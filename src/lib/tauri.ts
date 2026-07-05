import { invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";

// Types
export interface StorageHabits {
  uses_multiple_drives: boolean;
  uses_cloud_storage: string[];
  uses_external_storage: boolean;
}

export interface UserProfile {
  language: string;
  usage_type: "personal" | "work" | "both";
  activities: string[];
  project_types: string[];
  organization_style: string[];
  primary_file_types: string[];
  storage_habits: StorageHabits | null;
  custom_notes?: string;
  onboarding_completed: boolean;
  created_at: string;
}

export interface FolderNode {
  name: string;
  path: string;
  node_type: "folder" | "file";
  children?: FolderNode[];
  file_count?: number;
  size?: number;
  extension?: string;
}

export interface FolderAnnotation {
  path: string;
  description: string;
  category: "project" | "archive" | "active" | "reference" | "temp";
  project?: string;
  tags: string[];
  ai_context?: string;
}

export interface FolderStatistics {
  total_folders: number;
  total_files: number;
  file_types: Record<string, number>;
  largest_folders: string[];
  deepest_path: number;
}

export interface AIExportData {
  user_profile: UserProfile;
  folder_structure: {
    root: string;
    tree: FolderNode;
    annotations: FolderAnnotation[];
    statistics: FolderStatistics;
  };
  analysis_request: string;
}

// User profile commands
export async function saveUserProfile(profile: UserProfile): Promise<void> {
  return invoke("save_user_profile", { profile });
}

export async function loadUserProfile(): Promise<UserProfile | null> {
  return invoke("load_user_profile");
}

// Folder commands
export async function scanDirectory(path: string): Promise<FolderNode> {
  return invoke("scan_directory", { path });
}

export async function saveAnnotation(annotation: FolderAnnotation): Promise<void> {
  return invoke("save_annotation", { annotation });
}

export async function loadAnnotations(): Promise<FolderAnnotation[]> {
  return invoke("load_annotations");
}

export async function exportStructureForAI(path: string): Promise<AIExportData> {
  return invoke("export_structure_for_ai", { path });
}

// Scanning types
export interface DriveInfo {
  name: string;
  path: string;
  total_space?: number;
  free_space?: number;
  drive_type: string;
}

export interface FolderIndex {
  root_path: string;
  scanned_at: string;
  total_folders: number;
  tree: FolderIndexNode;
}

export interface FolderIndexNode {
  name: string;
  path: string;
  is_skipped: boolean;
  children: FolderIndexNode[];
  depth: number;
  project_type?: string;
}

export interface ScanProgress {
  current_path: string;
  folders_scanned: number;
  drive: string;
  percentage: number;
}

// Scanning commands
export async function listDrives(): Promise<DriveInfo[]> {
  return invoke("list_drives");
}

export async function smartScanDirectory(path: string, maxDepth?: number, isDeveloper?: boolean): Promise<FolderIndex> {
  return invoke("smart_scan_directory", { path, maxDepth: maxDepth ?? null, isDeveloper: isDeveloper ?? null });
}

export async function scanAllDrives(maxDepth?: number, isDeveloper?: boolean): Promise<FolderIndex[]> {
  return invoke("scan_all_drives", { maxDepth: maxDepth ?? null, isDeveloper: isDeveloper ?? null });
}

export async function cancelScan(): Promise<void> {
  return invoke("cancel_scan");
}

export async function saveFolderIndex(index: FolderIndex[]): Promise<void> {
  return invoke("save_folder_index", { index });
}

export async function loadFolderIndex(): Promise<FolderIndex[] | null> {
  return invoke("load_folder_index");
}

// AI types
export interface AIConfig {
  api_key: string | null;
}

export interface RecommendedFolder {
  name: string;
  description: string;
  children: RecommendedFolder[];
}

export interface AIRecommendation {
  recommended_structure: RecommendedFolder[];
  explanation: string;
  tips: string[];
}

// AI commands
export async function generateAIRecommendation(
  userProfile: UserProfile,
  folderIndex: FolderIndex[],
  customApiKey?: string | null
): Promise<AIRecommendation> {
  return invoke("generate_ai_recommendation", {
    userProfile,
    folderIndex,
    customApiKey: customApiKey ?? null,
  });
}

export async function saveAIConfig(config: AIConfig): Promise<void> {
  return invoke("save_ai_config", { config });
}

export async function loadAIConfig(): Promise<AIConfig | null> {
  return invoke("load_ai_config");
}

// Template types
export type TemplateSource = "BuiltIn" | "Community" | "AI";

export interface TemplateFolderNode {
  name: string;
  description?: string;
  children: TemplateFolderNode[];
}

export interface PersonalizationQuestion {
  id: string;
  question: string;
  question_type: "Text" | "Select" | "MultiSelect" | "Toggle";
  variable_name: string;
  options?: string[];
  default_value?: string;
}

export interface FolderTemplate {
  id: string;
  name: string;
  description: string;
  author: string;
  version: string;
  category: string;
  tags: string[];
  icon: string;
  is_free: boolean;
  price?: number;
  downloads: number;
  rating: number;
  source: TemplateSource;
  structure: TemplateFolderNode[];
  personalization_questions: PersonalizationQuestion[];
  created_at: string;
  updated_at: string;
}

// Template commands
export async function loadBuiltinTemplates(): Promise<FolderTemplate[]> {
  return invoke("load_builtin_templates");
}

export async function fetchCommunityTemplates(
  page: number,
  category?: string
): Promise<FolderTemplate[]> {
  return invoke("fetch_community_templates", { page, category: category ?? null });
}

export async function applyTemplate(
  template: FolderTemplate,
  targetPath: string,
  personalization: Record<string, string>
): Promise<void> {
  return invoke("apply_template", { template, targetPath, personalization });
}

// Dialog helpers
export async function selectFolder(): Promise<string | null> {
  const selected = await open({
    directory: true,
    multiple: false,
    title: "Select a folder to analyze",
  });
  return selected as string | null;
}
