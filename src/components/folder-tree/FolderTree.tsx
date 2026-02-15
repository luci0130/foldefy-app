import { useFolderStore } from "@/stores/folderStore";
import type { FolderNode as FolderNodeType } from "@/lib/tauri";
import { FolderNodeItem } from "./FolderNode";

interface FolderTreeProps {
  node: FolderNodeType;
  level: number;
}

export function FolderTree({ node, level }: FolderTreeProps) {
  const { expandedFolders, toggleFolder, annotations } = useFolderStore();
  const isExpanded = expandedFolders.has(node.path);
  const annotation = annotations.find((a) => a.path === node.path);

  return (
    <div className="select-none">
      <FolderNodeItem
        node={node}
        level={level}
        isExpanded={isExpanded}
        onToggle={() => toggleFolder(node.path)}
        annotation={annotation}
      />
      {isExpanded && node.children && (
        <div className="relative">
          {/* Vertical connection line */}
          <div
            className="absolute left-4 top-0 bottom-0 w-px bg-border"
            style={{ marginLeft: `${level * 16 + 8}px` }}
          />
          {node.children.map((child) => (
            <FolderTree key={child.path} node={child} level={level + 1} />
          ))}
        </div>
      )}
    </div>
  );
}
