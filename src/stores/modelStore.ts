import { create } from "zustand";
import { listen } from "@tauri-apps/api/event";
import type {
  AIConfig,
  HardwareProfile,
  ModelDownloadProgress,
  ModelInfo,
} from "@/lib/tauri";
import {
  cancelModelDownload,
  deleteModel,
  downloadModel,
  getHardwareProfile,
  listModels,
  loadAIConfig,
  localEngineAvailable,
  saveAIConfig,
} from "@/lib/tauri";

interface ModelState {
  hardware: HardwareProfile | null;
  models: ModelInfo[];
  engineAvailable: boolean;
  config: AIConfig | null;
  /** model id -> live download progress */
  downloads: Record<string, ModelDownloadProgress>;
  loaded: boolean;
  error: string | null;

  init: () => Promise<void>;
  refreshModels: () => Promise<void>;
  startDownload: (id: string) => Promise<void>;
  cancelDownload: (id: string) => Promise<void>;
  removeModel: (id: string) => Promise<void>;
  saveConfig: (config: AIConfig) => Promise<void>;
}

export const useModelStore = create<ModelState>()((set, get) => ({
  hardware: null,
  models: [],
  engineAvailable: false,
  config: null,
  downloads: {},
  loaded: false,
  error: null,

  init: async () => {
    if (get().loaded) return;
    try {
      const [hardware, models, engineAvailable, config] = await Promise.all([
        getHardwareProfile(),
        listModels(),
        localEngineAvailable(),
        loadAIConfig(),
      ]);
      set({ hardware, models, engineAvailable, config, loaded: true });
    } catch (err) {
      set({ error: String(err), loaded: true });
    }
  },

  refreshModels: async () => {
    try {
      set({ models: await listModels() });
    } catch {
      // non-fatal
    }
  },

  startDownload: async (id) => {
    set({ error: null });
    const unlisten = await listen<ModelDownloadProgress>(
      "model-download-progress",
      (event) => {
        if (event.payload.id !== id) return;
        set({ downloads: { ...get().downloads, [id]: event.payload } });
      }
    );
    try {
      await downloadModel(id);
    } catch (err) {
      const message = String(err);
      if (!message.includes("cancelled")) {
        set({ error: message });
      }
    } finally {
      unlisten();
      const { [id]: _finished, ...rest } = get().downloads;
      set({ downloads: rest });
      await get().refreshModels();
    }
  },

  cancelDownload: async (id) => {
    await cancelModelDownload(id);
  },

  removeModel: async (id) => {
    try {
      await deleteModel(id);
    } catch (err) {
      set({ error: String(err) });
    }
    await get().refreshModels();
  },

  saveConfig: async (config) => {
    try {
      await saveAIConfig(config);
      set({ config });
    } catch (err) {
      set({ error: String(err) });
    }
  },
}));
