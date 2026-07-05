use std::collections::HashMap;
use std::fs;
use std::path::Path;

/// Minimal folder-tree shape shared by template application and AI
/// structure recommendations.
#[derive(Debug, Clone)]
pub struct TreeNode {
    pub name: String,
    pub children: Vec<TreeNode>,
}

#[derive(Debug, Clone, Default)]
pub struct TreeResult {
    pub created: Vec<String>,
    pub skipped: Vec<String>,
    pub errors: Vec<String>,
}

/// Create a folder tree under `root`, substituting `{{var}}` placeholders.
/// With `dry_run` nothing touches the disk — the result reports what WOULD
/// be created. Existing folders are reported as skipped, never touched.
pub fn create_tree(
    root: &Path,
    nodes: &[TreeNode],
    vars: &HashMap<String, String>,
    dry_run: bool,
) -> TreeResult {
    let mut result = TreeResult::default();
    create_recursive(root, nodes, vars, dry_run, &mut result);
    result
}

fn create_recursive(
    parent: &Path,
    nodes: &[TreeNode],
    vars: &HashMap<String, String>,
    dry_run: bool,
    out: &mut TreeResult,
) {
    for node in nodes {
        let mut name = node.name.clone();
        for (key, value) in vars {
            name = name.replace(&format!("{{{{{}}}}}", key), value);
        }

        let path = parent.join(&name);
        let path_str = path.to_string_lossy().to_string();

        if path.exists() {
            out.skipped.push(path_str);
        } else if dry_run {
            out.created.push(path_str);
        } else {
            match fs::create_dir_all(&path) {
                Ok(()) => out.created.push(path_str),
                Err(e) => {
                    out.errors.push(format!("{}: {}", path.display(), e));
                    continue; // children would fail too
                }
            }
        }

        create_recursive(&path, &node.children, vars, dry_run, out);
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn node(name: &str, children: Vec<TreeNode>) -> TreeNode {
        TreeNode {
            name: name.to_string(),
            children,
        }
    }

    #[test]
    fn dry_run_reports_without_creating() {
        let dir = tempfile::tempdir().unwrap();
        let nodes = vec![node("Projects", vec![node("{{client}}", vec![])])];
        let mut vars = HashMap::new();
        vars.insert("client".to_string(), "Acme".to_string());

        let result = create_tree(dir.path(), &nodes, &vars, true);
        assert_eq!(result.created.len(), 2);
        assert!(result.created[1].ends_with("Acme"));
        assert!(!dir.path().join("Projects").exists());
    }

    #[test]
    fn creates_tree_and_skips_existing() {
        let dir = tempfile::tempdir().unwrap();
        fs::create_dir(dir.path().join("Projects")).unwrap();
        let nodes = vec![
            node("Projects", vec![node("Active", vec![])]),
            node("Archive", vec![]),
        ];

        let result = create_tree(dir.path(), &nodes, &HashMap::new(), false);
        assert_eq!(result.skipped.len(), 1); // Projects existed
        assert_eq!(result.created.len(), 2); // Active + Archive
        assert!(dir.path().join("Projects").join("Active").is_dir());
        assert!(dir.path().join("Archive").is_dir());
    }
}
