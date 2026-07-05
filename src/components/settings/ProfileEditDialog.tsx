import { useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { LanguageStep } from "@/components/profile/LanguageStep";
import { UsageTypeStep } from "@/components/profile/UsageTypeStep";
import { ActivityStep } from "@/components/profile/ActivityStep";
import { ProjectTypesStep } from "@/components/profile/ProjectTypesStep";
import { OrganizationStyleStep } from "@/components/profile/OrganizationStyleStep";
import { FileTypesStep } from "@/components/profile/FileTypesStep";
import { StorageHabitsStep } from "@/components/profile/StorageHabitsStep";
import { useUserStore } from "@/stores/userStore";
import type { ProfileFormData } from "@/components/profile/ProfileSetup";
import type { UserProfile } from "@/lib/tauri";

export type EditableField =
  | "language"
  | "usageType"
  | "activities"
  | "projectTypes"
  | "organizationStyle"
  | "fileTypes"
  | "storageHabits";

interface ProfileEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  field: EditableField;
  profile: UserProfile;
}

const fieldTitles: Record<EditableField, string> = {
  language: "settings.language",
  usageType: "settings.usageType",
  activities: "settings.activities",
  projectTypes: "settings.projectTypes",
  organizationStyle: "settings.organizationStyle",
  fileTypes: "settings.fileTypes",
  storageHabits: "settings.storageHabits",
};

function profileToFormData(profile: UserProfile): ProfileFormData {
  return {
    language: profile.language,
    usageType: profile.usage_type,
    activities: profile.activities,
    customActivity: "",
    projectTypes: profile.project_types,
    organizationStyle: profile.organization_style,
    primaryFileTypes: profile.primary_file_types,
    storageHabits: profile.storage_habits ?? {
      uses_multiple_drives: false,
      uses_cloud_storage: [],
      uses_external_storage: false,
    },
    scanMode: null,
  };
}

export function ProfileEditDialog({
  open,
  onOpenChange,
  field,
  profile,
}: ProfileEditDialogProps) {
  const { t } = useTranslation();
  const { updateProfile, setLanguage } = useUserStore();
  const [formData, setFormData] = useState<ProfileFormData>(() =>
    profileToFormData(profile)
  );

  // Reset form data when dialog opens with new field/profile
  const handleOpenChange = useCallback(
    (isOpen: boolean) => {
      if (isOpen) {
        setFormData(profileToFormData(profile));
      }
      onOpenChange(isOpen);
    },
    [profile, onOpenChange]
  );

  const updateFormData = useCallback(
    (updates: Partial<ProfileFormData>) => {
      setFormData((prev) => ({ ...prev, ...updates }));
      if (updates.language) {
        setLanguage(updates.language);
      }
    },
    [setLanguage]
  );

  const noop = useCallback(() => {}, []);

  const handleSave = () => {
    const updates: Partial<UserProfile> = {};

    switch (field) {
      case "language":
        updates.language = formData.language;
        break;
      case "usageType":
        updates.usage_type = formData.usageType;
        break;
      case "activities":
        updates.activities = formData.customActivity
          ? [...formData.activities, formData.customActivity]
          : formData.activities;
        break;
      case "projectTypes":
        updates.project_types = formData.projectTypes;
        break;
      case "organizationStyle":
        updates.organization_style = formData.organizationStyle;
        break;
      case "fileTypes":
        updates.primary_file_types = formData.primaryFileTypes;
        break;
      case "storageHabits":
        updates.storage_habits = formData.storageHabits;
        break;
    }

    updateProfile(updates);
    onOpenChange(false);
  };

  const handleCancel = () => {
    // Revert language change if cancelled
    if (field === "language") {
      setLanguage(profile.language);
    }
    onOpenChange(false);
  };

  const stepComponents: Record<EditableField, React.ComponentType<{
    formData: ProfileFormData;
    updateFormData: (updates: Partial<ProfileFormData>) => void;
    onContinue: () => void;
  }>> = {
    language: LanguageStep,
    usageType: UsageTypeStep,
    activities: ActivityStep,
    projectTypes: ProjectTypesStep,
    organizationStyle: OrganizationStyleStep,
    fileTypes: FileTypesStep,
    storageHabits: StorageHabitsStep,
  };

  const StepComponent = stepComponents[field];

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t(fieldTitles[field])}</DialogTitle>
          <DialogDescription>{t("settings.editProfileDesc")}</DialogDescription>
        </DialogHeader>

        <div className="py-4">
          <StepComponent
            formData={formData}
            updateFormData={updateFormData}
            onContinue={noop}
          />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleCancel}>
            {t("common.cancel")}
          </Button>
          <Button onClick={handleSave}>{t("common.save")}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
