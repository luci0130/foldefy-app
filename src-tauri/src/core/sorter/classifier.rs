use std::path::Path;

/// Result of rule-based classification for one file.
#[derive(Debug, Clone)]
pub struct Classification {
    /// Destination category as a relative folder name; `None` = needs review.
    pub category: Option<String>,
    pub confidence: f32,
    pub reason: String,
}

/// Phase-1 rule engine: filename patterns first, then extension mapping.
/// AI classification (Phase 3) will only handle what this leaves unresolved.
pub fn classify_file(path: &Path) -> Classification {
    let name_lower = path
        .file_name()
        .map(|n| n.to_string_lossy().to_lowercase())
        .unwrap_or_default();
    let ext = path
        .extension()
        .map(|e| e.to_string_lossy().to_lowercase())
        .unwrap_or_default();

    // Filename patterns beat plain extension mapping
    if name_lower.starts_with("screenshot")
        || name_lower.starts_with("screen shot")
        || name_lower.starts_with("captura")
        || name_lower.starts_with("capture")
    {
        return hit("Screenshots", 0.95, "screenshot filename pattern");
    }
    for pattern in ["invoice", "factura", "receipt", "chitanta", "bon fiscal"] {
        if name_lower.contains(pattern)
            && matches!(
                ext.as_str(),
                "pdf" | "doc" | "docx" | "jpg" | "png" | "xlsx"
            )
        {
            return hit("Invoices", 0.85, "invoice/receipt filename pattern");
        }
    }

    let (category, confidence): (&str, f32) = match ext.as_str() {
        "pdf" | "doc" | "docx" | "odt" | "rtf" | "txt" | "md" | "xls" | "xlsx" | "ods" | "csv"
        | "ppt" | "pptx" | "odp" | "epub" => ("Documents", 0.9),
        "jpg" | "jpeg" | "png" | "gif" | "webp" | "bmp" | "svg" | "heic" | "tif" | "tiff"
        | "raw" | "cr2" | "nef" | "arw" | "dng" => ("Images", 0.9),
        "mp4" | "mkv" | "avi" | "mov" | "wmv" | "flv" | "webm" | "m4v" | "mpg" | "mpeg" => {
            ("Videos", 0.9)
        }
        "mp3" | "wav" | "flac" | "m4a" | "ogg" | "aac" | "wma" | "opus" => ("Music", 0.9),
        "zip" | "rar" | "7z" | "tar" | "gz" | "bz2" | "xz" => ("Archives", 0.9),
        "exe" | "msi" | "msix" | "appx" | "dmg" | "pkg" | "iso" => ("Installers", 0.85),
        "py" | "js" | "ts" | "rs" | "go" | "java" | "c" | "cpp" | "h" | "cs" | "php" | "rb"
        | "sh" | "ps1" | "bat" | "sql" => ("Code", 0.7),
        "ttf" | "otf" | "woff" | "woff2" => ("Fonts", 0.85),
        _ => {
            return Classification {
                category: None,
                confidence: 0.0,
                reason: if ext.is_empty() {
                    "no file extension".to_string()
                } else {
                    format!("unknown extension .{}", ext)
                },
            }
        }
    };

    Classification {
        category: Some(category.to_string()),
        confidence,
        reason: format!(".{} file", ext),
    }
}

fn hit(category: &str, confidence: f32, reason: &str) -> Classification {
    Classification {
        category: Some(category.to_string()),
        confidence,
        reason: reason.to_string(),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn classifies_by_extension() {
        assert_eq!(
            classify_file(Path::new("report.pdf")).category.as_deref(),
            Some("Documents")
        );
        assert_eq!(
            classify_file(Path::new("photo.JPG")).category.as_deref(),
            Some("Images")
        );
        assert_eq!(
            classify_file(Path::new("setup.exe")).category.as_deref(),
            Some("Installers")
        );
    }

    #[test]
    fn filename_patterns_win_over_extension() {
        assert_eq!(
            classify_file(Path::new("Screenshot 2026-07-05.png"))
                .category
                .as_deref(),
            Some("Screenshots")
        );
        assert_eq!(
            classify_file(Path::new("factura-electrica-2026.pdf"))
                .category
                .as_deref(),
            Some("Invoices")
        );
    }

    #[test]
    fn unknown_extensions_need_review() {
        let c = classify_file(Path::new("data.xyz123"));
        assert!(c.category.is_none());
        assert_eq!(c.confidence, 0.0);
    }
}
