use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AIConfig {
    pub api_key: Option<String>,
    /// "local" (default) or "claude".
    #[serde(default)]
    pub provider: Option<String>,
    /// Selected local model id from the registry; None = auto by tier.
    #[serde(default)]
    pub local_model_id: Option<String>,
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
