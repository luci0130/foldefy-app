use crate::core::scanner::{self, hotspots};
use crate::db::DbPool;
use crate::models::scanning::{DriveInfo, FolderIndex, Hotspot};
use std::fs;
use std::path::Path;
use sysinfo::Disks;
use tauri::{AppHandle, State};

#[tauri::command]
pub async fn cancel_scan() -> Result<(), String> {
    scanner::request_cancel();
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

#[tauri::command]
pub async fn smart_scan_directory(
    path: String,
    max_depth: Option<u32>,
    is_developer: Option<bool>,
    app_handle: AppHandle,
    pool: State<'_, DbPool>,
) -> Result<FolderIndex, String> {
    // is_developer only affects WSL discovery, which is a scan_all_drives concern
    let _ = is_developer;

    scanner::reset_cancel();
    let depth = max_depth.unwrap_or(10);
    let path_ref = Path::new(&path);
    if !path_ref.exists() || !path_ref.is_dir() {
        return Err(format!(
            "Path does not exist or is not a directory: {}",
            path
        ));
    }

    let installed_paths = scanner::skip_rules::get_installed_app_paths();
    let index = scanner::scan_root(path_ref, depth, &app_handle, &path, &installed_paths, false)?;

    if let Err(e) = scanner::persist_index(&pool, &index) {
        eprintln!("Failed to persist scan index for {}: {}", path, e);
    }

    Ok(index)
}

#[tauri::command]
pub async fn scan_all_drives(
    max_depth: Option<u32>,
    is_developer: Option<bool>,
    app_handle: AppHandle,
    pool: State<'_, DbPool>,
) -> Result<Vec<FolderIndex>, String> {
    scanner::reset_cancel();
    let depth = max_depth.unwrap_or(10);
    let is_developer = is_developer.unwrap_or(false);
    let drives = list_drives().await?;
    let mut results = Vec::new();
    let installed_paths = scanner::skip_rules::get_installed_app_paths();

    for drive in drives {
        match scanner::scan_root(
            Path::new(&drive.path),
            depth,
            &app_handle,
            &drive.name,
            &installed_paths,
            false,
        ) {
            Ok(index) => results.push(index),
            Err(e) => {
                eprintln!("Failed to scan drive {}: {}", drive.path, e);
                continue;
            }
        }
    }

    // Scan WSL home directories for developer users
    #[cfg(windows)]
    if is_developer {
        let wsl_results = scanner::scan_wsl_homes(depth, &app_handle, &installed_paths);
        results.extend(wsl_results);
    }
    #[cfg(not(windows))]
    let _ = is_developer;

    for index in &results {
        if let Err(e) = scanner::persist_index(&pool, index) {
            eprintln!(
                "Failed to persist scan index for {}: {}",
                index.root_path, e
            );
        }
    }

    Ok(results)
}

#[tauri::command]
pub async fn get_hotspots() -> Result<Vec<Hotspot>, String> {
    Ok(hotspots::detect_hotspots(&hotspots::default_candidates()))
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
