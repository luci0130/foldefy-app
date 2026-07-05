use crate::models::scanning::{DriveInfo, FolderIndex, FolderIndexNode, ScanProgress};
use std::collections::HashSet;
use std::fs;
use std::path::Path;
use std::sync::atomic::{AtomicBool, AtomicU32, Ordering};
use std::sync::Arc;
use sysinfo::Disks;
use tauri::{AppHandle, Emitter};

#[cfg(windows)]
use winreg::enums::*;
#[cfg(windows)]
use winreg::RegKey;

/// Global flag to signal scan cancellation.
static SCAN_CANCELLED: AtomicBool = AtomicBool::new(false);

#[tauri::command]
pub async fn cancel_scan() -> Result<(), String> {
    SCAN_CANCELLED.store(true, Ordering::Relaxed);
    Ok(())
}

#[tauri::command]
pub async fn list_drives() -> Result<Vec<DriveInfo>, String> {
    let disks = Disks::new_with_refreshed_list();
    let mut drives = Vec::new();

    for disk in disks.list() {
        let mount_point = disk.mount_point().to_string_lossy().to_string();
        let name = if disk.name().is_empty() {
            mount_point.clone()
        } else {
            format!("{} ({})", disk.name().to_string_lossy(), mount_point)
        };

        let drive_type = match disk.kind() {
            sysinfo::DiskKind::HDD => "hdd",
            sysinfo::DiskKind::SSD => "ssd",
            _ => "unknown",
        }
        .to_string();

        drives.push(DriveInfo {
            name,
            path: mount_point,
            total_space: Some(disk.total_space()),
            free_space: Some(disk.available_space()),
            drive_type,
        });
    }

    Ok(drives)
}

/// Returns true if the path is a drive root (e.g. `C:\`).
fn is_drive_root(path: &Path) -> bool {
    match path.parent() {
        None => true,
        Some(parent) => parent == path,
    }
}

/// Returns true if the folder has the Windows hidden attribute set.
#[cfg(windows)]
fn is_hidden(path: &Path) -> bool {
    use std::os::windows::fs::MetadataExt;
    const FILE_ATTRIBUTE_HIDDEN: u32 = 0x2;
    fs::metadata(path)
        .map(|m| m.file_attributes() & FILE_ATTRIBUTE_HIDDEN != 0)
        .unwrap_or(false)
}

#[cfg(not(windows))]
fn is_hidden(path: &Path) -> bool {
    path.file_name()
        .map(|n| n.to_string_lossy().starts_with('.'))
        .unwrap_or(false)
}

/// Detect the project type/framework of a directory by checking root-level files.
fn detect_project_type(path: &Path) -> Option<String> {
    let entries: Vec<String> = match fs::read_dir(path) {
        Ok(rd) => rd
            .flatten()
            .filter_map(|e| e.file_name().to_str().map(|s| s.to_string()))
            .collect(),
        Err(_) => return None,
    };

    let has = |name: &str| entries.iter().any(|e| e.eq_ignore_ascii_case(name));
    let has_prefix = |prefix: &str| {
        entries
            .iter()
            .any(|e| e.to_lowercase().starts_with(&prefix.to_lowercase()))
    };
    let has_ext = |ext: &str| {
        entries.iter().any(|e| {
            e.to_lowercase()
                .ends_with(&format!(".{}", ext.to_lowercase()))
        })
    };

    // Check for subdirectory existence (for CMS detection)
    let has_dir = |dir_name: &str| path.join(dir_name).is_dir();

    // Tier 1: unique config files (order matters — more specific first)

    // CMS platforms (check before generic PHP/Node.js)
    if has("wp-config.php") || (has_dir("wp-content") && has_dir("wp-includes")) {
        return Some("WordPress".to_string());
    }
    if (has("bin") && path.join("bin").join("magento").exists())
        || (has_dir("app") && path.join("app").join("etc").join("env.php").exists())
    {
        return Some("Magento".to_string());
    }
    if has("config") && has_dir("classes") && has_dir("modules") && has("autoload.php") {
        return Some("PrestaShop".to_string());
    }

    if has("pubspec.yaml") {
        return Some("Flutter".to_string());
    }
    if has("Cargo.toml") {
        if has("tauri.conf.json") {
            return Some("Tauri".to_string());
        }
        return Some("Rust".to_string());
    }
    if has("go.mod") {
        return Some("Go".to_string());
    }
    if has("composer.json") {
        if has("artisan") {
            return Some("Laravel".to_string());
        }
        return Some("PHP".to_string());
    }
    if has("package.json") {
        if has_prefix("next.config") {
            return Some("Next.js".to_string());
        }
        if has_prefix("nuxt.config") {
            return Some("Nuxt".to_string());
        }
        if has("angular.json") {
            return Some("Angular".to_string());
        }
        if has_prefix("vite.config") {
            // Try to distinguish React vs Vue by reading package.json
            let pkg_path = path.join("package.json");
            if let Ok(contents) = fs::read_to_string(&pkg_path) {
                let lower = contents.to_lowercase();
                if lower.contains("\"vue\"") || lower.contains("'vue'") {
                    return Some("Vue".to_string());
                }
                if lower.contains("\"react\"") || lower.contains("'react'") {
                    return Some("React".to_string());
                }
            }
            return Some("Vite".to_string());
        }
        return Some("Node.js".to_string());
    }
    if has("pom.xml") || has("build.gradle") || has("build.gradle.kts") {
        return Some("Java".to_string());
    }
    if has_ext("csproj") || has_ext("sln") {
        return Some(".NET".to_string());
    }
    if has("Gemfile") {
        return Some("Ruby".to_string());
    }
    if has("requirements.txt") || has("pyproject.toml") || has("setup.py") {
        return Some("Python".to_string());
    }
    if has("CMakeLists.txt") || has("Makefile") {
        return Some("C/C++".to_string());
    }
    if has("mix.exs") {
        return Some("Elixir".to_string());
    }
    if has("Podfile") {
        return Some("iOS".to_string());
    }
    if has("build.zig") {
        return Some("Zig".to_string());
    }

    None
}

