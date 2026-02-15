import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FolderOpen, File, Layers, FileType } from "lucide-react";
import type { FolderNode } from "@/lib/tauri";

interface FolderStatsProps {
  tree: FolderNode;
}

function calculateStats(node: FolderNode): {
  totalFolders: number;
  totalFiles: number;
  fileTypes: Record<string, number>;
  maxDepth: number;
} {
  let totalFolders = 0;
  let totalFiles = 0;
  const fileTypes: Record<string, number> = {};
  let maxDepth = 0;

  function traverse(n: FolderNode, depth: number) {
    if (depth > maxDepth) maxDepth = depth;

    if (n.node_type === "folder") {
      totalFolders++;
      if (n.children) {
        for (const child of n.children) {
          traverse(child, depth + 1);
        }
      }
    } else {
      totalFiles++;
      if (n.extension) {
        fileTypes[n.extension] = (fileTypes[n.extension] || 0) + 1;
      }
    }
  }

  traverse(node, 0);

  return { totalFolders, totalFiles, fileTypes, maxDepth };
}

export function FolderStats({ tree }: FolderStatsProps) {
  const stats = calculateStats(tree);

  // Get top 5 file types
  const topFileTypes = Object.entries(stats.fileTypes)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  return (
    <Card className="bg-surface border-border">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          Folder Statistics
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {/* Total folders */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <FolderOpen className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-xl font-bold text-foreground">
                {stats.totalFolders.toLocaleString()}
              </p>
              <p className="text-xs text-muted-foreground">Folders</p>
            </div>
          </div>

          {/* Total files */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-success/10 flex items-center justify-center">
              <File className="w-5 h-5 text-success" />
            </div>
            <div>
              <p className="text-xl font-bold text-foreground">
                {stats.totalFiles.toLocaleString()}
              </p>
              <p className="text-xs text-muted-foreground">Files</p>
            </div>
          </div>

          {/* Max depth */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-warning/10 flex items-center justify-center">
              <Layers className="w-5 h-5 text-warning" />
            </div>
            <div>
              <p className="text-xl font-bold text-foreground">
                {stats.maxDepth}
              </p>
              <p className="text-xs text-muted-foreground">Max Depth</p>
            </div>
          </div>

          {/* File types */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
              <FileType className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <p className="text-xl font-bold text-foreground">
                {Object.keys(stats.fileTypes).length}
              </p>
              <p className="text-xs text-muted-foreground">File Types</p>
            </div>
          </div>
        </div>

        {/* Top file types */}
        {topFileTypes.length > 0 && (
          <div className="mt-4 pt-4 border-t border-border">
            <p className="text-xs text-muted-foreground mb-2">
              Top File Types
            </p>
            <div className="flex flex-wrap gap-2">
              {topFileTypes.map(([ext, count]) => (
                <Badge
                  key={ext}
                  variant="secondary"
                  className="bg-surface-hover text-muted-foreground"
                >
                  {ext} ({count})
                </Badge>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
