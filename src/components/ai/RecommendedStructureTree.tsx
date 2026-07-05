import { useState } from "react";
import { motion } from "framer-motion";
import { ChevronRight, Folder, FolderOpen } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from "@/components/ui/tooltip";
import type { RecommendedFolder } from "@/lib/tauri";

interface TreeNodeProps {
  node: RecommendedFolder;
  depth: number;
  index: number;
}

function TreeNode({ node, depth, index }: TreeNodeProps) {
  const [isExpanded, setIsExpanded] = useState(depth < 2);
  const hasChildren = node.children.length > 0;

  return (
    <div>
      <motion.div
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: index * 0.03 }}
        className={cn(
          "flex items-center gap-2 py-1.5 px-2 rounded-lg hover:bg-surface-hover cursor-pointer transition-colors",
        )}
        style={{ paddingLeft: `${depth * 20 + 8}px` }}
        onClick={() => hasChildren && setIsExpanded(!isExpanded)}
      >
        {hasChildren ? (
          <ChevronRight
            className={cn(
              "w-4 h-4 text-muted-foreground transition-transform",
              isExpanded && "rotate-90"
            )}
          />
        ) : (
          <div className="w-4" />
        )}

        {isExpanded ? (
          <FolderOpen className="w-4 h-4 text-primary" />
        ) : (
          <Folder className="w-4 h-4 text-primary" />
        )}

        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="text-sm text-foreground font-medium">
                {node.name}
              </span>
            </TooltipTrigger>
            {node.description && (
              <TooltipContent>
                <p className="max-w-xs">{node.description}</p>
              </TooltipContent>
            )}
          </Tooltip>
        </TooltipProvider>
      </motion.div>

      {isExpanded &&
        hasChildren &&
        node.children.map((child, i) => (
          <TreeNode
            key={`${child.name}-${i}`}
            node={child}
            depth={depth + 1}
            index={index + i + 1}
          />
        ))}
    </div>
  );
}

interface RecommendedStructureTreeProps {
  structure: RecommendedFolder[];
}

export function RecommendedStructureTree({
  structure,
}: RecommendedStructureTreeProps) {
  return (
    <div className="w-full max-w-lg bg-surface border border-border rounded-xl p-4 max-h-80 overflow-y-auto">
      {structure.map((node, i) => (
        <TreeNode key={`${node.name}-${i}`} node={node} depth={0} index={i} />
      ))}
    </div>
  );
}
