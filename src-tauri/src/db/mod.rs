use crate::error::FoldefyError;
use r2d2_sqlite::SqliteConnectionManager;
use std::path::Path;

pub type DbPool = r2d2::Pool<SqliteConnectionManager>;

/// Numbered migrations; each entry runs once and is recorded in `schema_migrations`.
const MIGRATIONS: &[(i64, &str)] = &[(1, include_str!("migrations/001_init.sql"))];

/// Open (or create) `foldefy.db` in the app data directory and bring the
/// schema up to date. The returned pool is registered as Tauri managed state.
pub fn init(app_data_dir: &Path) -> Result<DbPool, FoldefyError> {
    std::fs::create_dir_all(app_data_dir)?;

    let manager =
        SqliteConnectionManager::file(app_data_dir.join("foldefy.db")).with_init(|conn| {
            // synchronous=FULL: move-journal writes must hit disk before the
            // filesystem move happens (crash-safety invariant of the sorter)
            conn.execute_batch(
                "PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON; PRAGMA synchronous=FULL;",
            )?;
            Ok(())
        });

    let pool = r2d2::Pool::builder().max_size(4).build(manager)?;
    migrate(&pool)?;
    Ok(pool)
}

fn migrate(pool: &DbPool) -> Result<(), FoldefyError> {
    let conn = pool.get()?;
    conn.execute_batch(
        "CREATE TABLE IF NOT EXISTS schema_migrations (
            version INTEGER PRIMARY KEY,
            applied_at TEXT NOT NULL
        )",
    )?;

    for (version, sql) in MIGRATIONS {
        let applied: bool = conn.query_row(
            "SELECT EXISTS(SELECT 1 FROM schema_migrations WHERE version = ?1)",
            [version],
            |row| row.get(0),
        )?;
        if !applied {
            conn.execute_batch(sql)?;
            conn.execute(
                "INSERT INTO schema_migrations (version, applied_at) VALUES (?1, datetime('now'))",
                [version],
            )?;
        }
    }

    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn init_creates_schema_and_is_idempotent() {
        let dir = tempfile::tempdir().unwrap();

        let pool = init(dir.path()).unwrap();
        let conn = pool.get().unwrap();
        let applied: i64 = conn
            .query_row("SELECT COUNT(*) FROM schema_migrations", [], |r| r.get(0))
            .unwrap();
        assert_eq!(applied, MIGRATIONS.len() as i64);
        drop(conn);
        drop(pool);

        // Re-init on the same directory must not re-run migrations or fail.
        let pool = init(dir.path()).unwrap();
        let conn = pool.get().unwrap();
        conn.execute(
            "INSERT INTO files (path, name, is_dir) VALUES ('C:/tmp/x', 'x', 1)",
            [],
        )
        .unwrap();
        conn.execute("INSERT INTO sort_batches (mode) VALUES ('auto')", [])
            .unwrap();
        conn.execute(
            "INSERT INTO move_journal (batch_id, src, dst) VALUES (last_insert_rowid(), 'a', 'b')",
            [],
        )
        .unwrap();
    }
}
