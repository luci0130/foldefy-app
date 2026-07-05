import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { HardDrive, Cloud, Usb } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ProfileFormData } from "./ProfileSetup";

interface StorageHabitsStepProps {
  formData: ProfileFormData;
  updateFormData: (updates: Partial<ProfileFormData>) => void;
  onContinue: () => void;
}

const cloudOptions = [
  { id: "google_drive", key: "googleDrive" },
  { id: "onedrive", key: "oneDrive" },
  { id: "dropbox", key: "dropbox" },
  { id: "icloud", key: "iCloud" },
  { id: "none", key: "none" },
];

export function StorageHabitsStep({
  formData,
  updateFormData,
}: StorageHabitsStepProps) {
  const { t } = useTranslation();

  const toggleMultipleDrives = () => {
    updateFormData({
      storageHabits: {
        ...formData.storageHabits,
        uses_multiple_drives: !formData.storageHabits.uses_multiple_drives,
      },
    });
  };

  const toggleExternalStorage = () => {
    updateFormData({
      storageHabits: {
        ...formData.storageHabits,
        uses_external_storage: !formData.storageHabits.uses_external_storage,
      },
    });
  };

  const toggleCloudStorage = (id: string) => {
    const current = formData.storageHabits.uses_cloud_storage;
    let updated: string[];

    if (id === "none") {
      updated = current.includes("none") ? [] : ["none"];
    } else {
      updated = current.includes(id)
        ? current.filter((c) => c !== id)
        : [...current.filter((c) => c !== "none"), id];
    }

    updateFormData({
      storageHabits: {
        ...formData.storageHabits,
        uses_cloud_storage: updated,
      },
    });
  };

  return (
    <div className="flex flex-col items-center text-center space-y-8">
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="space-y-3"
      >
        <h2 className="text-3xl font-bold text-foreground">
          {t("profile.storageHabits.title")}
        </h2>
        <p className="text-lg text-muted-foreground">
          {t("profile.storageHabits.subtitle")}
        </p>
      </motion.div>

      <div className="w-full max-w-lg space-y-4">
        {/* Multiple drives toggle */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.1 }}
          className={cn(
            "flex items-center justify-between p-4 rounded-xl border-2 transition-all cursor-pointer",
            formData.storageHabits.uses_multiple_drives
              ? "border-primary bg-primary/5"
              : "border-border bg-surface hover:bg-surface-hover"
          )}
          onClick={toggleMultipleDrives}
        >
          <div className="flex items-center gap-3">
            <div
              className={cn(
                "w-10 h-10 rounded-lg flex items-center justify-center",
                formData.storageHabits.uses_multiple_drives
                  ? "bg-primary/20 text-primary"
                  : "bg-surface-hover text-muted-foreground"
              )}
            >
              <HardDrive className="w-5 h-5" />
            </div>
            <div className="text-left">
              <p className="text-sm font-medium text-foreground">
                {t("profile.storageHabits.multipleDrives")}
              </p>
              <p className="text-xs text-muted-foreground">
                {t("profile.storageHabits.multipleDrivesDesc")}
              </p>
            </div>
          </div>
          <div
            className={cn(
              "w-12 h-6 rounded-full transition-colors flex items-center px-1",
              formData.storageHabits.uses_multiple_drives
                ? "bg-primary"
                : "bg-muted"
            )}
          >
            <motion.div
              className="w-4 h-4 rounded-full bg-white"
              animate={{
                x: formData.storageHabits.uses_multiple_drives ? 24 : 0,
              }}
              transition={{ type: "spring", stiffness: 500, damping: 30 }}
            />
          </div>
        </motion.div>

        {/* Cloud storage */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="p-4 rounded-xl border-2 border-border bg-surface space-y-3"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-surface-hover text-muted-foreground">
              <Cloud className="w-5 h-5" />
            </div>
            <div className="text-left">
              <p className="text-sm font-medium text-foreground">
                {t("profile.storageHabits.cloudStorage")}
              </p>
              <p className="text-xs text-muted-foreground">
                {t("profile.storageHabits.cloudStorageDesc")}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {cloudOptions.map((option) => {
              const isSelected =
                formData.storageHabits.uses_cloud_storage.includes(option.id);
              return (
                <button
                  key={option.id}
                  onClick={() => toggleCloudStorage(option.id)}
                  className={cn(
                    "px-4 py-2 rounded-lg text-sm font-medium transition-all border",
                    isSelected
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border bg-surface-hover text-muted-foreground hover:text-foreground"
                  )}
                >
                  {t(`profile.storageHabits.${option.key}`)}
                </button>
              );
            })}
          </div>
        </motion.div>

        {/* External storage toggle */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3 }}
          className={cn(
            "flex items-center justify-between p-4 rounded-xl border-2 transition-all cursor-pointer",
            formData.storageHabits.uses_external_storage
              ? "border-primary bg-primary/5"
              : "border-border bg-surface hover:bg-surface-hover"
          )}
          onClick={toggleExternalStorage}
        >
          <div className="flex items-center gap-3">
            <div
              className={cn(
                "w-10 h-10 rounded-lg flex items-center justify-center",
                formData.storageHabits.uses_external_storage
                  ? "bg-primary/20 text-primary"
                  : "bg-surface-hover text-muted-foreground"
              )}
            >
              <Usb className="w-5 h-5" />
            </div>
            <div className="text-left">
              <p className="text-sm font-medium text-foreground">
                {t("profile.storageHabits.externalStorage")}
              </p>
              <p className="text-xs text-muted-foreground">
                {t("profile.storageHabits.externalStorageDesc")}
              </p>
            </div>
          </div>
          <div
            className={cn(
              "w-12 h-6 rounded-full transition-colors flex items-center px-1",
              formData.storageHabits.uses_external_storage
                ? "bg-primary"
                : "bg-muted"
            )}
          >
            <motion.div
              className="w-4 h-4 rounded-full bg-white"
              animate={{
                x: formData.storageHabits.uses_external_storage ? 24 : 0,
              }}
              transition={{ type: "spring", stiffness: 500, damping: 30 }}
            />
          </div>
        </motion.div>
      </div>
    </div>
  );
}
