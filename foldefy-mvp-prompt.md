# Foldefy MVP - Claude Code Prompt

## Project Overview
Build an AI-powered file organizer using **Tauri 2.0 + React + TypeScript**. The app analyzes a folder, generates a recommended structure using AI, shows before/after comparison, and moves files on user approval.

Project location: `C:\Users\lucian.turiac\foldefy`

## Tech Stack
- **Frontend**: React 18 + TypeScript + Vite
- **Backend**: Tauri 2.0 (Rust)
- **Styling**: Tailwind CSS + shadcn/ui
- **State**: Zustand
- **AI**: Claude API (Anthropic)

---

## Core User Flow

```
1. User selects a folder to organize
          ↓
2. App scans folder (files, sizes, types, names)
          ↓
3. App sends structure to Claude AI
          ↓
4. AI returns recommended folder structure + file mappings
          ↓
5. User sees split view:
   [CURRENT STRUCTURE]  |  [AI RECOMMENDED]
          ↓
6. User can tweak/approve the recommendation
          ↓
7. On "Apply" → App moves files to new structure
          ↓
8. Done! Show success summary
```

---

## UI Layout

```
┌─────────────────────────────────────────────────────────────────┐
│  📁 Foldefy                                    [Settings] [?]   │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  📂 Selected: C:\Users\lucian\Downloads                  │   │
│  │  [Change Folder]                        [Analyze] 🔍     │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌──────────────────────┐    ┌──────────────────────────┐      │
│  │   CURRENT STRUCTURE  │    │   AI RECOMMENDED         │      │
│  │   ──────────────────│    │   ──────────────────────  │      │
│  │                      │    │                          │      │
│  │   📁 Downloads       │    │   📁 Downloads           │      │
│  │   ├── IMG_001.jpg    │    │   ├── 📁 Images          │      │
│  │   ├── IMG_002.jpg    │    │   │   ├── IMG_001.jpg    │      │
│  │   ├── report.pdf     │    │   │   └── IMG_002.jpg    │      │
│  │   ├── invoice.pdf    │    │   ├── 📁 Documents       │      │
│  │   ├── song.mp3       │    │   │   ├── report.pdf     │      │
│  │   ├── notes.txt      │    │   │   ├── invoice.pdf    │      │
│  │   └── video.mp4      │    │   │   └── notes.txt      │      │
│  │                      │    │   ├── 📁 Media           │      │
│  │                      │    │   │   ├── song.mp3       │      │
│  │                      │    │   │   └── video.mp4      │      │
│  │                      │    │                          │      │
│  │   12 files           │    │   3 folders, 12 files    │      │
│  └──────────────────────┘    └──────────────────────────┘      │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  💡 AI Reasoning:                                        │   │
│  │  "I organized your files by type. Images go together,   │   │
│  │   documents are grouped, and media files are separate." │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│           [Cancel]                    [✓ Apply Changes]         │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## File Structure

```
src/
├── components/
│   ├── FolderPicker.tsx       # Folder selection button
│   ├── FolderTree.tsx         # Recursive tree view component
│   ├── CompareView.tsx        # Side-by-side comparison
│   ├── AIReasoning.tsx        # Shows AI explanation
│   ├── ProgressModal.tsx      # File moving progress
│   └── ui/                    # shadcn components
├── stores/
│   └── appStore.ts            # Zustand store
├── lib/
│   ├── ai.ts                  # Claude API calls
│   └── tauri.ts               # Tauri command wrappers
├── App.tsx
└── main.tsx

