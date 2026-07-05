mod commands;
mod models;

use commands::{
    save_user_profile, load_user_profile,
    scan_directory, save_annotation, load_annotations, export_structure_for_ai,
    list_drives, smart_scan_directory, scan_all_drives, cancel_scan, save_folder_index, load_folder_index,
    generate_ai_recommendation, save_ai_config, load_ai_config,
    load_builtin_templates, fetch_community_templates, apply_template,
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
