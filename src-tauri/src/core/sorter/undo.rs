use super::{executor, journal};
use crate::db::DbPool;
use crate::error::FoldefyError;
use crate::models::sorting::UndoResult;
use std::fs;
use std::path::Path;

/// Undo every completed move of a batch, newest first, then remove the
/// category folders the batch created if they are now empty.
pub fn undo_batch(pool: &DbPool, batch_id: i64) -> Result<UndoResult, FoldefyError> {
    undo_internal(pool, batch_id, None, None)
}

/// Undo only the moves whose ORIGINAL location was directly inside `folder`.
pub fn undo_folder(pool: &DbPool, batch_id: i64, folder: &str) -> Result<UndoResult, FoldefyError> {
    undo_internal(pool, batch_id, Some(folder), None)
}

/// Undo a single move by journal id.
pub fn undo_file(pool: &DbPool, journal_id: i64) -> Result<UndoResult, FoldefyError> {
    let conn = pool.get()?;
    let batch_id: i64 = conn.query_row(
        "SELECT batch_id FROM move_journal WHERE id = ?1",
        [journal_id],
        |r| r.get(0),
    )?;
    drop(conn);
    undo_internal(pool, batch_id, None, Some(journal_id))
}

fn undo_internal(
    pool: &DbPool,
    batch_id: i64,
    folder_filter: Option<&str>,
    id_filter: Option<i64>,
) -> Result<UndoResult, FoldefyError> {
    let conn = pool.get()?;
    let mut rows = journal::rows_with_status(&conn, batch_id, "done", None)?;

    // Reverse chronological order: last move is undone first
    rows.reverse();

    let mut undone = 0u32;
    let mut conflicts = Vec::new();
    let mut failed = Vec::new();

    for row in &rows {
        if row.kind != "move" {
            continue;
        }
        if let Some(id) = id_filter {
            if row.id != id {
                continue;
            }
        }
        if let Some(folder) = folder_filter {
            let src_parent = Path::new(&row.src).parent();
            if src_parent != Some(Path::new(folder)) {
                continue;
            }
        }

        let dst = Path::new(&row.dst);
        let src = Path::new(&row.src);

        // Never clobber: conflicts are reported, not resolved destructively
        if !dst.exists() {
            journal::set_status(
                &conn,
                row.id,
                "conflict",
                Some("sorted file no longer exists"),
            )?;
            conflicts.push(format!("{}: sorted file no longer exists", row.dst));
            continue;
        }
        if let (Some(expected), Ok(metadata)) = (row.size, dst.metadata()) {
            if metadata.len() as i64 != expected {
                journal::set_status(
                    &conn,
                    row.id,
                    "conflict",
                    Some("file was modified after sorting"),
                )?;
                conflicts.push(format!("{}: file was modified after sorting", row.dst));
                continue;
            }
        }
        if src.exists() {
            journal::set_status(
                &conn,
                row.id,
                "conflict",
                Some("original location is now occupied"),
            )?;
            conflicts.push(format!("{}: original location is now occupied", row.src));
            continue;
        }

        match executor::move_file(dst, src) {
            Ok(_) => {
                journal::set_status(&conn, row.id, "undone", None)?;
                undone += 1;
            }
            Err(e) => {
                failed.push(format!("{}: {}", row.dst, e));
            }
        }
    }

    // Remove now-empty folders this batch created (remove_dir refuses
    // non-empty directories, so this can never delete user content).
    let mkdirs = journal::rows_with_status(&conn, batch_id, "done", None)?;
    for row in mkdirs.iter().rev() {
        if row.kind == "mkdir" && fs::remove_dir(&row.dst).is_ok() {
            journal::set_status(&conn, row.id, "undone", None)?;
        }
    }

    // Recompute batch status
    let remaining_done: i64 = conn.query_row(
        "SELECT COUNT(*) FROM move_journal WHERE batch_id = ?1 AND kind = 'move' AND status = 'done'",
        [batch_id],
        |r| r.get(0),
    )?;
    let any_undone: i64 = conn.query_row(
        "SELECT COUNT(*) FROM move_journal WHERE batch_id = ?1 AND kind = 'move' AND status = 'undone'",
        [batch_id],
        |r| r.get(0),
    )?;
    if remaining_done == 0 && any_undone > 0 {
        journal::set_batch_status(&conn, batch_id, "undone")?;
    } else if any_undone > 0 {
        journal::set_batch_status(&conn, batch_id, "partially_undone")?;
    }

    Ok(UndoResult {
        undone,
        conflicts,
        failed,
    })
}