src-tauri/src/
├── main.rs
├── lib.rs
├── scanner.rs                 # Scan directory, build tree
├── organizer.rs               # Move files to new structure
└── models.rs                  # Shared structs
```

---

## Data Models

### Rust (src-tauri/src/models.rs)

```rust
use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct FileEntry {
    pub name: String,
    pub path: String,
    pub extension: Option<String>,
    pub size: u64,
    pub is_directory: bool,
    pub modified: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct FolderNode {
    pub name: String,
    pub path: String,
    pub files: Vec<FileEntry>,
    pub children: Vec<FolderNode>,
    pub total_files: u32,
    pub total_size: u64,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct FileMove {
    pub from: String,       // Current path
    pub to: String,         // New path
    pub file_name: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct OrganizationPlan {
    pub recommended_structure: FolderNode,
    pub file_moves: Vec<FileMove>,
    pub folders_to_create: Vec<String>,
    pub ai_reasoning: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct MoveResult {
    pub success: bool,
    pub moved_count: u32,
    pub failed: Vec<String>,
    pub error: Option<String>,
}
```

### TypeScript (src/lib/types.ts)

```typescript
export interface FileEntry {
  name: string
  path: string
  extension?: string
  size: number
  isDirectory: boolean
  modified?: string
}

export interface FolderNode {
  name: string
  path: string
  files: FileEntry[]
  children: FolderNode[]
  totalFiles: number
  totalSize: number
}

export interface FileMove {
  from: string
  to: string
  fileName: string
}

export interface OrganizationPlan {
  recommendedStructure: FolderNode
  fileMoves: FileMove[]
  foldersToCreate: string[]
  aiReasoning: string
}

export interface MoveResult {
  success: boolean
  movedCount: number
  failed: string[]
  error?: string
}
```

---

## Rust Commands

### scanner.rs

```rust
use std::fs;
use std::path::Path;
use crate::models::{FileEntry, FolderNode};

#[tauri::command]
pub fn scan_directory(path: String) -> Result<FolderNode, String> {
    let path = Path::new(&path);
    
    if !path.exists() {
        return Err("Directory does not exist".to_string());
    }
    
    if !path.is_dir() {
        return Err("Path is not a directory".to_string());
    }
    
    scan_recursive(path).map_err(|e| e.to_string())
}

fn scan_recursive(path: &Path) -> Result<FolderNode, std::io::Error> {
    let mut files = Vec::new();
    let mut children = Vec::new();
    let mut total_files: u32 = 0;
    let mut total_size: u64 = 0;
    
    for entry in fs::read_dir(path)? {
        let entry = entry?;
        let file_path = entry.path();
        let metadata = entry.metadata()?;
        let file_name = entry.file_name().to_string_lossy().to_string();
        
        // Skip hidden files and system folders
        if file_name.starts_with('.') {
            continue;
        }
        
        if metadata.is_dir() {
            let child = scan_recursive(&file_path)?;
            total_files += child.total_files;
            total_size += child.total_size;
            children.push(child);
        } else {
            let size = metadata.len();
            total_files += 1;
            total_size += size;
            
            let extension = file_path
                .extension()
                .map(|e| e.to_string_lossy().to_string());
            
            let modified = metadata.modified().ok().map(|t| {
                chrono::DateTime::<chrono::Utc>::from(t)
                    .format("%Y-%m-%d %H:%M:%S")
                    .to_string()
            });
            
            files.push(FileEntry {
                name: file_name,
                path: file_path.to_string_lossy().to_string(),
                extension,
                size,
                is_directory: false,
                modified,
            });
        }
    }
    
    Ok(FolderNode {
        name: path.file_name().unwrap_or_default().to_string_lossy().to_string(),
        path: path.to_string_lossy().to_string(),
        files,
        children,
        total_files,
        total_size,
    })
}

// Export structure as simplified text for AI
#[tauri::command]
pub fn export_for_ai(folder: FolderNode) -> String {
    let mut output = String::new();
    export_recursive(&folder, 0, &mut output);
    output
}

fn export_recursive(node: &FolderNode, depth: usize, output: &mut String) {
    let indent = "  ".repeat(depth);
    
    for file in &node.files {
        let size_kb = file.size / 1024;
        output.push_str(&format!(
            "{}📄 {} ({} KB, .{})\n",
            indent,
            file.name,
            size_kb,
            file.extension.as_deref().unwrap_or("none")
        ));
    }
    
    for child in &node.children {
        output.push_str(&format!("{}📁 {}/\n", indent, child.name));
        export_recursive(child, depth + 1, output);
    }
}
```

### organizer.rs

```rust
use std::fs;
use std::path::Path;
use crate::models::{FileMove, MoveResult};

#[tauri::command]
pub fn create_folders(folders: Vec<String>) -> Result<(), String> {
    for folder in folders {
        fs::create_dir_all(&folder).map_err(|e| {
            format!("Failed to create folder {}: {}", folder, e)
        })?;
    }
    Ok(())
}

#[tauri::command]
pub fn move_files(moves: Vec<FileMove>) -> MoveResult {
    let mut moved_count = 0;
    let mut failed = Vec::new();
    
    for file_move in moves {
        // Ensure target directory exists
        if let Some(parent) = Path::new(&file_move.to).parent() {
            if let Err(e) = fs::create_dir_all(parent) {
                failed.push(format!("{}: {}", file_move.file_name, e));
                continue;
            }
        }
        
        // Move the file
        match fs::rename(&file_move.from, &file_move.to) {
            Ok(_) => moved_count += 1,
            Err(e) => {
                // Try copy + delete if rename fails (cross-device)
                match fs::copy(&file_move.from, &file_move.to) {
                    Ok(_) => {
                        let _ = fs::remove_file(&file_move.from);
                        moved_count += 1;
                    }
                    Err(e) => {
                        failed.push(format!("{}: {}", file_move.file_name, e));
                    }
                }
            }
        }
    }
    
    MoveResult {
        success: failed.is_empty(),
        moved_count,
        failed,
        error: None,
    }
}

#[tauri::command]
pub fn preview_move(file_move: FileMove) -> Result<String, String> {
    // Just validate the move is possible
    let from_path = Path::new(&file_move.from);
    
    if !from_path.exists() {
        return Err(format!("Source file does not exist: {}", file_move.from));
    }
    
    Ok(format!("{} → {}", file_move.from, file_move.to))
}
```

### main.rs

```rust
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod models;
mod scanner;
mod organizer;

fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            scanner::scan_directory,
            scanner::export_for_ai,
            organizer::create_folders,
            organizer::move_files,
            organizer::preview_move,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
```

### lib.rs

```rust
pub mod models;
pub mod scanner;
pub mod organizer;
```

### Cargo.toml additions

```toml
[dependencies]
serde = { version = "1.0", features = ["derive"] }
serde_json = "1.0"
chrono = { version = "0.4", features = ["serde"] }
```

---

## Frontend Implementation

### src/lib/ai.ts

```typescript
import { FolderNode, OrganizationPlan, FileMove } from './types'

const CLAUDE_API_KEY = 'YOUR_API_KEY' // Move to env/settings

export async function generateOrganizationPlan(
  folder: FolderNode,
  folderTextExport: string
): Promise<OrganizationPlan> {
  
  const prompt = `You are a file organization expert. Analyze this folder structure and create an optimal organization plan.

CURRENT FOLDER: ${folder.path}
CURRENT STRUCTURE:
${folderTextExport}

TOTAL FILES: ${folder.totalFiles}

YOUR TASK:
1. Analyze the files by name, extension, and any patterns
2. Create a logical folder structure (max 2 levels deep for simplicity)
3. Map each file to its new location
4. Explain your reasoning

RESPOND IN THIS EXACT JSON FORMAT:
{
  "folders_to_create": [
    "Images",
    "Documents",
    "Media"
  ],
  "file_moves": [
    {
      "from": "full/current/path/file.jpg",
      "to": "full/new/path/Images/file.jpg",
      "file_name": "file.jpg"
    }
  ],
  "reasoning": "Your explanation here"
}

RULES:
- Keep folder names simple and clear (Images, Documents, Videos, Music, Archives, Projects, etc.)
- Group by logical categories, not just extensions
- Don't move files that are already well-organized
- Preserve original file names
- Use the FULL paths provided
- Maximum 2 levels of nesting
- If a folder is already well-organized, say so and make minimal changes

Return ONLY valid JSON, no markdown or explanation outside the JSON.`

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': CLAUDE_API_KEY,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4096,
      messages: [
        { role: 'user', content: prompt }
      ]
    })
  })

  if (!response.ok) {
    throw new Error(`AI request failed: ${response.statusText}`)
  }

  const data = await response.json()
  const content = data.content[0].text

  // Parse AI response
  const parsed = JSON.parse(content)
  
  // Build recommended structure from file moves
  const recommendedStructure = buildRecommendedTree(folder, parsed.file_moves)

  return {
    recommendedStructure,
    fileMoves: parsed.file_moves.map((m: any) => ({
      from: m.from,
      to: m.to,
      fileName: m.file_name
    })),
    foldersToCreate: parsed.folders_to_create.map(
      (f: string) => `${folder.path}/${f}`
    ),
    aiReasoning: parsed.reasoning
  }
}

