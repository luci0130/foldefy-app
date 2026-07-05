use crate::models::scanning::{FolderIndex, FolderIndexNode};
use crate::models::user::UserProfile;

pub const RECOMMENDATION_SYSTEM: &str = "You are Foldefy, an AI assistant that recommends folder structures. Respond ONLY with valid JSON matching the schema provided. Do not wrap in markdown code blocks.";

fn serialize_tree_compact(node: &FolderIndexNode, indent: usize) -> String {
    let mut result = String::new();
    let prefix = "  ".repeat(indent);

    if node.is_skipped {
        result.push_str(&format!("{}{} [skipped]\n", prefix, node.name));
    } else {
        result.push_str(&format!("{}{}/\n", prefix, node.name));
        for child in &node.children {
            // Limit depth in output to avoid huge prompts
            if indent < 4 {
                result.push_str(&serialize_tree_compact(child, indent + 1));
            }
        }
    }

    result
}

pub fn build_recommendation_prompt(
    profile: &UserProfile,
    folder_indices: &[FolderIndex],
) -> String {
    let mut folder_tree_str = String::new();
    for index in folder_indices {
        folder_tree_str.push_str(&format!("Drive: {}\n", index.root_path));
        folder_tree_str.push_str(&serialize_tree_compact(&index.tree, 1));
        folder_tree_str.push('\n');
    }

    // Truncate at a line boundary if too long
    if folder_tree_str.len() > 8000 {
        let mut limit = 8000;
        while !folder_tree_str.is_char_boundary(limit) {
            limit -= 1;
        }
        let cut = folder_tree_str[..limit].rfind('\n').unwrap_or(0);
        folder_tree_str.truncate(cut);
        folder_tree_str.push_str("\n... (truncated)\n");
    }

    let storage_info = profile
        .storage_habits
        .as_ref()
        .map(|h| {
            format!(
                "Multiple drives: {}, Cloud storage: {:?}, External storage: {}",
                h.uses_multiple_drives, h.uses_cloud_storage, h.uses_external_storage
            )
        })
        .unwrap_or_else(|| "Not specified".to_string());

    format!(
        r#"Based on this user profile and their current folder structure, generate an optimal folder organization recommendation.

## User Profile
- Language: {}
- Usage: {}
- Activities/Profession: {:?}
- Project Types: {:?}
- Current Organization Style: {:?}
- Primary File Types: {:?}
- Storage Setup: {}
- Custom Notes: {}

## Current Folder Structure (simplified, folders only)
{}

## Instructions
1. Analyze the current structure and identify improvement opportunities
2. Create a recommended folder hierarchy that:
   - Matches the user's profession and workflow
   - Follows their preferred organization style when possible
   - Groups related content logically
   - Uses clear, descriptive folder names in {} language
   - Is practical and not overly nested (max 4 levels deep)
3. Respond with ONLY this exact JSON (no markdown, no code blocks):
{{
  "recommended_structure": [
    {{
      "name": "FolderName",
      "description": "Brief purpose of this folder",
      "children": []
    }}
  ],
  "explanation": "Brief explanation of why this structure works for the user",
  "tips": ["Tip 1 for maintaining organization", "Tip 2"]
}}"#,
        profile.language,
        profile.usage_type,
        profile.activities,
        profile.project_types,
        profile.organization_style,
        profile.primary_file_types,
        storage_info,
        profile.custom_notes.as_deref().unwrap_or("None"),
        folder_tree_str,
        profile.language,
    )
}
