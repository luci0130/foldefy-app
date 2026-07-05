use crate::error::FoldefyError;
use async_trait::async_trait;

/// A JSON-producing completion request, provider-agnostic.
pub struct JsonRequest {
    pub system: String,
    pub prompt: String,
    pub max_tokens: u32,
}

/// One interface for every AI backend: local llama.cpp, Claude API,
/// and later the cloud proxy.
#[async_trait]
pub trait AiProvider: Send + Sync {
    async fn complete_json(&self, request: &JsonRequest)
        -> Result<serde_json::Value, FoldefyError>;
}
