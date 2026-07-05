pub mod hotspots;
pub mod project_detect;
pub mod skip_rules;

use crate::db::DbPool;
use crate::error::FoldefyError;
use crate::models::scanning::{FolderIndex, FolderIndexNode, ScanProgress};
use rusqlite::params;
use std::collections::HashSet;
use std::fs;
use std::path::Path;
use std::sync::atomic::{AtomicBool, AtomicU32, Ordering};
use tauri::{AppHandle, Emitter};

const CANCELLED_MSG: &str = "Scan cancelled";

/// Global flag to signal scan cancellation.
static SCAN_CANCELLED: AtomicBool = AtomicBool::new(false);

pub fn request_cancel() {
    SCAN_CANCELLED.store(true, Ordering::Relaxed);
}

pub fn reset_cancel() {
    SCAN_CANCELLED.store(false, Ordering::Relaxed);
}

fn is_cancelled() -> bool {
    SCAN_CANCELLED.load(Ordering::Relaxed)
}

/// Shared, read-only state threaded through the scan recursion.
struct ScanContext<'a> {
    max_depth: u32,
    counter: &'a AtomicU32,
    app_handle: &'a AppHandle,
    drive_name: &'a str,
    installed_paths: &'a HashSet<String>,
    is_wsl_path: bool,
    /// Number of immediate subdirectories of the scan root; basis for a
    /// real, monotonic progress percentage.
    top_total: u32,
    top_done: &'a AtomicU32,
}

impl ScanContext<'_> {
    fn percentage(&self) -> f32 {
        if self.top_total == 0 {
            return -1.0;
        }
        (self.top_done.load(Ordering::Relaxed) as f32 / self.top_total as f32 * 100.0).min(100.0)
    }

    fn emit_progress(&self, current_path: &str) {
        let _ = self.app_handle.emit(
            "scan-progress",
            ScanProgress {
                current_path: current_path.to_string(),
                folders_scanned: self.counter.load(Ordering::Relaxed),
                drive: self.drive_name.to_string(),
                percentage: self.percentage(),
            },
        );
    }
}

/// Scan one root directory into a `FolderIndex`, emitting `scan-progress`
/// events along the way.
pub fn scan_root(
    path: &Path,
    max_depth: u32,
    app_handle: &AppHandle,
    drive_name: &str,
    installed_paths: &HashSet<String>,
    is_wsl_path: bool,
) -> Result<FolderIndex, String> {
    let counter = AtomicU32::new(0);
    let top_done = AtomicU32::new(0);
    let top_total = fs::read_dir(path)
        .map(|rd| {
            rd.flatten()
                .filter(|e| e.file_type().map(|t| t.is_dir()).unwrap_or(false))
                .count() as u32
        })
        .unwrap_or(0);

    let ctx = ScanContext {
        max_depth,
        counter: &counter,
        app_handle,
        drive_name,
        installed_paths,
        is_wsl_path,
        top_total,
        top_done: &top_done,
    };

    let tree = scan_recursive(path, 0, &ctx)?;

    Ok(FolderIndex {
        root_path: path.to_string_lossy().to_string(),
        scanned_at: chrono::Utc::now().to_rfc3339(),
        total_folders: counter.load(Ordering::Relaxed),
        tree,
    })
}

fn scan_recursive(
    path: &Path,
    current_depth: u32,
    ctx: &ScanContext,
) -> Result<FolderIndexNode, String> {
    if is_cancelled() {
        return Err(CANCELLED_MSG.to_string());
    }

    let name = path
        .file_name()
        .map(|n| n.to_string_lossy().to_string())
        .unwrap_or_else(|| path.to_string_lossy().to_string());

    let path_str = path.to_string_lossy().to_string();
    let count = ctx.counter.fetch_add(1, Ordering::Relaxed);

    // Emit progress every 50 folders
    if count.is_multiple_of(50) {
        ctx.emit_progress(&path_str);
    }

    let is_skipped = skip_rules::is_skipped_folder(path, ctx.installed_paths);

    // Detect project type for non-skipped folders
    let project_type = if !is_skipped {
        project_detect::detect_project_type(path)
    } else {
        None
    };

    // Code source project: normal folder with project_type tag, shallow children (1 level)
    if project_type.is_some() {
        let children = collect_shallow_children(path, current_depth, ctx);
        return Ok(FolderIndexNode {
            name,
            path: path_str,
            is_skipped: false,
            children,
            depth: current_depth,
            project_type,
        });
    }

    if is_skipped || current_depth >= ctx.max_depth {
        return Ok(FolderIndexNode {
            name,
            path: path_str,
            is_skipped,
            children: Vec::new(),
            depth: current_depth,
            project_type: None,
        });
    }

    let mut children = Vec::new();

    if let Ok(entries) = fs::read_dir(path) {
        for entry in entries.flatten() {
            // Check cancellation inside the loop too for responsiveness
            if is_cancelled() {
                return Err(CANCELLED_MSG.to_string());
            }

            let is_dir = entry.file_type().map(|t| t.is_dir()).unwrap_or(false);
            let result = scan_child(&entry, is_dir, current_depth, ctx);

            // Every processed top-level subdirectory advances the percentage
            if current_depth == 0 && is_dir {
                ctx.top_done.fetch_add(1, Ordering::Relaxed);
                ctx.emit_progress(&entry.path().to_string_lossy());
            }

            match result {
                Some(Ok(child)) => children.push(child),
                Some(Err(e)) if e == CANCELLED_MSG => return Err(e),
                _ => {}
            }
        }
    }

    children.sort_by(|a, b| a.name.to_lowercase().cmp(&b.name.to_lowercase()));

    Ok(FolderIndexNode {
        name,
        path: path_str,
        is_skipped: false,
        children,
        depth: current_depth,
        project_type: None,
    })
}

