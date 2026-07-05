use crate::core::fs_ops::create_tree::{self, TreeNode};
use crate::core::sorter::journal;
use crate::db::DbPool;
use crate::models::ai::{AIRecommendation, RecommendedFolder};
use crate::models::sorting::ApplyResult;
use rusqlite::params;
use std::collections::HashMap;
use std::path::Path;
use tauri::State;

fn to_tree(folders: &[RecommendedFolder]) -> Vec<TreeNode> {
    folders
        .iter()
        .map(|f| TreeNode {
            name: f.name.clone(),
            children: to_tree(&f.children),
        })
        .collect()
}

/// Create the AI-recommended folder structure under `target_root`.
/// `dry_run` previews without touching the disk. Real runs journal every
/// created folder as an undoable batch (kind `mkdir`).
#[tauri::command]
pub async fn apply_structure(
    recommendation: AIRecommendation,
    target_root: String,
    dry_run: bool,
    pool: State<'_, DbPool>,
) -> Result<ApplyResult, String> {
    let root = Path::new(&target_root);
    if !root.exists() || !root.is_dir() {
        return Err(format!(
            "Target path does not exist or is not a directory: {}",
            target_root
        ));
    }

    let nodes = to_tree(&recommendation.recommended_structure);
    let result = create_tree::create_tree(root, &nodes, &HashMap::new(), dry_run);

    if !dry_run {
        let conn = pool.get().map_err(|e| e.to_string())?;

        // Journal created folders so the run shows up in the Undo Center
        let scope = serde_json::json!({ "target_root": target_root });
        let batch_id = journal::create_batch(&conn, "structure", &scope.to_string())
            .map_err(|e| e.to_string())?;
        for dir in &result.created {
            let id = journal::record_planned(&conn, batch_id, "mkdir", "", dir, None, None)
                .map_err(|e| e.to_string())?;
            journal::set_status(&conn, id, "done", None).map_err(|e| e.to_string())?;
        }
        journal::set_batch_status(&conn, batch_id, "executed").map_err(|e| e.to_string())?;

        // Keep the applied recommendation for the dashboard / later sorting
        conn.execute(
            "INSERT INTO recommendations (provider, root, json) VALUES ('ai', ?1, ?2)",
            params![
                target_root,
                serde_json::to_string(&recommendation).map_err(|e| e.to_string())?
            ],
        )
        .map_err(|e| e.to_string())?;
    }

    Ok(ApplyResult {
        created: result.created,
        skipped: result.skipped,
        errors: result.errors,
    })
}
