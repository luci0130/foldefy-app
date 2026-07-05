import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Download, Star, ShoppingBag, Eye, FolderOpen } from "lucide-react";
import { useTemplateStore } from "@/stores/templateStore";
import {
  loadBuiltinTemplates,
  selectFolder,
  applyTemplate,
} from "@/lib/tauri";
import type { FolderTemplate } from "@/lib/tauri";

export function Marketplace() {
  const { t } = useTranslation();
  const { templates, isLoading, setTemplates, setLoading } = useTemplateStore();
  const [selectedTemplate, setSelectedTemplate] = useState<FolderTemplate | null>(null);
  const [personalization, setPersonalization] = useState<Record<string, string>>({});
  const [isApplying, setIsApplying] = useState(false);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const builtIn = await loadBuiltinTemplates();
        setTemplates(builtIn);
      } catch (err) {
        console.error("Failed to load templates:", err);
      } finally {
        setLoading(false);
      }
    };
    if (templates.length === 0) {
      load();
    }
  }, [templates.length, setTemplates, setLoading]);

  const handleInstall = (template: FolderTemplate) => {
    // Initialize personalization defaults
    const defaults: Record<string, string> = {};
    for (const q of template.personalization_questions) {
      defaults[q.variable_name] = q.default_value ?? "";
    }
    setPersonalization(defaults);
    setSelectedTemplate(template);
  };

  const handleApply = async () => {
    if (!selectedTemplate) return;

    const targetPath = await selectFolder();
    if (!targetPath) return;

    setIsApplying(true);
    try {
      await applyTemplate(selectedTemplate, targetPath, personalization);
      setSelectedTemplate(null);
    } catch (err) {
      console.error("Failed to apply template:", err);
    } finally {
      setIsApplying(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-2xl font-bold text-foreground">
          {t("templates.title")}
        </h1>
        <p className="text-muted-foreground">{t("templates.subtitle")}</p>
      </div>

      {/* Community coming soon notice */}
      <Card className="bg-primary/5 border-primary/20">
        <CardContent className="flex items-center gap-4 py-4">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
            <ShoppingBag className="w-5 h-5 text-primary" />
          </div>
          <div>
            <p className="font-medium text-foreground">
              {t("templates.community")} - {t("common.comingSoon")}
            </p>
            <p className="text-sm text-muted-foreground">
              Community templates will be available in a future update
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Template grid */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <p className="text-muted-foreground">{t("common.loading")}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {templates.map((template) => (
            <Card
              key={template.id}
              className="bg-surface border-border hover:border-primary/50 transition-colors"
            >
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg">{template.name}</CardTitle>
                    <CardDescription className="mt-1">
                      by {template.author}
                    </CardDescription>
                  </div>
                  <div className="flex gap-1">
                    <Badge variant="secondary" className="bg-surface-hover">
                      {template.category}
                    </Badge>
                    {template.is_free && (
                      <Badge
                        variant="secondary"
                        className="bg-success/10 text-success border-success/20"
                      >
                        {t("templates.free")}
                      </Badge>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  {template.description}
                </p>

                <div className="flex flex-wrap gap-1">
                  {template.tags.map((tag) => (
                    <Badge
                      key={tag}
                      variant="outline"
                      className="text-xs border-border text-muted-foreground"
                    >
                      {tag}
                    </Badge>
                  ))}
                </div>

                <div className="flex items-center justify-between pt-2">
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Download className="w-3.5 h-3.5" />
                      {template.downloads.toLocaleString()}
                    </span>
                    <span className="flex items-center gap-1">
                      <Star className="w-3.5 h-3.5 fill-warning text-warning" />
                      {template.rating}
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => handleInstall(template)}
                    >
                      <Eye className="w-3.5 h-3.5 mr-1" />
                      {t("templates.install")}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Personalization dialog */}
      <Dialog
        open={!!selectedTemplate}
        onOpenChange={(open) => !open && setSelectedTemplate(null)}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {t("templates.personalize")} - {selectedTemplate?.name}
            </DialogTitle>
          </DialogHeader>

          {selectedTemplate && (
            <div className="space-y-4 py-4">
              {/* Template preview */}
              <div className="bg-surface border border-border rounded-lg p-3 max-h-48 overflow-y-auto">
                {selectedTemplate.structure.map((node, i) => (
                  <TemplateTreePreview key={i} node={node} depth={0} />
                ))}
              </div>

              {/* Personalization questions */}
              {selectedTemplate.personalization_questions.length > 0 && (
                <div className="space-y-3">
                  {selectedTemplate.personalization_questions.map((q) => (
                    <div key={q.id} className="space-y-1">
                      <label className="text-sm font-medium text-foreground">
                        {q.question}
                      </label>
                      <Input
                        value={personalization[q.variable_name] ?? ""}
                        onChange={(e) =>
                          setPersonalization((prev) => ({
                            ...prev,
                            [q.variable_name]: e.target.value,
                          }))
                        }
                        placeholder={q.default_value ?? ""}
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setSelectedTemplate(null)}
            >
              {t("common.cancel")}
            </Button>
            <Button onClick={handleApply} disabled={isApplying}>
              <FolderOpen className="w-4 h-4 mr-2" />
              {t("templates.applyTemplate")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function TemplateTreePreview({
  node,
  depth,
}: {
  node: { name: string; children: any[] };
  depth: number;
}) {
  return (
    <div>
      <div
        className="flex items-center gap-1.5 py-0.5 text-sm"
        style={{ paddingLeft: `${depth * 16}px` }}
      >
        <FolderOpen className="w-3.5 h-3.5 text-primary" />
        <span className="text-foreground">{node.name}</span>
      </div>
      {node.children?.map((child: any, i: number) => (
        <TemplateTreePreview key={i} node={child} depth={depth + 1} />
      ))}
    </div>
  );
}
