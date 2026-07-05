use super::provider::{AiProvider, JsonRequest};
use crate::error::FoldefyError;
use async_trait::async_trait;
use std::path::PathBuf;

/// Local llama.cpp provider. The inference engine (llama-cpp-2 with
/// Vulkan) requires CMake + Vulkan SDK at build time and lands as the
/// next step of Phase 2 — until then this provider reports unavailable
/// and the dispatcher falls back to Claude when a key is configured.
pub struct LocalLlamaProvider {
    #[allow(dead_code)]
    model_path: PathBuf,
}

impl LocalLlamaProvider {
    /// True once the app is built with the embedded inference engine.
    pub const ENGINE_COMPILED: bool = false;

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
        _request: &JsonRequest,
    ) -> Result<serde_json::Value, FoldefyError> {
        Err(FoldefyError::Ai(
            "The embedded local AI engine is not included in this build yet".to_string(),
        ))
    }
}
