import { motion } from "framer-motion";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface ActivityStepProps {
  usageType: "personal" | "work" | "both";
  setUsageType: (type: "personal" | "work" | "both") => void;
  activities: string[];
  setActivities: (activities: string[]) => void;
  customActivity: string;
  setCustomActivity: (activity: string) => void;
  onContinue: () => void;
}

const activityOptions = [
  { id: "accountant", label: "Accountant / Finance", emoji: "📊" },
  { id: "photographer", label: "Photographer / Videographer", emoji: "📸" },
  { id: "developer", label: "Software Developer / IT", emoji: "💻" },
  { id: "manager", label: "CEO / Manager", emoji: "👔" },
  { id: "hr", label: "HR / Recruitment", emoji: "👥" },
  { id: "designer", label: "Designer / Creative", emoji: "🎨" },
  { id: "writer", label: "Writer / Content Creator", emoji: "📝" },
  { id: "student", label: "Student / Education", emoji: "🎓" },
  { id: "healthcare", label: "Healthcare", emoji: "🏥" },
];

export function ActivityStep({
  activities,
  setActivities,
  customActivity,
  setCustomActivity,
}: ActivityStepProps) {
  const toggleActivity = (id: string) => {
    if (activities.includes(id)) {
      setActivities(activities.filter((a) => a !== id));
    } else {
      setActivities([...activities, id]);
    }
  };

  return (
    <div className="flex flex-col items-center text-center space-y-8">
      {/* Title */}
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="space-y-3"
      >
        <h2 className="text-3xl font-bold text-foreground">
          What best describes your main activity?
        </h2>
        <p className="text-lg text-muted-foreground">
          Select all that apply - you can choose multiple
        </p>
      </motion.div>

      {/* Activity grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 w-full max-w-2xl">
        {activityOptions.map((option, index) => {
          const isSelected = activities.includes(option.id);

          return (
            <motion.button
              key={option.id}
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.05 + index * 0.03 }}
              onClick={() => toggleActivity(option.id)}
              className={cn(
                "flex items-center gap-3 p-4 rounded-xl border-2 transition-all text-left",
                "hover:border-primary/50",
                isSelected
                  ? "border-primary bg-primary/5"
                  : "border-border bg-surface hover:bg-surface-hover"
              )}
            >
              <span className="text-2xl">{option.emoji}</span>
              <span
                className={cn(
                  "text-sm font-medium",
                  isSelected ? "text-foreground" : "text-muted-foreground"
                )}
              >
                {option.label}
              </span>
            </motion.button>
          );
        })}

        {/* Other option with input */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.05 + activityOptions.length * 0.03 }}
          className={cn(
            "flex items-center gap-3 p-4 rounded-xl border-2 transition-all",
            customActivity
              ? "border-primary bg-primary/5"
              : "border-border bg-surface"
          )}
        >
          <span className="text-2xl">📦</span>
          <Input
            value={customActivity}
            onChange={(e) => setCustomActivity(e.target.value)}
            placeholder="Other..."
            className="border-0 bg-transparent p-0 h-auto text-sm focus-visible:ring-0"
          />
        </motion.div>
      </div>

      {/* Selected count */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="text-sm text-muted-foreground"
      >
        {activities.length + (customActivity ? 1 : 0)} selected
      </motion.p>
    </div>
  );
}
