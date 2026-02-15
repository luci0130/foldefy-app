import { motion } from "framer-motion";
import { Check, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface ConfirmationStepProps {
  usageType: "personal" | "work" | "both";
  setUsageType: (type: "personal" | "work" | "both") => void;
  activities: string[];
  setActivities: (activities: string[]) => void;
  customActivity: string;
  setCustomActivity: (activity: string) => void;
  onContinue: () => void;
}

const usageLabels = {
  personal: { label: "Personal", emoji: "🏠" },
  work: { label: "Work", emoji: "💼" },
  both: { label: "Personal & Work", emoji: "🔄" },
};

const activityLabels: Record<string, { label: string; emoji: string }> = {
  accountant: { label: "Accountant / Finance", emoji: "📊" },
  photographer: { label: "Photographer / Videographer", emoji: "📸" },
  developer: { label: "Software Developer / IT", emoji: "💻" },
  manager: { label: "CEO / Manager", emoji: "👔" },
  hr: { label: "HR / Recruitment", emoji: "👥" },
  designer: { label: "Designer / Creative", emoji: "🎨" },
  writer: { label: "Writer / Content Creator", emoji: "📝" },
  student: { label: "Student / Education", emoji: "🎓" },
  healthcare: { label: "Healthcare", emoji: "🏥" },
};

export function ConfirmationStep({
  usageType,
  activities,
  customActivity,
}: ConfirmationStepProps) {
  const allActivities = [
    ...activities,
    ...(customActivity ? [customActivity] : []),
  ];

  return (
    <div className="flex flex-col items-center text-center space-y-8">
      {/* Celebration icon */}
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring", stiffness: 200, damping: 15 }}
        className="relative"
      >
        <div className="w-20 h-20 rounded-2xl bg-success/20 flex items-center justify-center">
          <Check className="w-10 h-10 text-success" />
        </div>
        <motion.div
          animate={{
            rotate: [0, 15, -15, 0],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
          }}
          className="absolute -top-2 -right-2"
        >
          <Sparkles className="w-6 h-6 text-warning" />
        </motion.div>
      </motion.div>

      {/* Title */}
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="space-y-3"
      >
        <h2 className="text-3xl font-bold text-foreground">
          Perfect, you're all set!
        </h2>
        <p className="text-lg text-muted-foreground">
          Here's a summary of your preferences
        </p>
      </motion.div>

      {/* Summary card */}
      <motion.div
        initial={{ y: 30, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="w-full max-w-md bg-surface border border-border rounded-xl p-6 space-y-6"
      >
        {/* Usage type */}
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">Usage Type</p>
          <div className="flex items-center gap-2">
            <span className="text-xl">{usageLabels[usageType].emoji}</span>
            <span className="font-medium text-foreground">
              {usageLabels[usageType].label}
            </span>
          </div>
        </div>

        {/* Activities */}
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">Activities</p>
          {allActivities.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {allActivities.map((activity, index) => {
                const activityInfo = activityLabels[activity];
                return (
                  <motion.div
                    key={activity}
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.4 + index * 0.05 }}
                  >
                    <Badge
                      variant="secondary"
                      className="bg-surface-hover text-foreground gap-1"
                    >
                      {activityInfo ? (
                        <>
                          <span>{activityInfo.emoji}</span>
                          {activityInfo.label}
                        </>
                      ) : (
                        <>
                          <span>📦</span>
                          {activity}
                        </>
                      )}
                    </Badge>
                  </motion.div>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground italic">
              No activities selected
            </p>
          )}
        </div>
      </motion.div>

      {/* What's next */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6 }}
        className="text-sm text-muted-foreground max-w-md"
      >
        We'll use this information to provide personalized organization
        suggestions and recommend relevant templates.
      </motion.div>
    </div>
  );
}
