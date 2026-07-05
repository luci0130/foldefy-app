import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import {
  FileText,
  Table,
  Image,
  Video,
  Music,
  Code,
  Palette,
  Archive,
  Database,
  Box,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { ProfileFormData } from "./ProfileSetup";

interface FileTypesStepProps {
  formData: ProfileFormData;
  updateFormData: (updates: Partial<ProfileFormData>) => void;
  onContinue: () => void;
}

const fileTypeOptions = [
  { id: "documents", icon: FileText },
  { id: "spreadsheets", icon: Table },
  { id: "images", icon: Image },
  { id: "videos", icon: Video },
  { id: "audio", icon: Music },
  { id: "code", icon: Code },
  { id: "design", icon: Palette },
  { id: "archives", icon: Archive },
  { id: "databases", icon: Database },
  { id: "threeD", icon: Box },
];

export function FileTypesStep({
  formData,
  updateFormData,
}: FileTypesStepProps) {
  const { t } = useTranslation();

  const toggleFileType = (id: string) => {
    const updated = formData.primaryFileTypes.includes(id)
      ? formData.primaryFileTypes.filter((f) => f !== id)
      : [...formData.primaryFileTypes, id];
    updateFormData({ primaryFileTypes: updated });
  };

  return (
    <div className="flex flex-col items-center text-center space-y-8">
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="space-y-3"
      >
        <h2 className="text-3xl font-bold text-foreground">
          {t("profile.fileTypes.title")}
        </h2>
        <p className="text-lg text-muted-foreground">
          {t("profile.fileTypes.subtitle")}
        </p>
      </motion.div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 w-full max-w-2xl">
        {fileTypeOptions.map((option, index) => {
          const isSelected = formData.primaryFileTypes.includes(option.id);
          const Icon = option.icon;

          return (
            <motion.button
              key={option.id}
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.05 + index * 0.03 }}
              onClick={() => toggleFileType(option.id)}
              className={cn(
                "flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all",
                "hover:border-primary/50",
                isSelected
                  ? "border-primary bg-primary/5"
                  : "border-border bg-surface hover:bg-surface-hover"
              )}
            >
              <div
                className={cn(
                  "w-10 h-10 rounded-lg flex items-center justify-center transition-colors",
                  isSelected ? "bg-primary/20 text-primary" : "bg-surface-hover text-muted-foreground"
                )}
              >
                <Icon className="w-5 h-5" />
              </div>
              <span
                className={cn(
                  "text-xs font-medium",
                  isSelected ? "text-foreground" : "text-muted-foreground"
                )}
              >
                {t(`profile.fileTypes.${option.id}`)}
              </span>
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
        {t("common.selected", { count: formData.primaryFileTypes.length })}
      </motion.p>
    </div>
  );
}
