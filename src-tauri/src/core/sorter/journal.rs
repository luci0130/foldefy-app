use crate::db::DbPool;
use crate::error::FoldefyError;
use crate::models::sorting::{BatchDetail, JournalEntry, SortBatch};
use rusqlite::{params, Connection};
use std::path::Path;

/// A journal row loaded for execution or undo.
#[derive(Debug, Clone)]
pub struct JournalRow {
    pub id: i64,
    pub kind: String,
    pub src: String,
    pub dst: String,
    pub size: Option<i64>,
}

pub fn create_batch(conn: &Connection, mode: &str, scope_json: &str) -> Result<i64, FoldefyError> {
    conn.execute(
        "INSERT INTO sort_batches (mode, scope_json) VALUES (?1, ?2)",
        params![mode, scope_json],
    )?;
    Ok(conn.last_insert_rowid())
}

/// Record a planned move. Size/mtime are captured now so undo can detect
/// files modified after sorting.
pub fn record_planned(
    conn: &Connection,
    batch_id: i64,
    kind: &str,
    src: &str,
    dst: &str,
    size: Option<i64>,
    mtime: Option<i64>,
) -> Result<i64, FoldefyError> {
    conn.execute(
        "INSERT INTO move_journal (batch_id, kind, src, dst, size, mtime, status)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, 'planned')",
        params![batch_id, kind, src, dst, size, mtime],
    )?;
    Ok(conn.last_insert_rowid())
}

/// Flushed to disk BEFORE the filesystem move happens — this is the crash
/// safety invariant. `PRAGMA synchronous=FULL` is set on every connection.
pub fn mark_in_progress(conn: &Connection, id: i64) -> Result<(), FoldefyError> {
    conn.execute(
        "UPDATE move_journal SET status = 'in_progress' WHERE id = ?1",
        params![id],
    )?;
    Ok(())
}

pub fn set_status(
    conn: &Connection,
    id: i64,
    status: &str,
    error: Option<&str>,
) -> Result<(), FoldefyError> {
    conn.execute(
        "UPDATE move_journal
         SET status = ?2, error = ?3, executed_at = datetime('now')
         WHERE id = ?1",
        params![id, status, error],
    )?;
    Ok(())
}

/// The destination can change at execution time (late collision resolution).
pub fn update_dst(conn: &Connection, id: i64, dst: &str) -> Result<(), FoldefyError> {
    conn.execute(
        "UPDATE move_journal SET dst = ?2 WHERE id = ?1",
        params![id, dst],
    )?;
    Ok(())
}

pub fn set_batch_status(
    conn: &Connection,
    batch_id: i64,
    status: &str,
) -> Result<(), FoldefyError> {
    conn.execute(
        "UPDATE sort_batches SET status = ?2 WHERE id = ?1",
        params![batch_id, status],
    )?;
    Ok(())
}

pub fn rows_with_status(
    conn: &Connection,
    batch_id: i64,
    status: &str,
    only_ids: Option<&[i64]>,
) -> Result<Vec<JournalRow>, FoldefyError> {
    let mut stmt = conn.prepare(
        "SELECT id, kind, src, dst, size FROM move_journal
         WHERE batch_id = ?1 AND status = ?2 ORDER BY id",
    )?;
    let rows = stmt
        .query_map(params![batch_id, status], |row| {
            Ok(JournalRow {
                id: row.get(0)?,
                kind: row.get(1)?,
                src: row.get(2)?,
                dst: row.get(3)?,
                size: row.get(4)?,
            })
        })?
        .collect::<Result<Vec<_>, _>>()?;

    Ok(match only_ids {
        Some(ids) => rows.into_iter().filter(|r| ids.contains(&r.id)).collect(),
        None => rows,
    })
}

pub fn list_batches(conn: &Connection) -> Result<Vec<SortBatch>, FoldefyError> {
    let mut stmt = conn.prepare(
        "SELECT b.id, b.created_at, b.mode, b.status,
                COALESCE(SUM(CASE WHEN j.kind = 'move' THEN 1 ELSE 0 END), 0),
                COALESCE(SUM(CASE WHEN j.kind = 'move' AND j.status = 'done' THEN 1 ELSE 0 END), 0),
                COALESCE(SUM(CASE WHEN j.kind = 'move' AND j.status = 'undone' THEN 1 ELSE 0 END), 0),
                COALESCE(SUM(CASE WHEN j.kind = 'move' AND j.status = 'failed' THEN 1 ELSE 0 END), 0)
         FROM sort_batches b
         LEFT JOIN move_journal j ON j.batch_id = b.id
         GROUP BY b.id
         ORDER BY b.id DESC",
    )?;
    let batches = stmt
        .query_map([], |row| {
            Ok(SortBatch {
                id: row.get(0)?,
                created_at: row.get(1)?,
                mode: row.get(2)?,
                status: row.get(3)?,
                total: row.get(4)?,
                done: row.get(5)?,
                undone: row.get(6)?,
                failed: row.get(7)?,
            })
        })?
        .collect::<Result<Vec<_>, _>>()?;
    Ok(batches)
}

