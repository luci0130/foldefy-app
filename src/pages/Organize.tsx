import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { AlertCircle, CheckCircle2, History, RotateCcw, Sparkles } from "lucide-react";
import { useSortStore } from "@/stores/sortStore";
import { ScopePicker } from "@/components/sorting/ScopePicker";
import { ReviewPlan } from "@/components/sorting/ReviewPlan";
import { SortProgress } from "@/components/sorting/SortProgress";
import { UndoCenter } from "@/components/sorting/UndoCenter";

export function Organize() {
  const { t } = useTranslation();
  const {
    phase,
    scopeType,
    selectedFolders,
    reviewFirst,
    setReviewFirst,
    start,
    result,
    error,
    undoResult,
    runUndoBatch,
    resetRun,
  } = useSortStore();
  const [historyOpen, setHistoryOpen] = useState(false);

  // Returning to the page after a finished run starts fresh — the previous
  // run stays available in the sorting history.
  useEffect(() => {
    if (phase === "done") {
      resetRun();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const startDisabled =
    scopeType === "selected_folders" && selectedFolders.length === 0;

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold text-foreground">{t("sorting.title")}</h1>
          <p className="text-muted-foreground">{t("sorting.subtitle")}</p>
        </div>
        <Button variant="outline" onClick={() => setHistoryOpen(true)}>
          <History className="w-4 h-4 mr-2" />
          {t("sorting.history")}
        </Button>
      </div>

      {error && (
        <Card className="bg-destructive/10 border-destructive/50">
          <CardContent className="flex items-center gap-3 py-3">
            <AlertCircle className="w-5 h-5 text-destructive" />
            <p className="text-sm text-destructive">{error}</p>
          </CardContent>
        </Card>
      )}

      {phase === "setup" && (
        <>
          <div className="space-y-2">
            <h2 className="text-lg font-semibold text-foreground">
              {t("sorting.scopeTitle")}
            </h2>
            <ScopePicker />
          </div>

          <Card className="bg-surface border-border">
            <CardContent className="p-4 flex items-center justify-between gap-4">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={reviewFirst}
                  onChange={(e) => setReviewFirst(e.target.checked)}
                  className="accent-primary"
                />
                <div>
                  <p className="text-sm font-medium text-foreground">
                    {t("sorting.reviewFirst")}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {t("sorting.reviewFirstDesc")}
                  </p>
                </div>
              </label>
              <Button size="lg" onClick={() => void start()} disabled={startDisabled}>
                <Sparkles className="w-4 h-4 mr-2" />
                {t("sorting.start")}
              </Button>
            </CardContent>
          </Card>
        </>
      )}

      {(phase === "planning" || phase === "executing") && <SortProgress />}

      {phase === "review" && <ReviewPlan />}

      {phase === "done" && (
        <Card className="bg-surface border-border">
          <CardContent className="py-10 flex flex-col items-center gap-4 text-center">
            <CheckCircle2 className="w-10 h-10 text-success" />
            <div>
              <h2 className="text-lg font-semibold text-foreground">
                {result && result.moved > 0
                  ? t("sorting.doneTitle")
                  : t("sorting.nothingToSort")}
              </h2>
              {result && result.moved > 0 && (
                <p className="text-sm text-muted-foreground mt-1">
                  {t("sorting.doneSummary", { count: result.moved })}
                </p>
              )}
              {result && result.failed.length > 0 && (
                <p className="text-sm text-warning mt-1">
                  {t("sorting.failedSummary", { count: result.failed.length })}
                </p>
              )}
              {undoResult && (
                <p className="text-sm text-muted-foreground mt-1">
                  {t("sorting.undoDone", { count: undoResult.undone })}
                </p>
              )}
            </div>
            <div className="flex gap-3">
              {result && result.moved > 0 && !undoResult && (
                <Button
                  variant="outline"
                  onClick={() => void runUndoBatch(result.batch_id)}
                >
                  <RotateCcw className="w-4 h-4 mr-2" />
                  {t("sorting.undoAll")}
                </Button>
              )}
              <Button onClick={resetRun}>{t("sorting.sortMore")}</Button>
            </div>
          </CardContent>
        </Card>
      )}

      <UndoCenter open={historyOpen} onOpenChange={setHistoryOpen} />
    </div>
  );
}
