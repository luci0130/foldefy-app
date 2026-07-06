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

// Models (especially small local ones) omit optional-feeling fields like
// `children` on leaf folders — accept that instead of failing the parse.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RecommendedFolder {
    pub name: String,
    #[serde(default)]
    pub description: String,
    #[serde(default)]
    pub children: Vec<RecommendedFolder>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AIRecommendation {
    pub recommended_structure: Vec<RecommendedFolder>,
    #[serde(default)]
    pub explanation: String,
    #[serde(default)]
    pub tips: Vec<String>,
}
