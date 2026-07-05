use crate::models::ai::{AIConfig, AIRecommendation};
use crate::models::scanning::{FolderIndex, FolderIndexNode};
use crate::models::user::UserProfile;
use std::fs;

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

fn serialize_tree_compact(node: &FolderIndexNode, indent: usize) -> String {
    let mut result = String::new();
    let prefix = "  ".repeat(indent);

    if node.is_skipped {
        result.push_str(&format!("{}{} [skipped]\n", prefix, node.name));
    } else {
        result.push_str(&format!("{}{}/\n", prefix, node.name));
        for child in &node.children {
            // Limit depth in output to avoid huge prompts
            if indent < 4 {
                result.push_str(&serialize_tree_compact(child, indent + 1));
            }
        }
    }

    result
}

fn build_recommendation_prompt(
    profile: &UserProfile,
    folder_indices: &[FolderIndex],
) -> String {
    let mut folder_tree_str = String::new();
    for index in folder_indices {
        folder_tree_str.push_str(&format!("Drive: {}\n", index.root_path));
        folder_tree_str.push_str(&serialize_tree_compact(&index.tree, 1));
        folder_tree_str.push('\n');
    }

    // Truncate if too long
    if folder_tree_str.len() > 8000 {
        folder_tree_str.truncate(8000);
        folder_tree_str.push_str("\n... (truncated)\n");
    }

    let storage_info = profile
        .storage_habits
        .as_ref()
        .map(|h| {
            format!(
                "Multiple drives: {}, Cloud storage: {:?}, External storage: {}",
                h.uses_multiple_drives, h.uses_cloud_storage, h.uses_external_storage
            )
        })
        .unwrap_or_else(|| "Not specified".to_string());

    format!(
        r#"Based on this user profile and their current folder structure, generate an optimal folder organization recommendation.

## User Profile
- Language: {}
- Usage: {}
- Activities/Profession: {:?}
- Project Types: {:?}
- Current Organization Style: {:?}
- Primary File Types: {:?}
- Storage Setup: {}
- Custom Notes: {}

## Current Folder Structure (simplified, folders only)
{}

## Instructions
1. Analyze the current structure and identify improvement opportunities
2. Create a recommended folder hierarchy that:
   - Matches the user's profession and workflow
   - Follows their preferred organization style when possible
   - Groups related content logically
   - Uses clear, descriptive folder names in {} language
   - Is practical and not overly nested (max 4 levels deep)
3. Respond with ONLY this exact JSON (no markdown, no code blocks):
{{
  "recommended_structure": [
    {{
      "name": "FolderName",
      "description": "Brief purpose of this folder",
      "children": []
    }}
  ],
  "explanation": "Brief explanation of why this structure works for the user",
  "tips": ["Tip 1 for maintaining organization", "Tip 2"]
}}"#,
        profile.language,
        profile.usage_type,
        profile.activities,
        profile.project_types,
        profile.organization_style,
        profile.primary_file_types,
        storage_info,
        profile.custom_notes.as_deref().unwrap_or("None"),
        folder_tree_str,
        profile.language,
    )
}

fn get_api_key(custom_key: &Option<String>) -> Result<String, String> {
    // Try custom key first
    if let Some(key) = custom_key {
        if !key.is_empty() {
            return Ok(key.clone());
        }
    }

    // Try loading saved config
    if let Ok(config) = load_ai_config_internal() {
        if let Some(config) = config {
            if let Some(key) = config.api_key {
                if !key.is_empty() {
                    return Ok(key);
                }
            }
        }
    }

    // Try built-in key from env (set at build time)
    if let Ok(key) = std::env::var("FOLDEFY_API_KEY") {
        if !key.is_empty() {
            return Ok(key);
        }
    }

    Err("No API key available. Please provide a Claude API key in Settings.".to_string())
}

#[tauri::command]
pub async fn generate_ai_recommendation(
    user_profile: UserProfile,
    folder_index: Vec<FolderIndex>,
    custom_api_key: Option<String>,
) -> Result<AIRecommendation, String> {
    let api_key = get_api_key(&custom_api_key)?;
    let prompt = build_recommendation_prompt(&user_profile, &folder_index);

    let client = reqwest::Client::new();
    let response = client
        .post("https://api.anthropic.com/v1/messages")
        .header("x-api-key", &api_key)
        .header("anthropic-version", "2023-06-01")
        .header("content-type", "application/json")
        .json(&serde_json::json!({
            "model": "claude-sonnet-4-20250514",
            "max_tokens": 4096,
            "messages": [{
                "role": "user",
                "content": prompt
            }],
            "system": "You are Foldefy, an AI assistant that recommends folder structures. Respond ONLY with valid JSON matching the schema provided. Do not wrap in markdown code blocks."
        }))
        .send()
        .await
        .map_err(|e| format!("API request failed: {}", e))?;

    if !response.status().is_success() {
        let status = response.status();
        let body = response
            .text()
            .await
            .unwrap_or_else(|_| "Unknown error".to_string());
        return Err(format!("API error ({}): {}", status, body));
    }

    let body: serde_json::Value = response
        .json()
        .await
        .map_err(|e| format!("Failed to parse API response: {}", e))?;

    // Extract text from Claude's response
    let content = body["content"]
        .as_array()
        .and_then(|arr| arr.first())
        .and_then(|block| block["text"].as_str())
        .ok_or_else(|| "Failed to extract text from API response".to_string())?;

    // Parse the JSON recommendation
    let recommendation: AIRecommendation = serde_json::from_str(content)
        .map_err(|e| format!("Failed to parse AI recommendation: {}. Raw: {}", e, content))?;

    Ok(recommendation)
}

fn load_ai_config_internal() -> Result<Option<AIConfig>, String> {
    let data_dir = get_data_dir()?;
    let config_path = data_dir.join("ai_config.json");

    if !config_path.exists() {
        return Ok(None);
    }

    let json = fs::read_to_string(&config_path)
        .map_err(|e| format!("Failed to read AI config: {}", e))?;

    let config: AIConfig = serde_json::from_str(&json)
        .map_err(|e| format!("Failed to parse AI config: {}", e))?;

    Ok(Some(config))
}

#[tauri::command]
pub async fn save_ai_config(config: AIConfig) -> Result<(), String> {
    let data_dir = get_data_dir()?;
    let config_path = data_dir.join("ai_config.json");

    let json = serde_json::to_string_pretty(&config)
        .map_err(|e| format!("Failed to serialize AI config: {}", e))?;

    fs::write(&config_path, json)
        .map_err(|e| format!("Failed to write AI config: {}", e))?;

    Ok(())
}

#[tauri::command]
pub async fn load_ai_config() -> Result<Option<AIConfig>, String> {
    load_ai_config_internal()
}
