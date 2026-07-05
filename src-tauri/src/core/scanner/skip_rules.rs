use std::collections::HashSet;
use std::fs;
use std::path::Path;

#[cfg(windows)]
use winreg::enums::*;
#[cfg(windows)]
use winreg::RegKey;

/// Returns true if the path is a drive root (e.g. `C:\`).
pub fn is_drive_root(path: &Path) -> bool {
    match path.parent() {
        None => true,
        Some(parent) => parent == path,
    }
}

/// Returns true if the folder has the Windows hidden attribute set.
#[cfg(windows)]
pub fn is_hidden(path: &Path) -> bool {
    use std::os::windows::fs::MetadataExt;
    const FILE_ATTRIBUTE_HIDDEN: u32 = 0x2;
    fs::metadata(path)
        .map(|m| m.file_attributes() & FILE_ATTRIBUTE_HIDDEN != 0)
        .unwrap_or(false)
}

#[cfg(not(windows))]
pub fn is_hidden(path: &Path) -> bool {
    path.file_name()
        .map(|n| n.to_string_lossy().starts_with('.'))
        .unwrap_or(false)
}

/// Linux system directories to exclude when scanning WSL paths.
pub fn is_linux_system_dir(name: &str) -> bool {
    matches!(
        name,
        "bin"
            | "sbin"
            | "usr"
            | "lib"
            | "lib32"
            | "lib64"
            | "libx32"
            | "etc"
            | "var"
            | "boot"
            | "dev"
            | "proc"
            | "sys"
            | "run"
            | "snap"
            | "tmp"
            | "opt"
            | "root"
            | "srv"
            | "mnt"
            | "media"
            | "lost+found"
    )
}

/// Read installed application paths from the Windows registry.
#[cfg(windows)]
pub fn get_installed_app_paths() -> HashSet<String> {
    let mut paths = HashSet::new();

    let registry_keys = [
        (
            HKEY_LOCAL_MACHINE,
            r"SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall",
        ),
        (
            HKEY_LOCAL_MACHINE,
            r"SOFTWARE\WOW6432Node\Microsoft\Windows\CurrentVersion\Uninstall",
        ),
        (
            HKEY_CURRENT_USER,
            r"SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall",
        ),
    ];

    for (hive, subkey_path) in &registry_keys {
        let hive_key = RegKey::predef(*hive);
        if let Ok(uninstall_key) = hive_key.open_subkey_with_flags(subkey_path, KEY_READ) {
            for subkey_name in uninstall_key.enum_keys().flatten() {
                if let Ok(app_key) = uninstall_key.open_subkey_with_flags(&subkey_name, KEY_READ) {
                    if let Ok(install_location) = app_key.get_value::<String, _>("InstallLocation")
                    {
                        let trimmed = install_location.trim().to_string();
                        if !trimmed.is_empty() {
                            let normalized =
                                trimmed.to_lowercase().trim_end_matches('\\').to_string();
                            if !normalized.is_empty() {
                                paths.insert(normalized);
                            }
                        }
                    }
                }
            }
        }
    }

    paths
}

#[cfg(not(windows))]
pub fn get_installed_app_paths() -> HashSet<String> {
    HashSet::new()
}

/// Check if a folder path matches or is a child of any installed app path.
fn is_installed_app_folder(path: &Path, installed_paths: &HashSet<String>) -> bool {
    let path_str = path
        .to_string_lossy()
        .to_lowercase()
        .trim_end_matches('\\')
        .to_string();

    if installed_paths.contains(&path_str) {
        return true;
    }

    for app_path in installed_paths {
        if path_str.starts_with(app_path.as_str()) {
            let remainder = &path_str[app_path.len()..];
            if remainder.starts_with('\\') || remainder.is_empty() {
                return true;
            }
        }
    }

    false
}

pub fn is_skipped_folder(path: &Path, installed_paths: &HashSet<String>) -> bool {
    // Never mark drive roots as software — they must always be traversed
    if is_drive_root(path) {
        return false;
    }

    let name_lower = path
        .file_name()
        .map(|n| n.to_string_lossy().to_lowercase())
        .unwrap_or_default();

    let software_indicators = [
        "program files",
        "program files (x86)",
        "windows",
        "programdata",
        "$recycle.bin",
        "system volume information",
        "node_modules",
        ".git",
        "__pycache__",
        "target",
        ".cargo",
        ".rustup",
        ".gradle",
        ".m2",
        "appdata",
        "steam",
        "steamapps",
        "epic games",
        "riot games",
        "common files",
        "windowsapps",
        "msys64",
        "mingw64",
        "recovery",
        "perflogs",
        "intel",
        "nvidia",
        "amd",
        ".vscode",
        ".idea",
        "vendor",
        "bower_components",
        ".cache",
        ".local",
        ".npm",
        ".nvm",
        ".pyenv",
        "boot",
        "drivers",
        "msixvc",
        "$windows.~bt",
        "$windows.~ws",
    ];

    if software_indicators.iter().any(|s| name_lower == *s) {
        return true;
    }

    let path_str = path.to_string_lossy().to_lowercase();
    if path_str.contains("program files")
        || path_str.contains("programdata")
        || path_str.contains("\\windows\\")
        || path_str.contains("\\appdata\\local\\")
        || path_str.contains("\\appdata\\roaming\\")
    {
        return true;
    }

    if is_installed_app_folder(path, installed_paths) {
        return true;
    }

    false
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn skips_known_software_folders_by_name() {
        let empty = HashSet::new();
        assert!(is_skipped_folder(
            Path::new(r"C:\Users\a\project\node_modules"),
            &empty
        ));
        assert!(is_skipped_folder(
            Path::new(r"C:\Users\a\repo\.git"),
            &empty
        ));
        assert!(is_skipped_folder(
            Path::new(r"C:\Users\a\AppData\Local\Temp"),
            &empty
        ));
        assert!(!is_skipped_folder(
            Path::new(r"C:\Users\a\Documents"),
            &empty
        ));
    }

    #[test]
    fn drive_roots_are_never_skipped() {
        let empty = HashSet::new();
        assert!(is_drive_root(Path::new(r"C:\")));
        assert!(!is_skipped_folder(Path::new(r"C:\"), &empty));
    }

    #[test]
    fn detects_installed_app_folders_and_children() {
        let mut installed = HashSet::new();
        installed.insert(r"c:\apps\foo".to_string());
        assert!(is_skipped_folder(Path::new(r"C:\Apps\Foo"), &installed));
        assert!(is_skipped_folder(Path::new(r"C:\Apps\Foo\bin"), &installed));
        // Prefix that is not a path-boundary match must not be skipped
        assert!(!is_skipped_folder(Path::new(r"C:\Apps\FooBar"), &installed));
    }
}
