import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AlertCircle, CheckCircle2, FolderOpen, FolderPlus, Loader2 } from "lucide-react";
import type { AIRecommendation, ApplyResult } from "@/lib/tauri";
import { applyStructure, selectFolder } from "@/lib/tauri";

interface ApplyStructureDialogProps {
  recommendation: AIRecommendation;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onApplied: () => void;
}

export function ApplyStructureDialog({
  recommendation,
  open,
  onOpenChange,
  onApplied,
}: ApplyStructureDialogProps) {
  const { t } = useTranslation();
  const [targetRoot, setTargetRoot] = useState<string | null>(null);
  const [preview, setPreview] = useState<ApplyResult | null>(null);
  const [applied, setApplied] = useState<ApplyResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pickFolder = async () => {
    setError(null);
    const path = await selectFolder();
    if (!path) return;
    setTargetRoot(path);
    setBusy(true);
    try {
      // Dry run: preview what would be created, nothing touches the disk
      setPreview(await applyStructure(recommendation, path, true));
    } catch (err) {
      setError(String(err));
      setPreview(null);
    } finally {
      setBusy(false);
    }
  };

  const apply = async () => {
    if (!targetRoot) return;
    setBusy(true);
    setError(null);
    try {
      setApplied(await applyStructure(recommendation, targetRoot, false));
    } catch (err) {
      setError(String(err));
    } finally {
      setBusy(false);
    }
  };

  const close = (nextOpen: boolean) => {
    if (!nextOpen) {
      const wasApplied = applied !== null;
      setTargetRoot(null);
      setPreview(null);
      setApplied(null);
      setError(null);
      onOpenChange(false);
      if (wasApplied) onApplied();
      return;
    }
    onOpenChange(nextOpen);
  };

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{t("ai.applyTitle")}</DialogTitle>
          <DialogDescription>{t("ai.applyWhere")}</DialogDescription>
        </DialogHeader>

        {error && (
          <div className="flex items-center gap-2 text-sm text-destructive">
            <AlertCircle className="w-4 h-4 shrink-0" />
            {error}
          </div>
        )}

        {applied ? (
          <div className="flex flex-col items-center gap-3 py-6 text-center">
            <CheckCircle2 className="w-10 h-10 text-success" />
            <p className="font-medium text-foreground">
              {t("ai.applied", { count: applied.created.length })}
            </p>
            {applied.errors.length > 0 && (
              <p className="text-sm text-destructive">{applied.errors.join(", ")}</p>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={() => void pickFolder()} disabled={busy}>
                <FolderOpen className="w-4 h-4 mr-2" />
                {t("ai.chooseFolder")}
              </Button>
              {targetRoot && (
                <span className="text-sm font-mono text-muted-foreground truncate">
                  {targetRoot}
                </span>
              )}
            </div>

            {busy && <Loader2 className="w-5 h-5 animate-spin text-primary" />}

            {preview && (
              <div className="space-y-2">
                <p className="text-sm text-foreground">
                  {t("ai.willCreate", { count: preview.created.length })}
                  {preview.skipped.length > 0 &&
                    ` · ${t("ai.alreadyExist", { count: preview.skipped.length })}`}
                </p>
                <ScrollArea className="max-h-48 rounded-md border border-border">
                  <div className="p-2 space-y-1">
                    {preview.created.map((dir) => (
                      <div key={dir} className="flex items-center gap-2 text-sm">
                        <FolderPlus className="w-3 h-3 text-primary shrink-0" />
                        <span className="font-mono text-xs text-foreground truncate">
                          {dir}
                        </span>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            )}
          </div>
        )}

        <DialogFooter>
          {applied ? (
            <Button onClick={() => close(false)}>{t("common.continue")}</Button>
          ) : (
            <>
              <Button variant="ghost" onClick={() => close(false)}>
                {t("common.cancel")}
              </Button>
              <Button
                onClick={() => void apply()}
                disabled={!preview || preview.created.length === 0 || busy}
              >
                {t("ai.applyConfirm", { count: preview?.created.length ?? 0 })}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
