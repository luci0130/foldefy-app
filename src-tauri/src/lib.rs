mod commands;
mod db;
mod error;
mod models;

use tauri::Manager;

use commands::{
    apply_template, cancel_scan, export_structure_for_ai, fetch_community_templates,
    generate_ai_recommendation, list_drives, load_ai_config, load_annotations,
    load_builtin_templates, load_folder_index, load_user_profile, save_ai_config, save_annotation,
    save_folder_index, save_user_profile, scan_all_drives, scan_directory, smart_scan_directory,
};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .setup(|app| {
            let data_dir = app.path().app_data_dir()?;
            let pool = db::init(&data_dir)?;
            app.manage(pool);
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            save_user_profile,
            load_user_profile,
            scan_directory,
            save_annotation,
            load_annotations,
            export_structure_for_ai,
            list_drives,
            smart_scan_directory,
            scan_all_drives,
            cancel_scan,
            save_folder_index,
            load_folder_index,
            generate_ai_recommendation,
            save_ai_config,
            load_ai_config,
            load_builtin_templates,
            fetch_community_templates,
            apply_template,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
