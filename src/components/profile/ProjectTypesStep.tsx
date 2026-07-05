import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import type { ProfileFormData } from "./ProfileSetup";

interface ProjectTypesStepProps {
  formData: ProfileFormData;
  updateFormData: (updates: Partial<ProfileFormData>) => void;
  onContinue: () => void;
}

const projectOptions = [
  { id: "client", emoji: "\uD83E\uDD1D" },
  { id: "personal", emoji: "\uD83C\uDFE0" },
  { id: "research", emoji: "\uD83D\uDD2C" },
  { id: "creative", emoji: "\uD83C\uDFA8" },
  { id: "business", emoji: "\uD83D\uDCBC" },
  { id: "teaching", emoji: "\uD83D\uDCDA" },
  { id: "openSource", emoji: "\uD83C\uDF10" },
];

export function ProjectTypesStep({
  formData,
  updateFormData,
}: ProjectTypesStepProps) {
  const { t } = useTranslation();

  const toggleProject = (id: string) => {
    const updated = formData.projectTypes.includes(id)
      ? formData.projectTypes.filter((p) => p !== id)
      : [...formData.projectTypes, id];
    updateFormData({ projectTypes: updated });
  };

  return (
    <div className="flex flex-col items-center text-center space-y-8">
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="space-y-3"
      >
        <h2 className="text-3xl font-bold text-foreground">
          {t("profile.projectTypes.title")}
        </h2>
        <p className="text-lg text-muted-foreground">
          {t("profile.projectTypes.subtitle")}
        </p>
      </motion.div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 w-full max-w-2xl">
        {projectOptions.map((option, index) => {
          const isSelected = formData.projectTypes.includes(option.id);

          return (
            <motion.button
              key={option.id}
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.05 + index * 0.03 }}
              onClick={() => toggleProject(option.id)}
              className={cn(
                "flex flex-col items-center gap-3 p-5 rounded-xl border-2 transition-all",
                "hover:border-primary/50",
                isSelected
                  ? "border-primary bg-primary/5"
                  : "border-border bg-surface hover:bg-surface-hover"
              )}
            >
              <span className="text-2xl">{option.emoji}</span>
              <div className="space-y-1">
                <span
                  className={cn(
                    "text-sm font-medium",
                    isSelected ? "text-foreground" : "text-muted-foreground"
                  )}
                >
                  {t(`profile.projectTypes.${option.id}`)}
                </span>
                <p className="text-xs text-muted-foreground">
                  {t(`profile.projectTypes.${option.id}Desc`)}
                </p>
              </div>
            </motion.button>
          );
        })}
      </div>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="text-sm text-muted-foreground"
      >
        {t("common.selected", { count: formData.projectTypes.length })}
      </motion.p>
    </div>
  );
}
