import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useUserStore } from "@/stores/userStore";
import { useAppStore } from "@/stores/appStore";
import { useScanStore } from "@/stores/scanStore";
import { User, Palette, Bell, Shield, RotateCcw, Pencil, Search, RefreshCw, Loader2, Square } from "lucide-react";
import {
  ProfileEditDialog,
  type EditableField,
} from "@/components/settings/ProfileEditDialog";
import { AISettings } from "@/components/settings/AISettings";

const languages: Record<string, string> = {
  en: "English",
  ro: "Romana",
  fr: "Francais",
  de: "Deutsch",
  es: "Espanol",
};

const organizationStyleKeys: Record<string, string> = {
  by_date: "byDate",
  by_project: "byProject",
  by_type: "byType",
  by_client: "byClient",
  by_status: "byStatus",
  no_pattern: "noPattern",
};

export function Settings() {
  const { t } = useTranslation();
  const { profile, reset: resetUser } = useUserStore();
  const { setShowOnboarding } = useAppStore();
  const { maxDepth, setMaxDepth, isScanning, reindexAll, cancelScan } = useScanStore();
  const [editField, setEditField] = useState<EditableField | null>(null);

  const handleResetOnboarding = () => {
    resetUser();
    setShowOnboarding(true);
  };

  const openEdit = (field: EditableField) => setEditField(field);

  const formatValue = (field: EditableField): string => {
    if (!profile) return "-";

    switch (field) {
      case "language":
        return languages[profile.language] ?? profile.language;
      case "usageType":
        return t(`profile.usageType.${profile.usage_type}`);
      case "activities":
        return profile.activities.length > 0
          ? profile.activities.map((a) => t(`profile.activity.${a}`)).join(", ")
          : t("profile.confirmation.noActivities");
      case "projectTypes":
        return profile.project_types.length > 0
          ? profile.project_types.map((p) => t(`profile.projectTypes.${p}`)).join(", ")
          : "-";
      case "organizationStyle":
        return profile.organization_style.length > 0
          ? profile.organization_style
              .map((s) => t(`profile.organizationStyle.${organizationStyleKeys[s] ?? s}`))
              .join(", ")
          : "-";
      case "fileTypes":
        return profile.primary_file_types.length > 0
          ? profile.primary_file_types.map((f) => t(`profile.fileTypes.${f}`)).join(", ")
          : "-";
      case "storageHabits": {
        const habits = profile.storage_habits;
        if (!habits) return "-";
        const parts: string[] = [];
        if (habits.uses_multiple_drives) parts.push(t("profile.confirmation.multipleDrives"));
        if (habits.uses_external_storage) parts.push(t("profile.confirmation.externalStorage"));
        if (habits.uses_cloud_storage.length > 0) {
          parts.push(habits.uses_cloud_storage.filter((c) => c !== "none").join(", "));
        }
        return parts.length > 0 ? parts.join(" | ") : "-";
      }
    }
  };

  const profileFields: { field: EditableField; labelKey: string }[] = [
    { field: "language", labelKey: "settings.language" },
    { field: "usageType", labelKey: "settings.usageType" },
    { field: "activities", labelKey: "settings.activities" },
    { field: "projectTypes", labelKey: "settings.projectTypes" },
    { field: "organizationStyle", labelKey: "settings.organizationStyle" },
    { field: "fileTypes", labelKey: "settings.fileTypes" },
    { field: "storageHabits", labelKey: "settings.storageHabits" },
  ];

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-2xl font-bold text-foreground">{t("settings.title")}</h1>
        <p className="text-muted-foreground">
          {t("settings.editProfileDesc")}
        </p>
      </div>

      {/* Profile section */}
      <Card className="bg-surface border-border">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <User className="w-5 h-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-lg">{t("settings.profile")}</CardTitle>
              <CardDescription>{t("settings.editProfile")}</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-1">
          {profile ? (
            profileFields.map(({ field, labelKey }, index) => (
              <div key={field}>
                {index > 0 && <Separator className="bg-border my-1" />}
                <div className="flex items-center justify-between py-2">
                  <div className="flex-1 min-w-0 mr-4">
                    <p className="text-sm text-muted-foreground">{t(labelKey)}</p>
                    <p className="text-sm text-foreground truncate">
                      {formatValue(field)}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="shrink-0 h-8 w-8"
                    onClick={() => openEdit(field)}
                  >
                    <Pencil className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))
          ) : (
            <p className="text-muted-foreground">{t("settings.noProfile")}</p>
          )}
        </CardContent>
      </Card>

      {/* Scanning section */}
      <Card className="bg-surface border-border">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Search className="w-5 h-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-lg">{t("settings.scanning")}</CardTitle>
              <CardDescription>{t("settings.scanDepthDesc")}</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-foreground">
                {t("settings.scanDepth")}
              </p>
              <p className="text-sm text-muted-foreground">
                {t("settings.scanDepthDesc")}
              </p>
            </div>
            <input
              type="number"
              min={1}
              max={20}
              value={maxDepth}
              onChange={(e) => {
                const val = Math.min(20, Math.max(1, Number(e.target.value)));
                setMaxDepth(val);
              }}
              className="w-16 h-9 rounded-md border border-border bg-background px-3 text-sm text-foreground text-center focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <Separator className="bg-border my-3" />
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-foreground">
                {t("settings.reindexStorage")}
              </p>
              <p className="text-sm text-muted-foreground">
                {t("settings.reindexStorageDesc")}
              </p>
            </div>
            <div className="flex gap-2">
              {isScanning && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => cancelScan()}
                  className="border-destructive text-destructive hover:bg-destructive/10"
                >
                  <Square className="w-4 h-4 mr-2 fill-current" />
                  {t("scanning.stop")}
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={() => reindexAll()}
                disabled={isScanning}
                className="border-border"
              >
                {isScanning ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <RefreshCw className="w-4 h-4 mr-2" />
                )}
                {isScanning ? t("settings.reindexing") : t("settings.reindex")}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* AI section */}
      <AISettings />

      {/* Appearance section */}
      <Card className="bg-surface border-border">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Palette className="w-5 h-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-lg">{t("settings.appearance")}</CardTitle>
              <CardDescription>{t("common.comingSoon")}</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            {t("common.comingSoon")}
          </p>
        </CardContent>
      </Card>

      {/* Notifications section */}
      <Card className="bg-surface border-border">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Bell className="w-5 h-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-lg">{t("settings.notifications")}</CardTitle>
              <CardDescription>{t("common.comingSoon")}</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            {t("common.comingSoon")}
          </p>
        </CardContent>
      </Card>

      {/* Privacy section */}
      <Card className="bg-surface border-border">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Shield className="w-5 h-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-lg">{t("settings.privacy")}</CardTitle>
              <CardDescription>
                {t("settings.privacyDesc")}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            {t("settings.dataLocal")}
          </p>
          <Separator className="bg-border" />
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-foreground">
                {t("settings.resetOnboarding")}
              </p>
              <p className="text-sm text-muted-foreground">
                {t("settings.resetOnboardingDesc")}
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleResetOnboarding}
              className="border-border"
            >
              <RotateCcw className="w-4 h-4 mr-2" />
              {t("settings.reset")}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Edit dialog */}
      {profile && editField && (
        <ProfileEditDialog
          open={!!editField}
          onOpenChange={(open) => !open && setEditField(null)}
          field={editField}
          profile={profile}
        />
      )}
    </div>
  );
}