function buildRecommendedTree(
  original: FolderNode,
  moves: FileMove[]
): FolderNode {
  // Build a tree structure from the planned moves
  const root: FolderNode = {
    name: original.name,
    path: original.path,
    files: [],
    children: [],
    totalFiles: original.totalFiles,
    totalSize: original.totalSize
  }

  const folderMap = new Map<string, FolderNode>()
  folderMap.set(original.path, root)

  for (const move of moves) {
    const targetDir = move.to.substring(0, move.to.lastIndexOf('/'))
    const relativePath = targetDir.replace(original.path + '/', '')
    
    // Create folder hierarchy
    const parts = relativePath.split('/').filter(Boolean)
    let currentPath = original.path
    let currentNode = root

    for (const part of parts) {
      currentPath = `${currentPath}/${part}`
      
      let childNode = currentNode.children.find(c => c.name === part)
      if (!childNode) {
        childNode = {
          name: part,
          path: currentPath,
          files: [],
          children: [],
          totalFiles: 0,
          totalSize: 0
        }
        currentNode.children.push(childNode)
      }
      currentNode = childNode
    }

    // Add file to target folder
    const originalFile = findFileInTree(original, move.from)
    if (originalFile) {
      currentNode.files.push({
        ...originalFile,
        path: move.to
      })
    }
  }

  return root
}

