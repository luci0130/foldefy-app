import { invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";

// Types
export interface UserProfile {
  usage_type: "personal" | "work" | "both";
  activities: string[];
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

// Dialog helpers
export async function selectFolder(): Promise<string | null> {
  const selected = await open({
    directory: true,
    multiple: false,
    title: "Select a folder to analyze",
  });
  return selected as string | null;
}
