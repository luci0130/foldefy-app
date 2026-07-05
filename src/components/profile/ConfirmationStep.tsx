import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { Check, Sparkles, HardDrive, FolderOpen } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { ProfileFormData } from "./ProfileSetup";

interface ConfirmationStepProps {
  formData: ProfileFormData;
  updateFormData: (updates: Partial<ProfileFormData>) => void;
  onContinue: () => void;
}

export function ConfirmationStep({ formData }: ConfirmationStepProps) {
  const { t } = useTranslation();

  const allActivities = [
    ...formData.activities,
    ...(formData.customActivity ? [formData.customActivity] : []),
  ];

  return (
    <div className="flex flex-col items-center text-center space-y-6 max-h-[calc(100vh-12rem)] overflow-y-auto pb-4 px-2">
      {/* Small celebration icon */}
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring", stiffness: 200, damping: 15 }}
        className="relative flex-shrink-0"
      >
        <div className="w-14 h-14 rounded-xl bg-success/20 flex items-center justify-center">
          <Check className="w-7 h-7 text-success" />
        </div>
        <motion.div
          animate={{ rotate: [0, 15, -15, 0] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="absolute -top-1 -right-1"
        >
          <Sparkles className="w-4 h-4 text-warning" />
        </motion.div>
      </motion.div>

      {/* Title */}
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="space-y-2 flex-shrink-0"
      >
        <h2 className="text-2xl font-bold text-foreground">
          {t("profile.confirmation.title")}
        </h2>
        <p className="text-sm text-muted-foreground">
          {t("profile.confirmation.subtitle")}
        </p>
      </motion.div>

      {/* Summary card - compact */}
      <motion.div
        initial={{ y: 30, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="w-full max-w-md bg-surface border border-border rounded-xl p-4 space-y-3 text-left flex-shrink-0"
      >
        {/* Usage type */}
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground uppercase tracking-wider">
            {t("profile.confirmation.usageType")}
          </p>
          <p className="text-sm font-medium text-foreground">
            {t(`profile.usageType.${formData.usageType}`)}
          </p>
        </div>

        {/* Activities */}
        {allActivities.length > 0 && (
          <div className="space-y-1.5">
            <p className="text-xs text-muted-foreground uppercase tracking-wider">
              {t("profile.confirmation.activities")}
            </p>
            <div className="flex flex-wrap gap-1">
              {allActivities.map((activity) => (
                <Badge
                  key={activity}
                  variant="secondary"
                  className="bg-surface-hover text-foreground text-xs"
                >
                  {t(`profile.activity.${activity}`, activity)}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Project types */}
        {formData.projectTypes.length > 0 && (
          <div className="space-y-1.5">
            <p className="text-xs text-muted-foreground uppercase tracking-wider">
              {t("profile.confirmation.projectTypes")}
            </p>
            <div className="flex flex-wrap gap-1">
              {formData.projectTypes.map((pt) => (
                <Badge
                  key={pt}
                  variant="secondary"
                  className="bg-surface-hover text-foreground text-xs"
                >
                  {t(`profile.projectTypes.${pt}`, pt)}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Organization style */}
        {formData.organizationStyle.length > 0 && (
          <div className="space-y-1.5">
            <p className="text-xs text-muted-foreground uppercase tracking-wider">
              {t("profile.confirmation.organizationStyle")}
            </p>
            <div className="flex flex-wrap gap-1">
              {formData.organizationStyle.map((style) => {
                const keyMap: Record<string, string> = {
                  by_date: "byDate",
                  by_project: "byProject",
                  by_type: "byType",
                  by_client: "byClient",
                  by_status: "byStatus",
                  no_pattern: "noPattern",
                };
                return (
                  <Badge
                    key={style}
                    variant="secondary"
                    className="bg-surface-hover text-foreground text-xs"
                  >
                    {t(
                      `profile.organizationStyle.${keyMap[style] || style}`,
                      style
                    )}
                  </Badge>
                );
              })}
            </div>
          </div>
        )}
      </motion.div>

      {/* Scan selection */}
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="w-full max-w-md space-y-2 flex-shrink-0"
      >
        <p className="text-sm font-medium text-foreground">
          {t("scanning.title")}
        </p>
        <p className="text-xs text-muted-foreground mb-3">
          {t("scanning.subtitle")}
        </p>

        <div className="grid grid-cols-2 gap-3">
          {/* Entire Storage */}
          <button
            onClick={() => {}}
            data-scan-mode="entire"
            className={cn(
              "relative flex flex-col items-center gap-3 p-5 rounded-xl border-2 transition-all",
              "hover:border-primary/50 hover:bg-surface-hover",
              formData.scanMode === "entire"
                ? "border-primary bg-primary/5"
                : "border-border bg-surface"
            )}
          >
            <div className="absolute top-2 right-2">
              <span className="px-1.5 py-0.5 rounded bg-primary/10 text-primary text-[10px] font-medium flex items-center gap-0.5">
                <Sparkles className="w-2.5 h-2.5" />
                {t("scanning.recommended")}
              </span>
            </div>
            <div className="w-12 h-12 rounded-full flex items-center justify-center bg-primary/10 mt-2">
              <HardDrive className="w-6 h-6 text-primary" />
            </div>
            <div className="space-y-1">
              <h3 className="font-medium text-sm text-foreground">
                {t("scanning.entireStorage")}
              </h3>
              <p className="text-xs text-muted-foreground">
                {t("scanning.entireStorageDesc")}
              </p>
            </div>
          </button>

          {/* Specific Folder */}
          <button
            onClick={() => {}}
            data-scan-mode="folder"
            className={cn(
              "flex flex-col items-center gap-3 p-5 rounded-xl border-2 transition-all",
              "hover:border-primary/50 hover:bg-surface-hover",
              formData.scanMode === "folder"
                ? "border-primary bg-primary/5"
                : "border-border bg-surface"
            )}
          >
            <div className="w-12 h-12 rounded-full flex items-center justify-center bg-surface-hover mt-4">
              <FolderOpen className="w-6 h-6 text-muted-foreground" />
            </div>
            <div className="space-y-1">
              <h3 className="font-medium text-sm text-foreground">
                {t("scanning.specificFolder")}
              </h3>
              <p className="text-xs text-muted-foreground">
                {t("scanning.specificFolderDesc")}
              </p>
            </div>
          </button>
        </div>
      </motion.div>
    </div>
  );
}
