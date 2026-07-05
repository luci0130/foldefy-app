use serde::{Deserialize, Serialize};

/// What the user wants sorted in one run.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type", rename_all = "snake_case")]
pub enum SortScope {
    /// Explicit folders picked by the user.
    SelectedFolders { folders: Vec<String> },
    /// Messy folders detected by hotspot analysis.
    Hotspots,
    /// All default user folders (Downloads, Desktop, Documents, Pictures).
    Everything,
}

/// One planned file move, already journaled with status `planned`.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PlannedMove {
    pub journal_id: i64,
    pub src: String,
    pub dst: String,
    pub file_name: String,
    pub category: String,
    pub confidence: f32,
    pub reason: String,
}

/// A file the rule classifier could not confidently place.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NeedsReviewFile {
    pub path: String,
    pub file_name: String,
    pub reason: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MovePlan {
    pub batch_id: i64,
    pub entries: Vec<PlannedMove>,
    pub needs_review: Vec<NeedsReviewFile>,
    pub skipped_protected: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ExecuteResult {
    pub batch_id: i64,
    pub moved: u32,
    pub failed: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UndoResult {
    pub undone: u32,
    pub conflicts: Vec<String>,
    pub failed: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SortBatch {
    pub id: i64,
    pub created_at: String,
    pub mode: String,
    pub status: String,
    pub total: u32,
    pub done: u32,
    pub undone: u32,
    pub failed: u32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct JournalEntry {
    pub id: i64,
    pub batch_id: i64,
    pub kind: String,
    pub src: String,
    pub dst: String,
    pub status: String,
    pub error: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BatchDetail {
    pub batch: SortBatch,
    pub entries: Vec<JournalEntry>,
}

/// Result of applying a folder structure (AI recommendation or template).
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ApplyResult {
    pub created: Vec<String>,
    pub skipped: Vec<String>,
    pub errors: Vec<String>,
}

/// Payload of the `sort-progress` Tauri event.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SortProgressEvent {
    pub batch_id: i64,
    pub done: u32,
    pub total: u32,
    pub current: String,
}
