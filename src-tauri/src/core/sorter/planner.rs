use super::{classifier, guards, journal};
use crate::core::scanner::hotspots;
use crate::db::DbPool;
use crate::error::FoldefyError;
use crate::models::sorting::{MovePlan, NeedsReviewFile, PlannedMove, SortScope};
use std::collections::HashSet;
use std::fs;
use std::path::{Path, PathBuf};
use std::time::UNIX_EPOCH;

/// Build a move plan for the given scope and journal it (status `planned`).
/// Nothing on disk changes here — execution is a separate, explicit step.
pub fn plan_sort(pool: &DbPool, scope: &SortScope, mode: &str) -> Result<MovePlan, FoldefyError> {
    let source_dirs = resolve_scope(scope);

    let mut entries_raw = Vec::new(); // (src, dst, file_name, category, confidence, reason, size, mtime)
    let mut needs_review = Vec::new();
    let mut skipped_protected = Vec::new();
    // Destinations already claimed by this plan (collision detection)
    let mut claimed: HashSet<PathBuf> = HashSet::new();

    for dir in &source_dirs {
        if let Some(reason) = guards::is_protected(dir) {
            skipped_protected.push(format!("{} — {}", dir.display(), reason));
            continue;
        }
        let Ok(dir_entries) = fs::read_dir(dir) else {
            continue;
        };

        for entry in dir_entries.flatten() {
            let path = entry.path();
            if !path.is_file() {
                continue;
            }
            let file_name = entry.file_name().to_string_lossy().to_string();
            if file_name.starts_with('.') || file_name.starts_with("~$") {
                continue;
            }

            if let Some(reason) = guards::is_protected(&path) {
                skipped_protected.push(format!("{} — {}", path.display(), reason));
                continue;
            }

            let classification = classifier::classify_file(&path);
            let Some(category) = classification.category else {
                needs_review.push(NeedsReviewFile {
                    path: path.to_string_lossy().to_string(),
                    file_name,
                    reason: classification.reason,
                });
                continue;
            };

            let dst = resolve_collision(&dir.join(&category).join(&file_name), &claimed);
            claimed.insert(dst.clone());

            let (size, mtime) = file_meta(&path);
            entries_raw.push((
                path.to_string_lossy().to_string(),
                dst.to_string_lossy().to_string(),
                file_name,
                category,
                classification.confidence,
                classification.reason,
                size,
                mtime,
            ));
        }
    }

    // Journal the whole plan in one transaction
    let mut conn = pool.get()?;
    let tx = conn.transaction()?;
    let scope_json = serde_json::to_string(scope)?;
    let batch_id = journal::create_batch(&tx, mode, &scope_json)?;

    let mut entries = Vec::with_capacity(entries_raw.len());
    for (src, dst, file_name, category, confidence, reason, size, mtime) in entries_raw {
        let journal_id = journal::record_planned(&tx, batch_id, "move", &src, &dst, size, mtime)?;
        entries.push(PlannedMove {
            journal_id,
            src,
            dst,
            file_name,
            category,
            confidence,
            reason,
        });
    }
    tx.commit()?;

    Ok(MovePlan {
        batch_id,
        entries,
        needs_review,
        skipped_protected,
    })
}

fn resolve_scope(scope: &SortScope) -> Vec<PathBuf> {
    match scope {
        SortScope::SelectedFolders { folders } => folders.iter().map(PathBuf::from).collect(),
        SortScope::Hotspots => hotspots::detect_hotspots(&hotspots::default_candidates())
            .into_iter()
            .map(|h| PathBuf::from(h.path))
            .collect(),
        // "Everything" means every default user folder — never whole drives.
        SortScope::Everything => hotspots::default_candidates(),
    }
}

/// Find a free destination: `name.ext`, then `name (2).ext`, `name (3).ext`, …
pub fn resolve_collision(wanted: &Path, claimed: &HashSet<PathBuf>) -> PathBuf {
    if !wanted.exists() && !claimed.contains(wanted) {
        return wanted.to_path_buf();
    }

    let stem = wanted
        .file_stem()
        .map(|s| s.to_string_lossy().to_string())
        .unwrap_or_default();
    let ext = wanted.extension().map(|e| e.to_string_lossy().to_string());
    let parent = wanted.parent().unwrap_or_else(|| Path::new(""));

    for n in 2..1000 {
        let candidate_name = match &ext {
            Some(e) => format!("{} ({}).{}", stem, n, e),
            None => format!("{} ({})", stem, n),
        };
        let candidate = parent.join(candidate_name);
        if !candidate.exists() && !claimed.contains(&candidate) {
            return candidate;
        }
    }
    wanted.to_path_buf()
}

fn file_meta(path: &Path) -> (Option<i64>, Option<i64>) {
    match path.metadata() {
        Ok(m) => {
            let size = Some(m.len() as i64);
            let mtime = m
                .modified()
                .ok()
                .and_then(|t| t.duration_since(UNIX_EPOCH).ok())
                .map(|d| d.as_secs() as i64);
            (size, mtime)
        }
        Err(_) => (None, None),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn plans_classified_files_and_flags_unknown_ones() {
        let db_dir = tempfile::tempdir().unwrap();
        let pool = crate::db::init(db_dir.path()).unwrap();
        let downloads = crate::core::sorter::test_util::user_like_tempdir();

        fs::write(downloads.path().join("report.pdf"), "x").unwrap();
        fs::write(downloads.path().join("photo.jpg"), "x").unwrap();
        fs::write(downloads.path().join("mystery.xyz"), "x").unwrap();

        let scope = SortScope::SelectedFolders {
            folders: vec![downloads.path().to_string_lossy().to_string()],
        };
        let plan = plan_sort(&pool, &scope, "auto").unwrap();

        assert_eq!(plan.entries.len(), 2);
        assert_eq!(plan.needs_review.len(), 1);
        assert!(plan.entries.iter().all(|e| e.journal_id > 0));
        // Files are planned into category subfolders of the source dir
        assert!(plan
            .entries
            .iter()
            .any(|e| e.dst.contains("Documents") && e.file_name == "report.pdf"));
    }

    #[test]
    fn collisions_get_numbered_names() {
        let dir = tempfile::tempdir().unwrap();
        let existing = dir.path().join("Documents");
        fs::create_dir_all(&existing).unwrap();
        fs::write(existing.join("report.pdf"), "old").unwrap();

        let claimed = HashSet::new();
        let resolved = resolve_collision(&existing.join("report.pdf"), &claimed);
        assert_eq!(
            resolved.file_name().unwrap().to_string_lossy(),
            "report (2).pdf"
        );
    }
}