function findFileInTree(node: FolderNode, path: string): FileEntry | null {
  for (const file of node.files) {
    if (file.path === path) return file
  }
  for (const child of node.children) {
    const found = findFileInTree(child, path)
    if (found) return found
  }
  return null
}
```

### src/stores/appStore.ts

```typescript
import { create } from 'zustand'
import { FolderNode, OrganizationPlan, MoveResult } from '../lib/types'

interface AppState {
  // Folder state
  selectedPath: string | null
  currentStructure: FolderNode | null
  
  // AI state
  isAnalyzing: boolean
  organizationPlan: OrganizationPlan | null
  
  // Move state
  isMoving: boolean
  moveProgress: number
  moveResult: MoveResult | null
  
  // Actions
  setSelectedPath: (path: string) => void
  setCurrentStructure: (structure: FolderNode) => void
  setIsAnalyzing: (analyzing: boolean) => void
  setOrganizationPlan: (plan: OrganizationPlan | null) => void
  setIsMoving: (moving: boolean) => void
  setMoveProgress: (progress: number) => void
  setMoveResult: (result: MoveResult | null) => void
  reset: () => void
}

export const useAppStore = create<AppState>((set) => ({
  selectedPath: null,
  currentStructure: null,
  isAnalyzing: false,
  organizationPlan: null,
  isMoving: false,
  moveProgress: 0,
  moveResult: null,

  setSelectedPath: (path) => set({ selectedPath: path }),
  setCurrentStructure: (structure) => set({ currentStructure: structure }),
  setIsAnalyzing: (analyzing) => set({ isAnalyzing: analyzing }),
  setOrganizationPlan: (plan) => set({ organizationPlan: plan }),
  setIsMoving: (moving) => set({ isMoving: moving }),
  setMoveProgress: (progress) => set({ moveProgress: progress }),
  setMoveResult: (result) => set({ moveResult: result }),
  reset: () => set({
    organizationPlan: null,
    moveResult: null,
    moveProgress: 0
  })
}))
```

### src/components/FolderPicker.tsx

```typescript
import { open } from '@tauri-apps/plugin-dialog'
import { invoke } from '@tauri-apps/api/core'
import { useAppStore } from '../stores/appStore'
import { Button } from './ui/button'
import { Folder, RefreshCw } from 'lucide-react'