/// Apply the per-entry filters and recurse; `None` means the entry was filtered out.
fn scan_child(
    entry: &fs::DirEntry,
    is_dir: bool,
    parent_depth: u32,
    ctx: &ScanContext,
) -> Option<Result<FolderIndexNode, String>> {
    if !is_dir {
        return None;
    }

    let entry_path = entry.path();
    let entry_name = entry.file_name().to_string_lossy().to_string();

    // Skip hidden folders: Windows hidden attribute or dot-prefix
    if skip_rules::is_hidden(&entry_path) || entry_name.starts_with('.') {
        return None;
    }

    // Skip Linux system directories when scanning WSL paths
    if ctx.is_wsl_path && skip_rules::is_linux_system_dir(&entry_name) {
        return None;
    }

    // Skip inaccessible folders (e.g. "Documents and Settings" junction)
    if fs::read_dir(&entry_path).is_err() {
        return None;
    }

    Some(scan_recursive(&entry_path, parent_depth + 1, ctx))
}

/// Collect immediate subdirectory names only (1 level, no recursion).
fn collect_shallow_children(
    path: &Path,
    current_depth: u32,
    ctx: &ScanContext,
) -> Vec<FolderIndexNode> {
    let mut children = Vec::new();
    if let Ok(entries) = fs::read_dir(path) {
        for entry in entries.flatten() {
            let entry_path = entry.path();
            if !entry_path.is_dir() {
                continue;
            }
            let entry_name = entry.file_name().to_string_lossy().to_string();
            if skip_rules::is_hidden(&entry_path) || entry_name.starts_with('.') {
                continue;
            }
            if ctx.is_wsl_path && skip_rules::is_linux_system_dir(&entry_name) {
                continue;
            }
            ctx.counter.fetch_add(1, Ordering::Relaxed);
            children.push(FolderIndexNode {
                name: entry_name,
                path: entry_path.to_string_lossy().to_string(),
                is_skipped: false,
                children: Vec::new(),
                depth: current_depth + 1,
                project_type: None,
            });
        }
    }
    children.sort_by(|a, b| a.name.to_lowercase().cmp(&b.name.to_lowercase()));
    children
}

/// Persist a scan result into SQLite (`scan_runs` + folder rows in `files`).
pub fn persist_index(pool: &DbPool, index: &FolderIndex) -> Result<(), FoldefyError> {
    let mut conn = pool.get()?;
    let tx = conn.transaction()?;

    let stats = serde_json::json!({ "total_folders": index.total_folders });
    tx.execute(
        "INSERT INTO scan_runs (root, started_at, finished_at, stats_json)
         VALUES (?1, ?2, ?2, ?3)",
        params![index.root_path, index.scanned_at, stats.to_string()],
    )?;

    insert_node(&tx, &index.tree, None, &index.root_path)?;
    tx.commit()?;
    Ok(())
}

fn insert_node(
    tx: &rusqlite::Transaction,
    node: &FolderIndexNode,
    parent_id: Option<i64>,
    drive: &str,
) -> Result<(), FoldefyError> {
    let kind = node
        .project_type
        .clone()
        .unwrap_or_else(|| if node.is_skipped { "skipped" } else { "folder" }.to_string());

    tx.execute(
        "INSERT INTO files (path, parent_id, name, kind, drive, is_dir)
         VALUES (?1, ?2, ?3, ?4, ?5, 1)
         ON CONFLICT(path) DO UPDATE SET
            parent_id = excluded.parent_id,
            name = excluded.name,
            kind = excluded.kind,
            drive = excluded.drive",
        params![node.path, parent_id, node.name, kind, drive],
    )?;

    let id: i64 = tx.query_row(
        "SELECT id FROM files WHERE path = ?1",
        params![node.path],
        |row| row.get(0),
    )?;

    for child in &node.children {
        insert_node(tx, child, Some(id), drive)?;
    }

    Ok(())
}

