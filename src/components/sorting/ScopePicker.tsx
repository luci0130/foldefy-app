import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useSortStore } from "@/stores/sortStore";
import { Flame, FolderPlus, FolderSearch, HardDrive, X } from "lucide-react";

const scopeOptions = [
  {
    type: "selected_folders" as const,
    icon: FolderSearch,
    titleKey: "sorting.scopeSelected",
    descKey: "sorting.scopeSelectedDesc",
  },
  {
    type: "hotspots" as const,
    icon: Flame,
    titleKey: "sorting.scopeHotspots",
    descKey: "sorting.scopeHotspotsDesc",
  },
  {
    type: "everything" as const,
    icon: HardDrive,
    titleKey: "sorting.scopeEverything",
    descKey: "sorting.scopeEverythingDesc",
  },
];

export function ScopePicker() {
  const { t } = useTranslation();
  const {
    scopeType,
    setScopeType,
    selectedFolders,
    addFolder,
    removeFolder,
    hotspots,
    hotspotsLoaded,
    loadHotspots,
  } = useSortStore();

  useEffect(() => {
    if (!hotspotsLoaded) {
      void loadHotspots();
    }
  }, [hotspotsLoaded, loadHotspots]);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {scopeOptions.map((option) => {
          const Icon = option.icon;
          const isActive = scopeType === option.type;
          return (
            <Card
              key={option.type}
              onClick={() => setScopeType(option.type)}
              className={cn(
                "cursor-pointer transition-colors border",
                isActive
                  ? "border-primary bg-primary/10"
                  : "border-border bg-surface hover:bg-surface-hover"
              )}
            >
              <CardContent className="p-4 space-y-2">
                <Icon
                  className={cn(
                    "w-6 h-6",
                    isActive ? "text-primary" : "text-muted-foreground"
                  )}
                />
                <p className="font-medium text-foreground">{t(option.titleKey)}</p>
                <p className="text-sm text-muted-foreground">{t(option.descKey)}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {scopeType === "selected_folders" && (
        <Card className="bg-surface border-border">
          <CardContent className="p-4 space-y-3">
            {selectedFolders.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t("sorting.noFolders")}</p>
            ) : (
              <div className="space-y-2">
                {selectedFolders.map((folder) => (
                  <div
                    key={folder}
                    className="flex items-center justify-between gap-2 rounded-md bg-background px-3 py-2"
                  >
                    <span className="text-sm font-mono text-foreground truncate">
                      {folder}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 shrink-0"
                      onClick={() => removeFolder(folder)}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
            <Button variant="outline" size="sm" onClick={() => void addFolder()}>
              <FolderPlus className="w-4 h-4 mr-2" />
              {t("sorting.addFolder")}
            </Button>
          </CardContent>
        </Card>
      )}

      {scopeType === "hotspots" && (
        <Card className="bg-surface border-border">
          <CardContent className="p-4 space-y-2">
            {hotspots.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t("sorting.noHotspots")}</p>
            ) : (
              hotspots.map((hotspot) => (
                <div
                  key={hotspot.path}
                  className="flex items-center justify-between gap-2 rounded-md bg-background px-3 py-2"
                >
                  <span className="text-sm font-mono text-foreground truncate">
                    {hotspot.path}
                  </span>
                  <Badge variant="secondary" className="shrink-0">
                    {t("sorting.looseFiles", { count: hotspot.loose_files })}
                  </Badge>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
