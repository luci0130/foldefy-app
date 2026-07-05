import { create } from "zustand";

type Page = "dashboard" | "organize" | "marketplace" | "folders" | "settings";

interface AppState {
  currentPage: Page;
  sidebarCollapsed: boolean;
  showOnboarding: boolean;
  showProfileSetup: boolean;
  showStorageScan: boolean;
  showAIRecommendation: boolean;

  setCurrentPage: (page: Page) => void;
  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  setShowOnboarding: (show: boolean) => void;
  setShowProfileSetup: (show: boolean) => void;
  setShowStorageScan: (show: boolean) => void;
  setShowAIRecommendation: (show: boolean) => void;
}

export const useAppStore = create<AppState>((set) => ({
  currentPage: "dashboard",
  sidebarCollapsed: false,
  showOnboarding: true,
  showProfileSetup: false,
  showStorageScan: false,
  showAIRecommendation: false,

  setCurrentPage: (page) => set({ currentPage: page }),

  toggleSidebar: () =>
    set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),

  setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),

  setShowOnboarding: (show) => set({ showOnboarding: show }),

  setShowProfileSetup: (show) => set({ showProfileSetup: show }),

  setShowStorageScan: (show) => set({ showStorageScan: show }),

  setShowAIRecommendation: (show) => set({ showAIRecommendation: show }),
}));
