import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { X } from "lucide-react";
import { useFolderStore } from "@/stores/folderStore";
import type { FolderAnnotation } from "@/lib/tauri";
import { cn } from "@/lib/utils";

interface FolderAnnotationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  folderPath: string;
  folderName: string;
  existingAnnotation?: FolderAnnotation;
}

const categories = [
  { id: "project" as const, label: "Project", color: "bg-primary/20 text-primary" },
  { id: "active" as const, label: "Active", color: "bg-success/20 text-success" },
  { id: "archive" as const, label: "Archive", color: "bg-muted text-muted-foreground" },
  { id: "reference" as const, label: "Reference", color: "bg-blue-500/20 text-blue-400" },
  { id: "temp" as const, label: "Temporary", color: "bg-warning/20 text-warning" },
];

export function FolderAnnotationDialog({
  open,
  onOpenChange,
  folderPath,
  folderName,
  existingAnnotation,
}: FolderAnnotationDialogProps) {
  const { addAnnotation, updateAnnotation, removeAnnotation } = useFolderStore();

  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<FolderAnnotation["category"]>("project");
  const [project, setProject] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [aiContext, setAiContext] = useState("");

  useEffect(() => {
    if (existingAnnotation) {
      setDescription(existingAnnotation.description);
      setCategory(existingAnnotation.category);
      setProject(existingAnnotation.project || "");
      setTags(existingAnnotation.tags);
      setAiContext(existingAnnotation.ai_context || "");
    } else {
      setDescription("");
      setCategory("project");
      setProject("");
      setTags([]);
      setAiContext("");
    }
  }, [existingAnnotation, open]);

  const handleAddTag = () => {
    const trimmed = tagInput.trim().toLowerCase();
    if (trimmed && !tags.includes(trimmed)) {
      setTags([...tags, trimmed]);
      setTagInput("");
    }
  };

  const handleRemoveTag = (tag: string) => {
    setTags(tags.filter((t) => t !== tag));
  };

  const handleSave = () => {
    const annotation: FolderAnnotation = {
      path: folderPath,
      description,
      category,
      project: project || undefined,
      tags,
      ai_context: aiContext || undefined,
    };

    if (existingAnnotation) {
      updateAnnotation(folderPath, annotation);
    } else {
      addAnnotation(annotation);
    }

    onOpenChange(false);
  };

  const handleDelete = () => {
    removeAnnotation(folderPath);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-surface border-border sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Annotate Folder</DialogTitle>
          <DialogDescription className="font-mono text-xs truncate">
            {folderName}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Description */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">
              Description
            </label>
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What is this folder for?"
              className="bg-background border-border"
            />
          </div>

          {/* Category */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">
              Category
            </label>
            <div className="flex flex-wrap gap-2">
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setCategory(cat.id)}
                  className={cn(
                    "px-3 py-1.5 rounded-md text-sm transition-all",
                    category === cat.id
                      ? cn(cat.color, "ring-2 ring-offset-2 ring-offset-surface ring-primary")
                      : "bg-surface-hover text-muted-foreground hover:text-foreground"
                  )}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          {/* Project name */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">
              Project Name <span className="text-muted-foreground">(optional)</span>
            </label>
            <Input
              value={project}
              onChange={(e) => setProject(e.target.value)}
              placeholder="e.g., Website Redesign"
              className="bg-background border-border"
            />
          </div>

          {/* Tags */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Tags</label>
            <div className="flex gap-2">
              <Input
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAddTag();
                  }
                }}
                placeholder="Add a tag..."
                className="bg-background border-border"
              />
              <Button
                type="button"
                variant="secondary"
                onClick={handleAddTag}
                className="bg-surface-hover"
              >
                Add
              </Button>
            </div>
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {tags.map((tag) => (
                  <Badge
                    key={tag}
                    variant="secondary"
                    className="bg-surface-hover text-foreground gap-1"
                  >
                    {tag}
                    <button
                      onClick={() => handleRemoveTag(tag)}
                      className="hover:text-destructive"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {/* AI Context */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">
              AI Context <span className="text-muted-foreground">(optional)</span>
            </label>
            <Input
              value={aiContext}
              onChange={(e) => setAiContext(e.target.value)}
              placeholder="Additional context for AI analysis..."
              className="bg-background border-border"
            />
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          {existingAnnotation && (
            <Button
              type="button"
              variant="destructive"
              onClick={handleDelete}
              className="mr-auto"
            >
              Delete
            </Button>
          )}
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="border-border"
          >
            Cancel
          </Button>
          <Button type="button" onClick={handleSave}>
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
