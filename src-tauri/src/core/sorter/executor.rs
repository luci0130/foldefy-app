use super::journal;
use crate::db::DbPool;
use crate::error::FoldefyError;
use crate::models::sorting::{ExecuteResult, SortProgressEvent};
use std::collections::HashSet;
use std::fs;
use std::path::{Path, PathBuf};
use std::thread;
use std::time::Duration;
use tauri::{AppHandle, Emitter};

const SHARING_VIOLATION: i32 = 32; // ERROR_SHARING_VIOLATION
const NOT_SAME_DEVICE: i32 = 17; // ERROR_NOT_SAME_DEVICE

/// Execute the planned moves of a batch. Every move is journaled
/// `in_progress` (flushed) BEFORE touching the filesystem, so a crash at any
/// point is recoverable by `journal::reconcile_on_startup`.
pub fn execute_batch(
    pool: &DbPool,
    app: Option<&AppHandle>,
    batch_id: i64,
    only_ids: Option<Vec<i64>>,
) -> Result<ExecuteResult, FoldefyError> {
    let conn = pool.get()?;
    let rows = journal::rows_with_status(&conn, batch_id, "planned", only_ids.as_deref())?;
    let total = rows.len() as u32;

    let mut moved = 0u32;
    let mut failed = Vec::new();
    let mut created_dirs: HashSet<PathBuf> = HashSet::new();

    for (i, row) in rows.iter().enumerate() {
        // Create the destination's category folder if needed, journaled so
        // a full-batch undo can remove it again when it ends up empty.
        if let Some(parent) = Path::new(&row.dst).parent() {
            if !parent.exists() && !created_dirs.contains(parent) {
                if let Err(e) = fs::create_dir_all(parent) {
                    journal::set_status(
                        &conn,
                        row.id,
                        "failed",
                        Some(&format!("could not create folder: {}", e)),
                    )?;
                    failed.push(format!("{}: could not create folder: {}", row.src, e));
                    continue;
                }
                created_dirs.insert(parent.to_path_buf());
                let mkdir_id = journal::record_planned(
                    &conn,
                    batch_id,
                    "mkdir",
                    "",
                    &parent.to_string_lossy(),
                    None,
                    None,
                )?;
                journal::set_status(&conn, mkdir_id, "done", None)?;
            }
        }

        journal::mark_in_progress(&conn, row.id)?;

        match move_file(Path::new(&row.src), Path::new(&row.dst)) {
            Ok(final_dst) => {
                let final_str = final_dst.to_string_lossy().to_string();
                if final_str != row.dst {
                    journal::update_dst(&conn, row.id, &final_str)?;
                }
                journal::set_status(&conn, row.id, "done", None)?;
                moved += 1;
            }
            Err(e) => {
                journal::set_status(&conn, row.id, "failed", Some(&e))?;
                failed.push(format!("{}: {}", row.src, e));
            }
        }

        if let Some(app) = app {
            let _ = app.emit(
                "sort-progress",
                SortProgressEvent {
                    batch_id,
                    done: (i + 1) as u32,
                    total,
                    current: row.src.clone(),
                },
            );
        }
    }

    let status = if failed.is_empty() {
        "executed"
    } else {
        "executed_with_errors"
    };
    journal::set_batch_status(&conn, batch_id, status)?;

    Ok(ExecuteResult {
        batch_id,
        moved,
        failed,
    })
}

/// Move one file: same-volume rename, cross-volume copy+verify+delete,
/// locked files retried twice. Late collisions get a numbered name.
/// Returns the actual destination used.
pub(super) fn move_file(src: &Path, dst: &Path) -> Result<PathBuf, String> {
    if !src.exists() {
        return Err("source file no longer exists".to_string());
    }

    let target = if dst.exists() {
        super::planner::resolve_collision(dst, &HashSet::new())
    } else {
        dst.to_path_buf()
    };

    let mut attempt = 0;
    loop {
        match fs::rename(src, &target) {
            Ok(()) => return Ok(target),
            Err(e) if e.raw_os_error() == Some(NOT_SAME_DEVICE) => {
                return copy_verify_delete(src, &target);
            }
            Err(e) if e.raw_os_error() == Some(SHARING_VIOLATION) && attempt < 2 => {
                attempt += 1;
                thread::sleep(Duration::from_millis(200));
            }
            Err(e) if e.raw_os_error() == Some(SHARING_VIOLATION) => {
                return Err("file is locked by another program".to_string());
            }
            Err(e) => return Err(e.to_string()),
        }
    }
}

fn copy_verify_delete(src: &Path, dst: &Path) -> Result<PathBuf, String> {
    let src_len = src.metadata().map_err(|e| e.to_string())?.len();
    fs::copy(src, dst).map_err(|e| format!("cross-drive copy failed: {}", e))?;

    let dst_len = dst.metadata().map_err(|e| e.to_string())?.len();
    if dst_len != src_len {
        let _ = fs::remove_file(dst);
        return Err("cross-drive copy verification failed (size mismatch)".to_string());
    }

    fs::remove_file(src).map_err(|e| format!("copied but could not remove original: {}", e))?;
    Ok(dst.to_path_buf())
}
