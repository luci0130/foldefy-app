import { Search, User } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export function Header() {
  return (
    <header className="flex items-center justify-between h-14 px-6 bg-surface border-b border-border">
      {/* Search */}
      <div className="flex-1 max-w-md">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search files and folders..."
            className="pl-10 bg-background border-border focus:ring-primary"
          />
        </div>
      </div>

      {/* Right side */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          className="rounded-full w-9 h-9 bg-surface-hover hover:bg-muted"
        >
          <User className="w-5 h-5 text-muted-foreground" />
        </Button>
      </div>
    </header>
  );
}
