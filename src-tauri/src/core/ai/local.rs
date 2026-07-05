use super::claude::parse_json_lenient;
use super::engine;
use super::provider::{AiProvider, JsonRequest};
use crate::error::FoldefyError;
use async_trait::async_trait;
use std::path::PathBuf;

/// Local llama.cpp provider — inference runs fully on-device through the
/// embedded engine (Vulkan GPU when available, CPU otherwise).
pub struct LocalLlamaProvider {
    model_path: PathBuf,
}

impl LocalLlamaProvider {
    /// True once the app is built with the embedded inference engine.
    pub const ENGINE_COMPILED: bool = true;

    pub fn try_new(model_path: PathBuf) -> Option<Self> {
        if !Self::ENGINE_COMPILED || !model_path.exists() {
            return None;
        }
        Some(Self { model_path })
    }
}

#[async_trait]
impl AiProvider for LocalLlamaProvider {
    async fn complete_json(
        &self,
        request: &JsonRequest,
    ) -> Result<serde_json::Value, FoldefyError> {
        let model_path = self.model_path.clone();
        let system = request.system.clone();
        let prompt = request.prompt.clone();
        let max_tokens = request.max_tokens;

        let text = tauri::async_runtime::spawn_blocking(move || {
            engine::complete(&model_path, &system, &prompt, max_tokens)
        })
        .await
        .map_err(|e| FoldefyError::Ai(format!("local inference task failed: {}", e)))??;

        parse_json_lenient(&text)
    }
}
