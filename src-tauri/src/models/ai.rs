use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AIConfig {
    pub api_key: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RecommendedFolder {
    pub name: String,
    pub description: String,
    pub children: Vec<RecommendedFolder>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AIRecommendation {
    pub recommended_structure: Vec<RecommendedFolder>,
    pub explanation: String,
    pub tips: Vec<String>,
}
