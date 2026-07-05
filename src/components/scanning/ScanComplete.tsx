import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { Check, FolderTree } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { FolderIndex } from "@/lib/tauri";

interface ScanCompleteProps {
  folderIndex: FolderIndex[];
  onContinue: () => void;
}

export function ScanComplete({ folderIndex, onContinue }: ScanCompleteProps) {
  const { t } = useTranslation();

  const totalFolders = folderIndex.reduce(
    (sum, idx) => sum + idx.total_folders,
    0
  );

  return (
    <div className="flex flex-col items-center text-center space-y-8">
      {/* Success icon */}
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring", stiffness: 200, damping: 15 }}
        className="relative"
      >
        <div className="w-20 h-20 rounded-2xl bg-success/20 flex items-center justify-center">
          <Check className="w-10 h-10 text-success" />
        </div>
      </motion.div>

      {/* Title */}
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="space-y-3"
      >
        <h2 className="text-3xl font-bold text-foreground">
          {t("scanning.scanComplete")}
        </h2>
        <p className="text-lg text-muted-foreground">
          {t("scanning.scanSummary", { folders: totalFolders })}
        </p>
      </motion.div>

      {/* Drive summaries */}
      <motion.div
        initial={{ y: 30, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="w-full max-w-md space-y-3"
      >
        {folderIndex.map((idx, i) => (
          <motion.div
            key={idx.root_path}
            initial={{ x: -20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.4 + i * 0.1 }}
            className="flex items-center gap-3 p-4 rounded-xl bg-surface border border-border"
          >
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <FolderTree className="w-5 h-5 text-primary" />
            </div>
            <div className="text-left flex-1">
              <p className="text-sm font-medium text-foreground">
                {idx.root_path}
              </p>
              <p className="text-xs text-muted-foreground">
                {t("scanning.foldersScanned", {
                  count: idx.total_folders,
                })}
              </p>
            </div>
          </motion.div>
        ))}
      </motion.div>

      {/* Continue button */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6 }}
      >
        <Button onClick={onContinue} size="lg" className="px-8">
          {t("scanning.continue")}
        </Button>
      </motion.div>
    </div>
  );
}
