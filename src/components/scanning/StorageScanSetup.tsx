import { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { listen } from "@tauri-apps/api/event";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import { ScanModeSelector } from "./ScanModeSelector";
import { ScanProgress } from "./ScanProgress";
import { ScanComplete } from "./ScanComplete";
import { useScanStore } from "@/stores/scanStore";
import {
  selectFolder,
  smartScanDirectory,
  scanAllDrives,
  saveFolderIndex,
} from "@/lib/tauri";
import type { ScanProgress as ScanProgressType } from "@/lib/tauri";

interface StorageScanSetupProps {
  onComplete: () => void;
  onSkip: () => void;
}

export function StorageScanSetup({ onComplete, onSkip }: StorageScanSetupProps) {
  const { t } = useTranslation();
  const {
    scanMode,
    isScanning,
    scanProgress,
    folderIndex,
    setScanning,
    setScanProgress,
    setFolderIndex,
    setScanMode,
    setError,
  } = useScanStore();

  const hasStarted = useRef(false);

  // Listen for scan progress events from Rust
  useEffect(() => {
    const unlisten = listen<ScanProgressType>("scan-progress", (event) => {
      setScanProgress(event.payload);
    });

    return () => {
      unlisten.then((fn) => fn());
    };
  }, [setScanProgress]);

  // Auto-start scanning when scan mode is pre-selected from profile setup
  useEffect(() => {
    if (scanMode && !hasStarted.current && !isScanning && !folderIndex) {
      hasStarted.current = true;
      if (scanMode === "entire") {
        handleSelectEntire();
      } else if (scanMode === "folder") {
        handleSelectFolder();
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scanMode]);

  const handleSelectEntire = async () => {
    setScanMode("entire");
    setScanning(true);
    setError(null);
    try {
      const results = await scanAllDrives();
      await saveFolderIndex(results);
      setFolderIndex(results);
    } catch (err) {
      setError(String(err));
      setScanning(false);
    } finally {
      setScanning(false);
      setScanProgress(null);
    }
  };

  const handleSelectFolder = async () => {
    const path = await selectFolder();
    if (!path) {
      // User cancelled folder selection, show mode selector
      setScanMode(null);
      hasStarted.current = false;
      return;
    }

    setScanMode("folder");
    setScanning(true);
    setError(null);
    try {
      const result = await smartScanDirectory(path);
      const results = [result];
      await saveFolderIndex(results);
      setFolderIndex(results);
    } catch (err) {
      setError(String(err));
    } finally {
      setScanning(false);
      setScanProgress(null);
    }
  };

  const handleContinue = () => {
    onComplete();
  };

  // Determine what to show
  const showSelector = !scanMode && !isScanning && !folderIndex;

  return (
    <div className="fixed inset-0 bg-background flex flex-col">
      {/* Skip button */}
      <div className="absolute top-4 right-4 z-10">
        <Button
          variant="ghost"
          size="sm"
          onClick={onSkip}
          className="text-muted-foreground hover:text-foreground"
        >
          {t("common.skip")}
          <X className="w-4 h-4 ml-1" />
        </Button>
      </div>

      {/* Content */}
      <div className="flex-1 flex items-center justify-center overflow-hidden px-8">
        {folderIndex ? (
          <ScanComplete
            folderIndex={folderIndex}
            onContinue={handleContinue}
          />
        ) : isScanning ? (
          <ScanProgress progress={scanProgress} />
        ) : showSelector ? (
          <ScanModeSelector
            onSelectEntire={handleSelectEntire}
            onSelectFolder={handleSelectFolder}
          />
        ) : (
          // Scanning is about to start (scanMode set but not yet scanning)
          <ScanProgress progress={null} />
        )}
      </div>
    </div>
  );
}
