use crate::error::FoldefyError;
use crate::models::hardware::ModelTier;
use futures_util::StreamExt;
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use std::collections::HashSet;
use std::io::Write;
use std::path::{Path, PathBuf};
use std::sync::{Mutex, OnceLock};
use tauri::{AppHandle, Emitter, Manager};

/// One entry of the curated model registry (embedded `models.json`).
/// Users can never point the app at arbitrary repos.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ModelSpec {
    pub id: String,
    pub purpose: String,
    pub tier: ModelTier,
    pub display_name: String,
    pub repo: String,
    pub filename: String,
    pub url: String,
    pub size_bytes: u64,
    pub sha256: Option<String>,
    pub min_ram_mb: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ModelInfo {
    #[serde(flatten)]
    pub spec: ModelSpec,
    /// "ready" | "partial" | "not_downloaded"
    pub status: String,
    pub downloaded_bytes: u64,
    pub local_path: Option<String>,
}

/// Payload of the `model-download-progress` event.
#[derive(Debug, Clone, Serialize)]
pub struct DownloadProgress {
    pub id: String,
    pub downloaded: u64,
    pub total: u64,
    /// "downloading" | "verifying" | "ready" | "cancelled" | "error"
    pub state: String,
}

fn registry() -> &'static Vec<ModelSpec> {
    static REGISTRY: OnceLock<Vec<ModelSpec>> = OnceLock::new();
    REGISTRY.get_or_init(|| {
        serde_json::from_str(include_str!("models.json")).expect("models.json must be valid")
    })
}

fn cancels() -> &'static Mutex<HashSet<String>> {
    static CANCELS: OnceLock<Mutex<HashSet<String>>> = OnceLock::new();
    CANCELS.get_or_init(|| Mutex::new(HashSet::new()))
}

pub fn find_spec(id: &str) -> Result<&'static ModelSpec, FoldefyError> {
    registry()
        .iter()
        .find(|m| m.id == id)
        .ok_or_else(|| FoldefyError::NotFound(format!("model {}", id)))
}

pub fn models_dir(app: &AppHandle) -> Result<PathBuf, FoldefyError> {
    let dir = app
        .path()
        .app_data_dir()
        .map_err(|e| FoldefyError::Other(format!("app data dir: {}", e)))?
        .join("models");
    std::fs::create_dir_all(&dir)?;
    Ok(dir)
}

fn final_path(dir: &Path, spec: &ModelSpec) -> PathBuf {
    dir.join(&spec.id).join(&spec.filename)
}

fn part_path(dir: &Path, spec: &ModelSpec) -> PathBuf {
    dir.join(&spec.id).join(format!("{}.part", spec.filename))
}

pub fn list_models(app: &AppHandle) -> Result<Vec<ModelInfo>, FoldefyError> {
    let dir = models_dir(app)?;
    Ok(registry()
        .iter()
        .map(|spec| {
            let final_file = final_path(&dir, spec);
            let part_file = part_path(&dir, spec);
            let (status, downloaded, local_path) = if final_file.exists() {
                let size = final_file.metadata().map(|m| m.len()).unwrap_or(0);
                (
                    "ready",
                    size,
                    Some(final_file.to_string_lossy().to_string()),
                )
            } else if part_file.exists() {
                let size = part_file.metadata().map(|m| m.len()).unwrap_or(0);
                ("partial", size, None)
            } else {
                ("not_downloaded", 0, None)
            };
            ModelInfo {
                spec: spec.clone(),
                status: status.to_string(),
                downloaded_bytes: downloaded,
                local_path,
            }
        })
        .collect())
}

/// Path of a downloaded, ready-to-load model file (None when not ready).
pub fn ready_model_path(app: &AppHandle, id: &str) -> Option<PathBuf> {
    let spec = find_spec(id).ok()?;
    let dir = models_dir(app).ok()?;
    let path = final_path(&dir, spec);
    path.exists().then_some(path)
}

pub fn request_cancel(id: &str) {
    cancels().lock().unwrap().insert(id.to_string());
}

fn is_cancelled(id: &str) -> bool {
    cancels().lock().unwrap().contains(id)
}

fn emit_progress(app: &AppHandle, id: &str, downloaded: u64, total: u64, state: &str) {
    let _ = app.emit(
        "model-download-progress",
        DownloadProgress {
            id: id.to_string(),
            downloaded,
            total,
            state: state.to_string(),
        },
    );
}

