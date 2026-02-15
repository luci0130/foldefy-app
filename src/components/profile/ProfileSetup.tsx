import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ChevronLeft, X } from "lucide-react";
import { UsageTypeStep } from "./UsageTypeStep";
import { ActivityStep } from "./ActivityStep";
import { ConfirmationStep } from "./ConfirmationStep";
import { useUserStore } from "@/stores/userStore";
import type { UserProfile } from "@/lib/tauri";

interface ProfileSetupProps {
  onComplete: () => void;
  onSkip: () => void;
}

const steps = [UsageTypeStep, ActivityStep, ConfirmationStep];

export function ProfileSetup({ onComplete, onSkip }: ProfileSetupProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [direction, setDirection] = useState(0);
  const [usageType, setUsageType] = useState<"personal" | "work" | "both">("personal");
  const [activities, setActivities] = useState<string[]>([]);
  const [customActivity, setCustomActivity] = useState("");

  const { setProfile } = useUserStore();

  const isFirstStep = currentStep === 0;
  const isLastStep = currentStep === steps.length - 1;

  const goToNext = () => {
    if (isLastStep) {
      // Save profile and complete
      const profile: UserProfile = {
        usage_type: usageType,
        activities: customActivity
          ? [...activities, customActivity]
          : activities,
        onboarding_completed: true,
        created_at: new Date().toISOString(),
      };
      setProfile(profile);
      onComplete();
    } else {
      setDirection(1);
      setCurrentStep((prev) => prev + 1);
    }
  };

  const goToPrev = () => {
    if (!isFirstStep) {
      setDirection(-1);
      setCurrentStep((prev) => prev - 1);
    }
  };

  const CurrentStepComponent = steps[currentStep];

  const slideVariants = {
    enter: (direction: number) => ({
      x: direction > 0 ? 100 : -100,
      opacity: 0,
    }),
    center: {
      x: 0,
      opacity: 1,
    },
    exit: (direction: number) => ({
      x: direction < 0 ? 100 : -100,
      opacity: 0,
    }),
  };

  return (
    <div className="fixed inset-0 bg-background flex flex-col">
      {/* Skip button */}
      <div className="absolute top-4 right-4 z-10">
        <Button
          variant="ghost"
          size="sm"
          onClick={onSkip}
          className="text-muted-foreground hover:text-foreground"
        >
          Skip
          <X className="w-4 h-4 ml-1" />
        </Button>
      </div>

      {/* Back button */}
      {!isFirstStep && (
        <div className="absolute top-4 left-4 z-10">
          <Button
            variant="ghost"
            size="sm"
            onClick={goToPrev}
            className="text-muted-foreground hover:text-foreground"
          >
            <ChevronLeft className="w-4 h-4 mr-1" />
            Back
          </Button>
        </div>
      )}

      {/* Progress bar */}
      <div className="absolute top-16 left-1/2 -translate-x-1/2 w-full max-w-md px-8">
        <div className="h-1 bg-surface rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-primary"
            initial={{ width: "0%" }}
            animate={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>
        <p className="text-center text-xs text-muted-foreground mt-2">
          Step {currentStep + 1} of {steps.length}
        </p>
      </div>

      {/* Step content */}
      <div className="flex-1 flex items-center justify-center overflow-hidden px-8 pt-24">
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={currentStep}
            custom={direction}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{
              x: { type: "spring", stiffness: 300, damping: 30 },
              opacity: { duration: 0.2 },
            }}
            className="w-full max-w-2xl"
          >
            <CurrentStepComponent
              usageType={usageType}
              setUsageType={setUsageType}
              activities={activities}
              setActivities={setActivities}
              customActivity={customActivity}
              setCustomActivity={setCustomActivity}
              onContinue={goToNext}
            />
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-center px-8 py-6">
        <Button onClick={goToNext} size="lg" className="px-8">
          {isLastStep ? "Start Using Foldefy" : "Continue"}
        </Button>
      </div>
    </div>
  );
}
