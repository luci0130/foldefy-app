use crate::models::template::*;

fn get_builtin_templates() -> Vec<FolderTemplate> {
    vec![
        FolderTemplate {
            id: "builtin-developer".to_string(),
            name: "Software Developer".to_string(),
            description: "Organized workspace for software development projects".to_string(),
            author: "Foldefy Team".to_string(),
            version: "1.0.0".to_string(),
            category: "Development".to_string(),
            tags: vec!["development".to_string(), "code".to_string(), "projects".to_string()],
            icon: "Code2".to_string(),
            is_free: true,
            price: None,
            downloads: 12500,
            rating: 4.8,
            source: TemplateSource::BuiltIn,
            structure: vec![
                TemplateFolderNode {
                    name: "Projects".to_string(),
                    description: Some("Active development projects".to_string()),
                    children: vec![
                        TemplateFolderNode { name: "{{project_name}}".to_string(), description: Some("Main project folder".to_string()), children: vec![
                            TemplateFolderNode { name: "src".to_string(), description: None, children: vec![] },
                            TemplateFolderNode { name: "docs".to_string(), description: None, children: vec![] },
                            TemplateFolderNode { name: "tests".to_string(), description: None, children: vec![] },
                            TemplateFolderNode { name: "scripts".to_string(), description: None, children: vec![] },
                        ]},
                    ],
                },
                TemplateFolderNode { name: "Learning".to_string(), description: Some("Courses and tutorials".to_string()), children: vec![
                    TemplateFolderNode { name: "Courses".to_string(), description: None, children: vec![] },
                    TemplateFolderNode { name: "Books".to_string(), description: None, children: vec![] },
                    TemplateFolderNode { name: "Tutorials".to_string(), description: None, children: vec![] },
                ]},
                TemplateFolderNode { name: "Tools".to_string(), description: Some("Development tools and configs".to_string()), children: vec![
                    TemplateFolderNode { name: "Scripts".to_string(), description: None, children: vec![] },
                    TemplateFolderNode { name: "Configs".to_string(), description: None, children: vec![] },
                    TemplateFolderNode { name: "Snippets".to_string(), description: None, children: vec![] },
                ]},
                TemplateFolderNode { name: "Archive".to_string(), description: Some("Completed or inactive projects".to_string()), children: vec![] },
            ],
            personalization_questions: vec![
                PersonalizationQuestion {
                    id: "q1".to_string(),
                    question: "What's your main project name?".to_string(),
                    question_type: QuestionType::Text,
                    variable_name: "project_name".to_string(),
                    options: None,
                    default_value: Some("MyProject".to_string()),
                },
            ],
            created_at: "2024-01-01T00:00:00Z".to_string(),
            updated_at: "2024-01-01T00:00:00Z".to_string(),
        },
        FolderTemplate {
            id: "builtin-photographer".to_string(),
            name: "Photo Studio".to_string(),
            description: "Professional photography workflow structure".to_string(),
            author: "Foldefy Team".to_string(),
            version: "1.0.0".to_string(),
            category: "Creative".to_string(),
            tags: vec!["photography".to_string(), "creative".to_string(), "media".to_string()],
            icon: "Camera".to_string(),
            is_free: true,
            price: None,
            downloads: 8200,
            rating: 4.7,
            source: TemplateSource::BuiltIn,
            structure: vec![
                TemplateFolderNode { name: "Clients".to_string(), description: Some("Client photo shoots".to_string()), children: vec![
                    TemplateFolderNode { name: "{{client_name}}".to_string(), description: None, children: vec![
                        TemplateFolderNode { name: "RAW".to_string(), description: None, children: vec![] },
                        TemplateFolderNode { name: "Edited".to_string(), description: None, children: vec![] },
                        TemplateFolderNode { name: "Final".to_string(), description: None, children: vec![] },
                        TemplateFolderNode { name: "Contract".to_string(), description: None, children: vec![] },
                    ]},
                ]},
                TemplateFolderNode { name: "Portfolio".to_string(), description: Some("Portfolio showcase".to_string()), children: vec![
                    TemplateFolderNode { name: "Wedding".to_string(), description: None, children: vec![] },
                    TemplateFolderNode { name: "Portrait".to_string(), description: None, children: vec![] },
                    TemplateFolderNode { name: "Landscape".to_string(), description: None, children: vec![] },
                    TemplateFolderNode { name: "Commercial".to_string(), description: None, children: vec![] },
                ]},
                TemplateFolderNode { name: "Resources".to_string(), description: Some("Presets, textures, overlays".to_string()), children: vec![
                    TemplateFolderNode { name: "Presets".to_string(), description: None, children: vec![] },
                    TemplateFolderNode { name: "Textures".to_string(), description: None, children: vec![] },
                    TemplateFolderNode { name: "Actions".to_string(), description: None, children: vec![] },
                ]},
                TemplateFolderNode { name: "Archive".to_string(), description: Some("Past projects archive".to_string()), children: vec![] },
            ],
            personalization_questions: vec![
                PersonalizationQuestion {
                    id: "q1".to_string(),
                    question: "Enter a sample client name".to_string(),
                    question_type: QuestionType::Text,
                    variable_name: "client_name".to_string(),
                    options: None,
                    default_value: Some("ClientName".to_string()),
                },
            ],
            created_at: "2024-01-01T00:00:00Z".to_string(),
            updated_at: "2024-01-01T00:00:00Z".to_string(),
        },
        FolderTemplate {
            id: "builtin-accountant".to_string(),
            name: "Finance Hub".to_string(),
            description: "Organized structure for accounting and financial documents".to_string(),
            author: "Foldefy Team".to_string(),
            version: "1.0.0".to_string(),
            category: "Business".to_string(),
            tags: vec!["finance".to_string(), "accounting".to_string(), "business".to_string()],
            icon: "Calculator".to_string(),
            is_free: true,
            price: None,
            downloads: 6800,
            rating: 4.6,
            source: TemplateSource::BuiltIn,
            structure: vec![
                TemplateFolderNode { name: "Clients".to_string(), description: Some("Client financial records".to_string()), children: vec![
                    TemplateFolderNode { name: "{{company_name}}".to_string(), description: None, children: vec![
                        TemplateFolderNode { name: "Invoices".to_string(), description: None, children: vec![] },
                        TemplateFolderNode { name: "Receipts".to_string(), description: None, children: vec![] },
                        TemplateFolderNode { name: "Tax Documents".to_string(), description: None, children: vec![] },
                        TemplateFolderNode { name: "Reports".to_string(), description: None, children: vec![] },
                    ]},
                ]},
                TemplateFolderNode { name: "Tax Season".to_string(), description: Some("Annual tax filings".to_string()), children: vec![
                    TemplateFolderNode { name: "2024".to_string(), description: None, children: vec![] },
                    TemplateFolderNode { name: "2025".to_string(), description: None, children: vec![] },
                ]},
                TemplateFolderNode { name: "Templates".to_string(), description: Some("Document templates".to_string()), children: vec![
                    TemplateFolderNode { name: "Invoice Templates".to_string(), description: None, children: vec![] },
                    TemplateFolderNode { name: "Report Templates".to_string(), description: None, children: vec![] },
                ]},
                TemplateFolderNode { name: "Archive".to_string(), description: Some("Completed fiscal years".to_string()), children: vec![] },
            ],
            personalization_questions: vec![
                PersonalizationQuestion {
                    id: "q1".to_string(),
                    question: "Enter a sample company/client name".to_string(),
                    question_type: QuestionType::Text,
                    variable_name: "company_name".to_string(),
                    options: None,
                    default_value: Some("AcmeCorp".to_string()),
                },
            ],
            created_at: "2024-01-01T00:00:00Z".to_string(),
            updated_at: "2024-01-01T00:00:00Z".to_string(),
        },
        FolderTemplate {
            id: "builtin-student".to_string(),
            name: "Student Pack".to_string(),
            description: "Academic life organized by semester and subject".to_string(),
            author: "Foldefy Team".to_string(),
            version: "1.0.0".to_string(),
            category: "Education".to_string(),
            tags: vec!["student".to_string(), "education".to_string(), "academic".to_string()],
            icon: "GraduationCap".to_string(),
            is_free: true,
            price: None,
            downloads: 9400,
            rating: 4.9,
            source: TemplateSource::BuiltIn,
            structure: vec![
                TemplateFolderNode { name: "Semesters".to_string(), description: Some("Course materials by semester".to_string()), children: vec![
                    TemplateFolderNode { name: "Current Semester".to_string(), description: None, children: vec![
                        TemplateFolderNode { name: "{{subject_name}}".to_string(), description: None, children: vec![
                            TemplateFolderNode { name: "Notes".to_string(), description: None, children: vec![] },
                            TemplateFolderNode { name: "Assignments".to_string(), description: None, children: vec![] },
                            TemplateFolderNode { name: "Resources".to_string(), description: None, children: vec![] },
                        ]},
                    ]},
                ]},
                TemplateFolderNode { name: "Research".to_string(), description: Some("Research papers and projects".to_string()), children: vec![
                    TemplateFolderNode { name: "Papers".to_string(), description: None, children: vec![] },
                    TemplateFolderNode { name: "References".to_string(), description: None, children: vec![] },
                ]},
                TemplateFolderNode { name: "Portfolio".to_string(), description: Some("Best work showcase".to_string()), children: vec![] },
                TemplateFolderNode { name: "Archive".to_string(), description: Some("Past semesters".to_string()), children: vec![] },
            ],
            personalization_questions: vec![
                PersonalizationQuestion {
                    id: "q1".to_string(),
                    question: "Enter a sample subject name".to_string(),
                    question_type: QuestionType::Text,
                    variable_name: "subject_name".to_string(),
                    options: None,
                    default_value: Some("Mathematics".to_string()),
                },
            ],
            created_at: "2024-01-01T00:00:00Z".to_string(),
            updated_at: "2024-01-01T00:00:00Z".to_string(),
        },
        FolderTemplate {
            id: "builtin-designer".to_string(),
            name: "Design Studio".to_string(),
            description: "Creative design workflow with asset management".to_string(),
            author: "Foldefy Team".to_string(),
            version: "1.0.0".to_string(),
            category: "Creative".to_string(),
            tags: vec!["design".to_string(), "creative".to_string(), "ui".to_string()],
            icon: "Palette".to_string(),
            is_free: true,
            price: None,
            downloads: 7100,
            rating: 4.7,
            source: TemplateSource::BuiltIn,
            structure: vec![
                TemplateFolderNode { name: "Projects".to_string(), description: Some("Design projects".to_string()), children: vec![
                    TemplateFolderNode { name: "{{project_name}}".to_string(), description: None, children: vec![
                        TemplateFolderNode { name: "Design Files".to_string(), description: None, children: vec![] },
                        TemplateFolderNode { name: "Assets".to_string(), description: None, children: vec![] },
                        TemplateFolderNode { name: "Exports".to_string(), description: None, children: vec![] },
                        TemplateFolderNode { name: "Feedback".to_string(), description: None, children: vec![] },
                    ]},
                ]},
                TemplateFolderNode { name: "Brand Assets".to_string(), description: Some("Logos, colors, typography".to_string()), children: vec![
                    TemplateFolderNode { name: "Logos".to_string(), description: None, children: vec![] },
                    TemplateFolderNode { name: "Icons".to_string(), description: None, children: vec![] },
                    TemplateFolderNode { name: "Typography".to_string(), description: None, children: vec![] },
                    TemplateFolderNode { name: "Color Palettes".to_string(), description: None, children: vec![] },
                ]},
                TemplateFolderNode { name: "Inspiration".to_string(), description: Some("Mood boards and references".to_string()), children: vec![] },
                TemplateFolderNode { name: "Templates".to_string(), description: Some("Reusable design templates".to_string()), children: vec![] },
                TemplateFolderNode { name: "Archive".to_string(), description: Some("Completed projects".to_string()), children: vec![] },
            ],
            personalization_questions: vec![
                PersonalizationQuestion {
                    id: "q1".to_string(),
                    question: "Enter a sample project name".to_string(),
                    question_type: QuestionType::Text,
                    variable_name: "project_name".to_string(),
                    options: None,
                    default_value: Some("BrandRedesign".to_string()),
                },
            ],
            created_at: "2024-01-01T00:00:00Z".to_string(),
            updated_at: "2024-01-01T00:00:00Z".to_string(),
        },
        FolderTemplate {
            id: "builtin-freelancer".to_string(),
            name: "Freelancer Pro".to_string(),
            description: "Complete freelance business management structure".to_string(),
            author: "Foldefy Team".to_string(),
            version: "1.0.0".to_string(),
            category: "Business".to_string(),
            tags: vec!["freelance".to_string(), "business".to_string(), "clients".to_string()],
            icon: "Briefcase".to_string(),
            is_free: true,
            price: None,
            downloads: 5600,
            rating: 4.5,
            source: TemplateSource::BuiltIn,
            structure: vec![
                TemplateFolderNode { name: "Clients".to_string(), description: Some("Client projects and contracts".to_string()), children: vec![
                    TemplateFolderNode { name: "{{client_name}}".to_string(), description: None, children: vec![
                        TemplateFolderNode { name: "Contracts".to_string(), description: None, children: vec![] },
                        TemplateFolderNode { name: "Deliverables".to_string(), description: None, children: vec![] },
                        TemplateFolderNode { name: "Communication".to_string(), description: None, children: vec![] },
                        TemplateFolderNode { name: "Invoices".to_string(), description: None, children: vec![] },
                    ]},
                ]},
                TemplateFolderNode { name: "Business".to_string(), description: Some("Business administration".to_string()), children: vec![
                    TemplateFolderNode { name: "Finances".to_string(), description: None, children: vec![] },
                    TemplateFolderNode { name: "Legal".to_string(), description: None, children: vec![] },
                    TemplateFolderNode { name: "Marketing".to_string(), description: None, children: vec![] },
                ]},
                TemplateFolderNode { name: "Portfolio".to_string(), description: Some("Showcase work".to_string()), children: vec![] },
                TemplateFolderNode { name: "Resources".to_string(), description: Some("Tools and templates".to_string()), children: vec![] },
                TemplateFolderNode { name: "Archive".to_string(), description: Some("Completed projects".to_string()), children: vec![] },
            ],
            personalization_questions: vec![
                PersonalizationQuestion {
                    id: "q1".to_string(),
                    question: "Enter a sample client name".to_string(),
                    question_type: QuestionType::Text,
                    variable_name: "client_name".to_string(),
                    options: None,
                    default_value: Some("ClientName".to_string()),
                },
            ],
            created_at: "2024-01-01T00:00:00Z".to_string(),
            updated_at: "2024-01-01T00:00:00Z".to_string(),
        },
    ]
}

