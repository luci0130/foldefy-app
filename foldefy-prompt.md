# Foldefy - Claude Code Development Prompt

## Project Context
I'm building **Foldefy**, a desktop file organization app using **Tauri 2.0 + React + TypeScript**. The project is already initialized with the default Tauri + React template.

Project location: `C:\Users\lucian.turiac\foldefy`

## Tech Stack
- **Frontend**: React 18 + TypeScript + Vite
- **Backend**: Tauri 2.0 (Rust)
- **Styling**: Tailwind CSS + shadcn/ui components
- **State Management**: Zustand
- **Icons**: Lucide React

---

## Task 1: Setup UI Foundation

### Install required dependencies:
```bash
pnpm add tailwindcss postcss autoprefixer -D
pnpm add zustand lucide-react clsx tailwind-merge
pnpm dlx shadcn@latest init
```

### Configure Tailwind with a modern dark theme suitable for a desktop app.

---

## Task 2: Onboarding Flow - Feature Slides

Create an onboarding carousel that shows on first app launch with these slides:

### Slide 1: Welcome
- Title: "Welcome to Foldefy"
- Subtitle: "Your intelligent file organization assistant"
- Animation: App logo with subtle glow effect

### Slide 2: Smart Organization
- Title: "AI-Powered Organization"
- Description: "Foldefy analyzes your files and suggests the perfect folder structure"
- Visual: Animated files flying into organized folders

### Slide 3: Templates Marketplace
- Title: "Ready-Made Templates"
- Description: "Browse and install organization templates created by professionals - accountants, photographers, developers, and more"
- Visual: Grid of template cards

### Slide 4: How It Works
- Step 1: "Select a folder to organize"
- Step 2: "AI analyzes your file structure"
- Step 3: "Review and apply suggestions"
- Step 4: "Enjoy your organized files"
- Visual: Numbered steps with icons

### Slide 5: Get Started
- Title: "Let's personalize your experience"
- CTA Button: "Continue to Setup"

### Requirements:
- Smooth slide transitions (framer-motion or CSS transitions)
- Progress dots at bottom
- Skip button in top-right
- Next/Back navigation buttons
- Store `onboardingCompleted: boolean` in localStorage
- Modern, clean dark UI design

---

## Task 3: User Profile Setup

After onboarding slides, show a multi-step profile setup form:

### Step 1: Usage Type
Question: "How will you use Foldefy?"

Options (single select, card-style buttons):
- 🏠 **Personal** - "Organize personal files, photos, documents"
- 💼 **Work** - "Professional file management for your job"
- 🔄 **Both** - "Mix of personal and work files"

### Step 2: Primary Activity/Profession
Question: "What best describes your main activity?"

Options (grid of selectable cards, allow multiple selection):
- 📊 Accountant / Finance
- 📸 Photographer / Videographer
- 💻 Software Developer / IT
- 👔 CEO / Manager
- 👥 HR / Recruitment
- 🎨 Designer / Creative
- 📝 Writer / Content Creator
- 🎓 Student / Education
- 🏥 Healthcare
- 📦 Other (with text input)

### Step 3: Confirmation
- Show summary of selections
- "Start Using Foldefy" button

### Data Storage:
Create a Rust backend command to save user profile:

```rust
#[derive(Serialize, Deserialize)]
struct UserProfile {
    usage_type: String,        // "personal" | "work" | "both"
    activities: Vec<String>,   // ["developer", "photographer", ...]
    onboarding_completed: bool,
    created_at: String,        // ISO timestamp
}
```

Store in app data directory as `user_profile.json` using Tauri's app data path.

---

## Task 4: Folder Structure Visualization

Create a folder tree visualization component that:

### 4.1 Folder Selection
- Button: "Select Folder to Analyze"
- Uses Tauri's `dialog.open()` to pick a directory
- Shows selected path

### 4.2 Folder Tree Component
Build a recursive tree visualization:

```typescript
interface FolderNode {
  name: string;
  path: string;
  type: 'folder' | 'file';
  children?: FolderNode[];
  fileCount?: number;
  size?: number;
  extension?: string;
}
```

Features:
- Expandable/collapsible folders (click to toggle)
- File/folder icons (use Lucide icons)
- Show file count badge on folders
- Color coding by file type
- Indentation lines connecting parent-child
- Smooth expand/collapse animations

### 4.3 Folder Annotation System
Allow users to add context to folders:

When user right-clicks or clicks edit icon on a folder, show a popover/modal:

```typescript
interface FolderAnnotation {
  path: string;
  description: string;           // User's description: "Client invoices 2024"
  category: string;              // "project" | "archive" | "active" | "reference" | "temp"
  project?: string;              // Optional project name: "Website Redesign"
  tags: string[];                // ["important", "tax", "client-x"]
  aiContext?: string;            // Additional context for AI
}
```

UI for annotation:
- Text input for description
- Dropdown for category
- Optional project name input
- Tag input (chips style, can add multiple)
- Save/Cancel buttons

### 4.4 Rust Backend Commands