export function FolderPicker() {
  const { 
    selectedPath, 
    setSelectedPath, 
    setCurrentStructure,
    isAnalyzing 
  } = useAppStore()

  const handleSelectFolder = async () => {
    const selected = await open({
      directory: true,
      multiple: false,
      title: 'Select folder to organize'
    })

    if (selected && typeof selected === 'string') {
      setSelectedPath(selected)
      
      // Scan the directory
      const structure = await invoke('scan_directory', { path: selected })
      setCurrentStructure(structure)
    }
  }

  return (
    <div className="flex items-center gap-4 p-4 bg-surface rounded-lg border border-border">
      <Folder className="w-6 h-6 text-primary" />
      
      <div className="flex-1 min-w-0">
        {selectedPath ? (
          <p className="text-sm text-text-primary truncate">{selectedPath}</p>
        ) : (
          <p className="text-sm text-text-secondary">No folder selected</p>
        )}
      </div>

      <Button 
        onClick={handleSelectFolder}
        disabled={isAnalyzing}
        variant="outline"
      >
        {selectedPath ? 'Change' : 'Select Folder'}
      </Button>
    </div>
  )
}
```

### src/components/FolderTree.tsx

```typescript
import { useState } from 'react'
import { FolderNode, FileEntry } from '../lib/types'
import { ChevronRight, ChevronDown, Folder, File } from 'lucide-react'
import { cn } from '../lib/utils'

interface FolderTreeProps {
  node: FolderNode
  depth?: number
}

