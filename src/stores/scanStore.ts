import { create } from "zustand";
import { persist } from "zustand/middleware";
import { listen } from "@tauri-apps/api/event";
import type { DriveInfo, FolderIndex, ScanProgress } from "@/lib/tauri";
import {
  scanAllDrives,
  smartScanDirectory,
  saveFolderIndex,
  selectFolder,
  cancelScan as invokeCancelScan,
} from "@/lib/tauri";
import { useUserStore } from "@/stores/userStore";

function getIsDeveloper(): boolean {
  const profile = useUserStore.getState().profile;
  return profile?.activities?.includes("developer") ?? false;
}

interface ScanState {
  scanMode: "entire" | "folder" | null;
  selectedPath: string | null;
  drives: DriveInfo[];
  folderIndex: FolderIndex[] | null;
  isScanning: boolean;
  scanProgress: ScanProgress | null;
  error: string | null;
  maxDepth: number;

  setScanMode: (mode: "entire" | "folder" | null) => void;
  setSelectedPath: (path: string | null) => void;
  setDrives: (drives: DriveInfo[]) => void;
  setFolderIndex: (index: FolderIndex[] | null) => void;
  setScanning: (scanning: boolean) => void;
  setScanProgress: (progress: ScanProgress | null) => void;
  setError: (error: string | null) => void;
  setMaxDepth: (depth: number) => void;
  startScan: () => Promise<void>;
  reindexAll: () => Promise<void>;
  cancelScan: () => Promise<void>;
  reset: () => void;
}

export const useScanStore = create<ScanState>()(
  persist(
    (set, get) => ({
      scanMode: null,
      selectedPath: null,
      drives: [],
      folderIndex: null,
      isScanning: false,
      scanProgress: null,
      error: null,
      maxDepth: 10,

      setScanMode: (mode) => set({ scanMode: mode }),
      setSelectedPath: (path) => set({ selectedPath: path }),
      setDrives: (drives) => set({ drives }),
      setFolderIndex: (index) => set({ folderIndex: index }),
      setScanning: (scanning) => set({ isScanning: scanning }),
      setScanProgress: (progress) => set({ scanProgress: progress }),
      setError: (error) => set({ error }),
      setMaxDepth: (depth) => set({ maxDepth: depth }),

      startScan: async () => {
        const { scanMode, maxDepth } = get();
        const isDeveloper = getIsDeveloper();
        set({ isScanning: true, error: null, scanProgress: null, folderIndex: null });

        // Set up progress listener
        const unlisten = await listen<ScanProgress>("scan-progress", (event) => {
          set({ scanProgress: event.payload });
        });

        try {
          let results: FolderIndex[];

          if (scanMode === "folder") {
            const path = await selectFolder();
            if (!path) {
              set({ isScanning: false, scanMode: null });
              unlisten();
              return;
            }
            set({ selectedPath: path });
            const result = await smartScanDirectory(path, maxDepth, isDeveloper);
            results = [result];
          } else {
            results = await scanAllDrives(maxDepth, isDeveloper);
          }

          await saveFolderIndex(results);
          set({ folderIndex: results });
        } catch (err) {
          const msg = String(err);
          if (!msg.includes("Scan cancelled")) {
            set({ error: msg });
          }
        } finally {
          set({ isScanning: false, scanProgress: null });
          unlisten();
        }
      },

      reindexAll: async () => {
        const { maxDepth } = get();
        const isDeveloper = getIsDeveloper();
        set({ isScanning: true, error: null, scanProgress: null, folderIndex: null, scanMode: "entire" });

        const unlisten = await listen<ScanProgress>("scan-progress", (event) => {
          set({ scanProgress: event.payload });
        });

        try {
          const results = await scanAllDrives(maxDepth, isDeveloper);
          await saveFolderIndex(results);
          set({ folderIndex: results });
        } catch (err) {
          const msg = String(err);
          if (!msg.includes("Scan cancelled")) {
            set({ error: msg });
          }
        } finally {
          set({ isScanning: false, scanProgress: null });
          unlisten();
        }
      },

      cancelScan: async () => {
        await invokeCancelScan();
      },

      reset: () =>
        set({
          scanMode: null,
          selectedPath: null,
          drives: [],
          folderIndex: null,
          isScanning: false,
          scanProgress: null,
          error: null,
        }),
    }),
    {
      name: "foldefy-scan",
      partialize: (state) => ({
        maxDepth: state.maxDepth,
        folderIndex: state.folderIndex,
      }),
    }
  )
);
