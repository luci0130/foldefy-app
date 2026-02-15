import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FolderOpen, Sparkles, ShoppingBag, ArrowRight } from "lucide-react";
import { useAppStore } from "@/stores/appStore";

export function Dashboard() {
  const { setCurrentPage } = useAppStore();

  return (
    <div className="space-y-6">
      {/* Welcome section */}
      <div className="space-y-2">
        <h1 className="text-2xl font-bold text-foreground">Welcome to Foldefy</h1>
        <p className="text-muted-foreground">
          Your intelligent file organization assistant
        </p>
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card
          className="bg-surface border-border hover:border-primary/50 transition-colors cursor-pointer group"
          onClick={() => setCurrentPage("organize")}
        >
          <CardHeader>
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-2">
              <FolderOpen className="w-5 h-5 text-primary" />
            </div>
            <CardTitle className="text-lg">Organize Folder</CardTitle>
            <CardDescription>
              Select a folder and let AI analyze its structure
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              variant="ghost"
              className="p-0 h-auto text-primary group-hover:translate-x-1 transition-transform"
            >
              Get started <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </CardContent>
        </Card>

        <Card
          className="bg-surface border-border hover:border-primary/50 transition-colors cursor-pointer group"
          onClick={() => setCurrentPage("marketplace")}
        >
          <CardHeader>
            <div className="w-10 h-10 rounded-lg bg-success/10 flex items-center justify-center mb-2">
              <ShoppingBag className="w-5 h-5 text-success" />
            </div>
            <CardTitle className="text-lg">Browse Templates</CardTitle>
            <CardDescription>
              Explore organization templates for your profession
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              variant="ghost"
              className="p-0 h-auto text-primary group-hover:translate-x-1 transition-transform"
            >
              View templates <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </CardContent>
        </Card>

        <Card className="bg-surface border-border hover:border-primary/50 transition-colors cursor-pointer group">
          <CardHeader>
            <div className="w-10 h-10 rounded-lg bg-warning/10 flex items-center justify-center mb-2">
              <Sparkles className="w-5 h-5 text-warning" />
            </div>
            <CardTitle className="text-lg">AI Suggestions</CardTitle>
            <CardDescription>
              Get personalized organization recommendations
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              variant="ghost"
              className="p-0 h-auto text-primary group-hover:translate-x-1 transition-transform"
            >
              Coming soon <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Recent activity placeholder */}
      <Card className="bg-surface border-border">
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
          <CardDescription>Your latest organization tasks</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <div className="w-16 h-16 rounded-full bg-surface-hover flex items-center justify-center mb-4">
              <FolderOpen className="w-8 h-8 text-muted-foreground" />
            </div>
            <p className="text-muted-foreground">No recent activity</p>
            <p className="text-sm text-muted-foreground mt-1">
              Start by organizing your first folder
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
