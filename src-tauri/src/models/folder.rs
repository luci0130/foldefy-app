use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use super::UserProfile;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FolderNode {
    pub name: String,
    pub path: String,
    pub node_type: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub children: Option<Vec<FolderNode>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub file_count: Option<u32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub size: Option<u64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub extension: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FolderAnnotation {
    pub path: String,
    pub description: String,
    pub category: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub project: Option<String>,
    pub tags: Vec<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub ai_context: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FolderStatistics {
    pub total_folders: u32,
    pub total_files: u32,
    pub file_types: HashMap<String, u32>,
    pub largest_folders: Vec<String>,
    pub deepest_path: u32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AIExportData {
    pub user_profile: UserProfile,
    pub folder_structure: FolderStructureData,
    pub analysis_request: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FolderStructureData {
    pub root: String,
    pub tree: FolderNode,
    pub annotations: Vec<FolderAnnotation>,
    pub statistics: FolderStatistics,
}
