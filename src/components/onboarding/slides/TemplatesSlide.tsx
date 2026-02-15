import { motion } from "framer-motion";
import { Download, Star } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface SlideProps {
  onContinue?: () => void;
}

const templates = [
  {
    name: "Developer Pro",
    icon: "💻",
    category: "Development",
    downloads: "2.5k",
    rating: 4.9,
  },
  {
    name: "Photo Studio",
    icon: "📸",
    category: "Creative",
    downloads: "1.8k",
    rating: 4.8,
  },
  {
    name: "Finance Hub",
    icon: "💰",
    category: "Finance",
    downloads: "3.2k",
    rating: 4.7,
  },
  {
    name: "Student Pack",
    icon: "📚",
    category: "Education",
    downloads: "4.1k",
    rating: 4.9,
  },
];

export function TemplatesSlide(_props: SlideProps) {
  return (
    <div className="flex flex-col items-center text-center space-y-8">
      {/* Title */}
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="space-y-3"
      >
        <h2 className="text-3xl font-bold text-foreground">
          Ready-Made Templates
        </h2>
        <p className="text-lg text-muted-foreground max-w-lg">
          Browse and install organization templates created by professionals -
          accountants, photographers, developers, and more
        </p>
      </motion.div>

      {/* Template grid */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="grid grid-cols-2 gap-4 w-full max-w-lg"
      >
        {templates.map((template, index) => (
          <motion.div
            key={template.name}
            initial={{ y: 30, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.3 + index * 0.1 }}
            whileHover={{ scale: 1.02, y: -2 }}
            className="bg-surface border border-border rounded-xl p-4 text-left cursor-pointer hover:border-primary/50 transition-colors"
          >
            <div className="flex items-start justify-between mb-3">
              <span className="text-2xl">{template.icon}</span>
              <Badge
                variant="secondary"
                className="bg-surface-hover text-xs"
              >
                {template.category}
              </Badge>
            </div>
            <h3 className="font-medium text-foreground mb-2">
              {template.name}
            </h3>
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Download className="w-3 h-3" />
                {template.downloads}
              </span>
              <span className="flex items-center gap-1">
                <Star className="w-3 h-3 fill-warning text-warning" />
                {template.rating}
              </span>
            </div>
          </motion.div>
        ))}
      </motion.div>

      {/* Bottom text */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.7 }}
        className="text-sm text-muted-foreground"
      >
        New templates added weekly by the community
      </motion.p>
    </div>
  );
}
