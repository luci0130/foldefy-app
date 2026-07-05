use serde::Serialize;

/// Unified error type for Tauri commands and core modules.
///
/// Serializes to its display string so the frontend receives a readable
/// message; existing commands returning `String` errors migrate to this
/// opportunistically.
// Ai/NotFound/Guard/Other are constructed starting with the Phase 1 sorter modules
#[allow(dead_code)]
#[derive(Debug, thiserror::Error)]
pub enum FoldefyError {
    #[error("I/O error: {0}")]
    Io(#[from] std::io::Error),

    #[error("database error: {0}")]
    Db(#[from] rusqlite::Error),

    #[error("database pool error: {0}")]
    Pool(#[from] r2d2::Error),

    #[error("serialization error: {0}")]
    Serde(#[from] serde_json::Error),

    #[error("AI error: {0}")]
    Ai(String),

    #[error("not found: {0}")]
    NotFound(String),

    #[error("blocked by safety guard: {0}")]
    Guard(String),

    #[error("{0}")]
    Other(String),
}

impl Serialize for FoldefyError {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: serde::Serializer,
    {
        serializer.serialize_str(&self.to_string())
    }
}
