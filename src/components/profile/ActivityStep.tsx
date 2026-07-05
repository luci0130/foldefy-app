import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { ProfileFormData } from "./ProfileSetup";

interface ActivityStepProps {
  formData: ProfileFormData;
  updateFormData: (updates: Partial<ProfileFormData>) => void;
  onContinue: () => void;
}

const activityOptions = [
  { id: "accountant", emoji: "\uD83D\uDCCA" },
  { id: "photographer", emoji: "\uD83D\uDCF8" },
  { id: "developer", emoji: "\uD83D\uDCBB" },
  { id: "manager", emoji: "\uD83D\uDC54" },
  { id: "hr", emoji: "\uD83D\uDC65" },
  { id: "designer", emoji: "\uD83C\uDFA8" },
  { id: "writer", emoji: "\uD83D\uDCDD" },
  { id: "student", emoji: "\uD83C\uDF93" },
  { id: "healthcare", emoji: "\uD83C\uDFE5" },
  { id: "marketing", emoji: "\uD83D\uDCE3" },
  { id: "legal", emoji: "\u2696\uFE0F" },
  { id: "engineering", emoji: "\uD83D\uDD27" },
  { id: "researcher", emoji: "\uD83D\uDD2C" },
  { id: "realEstate", emoji: "\uD83C\uDFE0" },
  { id: "music", emoji: "\uD83C\uDFB5" },
  { id: "ecommerce", emoji: "\uD83D\uDED2" },
];

export function ActivityStep({
  formData,
  updateFormData,
}: ActivityStepProps) {
  const { t } = useTranslation();

  const toggleActivity = (id: string) => {
    const updated = formData.activities.includes(id)
      ? formData.activities.filter((a) => a !== id)
      : [...formData.activities, id];
    updateFormData({ activities: updated });
  };

  return (
    <div className="flex flex-col items-center text-center space-y-8">
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="space-y-3"
      >
        <h2 className="text-3xl font-bold text-foreground">
          {t("profile.activity.title")}
        </h2>
        <p className="text-lg text-muted-foreground">
          {t("profile.activity.subtitle")}
        </p>
      </motion.div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 w-full max-w-2xl">
        {activityOptions.map((option, index) => {
          const isSelected = formData.activities.includes(option.id);

          return (
            <motion.button
              key={option.id}
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.05 + index * 0.02 }}
              onClick={() => toggleActivity(option.id)}
              className={cn(
                "flex items-center gap-3 p-3 rounded-xl border-2 transition-all text-left",
                "hover:border-primary/50",
                isSelected
                  ? "border-primary bg-primary/5"
                  : "border-border bg-surface hover:bg-surface-hover"
              )}
            >
              <span className="text-xl">{option.emoji}</span>
              <span
                className={cn(
                  "text-xs font-medium",
                  isSelected ? "text-foreground" : "text-muted-foreground"
                )}
              >
                {t(`profile.activity.${option.id}`)}
              </span>
            </motion.button>
          );
        })}

        {/* Other option with input */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.05 + activityOptions.length * 0.02 }}
          className={cn(
            "flex items-center gap-3 p-3 rounded-xl border-2 transition-all",
            formData.customActivity
              ? "border-primary bg-primary/5"
              : "border-border bg-surface"
          )}
        >
          <span className="text-xl">{"\uD83D\uDCE6"}</span>
          <Input
            value={formData.customActivity}
            onChange={(e) => updateFormData({ customActivity: e.target.value })}
            placeholder={t("profile.activity.other")}
            className="border-0 bg-transparent p-0 h-auto text-xs focus-visible:ring-0"
          />
        </motion.div>
      </div>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="text-sm text-muted-foreground"
      >
        {t("common.selected", {
          count: formData.activities.length + (formData.customActivity ? 1 : 0),
        })}
      </motion.p>
    </div>
  );
}
