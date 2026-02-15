use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UserProfile {
    pub usage_type: String,
    pub activities: Vec<String>,
    pub onboarding_completed: bool,
    pub created_at: String,
}
