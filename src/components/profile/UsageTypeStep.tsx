import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface UsageTypeStepProps {
  usageType: "personal" | "work" | "both";
  setUsageType: (type: "personal" | "work" | "both") => void;
  activities: string[];
  setActivities: (activities: string[]) => void;
  customActivity: string;
  setCustomActivity: (activity: string) => void;
  onContinue: () => void;
}

const options = [
  {
    id: "personal" as const,
    label: "Personal",
    description: "Organize personal files, photos, documents",
    emoji: "🏠",
  },
  {
    id: "work" as const,
    label: "Work",
    description: "Professional file management for your job",
    emoji: "💼",
  },
  {
    id: "both" as const,
    label: "Both",
    description: "Mix of personal and work files",
    emoji: "🔄",
  },
];

export function UsageTypeStep({
  usageType,
  setUsageType,
}: UsageTypeStepProps) {
  return (
    <div className="flex flex-col items-center text-center space-y-8">
      {/* Title */}
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="space-y-3"
      >
        <h2 className="text-3xl font-bold text-foreground">
          How will you use Foldefy?
        </h2>
        <p className="text-lg text-muted-foreground">
          This helps us customize your experience
        </p>
      </motion.div>

      {/* Options */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full max-w-2xl">
        {options.map((option, index) => {
          const isSelected = usageType === option.id;

          return (
            <motion.button
              key={option.id}
              initial={{ y: 30, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.1 + index * 0.1 }}
              onClick={() => setUsageType(option.id)}
              className={cn(
                "flex flex-col items-center gap-4 p-6 rounded-xl border-2 transition-all",
                "hover:border-primary/50 hover:bg-surface-hover",
                isSelected
                  ? "border-primary bg-primary/5"
                  : "border-border bg-surface"
              )}
            >
              <div
                className={cn(
                  "w-16 h-16 rounded-full flex items-center justify-center transition-colors",
                  isSelected ? "bg-primary/20" : "bg-surface-hover"
                )}
              >
                <span className="text-3xl">{option.emoji}</span>
              </div>

              <div className="space-y-1">
                <h3 className="font-semibold text-foreground">{option.label}</h3>
                <p className="text-sm text-muted-foreground">
                  {option.description}
                </p>
              </div>

              {/* Selection indicator */}
              <div
                className={cn(
                  "w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors",
                  isSelected
                    ? "border-primary bg-primary"
                    : "border-muted-foreground"
                )}
              >
                {isSelected && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="w-2 h-2 rounded-full bg-white"
                  />
                )}
              </div>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
