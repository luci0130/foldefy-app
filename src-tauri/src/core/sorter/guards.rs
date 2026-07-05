use crate::core::scanner::project_detect;
use std::path::Path;

/// Files larger than this are never auto-moved (cloud sync / risk of long copies).
const MAX_FILE_SIZE_BYTES: u64 = 10 * 1024 * 1024 * 1024; // 10 GB

/// Hard safety guard: paths the sorter must never touch, checked in the
/// planner (not just the UI). Returns a human-readable reason when protected.
pub fn is_protected(path: &Path) -> Option<String> {
    let lower = path.to_string_lossy().to_lowercase();

    for marker in [
        "\\windows\\",
        "\\program files",
        "\\programdata",
        "\\appdata\\",
        "\\$recycle.bin",
        "\\system volume information",
    ] {
        if lower.contains(marker) {
            return Some(format!("system path ({})", marker.trim_matches('\\')));
        }
    }

    // Files inside a detected code project must not be scattered
    if let Some(parent) = path.parent() {
        if let Some(project) = project_detect::detect_project_type(parent) {
            return Some(format!("inside a {} project", project));
        }
    }

    if let Ok(metadata) = path.metadata() {
        if metadata.is_file() && metadata.len() > MAX_FILE_SIZE_BYTES {
            return Some("file larger than 10 GB".to_string());
        }
    }

    // OneDrive/cloud placeholder: moving it would force a full download
    #[cfg(windows)]
    {
        use std::os::windows::fs::MetadataExt;
        const FILE_ATTRIBUTE_RECALL_ON_DATA_ACCESS: u32 = 0x0040_0000;
        if let Ok(metadata) = path.metadata() {
            if metadata.file_attributes() & FILE_ATTRIBUTE_RECALL_ON_DATA_ACCESS != 0 {
                return Some("cloud placeholder file (not downloaded locally)".to_string());
            }
        }
    }

    None
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;

    #[test]
    fn system_paths_are_protected() {
        assert!(is_protected(Path::new(r"C:\Windows\System32\kernel32.dll")).is_some());
        assert!(is_protected(Path::new(r"C:\Program Files\App\app.exe")).is_some());
        assert!(is_protected(Path::new(r"C:\Users\a\AppData\Local\x.dat")).is_some());
    }

    #[test]
    fn files_inside_code_projects_are_protected() {
        let dir = crate::core::sorter::test_util::user_like_tempdir();
        fs::write(dir.path().join("Cargo.toml"), "").unwrap();
        let file = dir.path().join("notes.txt");
        fs::write(&file, "x").unwrap();
        assert!(is_protected(&file).is_some());
    }

    #[test]
    fn ordinary_user_files_are_not_protected() {
        let dir = crate::core::sorter::test_util::user_like_tempdir();
        let file = dir.path().join("vacation.jpg");
        fs::write(&file, "x").unwrap();
        assert!(is_protected(&file).is_none());
    }
}
