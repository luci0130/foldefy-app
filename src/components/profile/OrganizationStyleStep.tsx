import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import {
  Calendar,
  FolderKanban,
  FileType2,
  Users,
  Activity,
  Shuffle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { ProfileFormData } from "./ProfileSetup";

interface OrganizationStyleStepProps {
  formData: ProfileFormData;
  updateFormData: (updates: Partial<ProfileFormData>) => void;
  onContinue: () => void;
}

const styleOptions = [
  { id: "by_date", icon: Calendar },
  { id: "by_project", icon: FolderKanban },
  { id: "by_type", icon: FileType2 },
  { id: "by_client", icon: Users },
  { id: "by_status", icon: Activity },
  { id: "no_pattern", icon: Shuffle },
];

const styleKeyMap: Record<string, string> = {
  by_date: "byDate",
  by_project: "byProject",
  by_type: "byType",
  by_client: "byClient",
  by_status: "byStatus",
  no_pattern: "noPattern",
};

export function OrganizationStyleStep({
  formData,
  updateFormData,
}: OrganizationStyleStepProps) {
  const { t } = useTranslation();

  const toggleStyle = (id: string) => {
    const updated = formData.organizationStyle.includes(id)
      ? formData.organizationStyle.filter((s) => s !== id)
      : [...formData.organizationStyle, id];
    updateFormData({ organizationStyle: updated });
  };

  return (
    <div className="flex flex-col items-center text-center space-y-8">
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="space-y-3"
      >
        <h2 className="text-3xl font-bold text-foreground">
          {t("profile.organizationStyle.title")}
        </h2>
        <p className="text-lg text-muted-foreground">
          {t("profile.organizationStyle.subtitle")}
        </p>
      </motion.div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 w-full max-w-2xl">
        {styleOptions.map((option, index) => {
          const isSelected = formData.organizationStyle.includes(option.id);
          const Icon = option.icon;
          const key = styleKeyMap[option.id];

          return (
            <motion.button
              key={option.id}
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.05 + index * 0.03 }}
              onClick={() => toggleStyle(option.id)}
              className={cn(
                "flex flex-col items-center gap-3 p-5 rounded-xl border-2 transition-all",
                "hover:border-primary/50",
                isSelected
                  ? "border-primary bg-primary/5"
                  : "border-border bg-surface hover:bg-surface-hover"
              )}
            >
              <div
                className={cn(
                  "w-12 h-12 rounded-lg flex items-center justify-center transition-colors",
                  isSelected ? "bg-primary/20 text-primary" : "bg-surface-hover text-muted-foreground"
                )}
              >
                <Icon className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <span
                  className={cn(
                    "text-sm font-medium",
                    isSelected ? "text-foreground" : "text-muted-foreground"
                  )}
                >
                  {t(`profile.organizationStyle.${key}`)}
                </span>
                <p className="text-xs text-muted-foreground">
                  {t(`profile.organizationStyle.${key}Desc`)}
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
        {t("common.selected", { count: formData.organizationStyle.length })}
      </motion.p>
    </div>
  );
}
