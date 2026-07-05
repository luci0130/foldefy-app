import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { X, RefreshCw, Lightbulb } from "lucide-react";
import { RecommendationLoader } from "./RecommendationLoader";
import { RecommendedStructureTree } from "./RecommendedStructureTree";
import { ApplyStructureDialog } from "./ApplyStructureDialog";
import { useAIStore } from "@/stores/aiStore";
import { useScanStore } from "@/stores/scanStore";
import { useUserStore } from "@/stores/userStore";
import { generateAIRecommendation } from "@/lib/tauri";

interface AIRecommendationProps {
  onComplete: () => void;
  onSkip: () => void;
}

export function AIRecommendation({ onComplete, onSkip }: AIRecommendationProps) {
  const { t } = useTranslation();
  const { profile } = useUserStore();
  const { folderIndex } = useScanStore();
  const [applyOpen, setApplyOpen] = useState(false);
  const {
    recommendation,
    isGenerating,
    error,
    customApiKey,
    setRecommendation,
    setGenerating,
    setError,
  } = useAIStore();

  const generate = async () => {
    if (!profile || !folderIndex) return;

    setGenerating(true);
    setError(null);

    try {
      const result = await generateAIRecommendation(
        profile,
        folderIndex,
        customApiKey
      );
      setRecommendation(result);
    } catch (err) {
      setError(String(err));
    } finally {
      setGenerating(false);
    }
  };

  useEffect(() => {
    if (!recommendation && !isGenerating && !error) {
      generate();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="fixed inset-0 bg-background flex flex-col">
      {/* Skip button */}
      <div className="absolute top-4 right-4 z-10">
        <Button
          variant="ghost"
          size="sm"
          onClick={onSkip}
          className="text-muted-foreground hover:text-foreground"
        >
          {t("common.skip")}
          <X className="w-4 h-4 ml-1" />
        </Button>
      </div>

      {/* Content */}
      <div className="flex-1 flex items-center justify-center overflow-hidden px-8">
        {isGenerating ? (
          <RecommendationLoader />
        ) : error ? (
          <div className="flex flex-col items-center text-center space-y-6">
            <p className="text-destructive">{t("ai.error")}</p>
            <p className="text-xs text-muted-foreground max-w-md">{error}</p>
            <div className="flex gap-3">
              <Button onClick={generate} variant="secondary">
                <RefreshCw className="w-4 h-4 mr-2" />
                {t("ai.regenerate")}
              </Button>
              <Button onClick={onSkip} variant="ghost">
                {t("ai.skipToTemplates")}
              </Button>
            </div>
          </div>
        ) : recommendation ? (
          <div className="flex flex-col items-center text-center space-y-6 w-full max-w-2xl">
            {/* Title */}
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              className="space-y-3"
            >
              <h2 className="text-3xl font-bold text-foreground">
                {t("ai.title")}
              </h2>
              <p className="text-lg text-muted-foreground">
                {t("ai.subtitle")}
              </p>
            </motion.div>

            {/* Tree */}
            <motion.div
              initial={{ y: 30, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="w-full flex justify-center"
            >
              <RecommendedStructureTree
                structure={recommendation.recommended_structure}
              />
            </motion.div>

            {/* Explanation */}
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="w-full max-w-lg bg-surface border border-border rounded-xl p-4 text-left"
            >
              <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">
                {t("ai.explanation")}
              </p>
              <p className="text-sm text-foreground">
                {recommendation.explanation}
              </p>
            </motion.div>

            {/* Tips */}
            {recommendation.tips.length > 0 && (
              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.4 }}
                className="w-full max-w-lg space-y-2"
              >
                <p className="text-xs text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                  <Lightbulb className="w-3 h-3" />
                  {t("ai.tips")}
                </p>
                {recommendation.tips.map((tip, i) => (
                  <p key={i} className="text-sm text-muted-foreground">
                    {tip}
                  </p>
                ))}
              </motion.div>
            )}

            {/* Actions */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="flex gap-3"
            >
              <Button onClick={() => setApplyOpen(true)} size="lg" className="px-8">
                {t("ai.apply")}
              </Button>
              <Button onClick={generate} variant="secondary" size="lg">
                <RefreshCw className="w-4 h-4 mr-2" />
                {t("ai.regenerate")}
              </Button>
              <Button onClick={onSkip} variant="ghost" size="lg">
                {t("ai.skipToTemplates")}
              </Button>
            </motion.div>
          </div>
        ) : null}
      </div>

      {recommendation && (
        <ApplyStructureDialog
          recommendation={recommendation}
          open={applyOpen}
          onOpenChange={setApplyOpen}
          onApplied={onComplete}
        />
      )}
    </div>
  );
}
