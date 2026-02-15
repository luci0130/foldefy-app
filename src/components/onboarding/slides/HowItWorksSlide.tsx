import { motion } from "framer-motion";
import { FolderSearch, Sparkles, CheckSquare, PartyPopper } from "lucide-react";

interface SlideProps {
  onContinue?: () => void;
}

const steps = [
  {
    number: 1,
    title: "Select a folder",
    description: "Choose the folder you want to organize",
    icon: FolderSearch,
    color: "text-blue-400",
    bgColor: "bg-blue-400/10",
  },
  {
    number: 2,
    title: "AI analyzes",
    description: "Our AI examines your file structure",
    icon: Sparkles,
    color: "text-warning",
    bgColor: "bg-warning/10",
  },
  {
    number: 3,
    title: "Review suggestions",
    description: "See proposed changes before applying",
    icon: CheckSquare,
    color: "text-success",
    bgColor: "bg-success/10",
  },
  {
    number: 4,
    title: "Enjoy organized files",
    description: "Apply changes with a single click",
    icon: PartyPopper,
    color: "text-primary",
    bgColor: "bg-primary/10",
  },
];

export function HowItWorksSlide(_props: SlideProps) {
  return (
    <div className="flex flex-col items-center text-center space-y-8">
      {/* Title */}
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="space-y-3"
      >
        <h2 className="text-3xl font-bold text-foreground">How It Works</h2>
        <p className="text-lg text-muted-foreground max-w-md">
          Four simple steps to a perfectly organized file system
        </p>
      </motion.div>

      {/* Steps */}
      <div className="grid grid-cols-2 gap-6 w-full max-w-2xl">
        {steps.map((step, index) => {
          const Icon = step.icon;
          return (
            <motion.div
              key={step.number}
              initial={{ y: 30, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.2 + index * 0.15 }}
              className="relative"
            >
              {/* Connection line */}
              {index < steps.length - 1 && index !== 1 && (
                <motion.div
                  initial={{ scaleX: 0 }}
                  animate={{ scaleX: 1 }}
                  transition={{ delay: 0.5 + index * 0.15, duration: 0.3 }}
                  className="absolute top-10 left-full w-6 h-0.5 bg-border origin-left hidden md:block"
                />
              )}

              <div className="flex flex-col items-center gap-3 p-4 rounded-xl bg-surface border border-border">
                {/* Number badge */}
                <div className="relative">
                  <div className={`w-16 h-16 rounded-full ${step.bgColor} flex items-center justify-center`}>
                    <Icon className={`w-8 h-8 ${step.color}`} />
                  </div>
                  <div className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-surface border-2 border-border flex items-center justify-center text-xs font-bold text-foreground">
                    {step.number}
                  </div>
                </div>

                {/* Text */}
                <div className="space-y-1">
                  <h3 className="font-medium text-foreground">{step.title}</h3>
                  <p className="text-sm text-muted-foreground">
                    {step.description}
                  </p>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
