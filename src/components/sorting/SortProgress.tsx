import { useTranslation } from "react-i18next";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { useSortStore } from "@/stores/sortStore";

export function SortProgress() {
  const { t } = useTranslation();
  const { progress, phase } = useSortStore();

  const percentage =
    progress && progress.total > 0
      ? Math.round((progress.done / progress.total) * 100)
      : null;

  return (
    <Card className="bg-surface border-border">
      <CardContent className="py-8 flex flex-col items-center gap-4">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
        <p className="font-medium text-foreground">
          {phase === "planning" ? t("sorting.planning") : t("sorting.inProgress")}
        </p>
        {progress && (
          <>
            <div className="w-full max-w-md h-2 rounded-full bg-background overflow-hidden">
              <div
                className="h-full bg-primary transition-all"
                style={{ width: `${percentage ?? 0}%` }}
              />
            </div>
            <p className="text-sm text-muted-foreground">
              {progress.done} / {progress.total}
            </p>
            <p className="text-xs text-muted-foreground font-mono truncate max-w-md">
              {progress.current}
            </p>
          </>
        )}
      </CardContent>
    </Card>
  );
}