pub fn get_batch(conn: &Connection, batch_id: i64) -> Result<BatchDetail, FoldefyError> {
    let batch = list_batches(conn)?
        .into_iter()
        .find(|b| b.id == batch_id)
        .ok_or_else(|| FoldefyError::NotFound(format!("sort batch {}", batch_id)))?;

    let mut stmt = conn.prepare(
        "SELECT id, batch_id, kind, src, dst, status, error
         FROM move_journal WHERE batch_id = ?1 ORDER BY id",
    )?;
    let entries = stmt
        .query_map([batch_id], |row| {
            Ok(JournalEntry {
                id: row.get(0)?,
                batch_id: row.get(1)?,
                kind: row.get(2)?,
                src: row.get(3)?,
                dst: row.get(4)?,
                status: row.get(5)?,
                error: row.get(6)?,
            })
        })?
        .collect::<Result<Vec<_>, _>>()?;

    Ok(BatchDetail { batch, entries })
}

/// Crash recovery, run at startup: rows stuck `in_progress` mean the app
/// died mid-move. If the file is at the destination the move completed;
/// if it is still at the source it never happened.
pub fn reconcile_on_startup(pool: &DbPool) -> Result<u32, FoldefyError> {
    let conn = pool.get()?;
    let mut stmt =
        conn.prepare("SELECT id, src, dst FROM move_journal WHERE status = 'in_progress'")?;
    let stuck: Vec<(i64, String, String)> = stmt
        .query_map([], |row| Ok((row.get(0)?, row.get(1)?, row.get(2)?)))?
        .collect::<Result<Vec<_>, _>>()?;

    let count = stuck.len() as u32;
    for (id, src, dst) in stuck {
        let dst_exists = Path::new(&dst).exists();
        let src_exists = Path::new(&src).exists();
        if dst_exists && !src_exists {
            set_status(&conn, id, "done", None)?;
        } else {
            set_status(&conn, id, "failed", Some("interrupted by crash"))?;
        }
    }
    Ok(count)
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;

    #[test]
    fn reconcile_resolves_stuck_in_progress_rows() {
        let db_dir = tempfile::tempdir().unwrap();
        let work = tempfile::tempdir().unwrap();
        let pool = crate::db::init(db_dir.path()).unwrap();
        let conn = pool.get().unwrap();

        // Case 1: move completed before crash (file at dst)
        let done_dst = work.path().join("done.txt");
        fs::write(&done_dst, "x").unwrap();
        // Case 2: move never happened (file still at src)
        let failed_src = work.path().join("failed.txt");
        fs::write(&failed_src, "x").unwrap();

        let batch = create_batch(&conn, "auto", "{}").unwrap();
        let id_done = record_planned(
            &conn,
            batch,
            "move",
            work.path().join("gone.txt").to_str().unwrap(),
            done_dst.to_str().unwrap(),
            Some(1),
            None,
        )
        .unwrap();
        let id_failed = record_planned(
            &conn,
            batch,
            "move",
            failed_src.to_str().unwrap(),
            work.path().join("never.txt").to_str().unwrap(),
            Some(1),
            None,
        )
        .unwrap();
        mark_in_progress(&conn, id_done).unwrap();
        mark_in_progress(&conn, id_failed).unwrap();
        drop(conn);

        let reconciled = reconcile_on_startup(&pool).unwrap();
        assert_eq!(reconciled, 2);

        let conn = pool.get().unwrap();
        let status_done: String = conn
            .query_row(
                "SELECT status FROM move_journal WHERE id = ?1",
                [id_done],
                |r| r.get(0),
            )
            .unwrap();
        let status_failed: String = conn
            .query_row(
                "SELECT status FROM move_journal WHERE id = ?1",
                [id_failed],
                |r| r.get(0),
            )
            .unwrap();
        assert_eq!(status_done, "done");
        assert_eq!(status_failed, "failed");
    }
}
