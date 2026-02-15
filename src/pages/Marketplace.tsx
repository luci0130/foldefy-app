import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Download, Star, ShoppingBag } from "lucide-react";

const templates = [
  {
    id: 1,
    name: "Freelancer Essentials",
    description: "Perfect organization structure for freelancers and consultants",
    author: "Foldefy Team",
    downloads: 1234,
    rating: 4.8,
    tags: ["freelance", "business", "invoices"],
    category: "Business",
  },
  {
    id: 2,
    name: "Developer Project Structure",
    description: "Standard folder structure for software development projects",
    author: "DevCommunity",
    downloads: 2567,
    rating: 4.9,
    tags: ["development", "code", "projects"],
    category: "Development",
  },
  {
    id: 3,
    name: "Photography Workflow",
    description: "Organize photos by date, event, and editing status",
    author: "PhotoPros",
    downloads: 876,
    rating: 4.7,
    tags: ["photography", "media", "creative"],
    category: "Creative",
  },
  {
    id: 4,
    name: "Accounting & Finance",
    description: "Structured organization for financial documents and records",
    author: "FinanceExperts",
    downloads: 1890,
    rating: 4.6,
    tags: ["accounting", "finance", "tax"],
    category: "Finance",
  },
  {
    id: 5,
    name: "Student Semester Pack",
    description: "Organize coursework, notes, and assignments by semester",
    author: "EduOrg",
    downloads: 3421,
    rating: 4.8,
    tags: ["education", "student", "courses"],
    category: "Education",
  },
  {
    id: 6,
    name: "HR Documents Hub",
    description: "Complete HR document organization system",
    author: "HRPros",
    downloads: 654,
    rating: 4.5,
    tags: ["hr", "recruitment", "documents"],
    category: "Business",
  },
];

export function Marketplace() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-2xl font-bold text-foreground">Template Marketplace</h1>
        <p className="text-muted-foreground">
          Browse and install organization templates created by professionals
        </p>
      </div>

      {/* Coming soon notice */}
      <Card className="bg-primary/5 border-primary/20">
        <CardContent className="flex items-center gap-4 py-4">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
            <ShoppingBag className="w-5 h-5 text-primary" />
          </div>
          <div>
            <p className="font-medium text-foreground">Marketplace coming soon!</p>
            <p className="text-sm text-muted-foreground">
              Template installation will be available in the next update
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Template grid */}
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
                <Badge variant="secondary" className="bg-surface-hover">
                  {template.category}
                </Badge>
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
                <Button size="sm" variant="secondary" disabled>
                  Install
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
