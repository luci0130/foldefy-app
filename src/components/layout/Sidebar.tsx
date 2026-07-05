import { cn } from "@/lib/utils";
import { useAppStore } from "@/stores/appStore";
import {
  Home,
  FolderOpen,
  FolderTree,
  ShoppingBag,
  Settings,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";

const navItems = [
  { id: "dashboard" as const, label: "Dashboard", icon: Home },
  { id: "organize" as const, label: "Organize", icon: FolderOpen },
  { id: "folders" as const, label: "Folders", icon: FolderTree },
  { id: "marketplace" as const, label: "Marketplace", icon: ShoppingBag },
  { id: "settings" as const, label: "Settings", icon: Settings },
];

export function Sidebar() {
  const { currentPage, setCurrentPage, sidebarCollapsed, toggleSidebar } = useAppStore();

  return (
    <TooltipProvider delayDuration={0}>
      <aside
        className={cn(
          "flex flex-col h-full bg-surface border-r border-border transition-all duration-300",
          sidebarCollapsed ? "w-16" : "w-56"
        )}
      >
        {/* Logo */}
        <div className="flex items-center h-14 px-4 border-b border-border">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <FolderOpen className="w-5 h-5 text-primary-foreground" />
            </div>
            {!sidebarCollapsed && (
              <span className="font-semibold text-foreground">Foldefy</span>
            )}
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-2 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentPage === item.id;

            const button = (
              <Button
                key={item.id}
                variant="ghost"
                onClick={() => setCurrentPage(item.id)}
                className={cn(
                  "w-full justify-start gap-3 h-10",
                  isActive
                    ? "bg-primary/10 text-primary hover:bg-primary/20"
                    : "text-muted-foreground hover:text-foreground hover:bg-surface-hover",
                  sidebarCollapsed && "justify-center px-2"
                )}
              >
                <Icon className="w-5 h-5 flex-shrink-0" />
                {!sidebarCollapsed && <span>{item.label}</span>}
              </Button>
            );

            if (sidebarCollapsed) {
              return (
                <Tooltip key={item.id}>
                  <TooltipTrigger asChild>{button}</TooltipTrigger>
                  <TooltipContent side="right">
                    <p>{item.label}</p>
                  </TooltipContent>
                </Tooltip>
              );
            }

            return button;
          })}
        </nav>

        {/* Collapse button */}
        <div className="p-2 border-t border-border">
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleSidebar}
            className={cn(
              "w-full justify-center text-muted-foreground hover:text-foreground"
            )}
          >
            {sidebarCollapsed ? (
              <ChevronRight className="w-4 h-4" />
            ) : (
              <>
                <ChevronLeft className="w-4 h-4 mr-2" />
                <span>Collapse</span>
              </>
            )}
          </Button>
        </div>
      </aside>
    </TooltipProvider>
  );
}
