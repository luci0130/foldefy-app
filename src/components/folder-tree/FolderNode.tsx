import { useState } from "react";
import { cn } from "@/lib/utils";
import type { FolderNode, FolderAnnotation } from "@/lib/tauri";
import {
  Folder,
  FolderOpen,
  File,
  ChevronRight,
  ChevronDown,
  FileText,
  FileImage,
  FileCode,
  FileArchive,
  FileVideo,
  FileAudio,
  Edit3,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FolderAnnotationDialog } from "./FolderAnnotation";
import { motion, AnimatePresence } from "framer-motion";

interface FolderNodeItemProps {
  node: FolderNode;
  level: number;
  isExpanded: boolean;
  onToggle: () => void;
  annotation?: FolderAnnotation;
}

const fileIcons: Record<string, typeof File> = {
  // Documents
  ".pdf": FileText,
  ".doc": FileText,
  ".docx": FileText,
  ".txt": FileText,
  ".md": FileText,
  // Images
  ".jpg": FileImage,
  ".jpeg": FileImage,
  ".png": FileImage,
  ".gif": FileImage,
  ".svg": FileImage,
  ".webp": FileImage,
  // Code
  ".js": FileCode,
  ".ts": FileCode,
  ".jsx": FileCode,
  ".tsx": FileCode,
  ".py": FileCode,
  ".rs": FileCode,
  ".go": FileCode,
  ".java": FileCode,
  ".html": FileCode,
  ".css": FileCode,
  ".json": FileCode,
  // Archives
  ".zip": FileArchive,
  ".rar": FileArchive,
  ".7z": FileArchive,
  ".tar": FileArchive,
  ".gz": FileArchive,
  // Video
  ".mp4": FileVideo,
  ".mov": FileVideo,
  ".avi": FileVideo,
  ".mkv": FileVideo,
  // Audio
  ".mp3": FileAudio,
  ".wav": FileAudio,
  ".flac": FileAudio,
  ".aac": FileAudio,
};

const extensionColors: Record<string, string> = {
  // Documents
  ".pdf": "text-red-400",
  ".doc": "text-blue-400",
  ".docx": "text-blue-400",
  ".txt": "text-gray-400",
  // Images
  ".jpg": "text-green-400",
  ".jpeg": "text-green-400",
  ".png": "text-green-400",
  ".gif": "text-purple-400",
  // Code
  ".js": "text-yellow-400",
  ".ts": "text-blue-400",
  ".jsx": "text-cyan-400",
  ".tsx": "text-cyan-400",
  ".py": "text-green-400",
  ".rs": "text-orange-400",
  // Archives
  ".zip": "text-amber-400",
  ".rar": "text-amber-400",
};

const categoryColors: Record<string, string> = {
  project: "bg-primary/20 text-primary",
  archive: "bg-muted text-muted-foreground",
  active: "bg-success/20 text-success",
  reference: "bg-blue-500/20 text-blue-400",
  temp: "bg-warning/20 text-warning",
};

export function FolderNodeItem({
  node,
  level,
  isExpanded,
  onToggle,
  annotation,
}: FolderNodeItemProps) {
  const [showAnnotation, setShowAnnotation] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  const isFolder = node.node_type === "folder";
  const extension = node.extension?.toLowerCase() || "";
  const IconComponent = isFolder
    ? isExpanded
      ? FolderOpen
      : Folder
    : fileIcons[extension] || File;
  const iconColor = isFolder
    ? "text-primary"
    : extensionColors[extension] || "text-muted-foreground";

  return (
    <>
      <div
        className={cn(
          "flex items-center gap-1 py-1 px-2 rounded-md cursor-pointer group transition-colors",
          "hover:bg-surface-hover",
          annotation && "bg-surface-hover/50"
        )}
        style={{ paddingLeft: `${level * 16 + 8}px` }}
        onClick={isFolder ? onToggle : undefined}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onContextMenu={(e) => {
          e.preventDefault();
          if (isFolder) {
            setShowAnnotation(true);
          }
        }}
      >
        {/* Expand/collapse arrow */}
        {isFolder && (
          <span className="w-4 h-4 flex items-center justify-center">
            {isExpanded ? (
              <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
            ) : (
              <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
            )}
          </span>
        )}
        {!isFolder && <span className="w-4" />}

        {/* Icon */}
        <IconComponent className={cn("w-4 h-4 flex-shrink-0", iconColor)} />

        {/* Name */}
        <span className="text-sm text-foreground truncate flex-1">
          {node.name}
        </span>

        {/* File count badge */}
        {isFolder && node.file_count !== undefined && node.file_count > 0 && (
          <Badge
            variant="secondary"
            className="bg-surface text-muted-foreground text-xs px-1.5 py-0"
          >
            {node.file_count}
          </Badge>
        )}

        {/* Category badge */}
        {annotation && (
          <Badge
            className={cn(
              "text-xs px-1.5 py-0",
              categoryColors[annotation.category]
            )}
          >
            {annotation.category}
          </Badge>
        )}

        {/* Edit button */}
        <AnimatePresence>
          {isHovered && isFolder && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ duration: 0.1 }}
            >
              <Button
                variant="ghost"
                size="icon"
                className="w-6 h-6 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowAnnotation(true);
                }}
              >
                <Edit3 className="w-3 h-3 text-muted-foreground" />
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Annotation dialog */}
      {isFolder && (
        <FolderAnnotationDialog
          open={showAnnotation}
          onOpenChange={setShowAnnotation}
          folderPath={node.path}
          folderName={node.name}
          existingAnnotation={annotation}
        />
      )}
    </>
  );
}
