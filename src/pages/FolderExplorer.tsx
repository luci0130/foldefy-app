import { useState, useEffect, useCallback, useRef } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ChevronRight, ChevronDown, Folder, FolderOpen, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";
import { useScanStore } from "@/stores/scanStore";
import { loadFolderIndex } from "@/lib/tauri";
import { revealItemInDir } from "@tauri-apps/plugin-opener";
import type { FolderIndexNode } from "@/lib/tauri";

const PROJECT_TYPE_COLORS: Record<string, string> = {
  Flutter: "bg-sky-500/15 text-sky-400",
  Tauri: "bg-amber-500/15 text-amber-400",
  Rust: "bg-orange-500/15 text-orange-400",
  Go: "bg-cyan-500/15 text-cyan-400",
  Laravel: "bg-red-500/15 text-red-400",
  PHP: "bg-indigo-500/15 text-indigo-400",
  WordPress: "bg-blue-500/15 text-blue-400",
  Magento: "bg-orange-500/15 text-orange-400",
  PrestaShop: "bg-pink-500/15 text-pink-400",
  "Next.js": "bg-neutral-500/15 text-neutral-300",
  Nuxt: "bg-green-500/15 text-green-400",
  Angular: "bg-red-500/15 text-red-400",
  React: "bg-sky-500/15 text-sky-400",
  Vue: "bg-emerald-500/15 text-emerald-400",
  Vite: "bg-purple-500/15 text-purple-400",
  "Node.js": "bg-green-500/15 text-green-400",
  Java: "bg-red-500/15 text-red-400",
  ".NET": "bg-violet-500/15 text-violet-400",
  Ruby: "bg-red-500/15 text-red-400",
  Python: "bg-yellow-500/15 text-yellow-400",
  "C/C++": "bg-blue-500/15 text-blue-400",
  Elixir: "bg-purple-500/15 text-purple-400",
  iOS: "bg-neutral-500/15 text-neutral-300",
  Zig: "bg-amber-500/15 text-amber-400",
};

function ContextMenu({
  x,
  y,
  path,
  onClose,
}: {
  x: number;
  y: number;
  path: string;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [onClose]);

  const handleReveal = async () => {
    try {
      await revealItemInDir(path);
    } catch {
      // ignore errors for inaccessible paths
    }
    onClose();
  };

  return (
    <div
      ref={menuRef}
      className="fixed z-50 min-w-[180px] rounded-md border border-border bg-surface shadow-lg py-1 animate-in fade-in-0 zoom-in-95"
      style={{ left: x, top: y }}
    >
      <button
        onClick={handleReveal}
        className="flex items-center gap-2 w-full px-3 py-2 text-sm text-foreground hover:bg-surface-hover transition-colors"
      >
        <ExternalLink className="w-4 h-4" />
        {t("folders.openInExplorer")}
      </button>
    </div>
  );
}

function TreeNode({ node, defaultExpanded = false }: { node: FolderIndexNode; defaultExpanded?: boolean }) {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(defaultExpanded);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);
  const hasChildren = node.children.length > 0;

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({ x: e.clientX, y: e.clientY });
  };

  const handleReveal = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await revealItemInDir(node.path);
    } catch {
      // ignore
    }
  };

  const projectColor = node.project_type
    ? PROJECT_TYPE_COLORS[node.project_type] ?? "bg-primary/15 text-primary"
    : null;

  return (
    <div>
      <div
        onContextMenu={handleContextMenu}
        className="group flex items-center"
      >
        <button
          onClick={() => hasChildren && setExpanded(!expanded)}
          className={cn(
            "flex items-center gap-1.5 flex-1 min-w-0 text-left py-1 px-1 rounded-md hover:bg-surface-hover transition-colors text-sm",
            node.is_skipped && "opacity-50"
          )}
          style={{ paddingLeft: `${node.depth * 16 + 4}px` }}
        >
          {hasChildren ? (
            expanded ? (
              <ChevronDown className="w-4 h-4 shrink-0 text-muted-foreground" />
            ) : (
              <ChevronRight className="w-4 h-4 shrink-0 text-muted-foreground" />
            )
          ) : (
            <span className="w-4 shrink-0" />
          )}
          {expanded ? (
            <FolderOpen className="w-4 h-4 shrink-0 text-primary" />
          ) : (
            <Folder className={cn("w-4 h-4 shrink-0", node.is_skipped ? "text-muted-foreground" : "text-primary")} />
          )}
          <span className={cn("truncate", node.is_skipped && "text-muted-foreground")}>
            {node.name}
          </span>
          {node.project_type && (
            <span className={cn("text-[10px] px-1.5 py-0.5 rounded font-medium shrink-0 ml-auto", projectColor)}>
              {node.project_type}
            </span>
          )}
          {node.is_skipped && !node.project_type && (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground shrink-0 ml-auto">
              {t("folders.skipped")}
            </span>
          )}
        </button>
        <button
          onClick={handleReveal}
          className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-surface-hover transition-all shrink-0 mr-1"
          title={t("folders.openInExplorer")}
        >
          <ExternalLink className="w-3.5 h-3.5 text-muted-foreground" />
        </button>
      </div>
      {expanded && hasChildren && (
        <div>
          {node.children.map((child) => (
            <TreeNode key={child.path} node={child} />
          ))}
        </div>
      )}
      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          path={node.path}
          onClose={() => setContextMenu(null)}
        />
      )}
    </div>
  );
}

export function FolderExplorer() {
  const { t } = useTranslation();
  const { folderIndex, setFolderIndex } = useScanStore();
  const [loading, setLoading] = useState(false);

  const loadData = useCallback(async () => {
    if (folderIndex) return;
    setLoading(true);
    try {
      const data = await loadFolderIndex();
      if (data) {
        setFolderIndex(data);
      }
    } finally {
      setLoading(false);
    }
  }, [folderIndex, setFolderIndex]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-muted-foreground">
        {t("common.loading")}
      </div>
    );
  }

  if (!folderIndex || folderIndex.length === 0) {
    return (
      <div className="space-y-6">
        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-foreground">{t("folders.title")}</h1>
          <p className="text-muted-foreground">{t("folders.subtitle")}</p>
        </div>
        <Card className="bg-surface border-border">
          <CardContent className="py-12">
            <div className="flex flex-col items-center justify-center text-center">
              <div className="w-16 h-16 rounded-full bg-surface-hover flex items-center justify-center mb-4">
                <Folder className="w-8 h-8 text-muted-foreground" />
              </div>
              <p className="text-muted-foreground">{t("folders.empty")}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-bold text-foreground">{t("folders.title")}</h1>
        <p className="text-muted-foreground">{t("folders.subtitle")}</p>
      </div>

      {folderIndex.map((index) => (
        <Card key={index.root_path} className="bg-surface border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">{index.root_path}</CardTitle>
            <CardDescription>
              {t("scanning.scanSummary", { folders: index.total_folders })}
            </CardDescription>
          </CardHeader>
          <CardContent className="max-h-[600px] overflow-auto">
            <TreeNode node={index.tree} defaultExpanded={true} />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