export function FolderTree({ node, depth = 0 }: FolderTreeProps) {
  const [isExpanded, setIsExpanded] = useState(depth < 2)
  
  const hasChildren = node.children.length > 0 || node.files.length > 0

  return (
    <div className="select-none">
      {/* Folder row */}
      <div
        className={cn(
          "flex items-center gap-2 py-1 px-2 rounded hover:bg-surface-hover cursor-pointer",
          depth === 0 && "font-medium"
        )}
        style={{ paddingLeft: `${depth * 16 + 8}px` }}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        {hasChildren ? (
          isExpanded ? (
            <ChevronDown className="w-4 h-4 text-text-secondary" />
          ) : (
            <ChevronRight className="w-4 h-4 text-text-secondary" />
          )
        ) : (
          <span className="w-4" />
        )}
        
        <Folder className="w-4 h-4 text-primary" />
        <span className="text-sm text-text-primary">{node.name}</span>
        
        {node.totalFiles > 0 && (
          <span className="text-xs text-text-muted ml-auto">
            {node.totalFiles} files
          </span>
        )}
      </div>

      {/* Children */}
      {isExpanded && (
        <div>
          {/* Subfolders */}
          {node.children.map((child) => (
            <FolderTree key={child.path} node={child} depth={depth + 1} />
          ))}
          
          {/* Files */}
          {node.files.map((file) => (
            <FileRow key={file.path} file={file} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  )
}

function FileRow({ file, depth }: { file: FileEntry; depth: number }) {
  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  return (
    <div
      className="flex items-center gap-2 py-1 px-2 rounded hover:bg-surface-hover"
      style={{ paddingLeft: `${depth * 16 + 28}px` }}
    >
      <File className="w-4 h-4 text-text-secondary" />
      <span className="text-sm text-text-primary truncate flex-1">
        {file.name}
      </span>
      <span className="text-xs text-text-muted">
        {formatSize(file.size)}
      </span>
    </div>
  )
}
```

### src/components/CompareView.tsx

```typescript
import { FolderTree } from './FolderTree'
import { useAppStore } from '../stores/appStore'
import { ArrowRight } from 'lucide-react'

export function CompareView() {
  const { currentStructure, organizationPlan } = useAppStore()

  if (!currentStructure) {
    return (
      <div className="flex items-center justify-center h-64 text-text-secondary">
        Select a folder to get started
      </div>
    )
  }

  return (
    <div className="grid grid-cols-2 gap-4">
      {/* Current Structure */}
      <div className="bg-surface rounded-lg border border-border overflow-hidden">
        <div className="px-4 py-3 border-b border-border bg-surface-hover">
          <h3 className="font-medium text-text-primary">Current Structure</h3>
        </div>
        <div className="p-2 max-h-[500px] overflow-y-auto">
          <FolderTree node={currentStructure} />
        </div>
      </div>

      {/* Recommended Structure */}
      <div className="bg-surface rounded-lg border border-primary/50 overflow-hidden">
        <div className="px-4 py-3 border-b border-primary/50 bg-primary/10">
          <h3 className="font-medium text-primary">AI Recommended</h3>
        </div>
        <div className="p-2 max-h-[500px] overflow-y-auto">
          {organizationPlan ? (
            <FolderTree node={organizationPlan.recommendedStructure} />
          ) : (
            <div className="flex items-center justify-center h-32 text-text-secondary">
              Click "Analyze" to get AI recommendations
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
```

### src/components/AIReasoning.tsx

```typescript
import { useAppStore } from '../stores/appStore'
import { Lightbulb } from 'lucide-react'

export function AIReasoning() {
  const { organizationPlan } = useAppStore()

  if (!organizationPlan) return null

  return (
    <div className="bg-surface rounded-lg border border-border p-4">
      <div className="flex items-start gap-3">
        <Lightbulb className="w-5 h-5 text-warning mt-0.5" />
        <div>
          <h4 className="font-medium text-text-primary mb-1">AI Reasoning</h4>
          <p className="text-sm text-text-secondary">
            {organizationPlan.aiReasoning}
          </p>
        </div>
      </div>
      
      <div className="mt-3 pt-3 border-t border-border">
        <p className="text-xs text-text-muted">
          {organizationPlan.fileMoves.length} files will be moved • 
          {organizationPlan.foldersToCreate.length} new folders
        </p>
      </div>
    </div>
  )
}
```

### src/components/ProgressModal.tsx

```typescript
import { useAppStore } from '../stores/appStore'
import { CheckCircle, XCircle, Loader2 } from 'lucide-react'
import { Button } from './ui/button'

export function ProgressModal() {
  const { isMoving, moveProgress, moveResult, reset } = useAppStore()

  if (!isMoving && !moveResult) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-surface rounded-lg border border-border p-6 w-[400px]">
        {isMoving ? (
          <>
            <div className="flex items-center gap-3 mb-4">
              <Loader2 className="w-6 h-6 text-primary animate-spin" />
              <h3 className="font-medium text-text-primary">
                Moving files...
              </h3>
            </div>
            
            <div className="w-full bg-background rounded-full h-2">
              <div
                className="bg-primary h-2 rounded-full transition-all"
                style={{ width: `${moveProgress}%` }}
              />
            </div>
            <p className="text-sm text-text-secondary mt-2">
              {moveProgress}% complete
            </p>
          </>
        ) : moveResult ? (
          <>
            <div className="flex items-center gap-3 mb-4">
              {moveResult.success ? (
                <CheckCircle className="w-6 h-6 text-success" />
              ) : (
                <XCircle className="w-6 h-6 text-error" />
              )}
              <h3 className="font-medium text-text-primary">
                {moveResult.success ? 'Organization Complete!' : 'Completed with errors'}
              </h3>
            </div>
            
            <p className="text-sm text-text-secondary mb-4">
              Successfully moved {moveResult.movedCount} files.
              {moveResult.failed.length > 0 && (
                <span className="text-error">
                  {' '}{moveResult.failed.length} failed.
                </span>
              )}
            </p>

            {moveResult.failed.length > 0 && (
              <div className="mb-4 p-2 bg-error/10 rounded text-xs text-error max-h-24 overflow-y-auto">
                {moveResult.failed.map((f, i) => (
                  <div key={i}>{f}</div>
                ))}
              </div>
            )}

            <Button onClick={reset} className="w-full">
              Done
            </Button>
          </>
        ) : null}
      </div>
    </div>
  )
}
```

### src/App.tsx

```typescript
import { invoke } from '@tauri-apps/api/core'
import { useAppStore } from './stores/appStore'
import { generateOrganizationPlan } from './lib/ai'
import { FolderPicker } from './components/FolderPicker'
import { CompareView } from './components/CompareView'
import { AIReasoning } from './components/AIReasoning'
import { ProgressModal } from './components/ProgressModal'
import { Button } from './components/ui/button'
import { Sparkles, Play } from 'lucide-react'

function App() {
  const {
    currentStructure,
    isAnalyzing,
    setIsAnalyzing,
    organizationPlan,
    setOrganizationPlan,
    setIsMoving,
    setMoveProgress,
    setMoveResult
  } = useAppStore()

  const handleAnalyze = async () => {
    if (!currentStructure) return

    setIsAnalyzing(true)
    setOrganizationPlan(null)

    try {
      // Get text export for AI
      const textExport = await invoke<string>('export_for_ai', {
        folder: currentStructure
      })

      // Call AI
      const plan = await generateOrganizationPlan(currentStructure, textExport)
      setOrganizationPlan(plan)
    } catch (error) {
      console.error('Analysis failed:', error)
      // TODO: Show error toast
    } finally {
      setIsAnalyzing(false)
    }
  }

  const handleApply = async () => {
    if (!organizationPlan) return

    setIsMoving(true)
    setMoveProgress(0)

    try {
      // Create folders first
      await invoke('create_folders', {
        folders: organizationPlan.foldersToCreate
      })
      setMoveProgress(10)

      // Move files
      const result = await invoke<MoveResult>('move_files', {
        moves: organizationPlan.fileMoves
      })

      setMoveProgress(100)
      setMoveResult(result)
    } catch (error) {
      console.error('Move failed:', error)
      setMoveResult({
        success: false,
        movedCount: 0,
        failed: [],
        error: String(error)
      })
    } finally {
      setIsMoving(false)
    }
  }

  return (
    <div className="min-h-screen bg-background text-text-primary p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">📁 Foldefy</h1>
        </div>

        {/* Folder Picker */}
        <FolderPicker />

        {/* Analyze Button */}
        {currentStructure && (
          <div className="flex justify-center">
            <Button
              onClick={handleAnalyze}
              disabled={isAnalyzing}
              size="lg"
              className="gap-2"
            >
              <Sparkles className="w-5 h-5" />
              {isAnalyzing ? 'Analyzing...' : 'Analyze with AI'}
            </Button>
          </div>
        )}

        {/* Compare View */}
        <CompareView />

        {/* AI Reasoning */}
        <AIReasoning />

        {/* Apply Button */}
        {organizationPlan && (
          <div className="flex justify-end gap-4">
            <Button variant="outline" onClick={() => setOrganizationPlan(null)}>
              Cancel
            </Button>
            <Button onClick={handleApply} className="gap-2">
              <Play className="w-4 h-4" />
              Apply Changes
            </Button>
          </div>
        )}

        {/* Progress Modal */}
        <ProgressModal />
      </div>
    </div>
  )
}

export default App
```

---

## Tailwind Config

```javascript
// tailwind.config.js
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        background: '#0a0a0b',
        surface: {
          DEFAULT: '#141416',
          hover: '#1c1c1f',
          active: '#242428',
        },
        border: {
          DEFAULT: '#27272a',
          light: '#3f3f46',
        },
        primary: {
          DEFAULT: '#6366f1',
          hover: '#818cf8',
          active: '#4f46e5',
        },
        text: {
          primary: '#fafafa',
          secondary: '#a1a1aa',
          muted: '#71717a',
        },
        success: '#22c55e',
        warning: '#f59e0b',
        error: '#ef4444',
      },
    },
  },
  plugins: [],
}
```

---

## Setup Commands

```bash
# Install frontend dependencies
pnpm add zustand lucide-react clsx tailwind-merge
pnpm add -D tailwindcss postcss autoprefixer
pnpm dlx tailwindcss init -p
pnpm dlx shadcn@latest init

# Add shadcn components
pnpm dlx shadcn@latest add button

# Tauri plugins
pnpm add @tauri-apps/plugin-dialog

# In src-tauri/Cargo.toml, add:
# tauri-plugin-dialog = "2"
# chrono = { version = "0.4", features = ["serde"] }
```

---

## Implementation Order

1. **Setup** - Tailwind, shadcn, dependencies
2. **Rust scanner** - `scan_directory`, `export_for_ai`
3. **FolderPicker** - Select folder UI
4. **FolderTree** - Display tree structure
5. **Zustand store** - App state
6. **AI integration** - Claude API call
7. **CompareView** - Side-by-side display
8. **Rust organizer** - `create_folders`, `move_files`
9. **ProgressModal** - Moving progress
10. **Polish** - Error handling, loading states

---

## Environment Variables

Create `.env` in project root:
```
VITE_CLAUDE_API_KEY=sk-ant-xxxxx
```

Access in code:
```typescript
const CLAUDE_API_KEY = import.meta.env.VITE_CLAUDE_API_KEY
```

**Note:** For production, move API key to Rust backend to keep it secure.

---

## Future Enhancements (Post-MVP)

- [ ] Undo last organization
- [ ] Save/load organization templates
- [ ] Custom rules (always put X in Y folder)
- [ ] File preview on hover
- [ ] Drag-and-drop to adjust AI suggestions
- [ ] Batch operations history
- [ ] Template marketplace integration
