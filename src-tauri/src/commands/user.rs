use crate::models::UserProfile;
use std::fs;
use std::path::PathBuf;

fn get_data_dir() -> Result<PathBuf, String> {
    let data_dir = dirs::data_dir()
        .ok_or_else(|| "Could not find data directory".to_string())?
        .join("foldefy");

    if !data_dir.exists() {
        fs::create_dir_all(&data_dir)
            .map_err(|e| format!("Failed to create data directory: {}", e))?;
    }

    Ok(data_dir)
}

#[tauri::command]
pub async fn save_user_profile(profile: UserProfile) -> Result<(), String> {
    let data_dir = get_data_dir()?;
    let profile_path = data_dir.join("user_profile.json");

    let json = serde_json::to_string_pretty(&profile)
        .map_err(|e| format!("Failed to serialize profile: {}", e))?;

    fs::write(&profile_path, json)
        .map_err(|e| format!("Failed to write profile: {}", e))?;

    Ok(())
}

#[tauri::command]
pub async fn load_user_profile() -> Result<Option<UserProfile>, String> {
    let data_dir = get_data_dir()?;
    let profile_path = data_dir.join("user_profile.json");

    if !profile_path.exists() {
        return Ok(None);
    }

    let json = fs::read_to_string(&profile_path)
        .map_err(|e| format!("Failed to read profile: {}", e))?;

    let profile: UserProfile = serde_json::from_str(&json)
        .map_err(|e| format!("Failed to parse profile: {}", e))?;

    Ok(Some(profile))
}
