use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DriveInfo {
    pub name: String,
    pub path: String,
    pub total_space: Option<u64>,
    pub free_space: Option<u64>,
    pub drive_type: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FolderIndex {
    pub root_path: String,
    pub scanned_at: String,
    pub total_folders: u32,
    pub tree: FolderIndexNode,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FolderIndexNode {
    pub name: String,
    pub path: String,
    pub is_skipped: bool,
    pub children: Vec<FolderIndexNode>,
    pub depth: u32,
    pub project_type: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ScanProgress {
    pub current_path: String,
    pub folders_scanned: u32,
    pub drive: String,
    pub percentage: f32,
}

/// A directory with many unsorted files, suggested as a sorting target.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Hotspot {
    pub path: String,
    pub loose_files: u32,
    pub score: f32,
    pub reason: String,
}
