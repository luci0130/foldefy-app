use crate::core::{hw, models_mgr};
use crate::models::hardware::HardwareProfile;
use tauri::AppHandle;

#[tauri::command]
pub async fn get_hardware_profile() -> Result<HardwareProfile, String> {
    tauri::async_runtime::spawn_blocking(hw::detect)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn list_models(app_handle: AppHandle) -> Result<Vec<models_mgr::ModelInfo>, String> {
    models_mgr::list_models(&app_handle).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn download_model(id: String, app_handle: AppHandle) -> Result<(), String> {
    models_mgr::download(&app_handle, &id)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn cancel_model_download(id: String) -> Result<(), String> {
    models_mgr::request_cancel(&id);
    Ok(())
}

#[tauri::command]
pub async fn delete_model(id: String, app_handle: AppHandle) -> Result<(), String> {
    models_mgr::delete(&app_handle, &id).map_err(|e| e.to_string())
}
