mod commands;
mod models;

use commands::{
    save_user_profile, load_user_profile,
    scan_directory, save_annotation, load_annotations, export_structure_for_ai,
};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            save_user_profile,
            load_user_profile,
            scan_directory,
            save_annotation,
            load_annotations,
            export_structure_for_ai,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
