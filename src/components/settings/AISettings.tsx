import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { useModelStore } from "@/stores/modelStore";
import type { ModelInfo } from "@/lib/tauri";
import {
  BrainCircuit,
  Cloud,
  Cpu,
  Download,
  HardDrive,
  Loader2,
  MonitorCog,
  Square,
  Trash2,
} from "lucide-react";

function formatGb(bytes: number): string {
  return (bytes / 1_000_000_000).toFixed(1);
}

export function AISettings() {
  const { t } = useTranslation();
  const {
    hardware,
    models,
    engineAvailable,
    config,
    downloads,
    error,
    init,
    startDownload,
    cancelDownload,
    removeModel,
    saveConfig,
  } = useModelStore();
  const [apiKey, setApiKey] = useState("");

  useEffect(() => {
    void init();
  }, [init]);

  useEffect(() => {
    setApiKey(config?.api_key ?? "");
  }, [config?.api_key]);

  const provider = config?.provider ?? "local";

  const setProvider = (next: "local" | "claude") => {
    void saveConfig({
      api_key: apiKey || null,
      provider: next,
      local_model_id: config?.local_model_id ?? null,
    });
  };

  const saveKey = () => {
    void saveConfig({
      api_key: apiKey || null,
      provider: config?.provider ?? null,
      local_model_id: config?.local_model_id ?? null,
    });
  };

  const primaryGpu = hardware?.gpus.find((g) => !g.is_software);

  return (
    <Card className="bg-surface border-border">
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <BrainCircuit className="w-5 h-5 text-primary" />
          </div>
          <div>
            <CardTitle className="text-lg">{t("ai.settingsTitle")}</CardTitle>
            <CardDescription>{t("ai.settingsDesc")}</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && <p className="text-sm text-destructive">{error}</p>}

        {/* Hardware summary */}
        {hardware && (
          <div className="rounded-md bg-background p-3 space-y-1 text-sm">
            <div className="flex items-center gap-2 text-foreground">
              <MonitorCog className="w-4 h-4 text-muted-foreground" />
              <span>
                {t("ai.hardwareSummary", {
                  ram: Math.round(hardware.total_ram_mb / 1024),
                  cores: hardware.cpu_cores,
                })}
              </span>
            </div>
            {primaryGpu && (
              <div className="flex items-center gap-2 text-foreground">
                <Cpu className="w-4 h-4 text-muted-foreground" />
                <span>
                  {primaryGpu.name}
                  {primaryGpu.dedicated_vram_mb > 0 &&
                    ` (${Math.round(primaryGpu.dedicated_vram_mb / 1024)} GB VRAM)`}
                  {hardware.vulkan_available ? " · Vulkan" : ""}
                </span>
              </div>
            )}
            <div className="flex items-center gap-2">
              <HardDrive className="w-4 h-4 text-muted-foreground" />
              <span className="text-muted-foreground">{t("ai.recommendedTier")}</span>
              <Badge variant="secondary">{t(`ai.tier.${hardware.tier}`)}</Badge>
            </div>
          </div>
        )}

        {/* Provider selection */}
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => setProvider("local")}
            className={cn(
              "rounded-md border p-3 text-left transition-colors",
              provider === "local"
                ? "border-primary bg-primary/10"
                : "border-border bg-background hover:bg-surface-hover"
            )}
          >
            <div className="flex items-center gap-2 font-medium text-sm text-foreground">
              <HardDrive className="w-4 h-4" />
              {t("ai.providerLocal")}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {engineAvailable ? t("ai.providerLocalDesc") : t("ai.providerLocalSoon")}
            </p>
          </button>
          <button
            onClick={() => setProvider("claude")}
            className={cn(
              "rounded-md border p-3 text-left transition-colors",
              provider === "claude"
                ? "border-primary bg-primary/10"
                : "border-border bg-background hover:bg-surface-hover"
            )}
          >
            <div className="flex items-center gap-2 font-medium text-sm text-foreground">
              <Cloud className="w-4 h-4" />
              {t("ai.providerClaude")}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {t("ai.providerClaudeDesc")}
            </p>
          </button>
        </div>

        {/* Claude API key */}
        <div className="space-y-2">
          <p className="text-sm font-medium text-foreground">{t("ai.apiKey")}</p>
          <p className="text-xs text-muted-foreground">{t("ai.apiKeyDesc")}</p>
          <div className="flex gap-2">
            <Input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder={t("ai.apiKeyPlaceholder")}
              className="bg-background border-border"
            />
            <Button variant="outline" onClick={saveKey}>
              {t("common.save")}
            </Button>
          </div>
        </div>

        <Separator className="bg-border" />

        {/* Local models */}
        <div className="space-y-2">
          <p className="text-sm font-medium text-foreground">{t("ai.models")}</p>
          <div className="space-y-2">
            {models.map((model) => (
              <ModelRow
                key={model.id}
                model={model}
                recommended={hardware?.tier === model.tier}
                progress={downloads[model.id]}
                onDownload={() => void startDownload(model.id)}
                onCancel={() => void cancelDownload(model.id)}
                onDelete={() => void removeModel(model.id)}
              />
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

interface ModelRowProps {
  model: ModelInfo;
  recommended: boolean;
  progress?: { downloaded: number; total: number; state: string };
  onDownload: () => void;
  onCancel: () => void;
  onDelete: () => void;
}

function ModelRow({
  model,
  recommended,
  progress,
  onDownload,
  onCancel,
  onDelete,
}: ModelRowProps) {
  const { t } = useTranslation();
  const isDownloading = progress !== undefined;
  const pct =
    progress && progress.total > 0
      ? Math.round((progress.downloaded / progress.total) * 100)
      : 0;

  return (
    <div className="rounded-md border border-border bg-background p-3 space-y-2">
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium text-foreground">{model.display_name}</span>
        <span className="text-xs text-muted-foreground">
          {t("ai.sizeGb", { size: formatGb(model.size_bytes) })}
        </span>
        {recommended && <Badge variant="secondary">{t("ai.recommended")}</Badge>}
        <div className="flex-1" />
        {model.status === "ready" ? (
          <>
            <Badge variant="outline">{t("ai.ready")}</Badge>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onDelete}>
              <Trash2 className="w-4 h-4 text-muted-foreground" />
            </Button>
          </>
        ) : isDownloading ? (
          <Button variant="outline" size="sm" onClick={onCancel}>
            <Square className="w-3 h-3 mr-1 fill-current" />
            {t("common.cancel")}
          </Button>
        ) : (
          <Button variant="outline" size="sm" onClick={onDownload}>
            <Download className="w-4 h-4 mr-1" />
            {model.status === "partial" ? t("ai.resume") : t("ai.download")}
          </Button>
        )}
      </div>

      {isDownloading && (
        <div className="space-y-1">
          <div className="h-1.5 w-full rounded-full bg-surface overflow-hidden">
            <div
              className="h-full bg-primary transition-all"
              style={{ width: `${pct}%` }}
            />
          </div>
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            <Loader2 className="w-3 h-3 animate-spin" />
            {progress?.state === "verifying"
              ? t("ai.verifying")
              : t("ai.downloadingPct", { pct })}
          </p>
        </div>
      )}
    </div>
  );
}
