import { useTranslation } from "react-i18next";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FolderOpen, Sparkles, ShoppingBag, ArrowRight, Folder, Loader2, CheckCircle2, RefreshCw, Square } from "lucide-react";
import { motion } from "framer-motion";
import { useAppStore } from "@/stores/appStore";
import { useScanStore } from "@/stores/scanStore";

export function Dashboard() {
  const { t } = useTranslation();
  const { setCurrentPage, setShowAIRecommendation } = useAppStore();
  const { isScanning, scanProgress, folderIndex, reindexAll, cancelScan } = useScanStore();

  const totalFolders = folderIndex?.reduce((sum, idx) => sum + idx.total_folders, 0) ?? 0;

  return (
    <div className="space-y-6">
      {/* Welcome section */}
      <div className="space-y-2">
        <h1 className="text-2xl font-bold text-foreground">{t("dashboard.welcome")}</h1>
        <p className="text-muted-foreground">
          {t("onboarding.welcome.subtitle")}
        </p>
      </div>

      {/* Indexing progress card */}
      {isScanning && (
        <Card className="bg-surface border-primary/30 border-2">
          <CardContent className="py-6">
            <div className="flex items-center gap-4">
              <div className="relative shrink-0">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Folder className="w-6 h-6 text-primary" />
                </div>
                <motion.div
                  className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-background flex items-center justify-center"
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                >
                  <Loader2 className="w-4 h-4 text-primary" />
                </motion.div>
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-semibold text-foreground">
                  {t("dashboard.indexing")}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {t("dashboard.indexingDesc")}
                </p>
                {scanProgress && (
                  <div className="mt-2 space-y-1">
                    <p className="text-sm text-foreground">
                      {t("scanning.foldersScanned", { count: scanProgress.folders_scanned })}
                    </p>
                    <p className="text-xs text-muted-foreground font-mono truncate">
                      {scanProgress.current_path}
                    </p>
                  </div>
                )}
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => cancelScan()}
                className="shrink-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                title={t("scanning.stop")}
              >
                <Square className="w-4 h-4 fill-current" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Scan complete card */}
      {!isScanning && folderIndex && (
        <Card className="bg-surface border-success/30 border-2">
          <CardContent className="py-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-success/10 flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-6 h-6 text-success" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-semibold text-foreground">
                  {t("dashboard.indexComplete")}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {t("scanning.scanSummary", { folders: totalFolders })}
                </p>
              </div>
              <div className="flex gap-2 shrink-0">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => reindexAll()}
                  title={t("settings.reindex")}
                >
                  <RefreshCw className="w-4 h-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage("folders")}
                  className="border-border"
                >
                  {t("dashboard.viewFolders")}
                  <ArrowRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card
          className="bg-surface border-border hover:border-primary/50 transition-colors cursor-pointer group"
          onClick={() => setCurrentPage("organize")}
        >
          <CardHeader>
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-2">
              <FolderOpen className="w-5 h-5 text-primary" />
            </div>
            <CardTitle className="text-lg">{t("dashboard.organizeFolder")}</CardTitle>
            <CardDescription>
              {t("scanning.specificFolderDesc")}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              variant="ghost"
              className="p-0 h-auto text-primary group-hover:translate-x-1 transition-transform"
            >
              {t("common.start")} <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </CardContent>
        </Card>

        <Card
          className="bg-surface border-border hover:border-primary/50 transition-colors cursor-pointer group"
          onClick={() => setCurrentPage("marketplace")}
        >
          <CardHeader>
            <div className="w-10 h-10 rounded-lg bg-success/10 flex items-center justify-center mb-2">
              <ShoppingBag className="w-5 h-5 text-success" />
            </div>
            <CardTitle className="text-lg">{t("dashboard.browseTemplates")}</CardTitle>
            <CardDescription>
              {t("templates.subtitle")}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              variant="ghost"
              className="p-0 h-auto text-primary group-hover:translate-x-1 transition-transform"
            >
              {t("templates.preview")} <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </CardContent>
        </Card>

        <Card
          className="bg-surface border-border hover:border-primary/50 transition-colors cursor-pointer group"
          onClick={() => setShowAIRecommendation(true)}
        >
          <CardHeader>
            <div className="w-10 h-10 rounded-lg bg-warning/10 flex items-center justify-center mb-2">
              <Sparkles className="w-5 h-5 text-warning" />
            </div>
            <CardTitle className="text-lg">{t("dashboard.aiSuggestions")}</CardTitle>
            <CardDescription>
              {t("ai.subtitle")}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              variant="ghost"
              className="p-0 h-auto text-primary group-hover:translate-x-1 transition-transform"
            >
              {t("dashboard.aiOpen")} <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Recent activity placeholder */}
      <Card className="bg-surface border-border">
        <CardHeader>
          <CardTitle>{t("dashboard.recentActivity")}</CardTitle>
          <CardDescription>{t("dashboard.recentActivity")}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <div className="w-16 h-16 rounded-full bg-surface-hover flex items-center justify-center mb-4">
              <FolderOpen className="w-8 h-8 text-muted-foreground" />
            </div>
            <p className="text-muted-foreground">No recent activity</p>
            <p className="text-sm text-muted-foreground mt-1">
              Start by organizing your first folder
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
