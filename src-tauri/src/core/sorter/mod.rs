pub mod classifier;
pub mod executor;
pub mod guards;
pub mod journal;
pub mod planner;
pub mod undo;

/// The default temp dir lives under AppData, which the sorter guards
/// correctly treat as protected — so tests that need "ordinary user files"
/// create them under target/test-tmp instead.
#[cfg(test)]
pub(crate) mod test_util {
    use std::path::PathBuf;

    pub fn user_like_tempdir() -> tempfile::TempDir {
        let root = PathBuf::from(env!("CARGO_MANIFEST_DIR"))
            .join("target")
            .join("test-tmp");
        std::fs::create_dir_all(&root).unwrap();
        tempfile::Builder::new()
            .prefix("foldefy")
            .tempdir_in(root)
            .unwrap()
    }
}

#[cfg(test)]
mod tests {
    use super::test_util::user_like_tempdir;
    use super::*;
    use crate::db::DbPool;
    use crate::models::sorting::SortScope;
    use std::collections::BTreeMap;
    use std::fs;
    use std::path::Path;

    fn setup() -> (tempfile::TempDir, DbPool, tempfile::TempDir) {
        let db_dir = tempfile::tempdir().unwrap();
        let pool = crate::db::init(db_dir.path()).unwrap();
        let downloads = user_like_tempdir();
        (db_dir, pool, downloads)
    }

    /// Recursively snapshot relative path -> content for tree comparison.
    fn snapshot(root: &Path) -> BTreeMap<String, Vec<u8>> {
        let mut map = BTreeMap::new();
        fn walk(root: &Path, dir: &Path, map: &mut BTreeMap<String, Vec<u8>>) {
            for entry in fs::read_dir(dir).unwrap().flatten() {
                let path = entry.path();
                if path.is_dir() {
                    walk(root, &path, map);
                } else {
                    let rel = path
                        .strip_prefix(root)
                        .unwrap()
                        .to_string_lossy()
                        .to_string();
                    map.insert(rel, fs::read(&path).unwrap());
                }
            }
        }
        walk(root, root, &mut map);
        map
    }

    fn scope_for(dir: &Path) -> SortScope {
        SortScope::SelectedFolders {
            folders: vec![dir.to_string_lossy().to_string()],
        }
    }

    #[test]
    fn sort_then_undo_batch_restores_identical_tree() {
        let (_db, pool, downloads) = setup();

        for i in 0..20 {
            fs::write(
                downloads.path().join(format!("doc{}.pdf", i)),
                format!("pdf-{}", i),
            )
            .unwrap();
            fs::write(
                downloads.path().join(format!("img{}.jpg", i)),
                format!("jpg-{}", i),
            )
            .unwrap();
        }
        fs::write(downloads.path().join("song.mp3"), "audio").unwrap();
        let before = snapshot(downloads.path());

        let plan = planner::plan_sort(&pool, &scope_for(downloads.path()), "auto").unwrap();
        assert_eq!(plan.entries.len(), 41);

        let result = executor::execute_batch(&pool, None, plan.batch_id, None).unwrap();
        assert_eq!(result.moved, 41);
        assert!(result.failed.is_empty());
        // Files actually moved into category folders
        assert!(downloads.path().join("Documents").join("doc0.pdf").exists());
        assert!(downloads.path().join("Music").join("song.mp3").exists());
        assert!(!downloads.path().join("doc0.pdf").exists());

        let undo_result = undo::undo_batch(&pool, plan.batch_id).unwrap();
        assert_eq!(undo_result.undone, 41);
        assert!(undo_result.conflicts.is_empty());
        assert!(undo_result.failed.is_empty());

        // Byte-identical tree, and the created category folders are gone
        let after = snapshot(downloads.path());
        assert_eq!(before, after);
        assert!(!downloads.path().join("Documents").exists());
        assert!(!downloads.path().join("Music").exists());
    }

    #[test]
    fn undo_single_file_leaves_the_rest_sorted() {
        let (_db, pool, downloads) = setup();
        fs::write(downloads.path().join("a.pdf"), "a").unwrap();
        fs::write(downloads.path().join("b.pdf"), "b").unwrap();

        let plan = planner::plan_sort(&pool, &scope_for(downloads.path()), "auto").unwrap();
        executor::execute_batch(&pool, None, plan.batch_id, None).unwrap();

        let entry_a = plan
            .entries
            .iter()
            .find(|e| e.file_name == "a.pdf")
            .unwrap();
        let result = undo::undo_file(&pool, entry_a.journal_id).unwrap();
        assert_eq!(result.undone, 1);

        assert!(downloads.path().join("a.pdf").exists());
        assert!(downloads.path().join("Documents").join("b.pdf").exists());
        // Category folder still holds b.pdf so it must NOT be removed
        assert!(downloads.path().join("Documents").exists());
    }

    #[test]
    fn undo_folder_restores_only_that_folder() {
        let (_db, pool, _unused) = setup();
        let dir_a = user_like_tempdir();
        let dir_b = user_like_tempdir();
        fs::write(dir_a.path().join("a.pdf"), "a").unwrap();
        fs::write(dir_b.path().join("b.pdf"), "b").unwrap();

        let scope = SortScope::SelectedFolders {
            folders: vec![
                dir_a.path().to_string_lossy().to_string(),
                dir_b.path().to_string_lossy().to_string(),
            ],
        };
        let plan = planner::plan_sort(&pool, &scope, "auto").unwrap();
        executor::execute_batch(&pool, None, plan.batch_id, None).unwrap();

        let result = undo::undo_folder(
            &pool,
            plan.batch_id,
            dir_a.path().to_string_lossy().as_ref(),
        )
        .unwrap();
        assert_eq!(result.undone, 1);

        assert!(dir_a.path().join("a.pdf").exists());
        assert!(dir_b.path().join("Documents").join("b.pdf").exists());
    }

    #[test]
    fn modified_files_conflict_instead_of_being_clobbered() {
        let (_db, pool, downloads) = setup();
        fs::write(downloads.path().join("report.pdf"), "original").unwrap();

        let plan = planner::plan_sort(&pool, &scope_for(downloads.path()), "auto").unwrap();
        executor::execute_batch(&pool, None, plan.batch_id, None).unwrap();

        // User edits the file after sorting — size changes
        let sorted = downloads.path().join("Documents").join("report.pdf");
        fs::write(&sorted, "edited after sorting, longer content").unwrap();

        let result = undo::undo_batch(&pool, plan.batch_id).unwrap();
        assert_eq!(result.undone, 0);
        assert_eq!(result.conflicts.len(), 1);
        // The edited file stays exactly where it is
        assert!(sorted.exists());
    }

    #[test]
    fn protected_files_never_enter_the_plan() {
        let (_db, pool, project) = setup();
        // Make the folder look like a code project
        fs::write(project.path().join("Cargo.toml"), "[package]").unwrap();
        fs::write(project.path().join("readme.pdf"), "docs").unwrap();

        let plan = planner::plan_sort(&pool, &scope_for(project.path()), "auto").unwrap();
        assert!(plan.entries.is_empty());
        assert!(!plan.skipped_protected.is_empty());
    }
}
