use crate::core::sorter::{executor, journal, planner, undo};
use crate::db::DbPool;
use crate::models::sorting::{
    BatchDetail, ExecuteResult, MovePlan, SortBatch, SortScope, UndoResult,
};
use tauri::{AppHandle, State};

// The sorter does blocking filesystem work, so every command runs it on the
// blocking thread pool instead of the async runtime.

#[tauri::command]
pub async fn plan_sort(
    scope: SortScope,
    mode: Option<String>,
    pool: State<'_, DbPool>,
) -> Result<MovePlan, String> {
    let pool = pool.inner().clone();
    let mode = mode.unwrap_or_else(|| "auto".to_string());
    tauri::async_runtime::spawn_blocking(move || {
        planner::plan_sort(&pool, &scope, &mode).map_err(|e| e.to_string())
    })
    .await
    .map_err(|e| e.to_string())?
}

#[tauri::command]
pub async fn execute_plan(
    batch_id: i64,
    entry_ids: Option<Vec<i64>>,
    app_handle: AppHandle,
    pool: State<'_, DbPool>,
) -> Result<ExecuteResult, String> {
    let pool = pool.inner().clone();
    tauri::async_runtime::spawn_blocking(move || {
        executor::execute_batch(&pool, Some(&app_handle), batch_id, entry_ids)
            .map_err(|e| e.to_string())
    })
    .await
    .map_err(|e| e.to_string())?
}

#[tauri::command]
pub async fn undo_batch(batch_id: i64, pool: State<'_, DbPool>) -> Result<UndoResult, String> {
    let pool = pool.inner().clone();
    tauri::async_runtime::spawn_blocking(move || {
        undo::undo_batch(&pool, batch_id).map_err(|e| e.to_string())
    })
    .await
    .map_err(|e| e.to_string())?
}

#[tauri::command]
pub async fn undo_folder(
    batch_id: i64,
    folder: String,
    pool: State<'_, DbPool>,
) -> Result<UndoResult, String> {
    let pool = pool.inner().clone();
    tauri::async_runtime::spawn_blocking(move || {
        undo::undo_folder(&pool, batch_id, &folder).map_err(|e| e.to_string())
    })
    .await
    .map_err(|e| e.to_string())?
}

#[tauri::command]
pub async fn undo_file(journal_id: i64, pool: State<'_, DbPool>) -> Result<UndoResult, String> {
    let pool = pool.inner().clone();
    tauri::async_runtime::spawn_blocking(move || {
        undo::undo_file(&pool, journal_id).map_err(|e| e.to_string())
    })
    .await
    .map_err(|e| e.to_string())?
}

#[tauri::command]
pub async fn list_batches(pool: State<'_, DbPool>) -> Result<Vec<SortBatch>, String> {
    let conn = pool.get().map_err(|e| e.to_string())?;
    journal::list_batches(&conn).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn get_batch(batch_id: i64, pool: State<'_, DbPool>) -> Result<BatchDetail, String> {
    let conn = pool.get().map_err(|e| e.to_string())?;
    journal::get_batch(&conn, batch_id).map_err(|e| e.to_string())
}
