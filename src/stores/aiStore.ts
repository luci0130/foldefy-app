import { create } from "zustand";
import type { AIRecommendation } from "@/lib/tauri";

interface AIState {
  recommendation: AIRecommendation | null;
  isGenerating: boolean;
  error: string | null;
  customApiKey: string | null;

  setRecommendation: (rec: AIRecommendation | null) => void;
  setGenerating: (generating: boolean) => void;
  setError: (error: string | null) => void;
  setCustomApiKey: (key: string | null) => void;
  reset: () => void;
}

export const useAIStore = create<AIState>((set) => ({
  recommendation: null,
  isGenerating: false,
  error: null,
  customApiKey: null,

  setRecommendation: (rec) => set({ recommendation: rec }),
  setGenerating: (generating) => set({ isGenerating: generating }),
  setError: (error) => set({ error }),
  setCustomApiKey: (key) => set({ customApiKey: key }),
  reset: () =>
    set({
      recommendation: null,
      isGenerating: false,
      error: null,
    }),
}));
