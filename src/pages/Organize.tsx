import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FolderOpen, Loader2, AlertCircle } from "lucide-react";
import { useFolderStore } from "@/stores/folderStore";
import { selectFolder, scanDirectory } from "@/lib/tauri";
import { FolderTree } from "@/components/folder-tree/FolderTree";
import { FolderStats } from "@/components/folder-tree/FolderStats";

export function Organize() { 
  const {
    selectedPath,
    folderTree,
    isScanning,
    error,
    setSelectedPath,
    setFolderTree,
    setScanning,
    setError,
  } = useFolderStore();
  const [localError, setLocalError] = useState<string | null>(null);

  const handleSelectFolder = async () => {
    try {
      setLocalError(null);
      const path = await selectFolder();
      if (path) {
        setSelectedPath(path);
        setScanning(true);
        setError(null);

        try {
          const tree = await scanDirectory(path);
          setFolderTree(tree);
        } catch (e) {
          const errorMessage = e instanceof Error ? e.message : "Failed to scan directory";
          setError(errorMessage);
          setLocalError(errorMessage);
        } finally {
          setScanning(false);
        }
      }
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : "Failed to select folder";
      setLocalError(errorMessage);
    }
  };

  return (
    <div className="space-y-4 h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold text-foreground">Organize</h1>
          <p className="text-muted-foreground">
            Select a folder to analyze and organize its structure
          </p>
        </div>
        <Button onClick={handleSelectFolder} disabled={isScanning}>
          {isScanning ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Scanning...
            </>
          ) : (
            <>
              <FolderOpen className="w-4 h-4 mr-2" />
              Select Folder
            </>
          )}
        </Button>
      </div>

      {/* Error display */}
      {(error || localError) && (
        <Card className="bg-destructive/10 border-destructive/50">
          <CardContent className="flex items-center gap-3 py-3">
            <AlertCircle className="w-5 h-5 text-destructive" />
            <p className="text-sm text-destructive">{error || localError}</p>
          </CardContent>
        </Card>
      )}

      {/* Selected path display */}
      {selectedPath && (
        <Card className="bg-surface border-border">
          <CardContent className="py-3">
            <p className="text-sm">
              <span className="text-muted-foreground">Selected: </span>
              <span className="text-foreground font-mono">{selectedPath}</span>
            </p>
          </CardContent>
        </Card>
      )}

      {/* Statistics */}
      {folderTree && <FolderStats tree={folderTree} />}

      {/* Folder tree or empty state */}
      <div className="flex-1 min-h-0">
        {folderTree ? (
          <Card className="bg-surface border-border h-full">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Folder Structure</CardTitle>
              <CardDescription>
                Click on folders to expand them. Right-click or click the edit icon to add annotations.
              </CardDescription>
            </CardHeader>
            <CardContent className="h-[calc(100%-80px)] overflow-auto">
              <FolderTree node={folderTree} level={0} />
            </CardContent>
          </Card>
        ) : (
          <Card className="bg-surface border-border h-full flex items-center justify-center">
            <CardContent className="flex flex-col items-center justify-center text-center py-16">
              <div className="w-20 h-20 rounded-full bg-surface-hover flex items-center justify-center mb-6">
                <FolderOpen className="w-10 h-10 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-medium text-foreground mb-2">
                No folder selected
              </h3>
              <p className="text-muted-foreground max-w-md mb-6">
                Select a folder to visualize its structure and add context for AI
                analysis.
              </p>
              <Button onClick={handleSelectFolder}>
                <FolderOpen className="w-4 h-4 mr-2" />
                Select Folder
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
