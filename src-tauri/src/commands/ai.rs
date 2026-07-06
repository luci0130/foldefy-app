use crate::core::ai::claude::ClaudeProvider;
use crate::core::ai::local::LocalLlamaProvider;
use crate::core::ai::prompts;
use crate::core::ai::provider::{AiProvider, JsonRequest};
use crate::core::models_mgr;
use crate::models::ai::{AIConfig, AIRecommendation};
use crate::models::scanning::FolderIndex;
use crate::models::user::UserProfile;
use std::fs;
use tauri::AppHandle;

fn get_data_dir() -> Result<std::path::PathBuf, String> {
    let data_dir = dirs::data_dir()
        .ok_or_else(|| "Could not find data directory".to_string())?
        .join("foldefy");

    if !data_dir.exists() {
        fs::create_dir_all(&data_dir)
            .map_err(|e| format!("Failed to create data directory: {}", e))?;
    }

    Ok(data_dir)
}

fn get_api_key(custom_key: &Option<String>) -> Option<String> {
    if let Some(key) = custom_key {
        if !key.is_empty() {
            return Some(key.clone());
        }
    }
    if let Some(key) = crate::core::secrets::get_claude_key() {
        return Some(key);
    }
    std::env::var("FOLDEFY_API_KEY")
        .ok()
        .filter(|k| !k.is_empty())
}

/// Pick the active local model: the configured one, or the best ready
/// model for this machine's tier.
fn active_local_model(app: &AppHandle, config: &Option<AIConfig>) -> Option<std::path::PathBuf> {
    if let Some(id) = config.as_ref().and_then(|c| c.local_model_id.clone()) {
        return models_mgr::ready_model_path(app, &id);
    }
    // Auto: try the tier-recommended model first, then anything ready
    let tier = crate::core::hw::detect().tier;
    let models = models_mgr::list_models(app).ok()?;
    models
        .iter()
        .find(|m| m.spec.tier == tier && m.status == "ready")
        .or_else(|| models.iter().find(|m| m.status == "ready"))
        .and_then(|m| m.local_path.clone())
        .map(std::path::PathBuf::from)
}

#[tauri::command]
pub async fn generate_ai_recommendation(
    user_profile: UserProfile,
    folder_index: Vec<FolderIndex>,
    custom_api_key: Option<String>,
    app_handle: AppHandle,
) -> Result<AIRecommendation, String> {
    let config = load_ai_config_internal()?;
    let base_prompt = prompts::build_recommendation_prompt(&user_profile, &folder_index);

    let requested = config
        .as_ref()
        .and_then(|c| c.provider.clone())
        .unwrap_or_else(|| "local".to_string());

    let mut request = JsonRequest {
        system: prompts::RECOMMENDATION_SYSTEM.to_string(),
        prompt: base_prompt,
        max_tokens: 6144,
    };

    // Resolve the provider: local when requested AND the engine + a model
    // are available; otherwise Claude with a configured key.
    let provider: Box<dyn AiProvider> = if requested == "local" {
        match active_local_model(&app_handle, &config).and_then(LocalLlamaProvider::try_new) {
            Some(local) => {
                // Small local models drift into very deep, verbose structures
                // and run out of tokens — constrain the output size.
                request.prompt.push_str(
                    "\n\nIMPORTANT: Keep the output compact: at most 2 levels of nesting, \
                     at most 20 folders in total, and each description under 8 words.",
                );
                Box::new(local)
            }
            None => match get_api_key(&custom_api_key) {
                Some(key) => Box::new(ClaudeProvider::new(key)),
                None => {
                    return Err(if LocalLlamaProvider::ENGINE_COMPILED {
                        "No local AI model is downloaded yet. Download one in Settings, or add a Claude API key.".to_string()
                    } else {
                        "Local AI is coming in the next update. For now, add a Claude API key in Settings.".to_string()
                    })
                }
            },
        }
    } else {
        let key = get_api_key(&custom_api_key).ok_or_else(|| {
            "No API key available. Please provide a Claude API key in Settings.".to_string()
        })?;
        Box::new(ClaudeProvider::new(key))
    };

    let value = provider
        .complete_json(&request)
        .await
        .map_err(|e| e.to_string())?;

    let recommendation: AIRecommendation = serde_json::from_value(value)
        .map_err(|e| format!("Failed to parse AI recommendation: {}", e))?;

    Ok(recommendation)
}

fn load_ai_config_internal() -> Result<Option<AIConfig>, String> {
    let data_dir = get_data_dir()?;
    let config_path = data_dir.join("ai_config.json");

    // One-time migration: move a legacy plaintext key from ai_config.json
    // into the OS credential store and blank it in the file.
    let mut file_config: Option<AIConfig> = None;
    if config_path.exists() {
        let json = fs::read_to_string(&config_path)
            .map_err(|e| format!("Failed to read AI config: {}", e))?;
        let mut config: AIConfig =
            serde_json::from_str(&json).map_err(|e| format!("Failed to parse AI config: {}", e))?;

        if let Some(key) = config.api_key.take() {
            if !key.is_empty() {
                crate::core::secrets::set_claude_key(&key).map_err(|e| e.to_string())?;
                let blanked = serde_json::to_string_pretty(&config)
                    .map_err(|e| format!("Failed to serialize AI config: {}", e))?;
                fs::write(&config_path, blanked)
                    .map_err(|e| format!("Failed to write AI config: {}", e))?;
            }
        }
        file_config = Some(config);
    }

    let key = crate::core::secrets::get_claude_key();
    if key.is_none() && file_config.is_none() {
        return Ok(None);
    }

    let mut config = file_config.unwrap_or(AIConfig {
        api_key: None,
        provider: None,
        local_model_id: None,
    });
    config.api_key = key;
    Ok(Some(config))
}

#[tauri::command]
pub async fn save_ai_config(config: AIConfig) -> Result<(), String> {
    let data_dir = get_data_dir()?;
    let config_path = data_dir.join("ai_config.json");

    // The key lives in the OS credential store; the JSON file never holds it.
    crate::core::secrets::set_claude_key(config.api_key.as_deref().unwrap_or(""))
        .map_err(|e| e.to_string())?;

    let sanitized = AIConfig {
        api_key: None,
        provider: config.provider,
        local_model_id: config.local_model_id,
    };
    let json = serde_json::to_string_pretty(&sanitized)
        .map_err(|e| format!("Failed to serialize AI config: {}", e))?;

    fs::write(&config_path, json).map_err(|e| format!("Failed to write AI config: {}", e))?;

    Ok(())
}

#[tauri::command]
pub async fn load_ai_config() -> Result<Option<AIConfig>, String> {
    load_ai_config_internal()
}

/// Whether the embedded local engine is compiled into this build, so the
/// UI can present local AI as active vs coming soon.
#[tauri::command]
pub async fn local_engine_available() -> Result<bool, String> {
    Ok(LocalLlamaProvider::ENGINE_COMPILED)
}