#[tauri::command]
pub async fn load_builtin_templates() -> Result<Vec<FolderTemplate>, String> {
    Ok(get_builtin_templates())
}

#[tauri::command]
pub async fn fetch_community_templates(
    _page: u32,
    _category: Option<String>,
) -> Result<Vec<FolderTemplate>, String> {
    // Placeholder: community marketplace coming soon
    Ok(Vec::new())
}

#[tauri::command]
pub async fn apply_template(
    template: FolderTemplate,
    target_path: String,
    personalization: std::collections::HashMap<String, String>,
) -> Result<(), String> {
    let target = std::path::Path::new(&target_path);
    if !target.exists() {
        return Err(format!("Target path does not exist: {}", target_path));
    }

    fn create_folders(
        parent: &std::path::Path,
        nodes: &[TemplateFolderNode],
        vars: &std::collections::HashMap<String, String>,
    ) -> Result<(), String> {
        for node in nodes {
            let mut name = node.name.clone();
            // Replace template variables
            for (key, value) in vars {
                name = name.replace(&format!("{{{{{}}}}}", key), value);
            }

            let folder_path = parent.join(&name);
            std::fs::create_dir_all(&folder_path)
                .map_err(|e| format!("Failed to create folder {}: {}", folder_path.display(), e))?;

            if !node.children.is_empty() {
                create_folders(&folder_path, &node.children, vars)?;
            }
        }
        Ok(())
    }

    create_folders(target, &template.structure, &personalization)?;
    Ok(())
}
