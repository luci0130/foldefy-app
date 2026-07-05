use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FolderTemplate {
    pub id: String,
    pub name: String,
    pub description: String,
    pub author: String,
    pub version: String,
    pub category: String,
    pub tags: Vec<String>,
    pub icon: String,
    pub is_free: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub price: Option<f64>,
    pub downloads: u32,
    pub rating: f32,
    pub source: TemplateSource,
    pub structure: Vec<TemplateFolderNode>,
    pub personalization_questions: Vec<PersonalizationQuestion>,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum TemplateSource {
    BuiltIn,
    Community,
    AI,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TemplateFolderNode {
    pub name: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub description: Option<String>,
    #[serde(default)]
    pub children: Vec<TemplateFolderNode>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PersonalizationQuestion {
    pub id: String,
    pub question: String,
    pub question_type: QuestionType,
    pub variable_name: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub options: Option<Vec<String>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub default_value: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum QuestionType {
    Text,
    Select,
    MultiSelect,
    Toggle,
}