```rust
// Scan directory and return tree structure
#[tauri::command]
async fn scan_directory(path: String) -> Result<FolderNode, String>

// Save folder annotations
#[tauri::command]
async fn save_annotation(annotation: FolderAnnotation) -> Result<(), String>

// Load all annotations
#[tauri::command]
async fn load_annotations() -> Result<Vec<FolderAnnotation>, String>

// Export structure for AI analysis
#[tauri::command]
async fn export_structure_for_ai(path: String) -> Result<String, String>
```

### 4.5 AI Analysis Export
Create a function that exports the folder structure + annotations in a format optimized for AI analysis:

```json
{
  "user_profile": {
    "usage_type": "work",
    "activities": ["developer", "designer"]
  },
  "folder_structure": {
    "root": "C:/Users/lucian/Projects",
    "tree": "... serialized tree ...",
    "annotations": [
      {
        "path": "C:/Users/lucian/Projects/ClientA",
        "description": "All files for Client A website project",
        "category": "project",
        "project": "ClientA Website",
        "tags": ["active", "priority"]
      }
    ],
    "statistics": {
      "total_folders": 45,
      "total_files": 230,
      "file_types": {
        ".pdf": 45,
        ".jpg": 120,
        ".docx": 30
      },
      "largest_folders": ["..."],
      "deepest_path": 6
    }
  },
  "analysis_request": "Based on my profile and current folder structure, suggest improvements to better organize my files. Consider my profession and usage patterns."
}
```

---

## Task 5: Main App Layout

Create the main app shell with:

### Sidebar Navigation:
- 🏠 Dashboard
- 📁 Organize (folder visualization)
- 🛒 Marketplace
- ⚙️ Settings
- Collapse/expand button

### Header:
- App logo + name
- Search bar (placeholder for now)
- User profile icon

### Content Area:
- Renders current page/view
- Smooth page transitions

---

## File Structure to Create:

```
src/
├── components/
│   ├── ui/                    # shadcn components
│   ├── onboarding/
│   │   ├── OnboardingCarousel.tsx
│   │   ├── FeatureSlide.tsx
│   │   └── slides/
│   │       ├── WelcomeSlide.tsx
│   │       ├── SmartOrgSlide.tsx
│   │       ├── TemplatesSlide.tsx
│   │       ├── HowItWorksSlide.tsx
│   │       └── GetStartedSlide.tsx
│   ├── profile/
│   │   ├── ProfileSetup.tsx
│   │   ├── UsageTypeStep.tsx
│   │   ├── ActivityStep.tsx
│   │   └── ConfirmationStep.tsx
│   ├── folder-tree/
│   │   ├── FolderTree.tsx
│   │   ├── FolderNode.tsx
│   │   ├── FolderAnnotation.tsx
│   │   └── FolderStats.tsx
│   └── layout/
│       ├── Sidebar.tsx
│       ├── Header.tsx
│       └── MainLayout.tsx
├── stores/
│   ├── userStore.ts           # Zustand store for user profile
│   ├── folderStore.ts         # Zustand store for folder data
│   └── appStore.ts            # General app state
├── lib/
│   ├── utils.ts               # Utility functions
│   └── tauri.ts               # Tauri command wrappers
├── pages/
│   ├── Dashboard.tsx
│   ├── Organize.tsx
│   ├── Marketplace.tsx
│   └── Settings.tsx
├── App.tsx                    # Main app with routing logic
└── main.tsx

src-tauri/src/
├── main.rs
├── lib.rs
├── commands/
│   ├── mod.rs
│   ├── user.rs                # User profile commands
│   └── folder.rs              # Folder scanning commands
└── models/
    ├── mod.rs
    ├── user.rs                # UserProfile struct
    └── folder.rs              # FolderNode, FolderAnnotation structs
```

---

## Design Guidelines:

### Colors (Dark Theme):
- Background: `#0a0a0b` (near black)
- Surface: `#141416` (cards, sidebar)
- Surface Hover: `#1c1c1f`
- Border: `#27272a`
- Primary: `#6366f1` (indigo)
- Primary Hover: `#818cf8`
- Text Primary: `#fafafa`
- Text Secondary: `#a1a1aa`
- Success: `#22c55e`
- Warning: `#f59e0b`
- Error: `#ef4444`

### Typography:
- Font: Inter or system-ui
- Headings: Bold, slightly larger
- Body: Regular weight, good line height

### Spacing:
- Consistent 4px grid (4, 8, 12, 16, 24, 32, 48)
- Generous padding in cards
- Clear visual hierarchy

### Animations:
- Subtle and purposeful
- 150-200ms for micro-interactions
- 300-400ms for page transitions
- Ease-out for entering, ease-in for exiting

---

## Priority Order:
1. Setup Tailwind + shadcn/ui
2. Create main layout (sidebar, header)
3. Build onboarding carousel
4. Build profile setup flow
5. Create folder tree visualization
6. Implement Rust backend commands
7. Connect everything together

---

## Additional Notes:
- Use TypeScript strict mode
- Add proper error handling
- Make components reusable
- Comment complex logic
- Test on Windows (primary target)

Start with Task 1 (setup) and Task 5 (layout), then proceed with the onboarding flow.
