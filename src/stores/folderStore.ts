import { create } from "zustand";
import type { FolderNode, FolderAnnotation } from "@/lib/tauri";

interface FolderState {
  selectedPath: string | null;
  folderTree: FolderNode | null;
  annotations: FolderAnnotation[];
  expandedFolders: Set<string>;
  isScanning: boolean;
  error: string | null;

  setSelectedPath: (path: string | null) => void;
  setFolderTree: (tree: FolderNode | null) => void;
  setAnnotations: (annotations: FolderAnnotation[]) => void;
  addAnnotation: (annotation: FolderAnnotation) => void;
  updateAnnotation: (path: string, updates: Partial<FolderAnnotation>) => void;
  removeAnnotation: (path: string) => void;
  toggleFolder: (path: string) => void;
  expandFolder: (path: string) => void;
  collapseFolder: (path: string) => void;
  setScanning: (scanning: boolean) => void;
  setError: (error: string | null) => void;
  reset: () => void;
}

export const useFolderStore = create<FolderState>((set) => ({
  selectedPath: null,
  folderTree: null,
  annotations: [],
  expandedFolders: new Set<string>(),
  isScanning: false,
  error: null,

  setSelectedPath: (path) => set({ selectedPath: path }),

  setFolderTree: (tree) => set({ folderTree: tree }),

  setAnnotations: (annotations) => set({ annotations }),

  addAnnotation: (annotation) =>
    set((state) => ({
      annotations: [...state.annotations, annotation],
    })),

  updateAnnotation: (path, updates) =>
    set((state) => ({
      annotations: state.annotations.map((a) =>
        a.path === path ? { ...a, ...updates } : a
      ),
    })),

  removeAnnotation: (path) =>
    set((state) => ({
      annotations: state.annotations.filter((a) => a.path !== path),
    })),

  toggleFolder: (path) =>
    set((state) => {
      const newSet = new Set(state.expandedFolders);
      if (newSet.has(path)) {
        newSet.delete(path);
      } else {
        newSet.add(path);
      }
      return { expandedFolders: newSet };
    }),

  expandFolder: (path) =>
    set((state) => {
      const newSet = new Set(state.expandedFolders);
      newSet.add(path);
      return { expandedFolders: newSet };
    }),

  collapseFolder: (path) =>
    set((state) => {
      const newSet = new Set(state.expandedFolders);
      newSet.delete(path);
      return { expandedFolders: newSet };
    }),

  setScanning: (scanning) => set({ isScanning: scanning }),

  setError: (error) => set({ error }),

  reset: () =>
    set({
      selectedPath: null,
      folderTree: null,
      annotations: [],
      expandedFolders: new Set(),
      isScanning: false,
      error: null,
    }),
}));