/// Decode UTF-16LE output from Windows CLI commands (e.g. `wsl --list`).
#[cfg(windows)]
fn decode_utf16le_output(bytes: &[u8]) -> String {
    // Strip BOM if present, then decode pairs of bytes as UTF-16LE
    let skip = if bytes.len() >= 2 && bytes[0] == 0xFF && bytes[1] == 0xFE {
        2
    } else {
        0
    };
    let u16s: Vec<u16> = bytes[skip..]
        .chunks_exact(2)
        .map(|pair| u16::from_le_bytes([pair[0], pair[1]]))
        .collect();
    String::from_utf16_lossy(&u16s)
}

/// Discover WSL distros and scan their home directories.
#[cfg(windows)]
pub fn scan_wsl_homes(
    max_depth: u32,
    app_handle: &AppHandle,
    installed_paths: &HashSet<String>,
) -> Vec<FolderIndex> {
    let mut results = Vec::new();

    let output = match std::process::Command::new("wsl")
        .args(["--list", "--quiet"])
        .output()
    {
        Ok(o) if o.status.success() => o,
        _ => return results,
    };

    // wsl --list --quiet outputs UTF-16LE on Windows — decode properly
    let stdout = decode_utf16le_output(&output.stdout);
    let distros: Vec<String> = stdout
        .lines()
        .map(|l| l.trim().trim_matches('\0').to_string())
        .filter(|l| !l.is_empty())
        .collect();

    for distro in &distros {
        // Use forward-slash UNC — Rust on Windows handles //server/share correctly,
        // whereas backslash UNC (\\server\share) gets mangled by Path.
        let home_path = format!("//wsl.localhost/{}/home", distro);
        let home = Path::new(&home_path);

        // Use read_dir directly instead of exists() — more reliable for UNC paths
        let user_dirs: Vec<_> = match fs::read_dir(home) {
            Ok(rd) => rd.flatten().filter(|e| e.path().is_dir()).collect(),
            Err(_) => continue,
        };

        for user_dir in user_dirs {
            let user_path = user_dir.path();
            let drive_label = format!("WSL:{}/{}", distro, user_dir.file_name().to_string_lossy());

            match scan_root(
                &user_path,
                max_depth,
                app_handle,
                &drive_label,
                installed_paths,
                true,
            ) {
                Ok(index) => results.push(index),
                Err(e) => {
                    eprintln!("Failed to scan WSL home {}: {}", user_path.display(), e);
                }
            }
        }
    }

    results
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::models::scanning::FolderIndexNode;

    fn node(path: &str, name: &str, children: Vec<FolderIndexNode>) -> FolderIndexNode {
        FolderIndexNode {
            name: name.to_string(),
            path: path.to_string(),
            is_skipped: false,
            children,
            depth: 0,
            project_type: None,
        }
    }

    #[test]
    fn persist_index_writes_scan_run_and_folder_rows() {
        let dir = tempfile::tempdir().unwrap();
        let pool = crate::db::init(dir.path()).unwrap();

        let index = FolderIndex {
            root_path: "C:/Users/test".to_string(),
            scanned_at: "2026-07-05T00:00:00Z".to_string(),
            total_folders: 3,
            tree: node(
                "C:/Users/test",
                "test",
                vec![
                    node("C:/Users/test/Documents", "Documents", vec![]),
                    node("C:/Users/test/Pictures", "Pictures", vec![]),
                ],
            ),
        };

        persist_index(&pool, &index).unwrap();
        // Re-persisting must upsert, not fail on the UNIQUE path constraint
        persist_index(&pool, &index).unwrap();

        let conn = pool.get().unwrap();
        let files: i64 = conn
            .query_row("SELECT COUNT(*) FROM files", [], |r| r.get(0))
            .unwrap();
        let runs: i64 = conn
            .query_row("SELECT COUNT(*) FROM scan_runs", [], |r| r.get(0))
            .unwrap();
        let children: i64 = conn
            .query_row(
                "SELECT COUNT(*) FROM files WHERE parent_id IS NOT NULL",
                [],
                |r| r.get(0),
            )
            .unwrap();

        assert_eq!(files, 3);
        assert_eq!(runs, 2);
        assert_eq!(children, 2);
    }
}
