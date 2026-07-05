import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useSortStore } from "@/stores/sortStore";
import type { PlannedMove } from "@/lib/tauri";
import { ArrowRight, FolderClosed, ShieldAlert, HelpCircle } from "lucide-react";

export function ReviewPlan() {
  const { t } = useTranslation();
  const { plan, execute, resetRun } = useSortStore();
  const [excluded, setExcluded] = useState<Set<number>>(new Set());

  const byCategory = useMemo(() => {
    const groups = new Map<string, PlannedMove[]>();
    for (const entry of plan?.entries ?? []) {
      const group = groups.get(entry.category) ?? [];
      group.push(entry);
      groups.set(entry.category, group);
    }
    return [...groups.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [plan]);

  if (!plan) return null;

  const selectedCount = plan.entries.length - excluded.size;

  const toggle = (journalId: number) => {
    setExcluded((prev) => {
      const next = new Set(prev);
      if (next.has(journalId)) {
        next.delete(journalId);
      } else {
        next.add(journalId);
      }
      return next;
    });
  };

  const apply = () => {
    const ids = plan.entries
      .filter((e) => !excluded.has(e.journal_id))
      .map((e) => e.journal_id);
    void execute(ids);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">
            {t("sorting.reviewTitle")}
          </h2>
          <p className="text-sm text-muted-foreground">
            {t("sorting.reviewSubtitle", { count: plan.entries.length })}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={resetRun}>
            {t("common.cancel")}
          </Button>
          <Button onClick={apply} disabled={selectedCount === 0}>
            {t("sorting.apply", { count: selectedCount })}
          </Button>
        </div>
      </div>

      <div className="space-y-3">
        {byCategory.map(([category, entries]) => (
          <Card key={category} className="bg-surface border-border">
            <CardHeader className="py-3">
              <CardTitle className="text-base flex items-center gap-2">
                <FolderClosed className="w-4 h-4 text-primary" />
                {category}
                <Badge variant="secondary">
                  {t("sorting.filesCount", { count: entries.length })}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-1 pb-3">
              {entries.map((entry) => (
                <label
                  key={entry.journal_id}
                  className="flex items-center gap-3 rounded-md px-2 py-1.5 hover:bg-surface-hover cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={!excluded.has(entry.journal_id)}
                    onChange={() => toggle(entry.journal_id)}
                    className="accent-primary"
                  />
                  <span className="text-sm text-foreground truncate flex-1">
                    {entry.file_name}
                  </span>
                  <span className="text-xs text-muted-foreground hidden md:inline">
                    {entry.reason}
                  </span>
                  <ArrowRight className="w-3 h-3 text-muted-foreground shrink-0" />
                  <span className="text-xs text-muted-foreground truncate max-w-[200px]">
                    {category}
                  </span>
                </label>
              ))}
            </CardContent>
          </Card>
        ))}
      </div>

      {plan.needs_review.length > 0 && (
        <Card className="bg-surface border-border">
          <CardHeader className="py-3">
            <CardTitle className="text-base flex items-center gap-2">
              <HelpCircle className="w-4 h-4 text-warning" />
              {t("sorting.needsReview", { count: plan.needs_review.length })}
            </CardTitle>
          </CardHeader>
          <CardContent className="pb-3">
            <p className="text-sm text-muted-foreground mb-2">
              {t("sorting.needsReviewDesc")}
            </p>
            <div className="space-y-1">
              {plan.needs_review.map((file) => (
                <div key={file.path} className="flex items-center gap-2 text-sm">
                  <span className="text-foreground truncate">{file.file_name}</span>
                  <span className="text-xs text-muted-foreground">({file.reason})</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {plan.skipped_protected.length > 0 && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <ShieldAlert className="w-4 h-4" />
          {t("sorting.protectedSkipped", { count: plan.skipped_protected.length })}
        </div>
      )}
    </div>
  );
}
