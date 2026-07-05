use crate::models::scanning::Hotspot;
use std::collections::HashMap;
use std::fs;
use std::path::{Path, PathBuf};

/// Minimum number of loose files directly in a directory before it counts
/// as a hotspot worth suggesting.
const LOOSE_FILE_THRESHOLD: u32 = 30;

/// Directories that typically accumulate unsorted files get a score boost.
const WEIGHTED_NAMES: [&str; 3] = ["downloads", "desktop", "documents"];

/// The default set of directories checked for hotspots: the user's
/// Downloads, Desktop, Documents and Pictures folders.
pub fn default_candidates() -> Vec<PathBuf> {
    [
        dirs::download_dir(),
        dirs::desktop_dir(),
        dirs::document_dir(),
        dirs::picture_dir(),
    ]
    .into_iter()
    .flatten()
    .collect()
}

/// Analyze candidate directories (non-recursively) and return messy ones,
/// highest score first.
pub fn detect_hotspots(candidates: &[PathBuf]) -> Vec<Hotspot> {
    let mut hotspots: Vec<Hotspot> = candidates.iter().filter_map(|d| analyze_dir(d)).collect();
    hotspots.sort_by(|a, b| b.score.total_cmp(&a.score));
    hotspots
}

fn analyze_dir(dir: &Path) -> Option<Hotspot> {
    let entries = fs::read_dir(dir).ok()?;

    let mut loose_files = 0u32;
    let mut ext_counts: HashMap<String, u32> = HashMap::new();

    for entry in entries.flatten() {
        let path = entry.path();
        if !path.is_file() {
            continue;
        }
        let name = entry.file_name().to_string_lossy().to_string();
        if name.starts_with('.') {
            continue;
        }
        loose_files += 1;
        let ext = path
            .extension()
            .map(|e| e.to_string_lossy().to_lowercase())
            .unwrap_or_else(|| "(none)".to_string());
        *ext_counts.entry(ext).or_insert(0) += 1;
    }

    if loose_files < LOOSE_FILE_THRESHOLD {
        return None;
    }

    let distinct_exts = ext_counts.len() as u32;
    let dir_name = dir
        .file_name()
        .map(|n| n.to_string_lossy().to_lowercase())
        .unwrap_or_default();
    let weight = if WEIGHTED_NAMES.contains(&dir_name.as_str()) {
        2.0
    } else {
        1.0
    };
    // More distinct extensions per file means a more mixed (messier) folder.
    let mixedness = 1.0 + distinct_exts as f32 / loose_files as f32;
    let score = loose_files as f32 * mixedness * weight;

    Some(Hotspot {
        path: dir.to_string_lossy().to_string(),
        loose_files,
        score,
        reason: format!(
            "{} loose files across {} file types",
            loose_files, distinct_exts
        ),
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn messy_dir_is_a_hotspot_tidy_dir_is_not() {
        let messy = tempfile::tempdir().unwrap();
        let exts = ["pdf", "jpg", "txt", "zip"];
        for i in 0..40 {
            let ext = exts[i % exts.len()];
            fs::write(messy.path().join(format!("file{}.{}", i, ext)), "x").unwrap();
        }

        let tidy = tempfile::tempdir().unwrap();
        for i in 0..3 {
            fs::write(tidy.path().join(format!("doc{}.pdf", i)), "x").unwrap();
        }

        let candidates = vec![messy.path().to_path_buf(), tidy.path().to_path_buf()];
        let hotspots = detect_hotspots(&candidates);

        assert_eq!(hotspots.len(), 1);
        assert_eq!(hotspots[0].loose_files, 40);
        assert!(hotspots[0].score > 0.0);
        assert!(hotspots[0].reason.contains("40 loose files"));
    }

    #[test]
    fn subdirectories_do_not_count_as_loose_files() {
        let dir = tempfile::tempdir().unwrap();
        for i in 0..40 {
            fs::create_dir(dir.path().join(format!("sub{}", i))).unwrap();
        }
        assert!(detect_hotspots(&[dir.path().to_path_buf()]).is_empty());
    }
}