/// Download a model with HTTP Range resume, progress events, optional
/// SHA-256 verification and atomic rename into place.
pub async fn download(app: &AppHandle, id: &str) -> Result<(), FoldefyError> {
    let spec = find_spec(id)?;
    let dir = models_dir(app)?;
    std::fs::create_dir_all(dir.join(&spec.id))?;
    let part_file = part_path(&dir, spec);
    let final_file = final_path(&dir, spec);

    if final_file.exists() {
        emit_progress(app, id, spec.size_bytes, spec.size_bytes, "ready");
        return Ok(());
    }
    cancels().lock().unwrap().remove(id);

    // Disk preflight: model size + 10% headroom
    if let Ok(available) = free_disk_space(&dir) {
        if available < spec.size_bytes + spec.size_bytes / 10 {
            return Err(FoldefyError::Other(
                "not enough free disk space for this model".to_string(),
            ));
        }
    }

    let mut start: u64 = part_file.metadata().map(|m| m.len()).unwrap_or(0);

    let client = reqwest::Client::new();
    let mut request = client.get(&spec.url);
    if start > 0 {
        request = request.header("Range", format!("bytes={}-", start));
    }
    let response = request
        .send()
        .await
        .map_err(|e| FoldefyError::Other(format!("download request failed: {}", e)))?;

    let status = response.status();
    if !status.is_success() {
        return Err(FoldefyError::Other(format!(
            "download failed with HTTP {}",
            status
        )));
    }

    // Server ignored the Range header — start over
    let mut file = if start > 0 && status != reqwest::StatusCode::PARTIAL_CONTENT {
        start = 0;
        std::fs::File::create(&part_file)?
    } else if start > 0 {
        std::fs::OpenOptions::new().append(true).open(&part_file)?
    } else {
        std::fs::File::create(&part_file)?
    };

    let total = start + response.content_length().unwrap_or(spec.size_bytes);
    let mut downloaded = start;
    let mut last_emit = 0u64;
    let mut stream = response.bytes_stream();

    while let Some(chunk) = stream.next().await {
        if is_cancelled(id) {
            emit_progress(app, id, downloaded, total, "cancelled");
            return Err(FoldefyError::Other("download cancelled".to_string()));
        }
        let chunk = chunk.map_err(|e| FoldefyError::Other(format!("download error: {}", e)))?;
        file.write_all(&chunk)?;
        downloaded += chunk.len() as u64;
        if downloaded - last_emit > 2 * 1024 * 1024 {
            last_emit = downloaded;
            emit_progress(app, id, downloaded, total, "downloading");
        }
    }
    file.flush()?;
    drop(file);

    // Integrity check when the registry pins a hash
    if let Some(expected) = &spec.sha256 {
        emit_progress(app, id, downloaded, total, "verifying");
        let actual = sha256_of(&part_file)?;
        if !actual.eq_ignore_ascii_case(expected) {
            std::fs::remove_file(&part_file)?;
            emit_progress(app, id, 0, total, "error");
            return Err(FoldefyError::Other(
                "downloaded file failed integrity verification and was removed".to_string(),
            ));
        }
    }

    std::fs::rename(&part_file, &final_file)?;
    emit_progress(app, id, downloaded, total, "ready");
    Ok(())
}

pub fn delete(app: &AppHandle, id: &str) -> Result<(), FoldefyError> {
    let spec = find_spec(id)?;
    let dir = models_dir(app)?;
    let final_file = final_path(&dir, spec);
    let part_file = part_path(&dir, spec);
    if final_file.exists() {
        std::fs::remove_file(final_file)?;
    }
    if part_file.exists() {
        std::fs::remove_file(part_file)?;
    }
    Ok(())
}

fn sha256_of(path: &Path) -> Result<String, FoldefyError> {
    let mut file = std::fs::File::open(path)?;
    let mut hasher = Sha256::new();
    std::io::copy(&mut file, &mut hasher)?;
    Ok(format!("{:x}", hasher.finalize()))
}

#[cfg(windows)]
fn free_disk_space(dir: &Path) -> Result<u64, FoldefyError> {
    use windows::core::HSTRING;
    use windows::Win32::Storage::FileSystem::GetDiskFreeSpaceExW;

    let mut free: u64 = 0;
    unsafe {
        GetDiskFreeSpaceExW(
            &HSTRING::from(dir.to_string_lossy().as_ref()),
            Some(&mut free),
            None,
            None,
        )
        .map_err(|e| FoldefyError::Other(format!("disk space check: {}", e)))?;
    }
    Ok(free)
}

#[cfg(not(windows))]
fn free_disk_space(_dir: &Path) -> Result<u64, FoldefyError> {
    Ok(u64::MAX)
}
