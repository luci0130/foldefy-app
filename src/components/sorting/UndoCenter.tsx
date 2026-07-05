import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useSortStore } from "@/stores/sortStore";
import type { JournalEntry } from "@/lib/tauri";
import { ChevronDown, ChevronRight, RotateCcw } from "lucide-react";

interface UndoCenterProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function parentOf(path: string): string {
  const idx = Math.max(path.lastIndexOf("\\"), path.lastIndexOf("/"));
  return idx > 0 ? path.slice(0, idx) : path;
}

export function UndoCenter({ open, onOpenChange }: UndoCenterProps) {
  const { t } = useTranslation();
  const {
    batches,
    batchDetails,
    loadBatches,
    loadBatchDetail,
    runUndoBatch,
    runUndoFolder,
    runUndoFile,
    undoResult,
  } = useSortStore();
  const [expanded, setExpanded] = useState<number | null>(null);

  useEffect(() => {
    if (open) {
      void loadBatches();
    }
  }, [open, loadBatches]);

  const toggleBatch = (batchId: number) => {
    if (expanded === batchId) {
      setExpanded(null);
    } else {
      setExpanded(batchId);
      void loadBatchDetail(batchId);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{t("sorting.history")}</DialogTitle>
          <DialogDescription>{t("sorting.historySubtitle")}</DialogDescription>
        </DialogHeader>

        {undoResult && (
          <div className="text-sm space-y-1 rounded-md bg-surface px-3 py-2">
            <p className="text-foreground">
              {t("sorting.undoDone", { count: undoResult.undone })}
            </p>
            {undoResult.conflicts.length > 0 && (
              <p className="text-warning">
                {t("sorting.undoConflicts", { count: undoResult.conflicts.length })}
              </p>
            )}
          </div>
        )}

        <ScrollArea className="max-h-[60vh]">
          {batches.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">
              {t("sorting.noBatches")}
            </p>
          ) : (
            <div className="space-y-2 pr-3">
              {batches.map((batch) => (
                <div key={batch.id} className="rounded-md border border-border">
                  <div
                    className="flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-surface-hover"
                    onClick={() => toggleBatch(batch.id)}
                  >
                    {expanded === batch.id ? (
                      <ChevronDown className="w-4 h-4 text-muted-foreground" />
                    ) : (
                      <ChevronRight className="w-4 h-4 text-muted-foreground" />
                    )}
                    <span className="font-medium text-sm text-foreground">
                      {t("sorting.batchLabel", { id: batch.id })}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {batch.created_at}
                    </span>
                    <div className="flex-1" />
                    {batch.done > 0 && (
                      <Badge variant="secondary">
                        {t("sorting.movedCount", { count: batch.done })}
                      </Badge>
                    )}
                    {batch.undone > 0 && (
                      <Badge variant="outline">
                        {t("sorting.restoredCount", { count: batch.undone })}
                      </Badge>
                    )}
                    {batch.failed > 0 && (
                      <Badge variant="destructive">
                        {t("sorting.failedCount", { count: batch.failed })}
                      </Badge>
                    )}
                    {batch.done > 0 && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          void runUndoBatch(batch.id);
                        }}
                      >
                        <RotateCcw className="w-3 h-3 mr-1" />
                        {t("sorting.undoAll")}
                      </Button>
                    )}
                  </div>

                  {expanded === batch.id && batchDetails[batch.id] && (
                    <BatchEntries
                      batchId={batch.id}
                      entries={batchDetails[batch.id].entries}
                      onUndoFolder={(folder) => void runUndoFolder(batch.id, folder)}
                      onUndoFile={(id) => void runUndoFile(id, batch.id)}
                    />
                  )}
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

interface BatchEntriesProps {
  batchId: number;
  entries: JournalEntry[];
  onUndoFolder: (folder: string) => void;
  onUndoFile: (journalId: number) => void;
}

function BatchEntries({ entries, onUndoFolder, onUndoFile }: BatchEntriesProps) {
  const { t } = useTranslation();

  const byFolder = useMemo(() => {
    const groups = new Map<string, JournalEntry[]>();
    for (const entry of entries) {
      if (entry.kind !== "move") continue;
      const folder = parentOf(entry.src);
      const group = groups.get(folder) ?? [];
      group.push(entry);
      groups.set(folder, group);
    }
    return [...groups.entries()];
  }, [entries]);

  const statusVariant = (status: string) => {
    switch (status) {
      case "done":
        return "secondary" as const;
      case "undone":
        return "outline" as const;
      default:
        return "destructive" as const;
    }
  };

  return (
    <div className="px-3 pb-3">
      <Separator className="mb-2" />
      <div className="space-y-3">
        {byFolder.map(([folder, folderEntries]) => (
          <div key={folder}>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-mono text-muted-foreground truncate flex-1">
                {folder}
              </span>
              {folderEntries.some((e) => e.status === "done") && (
                <Button variant="ghost" size="sm" onClick={() => onUndoFolder(folder)}>
                  <RotateCcw className="w-3 h-3 mr-1" />
                  {t("sorting.undoFolderBtn")}
                </Button>
              )}
            </div>
            <div className="space-y-1">
              {folderEntries.map((entry) => (
                <div
                  key={entry.id}
                  className="flex items-center gap-2 rounded bg-background px-2 py-1"
                >
                  <span className="text-sm text-foreground truncate flex-1">
                    {entry.src.slice(folder.length + 1)}
                  </span>
                  <Badge variant={statusVariant(entry.status)}>
                    {t(`sorting.status.${entry.status}`, entry.status)}
                  </Badge>
                  {entry.status === "done" && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 px-2"
                      onClick={() => onUndoFile(entry.id)}
                    >
                      <RotateCcw className="w-3 h-3" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
