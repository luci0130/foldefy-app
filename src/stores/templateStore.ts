import { create } from "zustand";
import type { FolderTemplate, TemplateSource } from "@/lib/tauri";

interface TemplateState {
  templates: FolderTemplate[];
  selectedTemplate: FolderTemplate | null;
  filter: {
    category: string | null;
    source: TemplateSource | null;
  };
  isLoading: boolean;

  setTemplates: (templates: FolderTemplate[]) => void;
  setSelectedTemplate: (template: FolderTemplate | null) => void;
  setFilter: (filter: Partial<TemplateState["filter"]>) => void;
  setLoading: (loading: boolean) => void;
  reset: () => void;
}

export const useTemplateStore = create<TemplateState>((set) => ({
  templates: [],
  selectedTemplate: null,
  filter: {
    category: null,
    source: null,
  },
  isLoading: false,

  setTemplates: (templates) => set({ templates }),
  setSelectedTemplate: (template) => set({ selectedTemplate: template }),
  setFilter: (filter) =>
    set((state) => ({ filter: { ...state.filter, ...filter } })),
  setLoading: (loading) => set({ isLoading: loading }),
  reset: () =>
    set({
      templates: [],
      selectedTemplate: null,
      filter: { category: null, source: null },
      isLoading: false,
    }),
}));
