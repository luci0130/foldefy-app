use std::fs;
use std::path::Path;

/// Detect the project type/framework of a directory by checking root-level files.
pub fn detect_project_type(path: &Path) -> Option<String> {
    let entries: Vec<String> = match fs::read_dir(path) {
        Ok(rd) => rd
            .flatten()
            .filter_map(|e| e.file_name().to_str().map(|s| s.to_string()))
            .collect(),
        Err(_) => return None,
    };

    let has = |name: &str| entries.iter().any(|e| e.eq_ignore_ascii_case(name));
    let has_prefix = |prefix: &str| {
        entries
            .iter()
            .any(|e| e.to_lowercase().starts_with(&prefix.to_lowercase()))
    };
    let has_ext = |ext: &str| {
        entries.iter().any(|e| {
            e.to_lowercase()
                .ends_with(&format!(".{}", ext.to_lowercase()))
        })
    };

    // Check for subdirectory existence (for CMS detection)
    let has_dir = |dir_name: &str| path.join(dir_name).is_dir();

    // Tier 1: unique config files (order matters — more specific first)

    // CMS platforms (check before generic PHP/Node.js)
    if has("wp-config.php") || (has_dir("wp-content") && has_dir("wp-includes")) {
        return Some("WordPress".to_string());
    }
    if (has("bin") && path.join("bin").join("magento").exists())
        || (has_dir("app") && path.join("app").join("etc").join("env.php").exists())
    {
        return Some("Magento".to_string());
    }

    if has("pubspec.yaml") {
        return Some("Flutter".to_string());
    }
    if has("Cargo.toml") {
        if has("tauri.conf.json") {
            return Some("Tauri".to_string());
        }
        return Some("Rust".to_string());
    }
    if has("go.mod") {
        return Some("Go".to_string());
    }
    if has("composer.json") {
        if has("artisan") {
            return Some("Laravel".to_string());
        }
        return Some("PHP".to_string());
    }
    if has("package.json") {
        if has_prefix("next.config") {
            return Some("Next.js".to_string());
        }
        if has_prefix("nuxt.config") {
            return Some("Nuxt".to_string());
        }
        if has("angular.json") {
            return Some("Angular".to_string());
        }
        if has_prefix("vite.config") {
            // Try to distinguish React vs Vue by reading package.json
            let pkg_path = path.join("package.json");
            if let Ok(contents) = fs::read_to_string(&pkg_path) {
                let lower = contents.to_lowercase();
                if lower.contains("\"vue\"") || lower.contains("'vue'") {
                    return Some("Vue".to_string());
                }
                if lower.contains("\"react\"") || lower.contains("'react'") {
                    return Some("React".to_string());
                }
            }
            return Some("Vite".to_string());
        }
        return Some("Node.js".to_string());
    }
    if has("pom.xml") || has("build.gradle") || has("build.gradle.kts") {
        return Some("Java".to_string());
    }
    if has_ext("csproj") || has_ext("sln") {
        return Some(".NET".to_string());
    }
    if has("Gemfile") {
        return Some("Ruby".to_string());
    }
    if has("requirements.txt") || has("pyproject.toml") || has("setup.py") {
        return Some("Python".to_string());
    }
    if has("CMakeLists.txt") || has("Makefile") {
        return Some("C/C++".to_string());
    }
    if has("mix.exs") {
        return Some("Elixir".to_string());
    }
    if has("Podfile") {
        return Some("iOS".to_string());
    }
    if has("build.zig") {
        return Some("Zig".to_string());
    }

    None
}

#[cfg(test)]
mod tests {
    use super::*;

    fn touch(dir: &Path, name: &str) {
        fs::write(dir.join(name), "").unwrap();
    }

    #[test]
    fn detects_tauri_over_plain_rust() {
        let dir = tempfile::tempdir().unwrap();
        touch(dir.path(), "Cargo.toml");
        assert_eq!(detect_project_type(dir.path()), Some("Rust".to_string()));

        touch(dir.path(), "tauri.conf.json");
        assert_eq!(detect_project_type(dir.path()), Some("Tauri".to_string()));
    }

    #[test]
    fn detects_nextjs_over_plain_node() {
        let dir = tempfile::tempdir().unwrap();
        touch(dir.path(), "package.json");
        assert_eq!(detect_project_type(dir.path()), Some("Node.js".to_string()));

        touch(dir.path(), "next.config.mjs");
        assert_eq!(detect_project_type(dir.path()), Some("Next.js".to_string()));
    }

    #[test]
    fn plain_folder_is_not_a_project() {
        let dir = tempfile::tempdir().unwrap();
        touch(dir.path(), "vacation.jpg");
        assert_eq!(detect_project_type(dir.path()), None);
    }
}
