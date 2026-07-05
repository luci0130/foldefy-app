import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { HardDrive, FolderOpen, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

interface ScanModeSelectorProps {
  onSelectEntire: () => void;
  onSelectFolder: () => void;
}

export function ScanModeSelector({
  onSelectEntire,
  onSelectFolder,
}: ScanModeSelectorProps) {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col items-center text-center space-y-8">
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="space-y-3"
      >
        <h2 className="text-3xl font-bold text-foreground">
          {t("scanning.title")}
        </h2>
        <p className="text-lg text-muted-foreground">
          {t("scanning.subtitle")}
        </p>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-2xl">
        {/* Entire Storage */}
        <motion.button
          initial={{ y: 30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.1 }}
          onClick={onSelectEntire}
          className={cn(
            "relative flex flex-col items-center gap-4 p-8 rounded-xl border-2 transition-all",
            "hover:border-primary/50 hover:bg-surface-hover",
            "border-border bg-surface"
          )}
        >
          <div className="absolute top-3 right-3">
            <span className="px-2 py-1 rounded-md bg-primary/10 text-primary text-xs font-medium flex items-center gap-1">
              <Sparkles className="w-3 h-3" />
              {t("scanning.recommended")}
            </span>
          </div>

          <div className="w-16 h-16 rounded-full flex items-center justify-center bg-primary/10">
            <HardDrive className="w-8 h-8 text-primary" />
          </div>

          <div className="space-y-2">
            <h3 className="font-semibold text-lg text-foreground">
              {t("scanning.entireStorage")}
            </h3>
            <p className="text-sm text-muted-foreground">
              {t("scanning.entireStorageDesc")}
            </p>
          </div>
        </motion.button>

        {/* Specific Folder */}
        <motion.button
          initial={{ y: 30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
          onClick={onSelectFolder}
          className={cn(
            "flex flex-col items-center gap-4 p-8 rounded-xl border-2 transition-all",
            "hover:border-primary/50 hover:bg-surface-hover",
            "border-border bg-surface"
          )}
        >
          <div className="w-16 h-16 rounded-full flex items-center justify-center bg-surface-hover">
            <FolderOpen className="w-8 h-8 text-muted-foreground" />
          </div>

          <div className="space-y-2">
            <h3 className="font-semibold text-lg text-foreground">
              {t("scanning.specificFolder")}
            </h3>
            <p className="text-sm text-muted-foreground">
              {t("scanning.specificFolderDesc")}
            </p>
          </div>
        </motion.button>
      </div>
    </div>
  );
}
