use crate::models::{
    AIExportData, FolderAnnotation, FolderNode, FolderStatistics, FolderStructureData, UserProfile,
};
use std::collections::HashMap;
use std::fs;
use std::path::{Path, PathBuf};
use walkdir::WalkDir;

fn get_data_dir() -> Result<PathBuf, String> {
    let data_dir = dirs::data_dir()
        .ok_or_else(|| "Could not find data directory".to_string())?
        .join("foldefy");

    if !data_dir.exists() {
        fs::create_dir_all(&data_dir)
            .map_err(|e| format!("Failed to create data directory: {}", e))?;
    }

    Ok(data_dir)
}

fn scan_directory_recursive(
    path: &Path,
    max_depth: usize,
    current_depth: usize,
) -> Result<FolderNode, String> {
    let metadata =
        fs::metadata(path).map_err(|e| format!("Failed to read metadata for {:?}: {}", path, e))?;

    let name = path
        .file_name()
        .map(|n| n.to_string_lossy().to_string())
        .unwrap_or_else(|| path.to_string_lossy().to_string());

    if metadata.is_file() {
        let extension = path
            .extension()
            .map(|e| format!(".{}", e.to_string_lossy().to_lowercase()));

        return Ok(FolderNode {
            name,
            path: path.to_string_lossy().to_string(),
            node_type: "file".to_string(),
            children: None,
            file_count: None,
            size: Some(metadata.len()),
            extension,
        });
    }

    // It's a directory
    let mut children = Vec::new();
    let mut file_count = 0u32;

    // Directories we can't read are skipped silently
    if current_depth < max_depth {
        if let Ok(entries) = fs::read_dir(path) {
            for entry in entries.flatten() {
                let entry_path = entry.path();

                // Skip hidden files/folders on Unix-like systems
                if let Some(name) = entry_path.file_name() {
                    if name.to_string_lossy().starts_with('.') {
                        continue;
                    }
                }

                match scan_directory_recursive(&entry_path, max_depth, current_depth + 1) {
                    Ok(node) => {
                        if node.node_type == "file" {
                            file_count += 1;
                        } else if let Some(count) = node.file_count {
                            file_count += count;
                        }
                        children.push(node);
                    }
                    Err(_) => continue, // Skip entries we can't read
                }
            }
        }
    }

    // Sort children: folders first, then files, alphabetically
    children.sort_by(|a, b| match (&a.node_type[..], &b.node_type[..]) {
        ("folder", "file") => std::cmp::Ordering::Less,
        ("file", "folder") => std::cmp::Ordering::Greater,
        _ => a.name.to_lowercase().cmp(&b.name.to_lowercase()),
    });

    Ok(FolderNode {
        name,
        path: path.to_string_lossy().to_string(),
        node_type: "folder".to_string(),
        children: Some(children),
        file_count: Some(file_count),
        size: None,
        extension: None,
    })
}

#[tauri::command]
pub async fn scan_directory(path: String) -> Result<FolderNode, String> {
    let path = Path::new(&path);

    if !path.exists() {
        return Err("Path does not exist".to_string());
    }

    if !path.is_dir() {
        return Err("Path is not a directory".to_string());
    }

    scan_directory_recursive(path, 10, 0)
}

#[tauri::command]
pub async fn save_annotation(annotation: FolderAnnotation) -> Result<(), String> {
    let data_dir = get_data_dir()?;
    let annotations_path = data_dir.join("annotations.json");

    let mut annotations: Vec<FolderAnnotation> = if annotations_path.exists() {
        let json = fs::read_to_string(&annotations_path)
            .map_err(|e| format!("Failed to read annotations: {}", e))?;
        serde_json::from_str(&json).unwrap_or_default()
    } else {
        Vec::new()
    };

    // Update or add annotation
    if let Some(pos) = annotations.iter().position(|a| a.path == annotation.path) {
        annotations[pos] = annotation;
    } else {
        annotations.push(annotation);
    }

    let json = serde_json::to_string_pretty(&annotations)
        .map_err(|e| format!("Failed to serialize annotations: {}", e))?;

    fs::write(&annotations_path, json)
        .map_err(|e| format!("Failed to write annotations: {}", e))?;

    Ok(())
}

#[tauri::command]
pub async fn load_annotations() -> Result<Vec<FolderAnnotation>, String> {
    let data_dir = get_data_dir()?;
    let annotations_path = data_dir.join("annotations.json");

    if !annotations_path.exists() {
        return Ok(Vec::new());
    }

    let json = fs::read_to_string(&annotations_path)
        .map_err(|e| format!("Failed to read annotations: {}", e))?;

    let annotations: Vec<FolderAnnotation> =
        serde_json::from_str(&json).map_err(|e| format!("Failed to parse annotations: {}", e))?;

    Ok(annotations)
}

fn calculate_statistics(path: &Path) -> FolderStatistics {
    let mut total_folders = 0u32;
    let mut total_files = 0u32;
    let mut file_types: HashMap<String, u32> = HashMap::new();
    let folder_sizes: Vec<(String, u64)> = Vec::new();
    let mut max_depth = 0u32;

    for entry in WalkDir::new(path).into_iter().filter_map(|e| e.ok()) {
        let depth = entry.depth() as u32;
        if depth > max_depth {
            max_depth = depth;
        }

        if entry.file_type().is_dir() {
            total_folders += 1;
        } else if entry.file_type().is_file() {
            total_files += 1;

            if let Some(ext) = entry.path().extension() {
                let ext_str = format!(".{}", ext.to_string_lossy().to_lowercase());
                *file_types.entry(ext_str).or_insert(0) += 1;
            }
        }
    }

    // Get largest folders (by file count)
    let largest_folders: Vec<String> = folder_sizes
        .into_iter()
        .take(5)
        .map(|(path, _)| path)
        .collect();

    FolderStatistics {
        total_folders,
        total_files,
        file_types,
        largest_folders,
        deepest_path: max_depth,
    }
}

#[tauri::command]
pub async fn export_structure_for_ai(path: String) -> Result<AIExportData, String> {
    let path_ref = Path::new(&path);

    if !path_ref.exists() {
        return Err("Path does not exist".to_string());
    }

    // Load user profile
    let data_dir = get_data_dir()?;
    let profile_path = data_dir.join("user_profile.json");
    let user_profile: UserProfile = if profile_path.exists() {
        let json = fs::read_to_string(&profile_path)
            .map_err(|e| format!("Failed to read profile: {}", e))?;
        serde_json::from_str(&json).map_err(|e| format!("Failed to parse profile: {}", e))?
    } else {
        UserProfile {
            language: "en".to_string(),
            usage_type: "personal".to_string(),
            activities: Vec::new(),
            project_types: Vec::new(),
            organization_style: Vec::new(),
            primary_file_types: Vec::new(),
            storage_habits: None,
            custom_notes: None,
            onboarding_completed: false,
            created_at: chrono::Utc::now().to_rfc3339(),
        }
    };

    // Scan directory
    let tree = scan_directory_recursive(path_ref, 10, 0)?;

    // Load annotations
    let annotations = load_annotations().await?;

    // Calculate statistics
    let statistics = calculate_statistics(path_ref);

    let folder_structure = FolderStructureData {
        root: path.clone(),
        tree,
        annotations,
        statistics,
    };

    let analysis_request = format!(
        "Based on my profile (usage: {}, activities: {:?}) and current folder structure, \
         suggest improvements to better organize my files. Consider my profession and usage patterns.",
        user_profile.usage_type,
        user_profile.activities
    );

    Ok(AIExportData {
        user_profile,
        folder_structure,
        analysis_request,
    })
}