/// Linux system directories to exclude when scanning WSL paths.
fn is_linux_system_dir(name: &str) -> bool {
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
fn get_installed_app_paths() -> HashSet<String> {
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
fn get_installed_app_paths() -> HashSet<String> {
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

fn is_skipped_folder(path: &Path, installed_paths: &HashSet<String>) -> bool {
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

/// Collect immediate subdirectory names only (1 level, no recursion).
fn collect_shallow_children(
    path: &Path,
    current_depth: u32,
    counter: &Arc<AtomicU32>,
    is_wsl_path: bool,
) -> Vec<FolderIndexNode> {
    let mut children = Vec::new();
    if let Ok(entries) = fs::read_dir(path) {
        for entry in entries.flatten() {
            let entry_path = entry.path();
            if !entry_path.is_dir() {
                continue;
            }
            let entry_name = entry.file_name().to_string_lossy().to_string();
            if is_hidden(&entry_path) || entry_name.starts_with('.') {
                continue;
            }
            if is_wsl_path && is_linux_system_dir(&entry_name) {
                continue;
            }
            counter.fetch_add(1, Ordering::Relaxed);
            children.push(FolderIndexNode {
                name: entry_name,
                path: entry_path.to_string_lossy().to_string(),
                is_skipped: false,
                children: Vec::new(),
                depth: current_depth + 1,
                project_type: None,
            });
        }
    }
    children.sort_by(|a, b| a.name.to_lowercase().cmp(&b.name.to_lowercase()));
    children
}

// Signature gets restructured into a ScanContext in the core/scanner refactor (plan task 0.4)
#[allow(clippy::too_many_arguments, clippy::only_used_in_recursion)]
fn smart_scan_recursive(
    path: &Path,
    max_depth: u32,
    current_depth: u32,
    counter: &Arc<AtomicU32>,
    app_handle: &AppHandle,
    drive_name: &str,
    installed_paths: &HashSet<String>,
    is_developer: bool,
    is_wsl_path: bool,
) -> Result<FolderIndexNode, String> {
    // Check cancellation
    if SCAN_CANCELLED.load(Ordering::Relaxed) {
        return Err("Scan cancelled".to_string());
    }

    let name = path
        .file_name()
        .map(|n| n.to_string_lossy().to_string())
        .unwrap_or_else(|| path.to_string_lossy().to_string());

    let path_str = path.to_string_lossy().to_string();
    let count = counter.fetch_add(1, Ordering::Relaxed);

    // Emit progress every 50 folders
    if count.is_multiple_of(50) {
        let _ = app_handle.emit(
            "scan-progress",
            ScanProgress {
                current_path: path_str.clone(),
                folders_scanned: count,
                drive: drive_name.to_string(),
                percentage: -1.0,
            },
        );
    }

    let is_skipped = is_skipped_folder(path, installed_paths);

    // Detect project type for non-skipped folders
    let project_type = if !is_skipped {
        detect_project_type(path)
    } else {
        None
    };

    // Code source project: normal folder with project_type tag, shallow children (1 level)
    if project_type.is_some() {
        let children = collect_shallow_children(path, current_depth, counter, is_wsl_path);
        return Ok(FolderIndexNode {
            name,
            path: path_str,
            is_skipped: false,
            children,
            depth: current_depth,
            project_type,
        });
    }

    if is_skipped || current_depth >= max_depth {
        return Ok(FolderIndexNode {
            name,
            path: path_str,
            is_skipped,
            children: Vec::new(),
            depth: current_depth,
            project_type: None,
        });
    }

    let mut children = Vec::new();

    if let Ok(entries) = fs::read_dir(path) {
        for entry in entries.flatten() {
            // Check cancellation inside the loop too for responsiveness
            if SCAN_CANCELLED.load(Ordering::Relaxed) {
                return Err("Scan cancelled".to_string());
            }

            let entry_path = entry.path();
            if !entry_path.is_dir() {
                continue;
            }

            let entry_name = entry.file_name().to_string_lossy().to_string();

            // Skip hidden folders: Windows hidden attribute or dot-prefix
            if is_hidden(&entry_path) || entry_name.starts_with('.') {
                continue;
            }

            // Skip Linux system directories when scanning WSL paths
            if is_wsl_path && is_linux_system_dir(&entry_name) {
                continue;
            }

            // Skip inaccessible folders (e.g. "Documents and Settings" junction)
            if fs::read_dir(&entry_path).is_err() {
                continue;
            }

            match smart_scan_recursive(
                &entry_path,
                max_depth,
                current_depth + 1,
                counter,
                app_handle,
                drive_name,
                installed_paths,
                is_developer,
                is_wsl_path,
            ) {
                Ok(child) => children.push(child),
                Err(e) if e == "Scan cancelled" => return Err(e),
                Err(_) => continue,
            }
        }
    }

    children.sort_by(|a, b| a.name.to_lowercase().cmp(&b.name.to_lowercase()));

    Ok(FolderIndexNode {
        name,
        path: path_str,
        is_skipped: false,
        children,
        depth: current_depth,
        project_type: None,
    })
}

/// Decode UTF-16LE output from Windows CLI commands (e.g. `wsl --list`).
#[cfg(windows)]
fn decode_utf16le_output(bytes: &[u8]) -> String {
    // Strip BOM if present, then decode pairs of bytes as UTF-16LE
    let skip = if bytes.len() >= 2 && bytes[0] == 0xFF && bytes[1] == 0xFE {
        2
    } else {
        0
    };
    let u16s: Vec<u16> = bytes[skip..]
        .chunks_exact(2)
        .map(|pair| u16::from_le_bytes([pair[0], pair[1]]))
        .collect();
    String::from_utf16_lossy(&u16s)
}

/// Discover WSL distros and scan their home directories.
#[cfg(windows)]
fn scan_wsl_homes(
    max_depth: u32,
    app_handle: &AppHandle,
    installed_paths: &HashSet<String>,
) -> Vec<FolderIndex> {
    let mut results = Vec::new();

    let output = match std::process::Command::new("wsl")
        .args(["--list", "--quiet"])
        .output()
    {
        Ok(o) if o.status.success() => o,
        _ => return results,
    };

    // wsl --list --quiet outputs UTF-16LE on Windows — decode properly
    let stdout = decode_utf16le_output(&output.stdout);
    let distros: Vec<String> = stdout
        .lines()
        .map(|l| l.trim().trim_matches('\0').to_string())
        .filter(|l| !l.is_empty())
        .collect();

    for distro in &distros {
        // Use forward-slash UNC — Rust on Windows handles //server/share correctly,
        // whereas backslash UNC (\\server\share) gets mangled by Path.
        let home_path = format!("//wsl.localhost/{}/home", distro);
        let home = Path::new(&home_path);

        // Use read_dir directly instead of exists() — more reliable for UNC paths
        let user_dirs: Vec<_> = match fs::read_dir(home) {
            Ok(rd) => rd.flatten().filter(|e| e.path().is_dir()).collect(),
            Err(_) => continue,
        };

        for user_dir in user_dirs {
            let user_path = user_dir.path();
            let counter = Arc::new(AtomicU32::new(0));
            let drive_label = format!("WSL:{}/{}", distro, user_dir.file_name().to_string_lossy());

            match smart_scan_recursive(
                &user_path,
                max_depth,
                0,
                &counter,
                app_handle,
                &drive_label,
                installed_paths,
                true, // WSL scanning is developer-only
                true, // is_wsl_path
            ) {
                Ok(tree) => {
                    let total_folders = counter.load(Ordering::Relaxed);
                    results.push(FolderIndex {
                        root_path: user_path.to_string_lossy().to_string(),
                        scanned_at: chrono::Utc::now().to_rfc3339(),
                        total_folders,
                        tree,
                    });
                }
                Err(e) => {
                    eprintln!("Failed to scan WSL home {}: {}", user_path.display(), e);
                }
            }
        }
    }

    results
}

#[tauri::command]
pub async fn smart_scan_directory(
    path: String,
    max_depth: Option<u32>,
    is_developer: Option<bool>,
    app_handle: AppHandle,
) -> Result<FolderIndex, String> {
    SCAN_CANCELLED.store(false, Ordering::Relaxed);
    let depth = max_depth.unwrap_or(10);
    let is_developer = is_developer.unwrap_or(false);
    let path_ref = Path::new(&path);
    if !path_ref.exists() || !path_ref.is_dir() {
        return Err(format!(
            "Path does not exist or is not a directory: {}",
            path
        ));
    }

    let counter = Arc::new(AtomicU32::new(0));
    let drive_name = path.clone();
    let installed_paths = get_installed_app_paths();

    let tree = smart_scan_recursive(
        path_ref,
        depth,
        0,
        &counter,
        &app_handle,
        &drive_name,
        &installed_paths,
        is_developer,
        false,
    )?;
    let total_folders = counter.load(Ordering::Relaxed);

    Ok(FolderIndex {
        root_path: path,
        scanned_at: chrono::Utc::now().to_rfc3339(),
        total_folders,
        tree,
    })
}

#[tauri::command]
pub async fn scan_all_drives(
    max_depth: Option<u32>,
    is_developer: Option<bool>,
    app_handle: AppHandle,
) -> Result<Vec<FolderIndex>, String> {
    SCAN_CANCELLED.store(false, Ordering::Relaxed);
    let depth = max_depth.unwrap_or(10);
    let is_developer = is_developer.unwrap_or(false);
    let drives = list_drives().await?;
    let mut results = Vec::new();
    let installed_paths = get_installed_app_paths();

    for drive in drives {
        let counter = Arc::new(AtomicU32::new(0));

        match smart_scan_recursive(
            Path::new(&drive.path),
            depth,
            0,
            &counter,
            &app_handle,
            &drive.name,
            &installed_paths,
            is_developer,
            false,
        ) {
            Ok(tree) => {
                let total_folders = counter.load(Ordering::Relaxed);
                results.push(FolderIndex {
                    root_path: drive.path,
                    scanned_at: chrono::Utc::now().to_rfc3339(),
                    total_folders,
                    tree,
                });
            }
            Err(e) => {
                eprintln!("Failed to scan drive {}: {}", drive.path, e);
                continue;
            }
        }
    }

    // Scan WSL home directories for developer users
    #[cfg(windows)]
    if is_developer {
        let wsl_results = scan_wsl_homes(depth, &app_handle, &installed_paths);
        results.extend(wsl_results);
    }

    Ok(results)
}

#[tauri::command]
pub async fn save_folder_index(index: Vec<FolderIndex>) -> Result<(), String> {
    let data_dir = dirs::data_dir()
        .ok_or_else(|| "Could not find data directory".to_string())?
        .join("foldefy");

    if !data_dir.exists() {
        fs::create_dir_all(&data_dir)
            .map_err(|e| format!("Failed to create data directory: {}", e))?;
    }

    let index_path = data_dir.join("folder_index.json");
    let json = serde_json::to_string_pretty(&index)
        .map_err(|e| format!("Failed to serialize index: {}", e))?;

    fs::write(&index_path, json).map_err(|e| format!("Failed to write index: {}", e))?;

    Ok(())
}

#[tauri::command]
pub async fn load_folder_index() -> Result<Option<Vec<FolderIndex>>, String> {
    let data_dir = dirs::data_dir()
        .ok_or_else(|| "Could not find data directory".to_string())?
        .join("foldefy");

    let index_path = data_dir.join("folder_index.json");

    if !index_path.exists() {
        return Ok(None);
    }

    let json =
        fs::read_to_string(&index_path).map_err(|e| format!("Failed to read index: {}", e))?;

    let index: Vec<FolderIndex> =
        serde_json::from_str(&json).map_err(|e| format!("Failed to parse index: {}", e))?;

    Ok(Some(index))
}
