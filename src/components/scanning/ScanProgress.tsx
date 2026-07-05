import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { Folder, Loader2 } from "lucide-react";
import type { ScanProgress as ScanProgressType } from "@/lib/tauri";

interface ScanProgressProps {
  progress: ScanProgressType | null;
}

export function ScanProgress({ progress }: ScanProgressProps) {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col items-center text-center space-y-8">
      {/* Animated scanning icon */}
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring", stiffness: 200, damping: 15 }}
        className="relative"
      >
        <div className="w-24 h-24 rounded-2xl bg-primary/10 flex items-center justify-center">
          <Folder className="w-12 h-12 text-primary" />
        </div>
        <motion.div
          className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-background flex items-center justify-center"
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
        >
          <Loader2 className="w-5 h-5 text-primary" />
        </motion.div>
      </motion.div>

      {/* Status text */}
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="space-y-3"
      >
        <h2 className="text-2xl font-bold text-foreground">
          {t("scanning.scanning")}
        </h2>

        {progress && (
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              {t("scanning.foldersScanned", {
                count: progress.folders_scanned,
              })}
            </p>
            <p className="text-xs text-muted-foreground font-mono truncate max-w-md">
              {progress.current_path}
            </p>
          </div>
        )}
      </motion.div>

      {/* Pulsing dots */}
      <div className="flex gap-2">
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            className="w-2 h-2 rounded-full bg-primary"
            animate={{ opacity: [0.3, 1, 0.3] }}
            transition={{
              duration: 1.5,
              repeat: Infinity,
              delay: i * 0.3,
            }}
          />
        ))}
      </div>
    </div>
  );
}
