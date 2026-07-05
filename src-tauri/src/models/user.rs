use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StorageHabits {
    pub uses_multiple_drives: bool,
    pub uses_cloud_storage: Vec<String>,
    pub uses_external_storage: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UserProfile {
    pub language: String,
    pub usage_type: String,
    pub activities: Vec<String>,
    #[serde(default)]
    pub project_types: Vec<String>,
    #[serde(default)]
    pub organization_style: Vec<String>,
    #[serde(default)]
    pub primary_file_types: Vec<String>,
    #[serde(default)]
    pub storage_habits: Option<StorageHabits>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub custom_notes: Option<String>,
    pub onboarding_completed: bool,
    pub created_at: String,
}
