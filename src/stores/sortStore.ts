import { create } from "zustand";
import { persist } from "zustand/middleware";
import { listen } from "@tauri-apps/api/event";
import type {
  BatchDetail,
  ExecuteResult,
  Hotspot,
  MovePlan,
  SortBatch,
  SortProgressEvent,
  SortScope,
  UndoResult,
} from "@/lib/tauri";
import {
  executePlan,
  getBatch,
  getHotspots,
  listBatches,
  planSort,
  selectFolder,
  undoBatch,
  undoFile,
  undoFolder,
} from "@/lib/tauri";

type ScopeType = "selected_folders" | "hotspots" | "everything";
type Phase = "setup" | "planning" | "review" | "executing" | "done";

interface SortState {
  scopeType: ScopeType;
  selectedFolders: string[];
  hotspots: Hotspot[];
  hotspotsLoaded: boolean;
  /** false = auto mode (default): plan and execute in one go. */
  reviewFirst: boolean;

  phase: Phase;
  plan: MovePlan | null;
  progress: SortProgressEvent | null;
  result: ExecuteResult | null;
  undoResult: UndoResult | null;
  batches: SortBatch[];
  batchDetails: Record<number, BatchDetail>;
  error: string | null;

  setScopeType: (type: ScopeType) => void;
  setReviewFirst: (review: boolean) => void;
  addFolder: () => Promise<void>;
  removeFolder: (path: string) => void;
  loadHotspots: () => Promise<void>;
  start: () => Promise<void>;
  execute: (entryIds?: number[]) => Promise<void>;
  runUndoBatch: (batchId: number) => Promise<void>;
  runUndoFolder: (batchId: number, folder: string) => Promise<void>;
  runUndoFile: (journalId: number, batchId: number) => Promise<void>;
  loadBatches: () => Promise<void>;
  loadBatchDetail: (batchId: number) => Promise<void>;
  resetRun: () => void;
}

function buildScope(state: Pick<SortState, "scopeType" | "selectedFolders">): SortScope {
  switch (state.scopeType) {
    case "selected_folders":
      return { type: "selected_folders", folders: state.selectedFolders };
    case "hotspots":
      return { type: "hotspots" };
    case "everything":
      return { type: "everything" };
  }
}

export const useSortStore = create<SortState>()(
  persist(
    (set, get) => ({
      scopeType: "hotspots",
      selectedFolders: [],
      hotspots: [],
      hotspotsLoaded: false,
      reviewFirst: false,

      phase: "setup",
      plan: null,
      progress: null,
      result: null,
      undoResult: null,
      batches: [],
      batchDetails: {},
      error: null,

      setScopeType: (type) => set({ scopeType: type }),
      setReviewFirst: (review) => set({ reviewFirst: review }),

      addFolder: async () => {
        const path = await selectFolder();
        if (path && !get().selectedFolders.includes(path)) {
          set({ selectedFolders: [...get().selectedFolders, path] });
        }
      },

      removeFolder: (path) =>
        set({ selectedFolders: get().selectedFolders.filter((f) => f !== path) }),

      loadHotspots: async () => {
        try {
          const hotspots = await getHotspots();
          set({ hotspots, hotspotsLoaded: true });
        } catch {
          set({ hotspots: [], hotspotsLoaded: true });
        }
      },

      start: async () => {
        const state = get();
        if (state.scopeType === "selected_folders" && state.selectedFolders.length === 0) {
          return;
        }
        set({ phase: "planning", error: null, result: null, undoResult: null, plan: null });

        try {
          const plan = await planSort(
            buildScope(state),
            state.reviewFirst ? "review" : "auto"
          );
          set({ plan });

          if (plan.entries.length === 0) {
            set({ phase: "done", result: { batch_id: plan.batch_id, moved: 0, failed: [] } });
            return;
          }

          if (state.reviewFirst) {
            set({ phase: "review" });
          } else {
            await get().execute();
          }
        } catch (err) {
          set({ phase: "setup", error: String(err) });
        }
      },

      execute: async (entryIds) => {
        const plan = get().plan;
        if (!plan) return;
        set({ phase: "executing", progress: null, error: null });

        const unlisten = await listen<SortProgressEvent>("sort-progress", (event) => {
          if (event.payload.batch_id === plan.batch_id) {
            set({ progress: event.payload });
          }
        });

        try {
          const result = await executePlan(plan.batch_id, entryIds);
          set({ phase: "done", result });
        } catch (err) {
          set({ phase: "done", error: String(err) });
        } finally {
          unlisten();
          set({ progress: null });
          void get().loadBatches();
        }
      },

      runUndoBatch: async (batchId) => {
        try {
          const undoResult = await undoBatch(batchId);
          set({ undoResult, error: null });
        } catch (err) {
          set({ error: String(err) });
        }
        await get().loadBatches();
        await get().loadBatchDetail(batchId);
      },

      runUndoFolder: async (batchId, folder) => {
        try {
          const undoResult = await undoFolder(batchId, folder);
          set({ undoResult, error: null });
        } catch (err) {
          set({ error: String(err) });
        }
        await get().loadBatches();
        await get().loadBatchDetail(batchId);
      },

      runUndoFile: async (journalId, batchId) => {
        try {
          const undoResult = await undoFile(journalId);
          set({ undoResult, error: null });
        } catch (err) {
          set({ error: String(err) });
        }
        await get().loadBatches();
        await get().loadBatchDetail(batchId);
      },

      loadBatches: async () => {
        try {
          const batches = await listBatches();
          set({ batches });
        } catch {
          // non-fatal: history simply stays empty
        }
      },

      loadBatchDetail: async (batchId) => {
        try {
          const detail = await getBatch(batchId);
          set({ batchDetails: { ...get().batchDetails, [batchId]: detail } });
        } catch {
          // non-fatal
        }
      },

      resetRun: () =>
        set({
          phase: "setup",
          plan: null,
          progress: null,
          result: null,
          undoResult: null,
          error: null,
        }),
    }),
    {
      name: "foldefy-sort",
      partialize: (state) => ({
        reviewFirst: state.reviewFirst,
        scopeType: state.scopeType,
      }),
    }
  )
);
