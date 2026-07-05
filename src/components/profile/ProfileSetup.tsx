import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { ChevronLeft, X } from "lucide-react";
import { LanguageStep } from "./LanguageStep";
import { UsageTypeStep } from "./UsageTypeStep";
import { ActivityStep } from "./ActivityStep";
import { ProjectTypesStep } from "./ProjectTypesStep";
import { OrganizationStyleStep } from "./OrganizationStyleStep";
import { ConfirmationStep } from "./ConfirmationStep";
import { useUserStore } from "@/stores/userStore";
import type { UserProfile } from "@/lib/tauri";

interface ProfileSetupProps {
  onComplete: (scanMode: "entire" | "folder") => void;
  onSkip: () => void;
}

export interface ProfileFormData {
  language: string;
  usageType: "personal" | "work" | "both";
  activities: string[];
  customActivity: string;
  projectTypes: string[];
  organizationStyle: string[];
  primaryFileTypes: string[];
  storageHabits: {
    uses_multiple_drives: boolean;
    uses_cloud_storage: string[];
    uses_external_storage: boolean;
  };
  scanMode: "entire" | "folder" | null;
}

const steps = [
  LanguageStep,
  UsageTypeStep,
  ActivityStep,
  ProjectTypesStep,
  OrganizationStyleStep,
  ConfirmationStep,
];

export function ProfileSetup({ onComplete, onSkip }: ProfileSetupProps) {
  const { t } = useTranslation();
  const [currentStep, setCurrentStep] = useState(0);
  const [direction, setDirection] = useState(0);
  const [formData, setFormData] = useState<ProfileFormData>({
    language: "en",
    usageType: "personal",
    activities: [],
    customActivity: "",
    projectTypes: [],
    organizationStyle: [],
    primaryFileTypes: [],
    storageHabits: {
      uses_multiple_drives: false,
      uses_cloud_storage: [],
      uses_external_storage: false,
    },
    scanMode: null,
  });

  const { setProfile, setLanguage } = useUserStore();

  const isFirstStep = currentStep === 0;
  const isLastStep = currentStep === steps.length - 1;

  const updateFormData = (updates: Partial<ProfileFormData>) => {
    setFormData((prev) => ({ ...prev, ...updates }));
    if (updates.language) {
      setLanguage(updates.language);
    }
  };

  const saveProfileAndComplete = (scanMode: "entire" | "folder") => {
    const profile: UserProfile = {
      language: formData.language,
      usage_type: formData.usageType,
      activities: formData.customActivity
        ? [...formData.activities, formData.customActivity]
        : formData.activities,
      project_types: formData.projectTypes,
      organization_style: formData.organizationStyle,
      primary_file_types: formData.primaryFileTypes,
      storage_habits: formData.storageHabits,
      onboarding_completed: true,
      created_at: new Date().toISOString(),
    };
    setProfile(profile);
    onComplete(scanMode);
  };

  const goToNext = () => {
    if (!isLastStep) {
      setDirection(1);
      setCurrentStep((prev) => prev + 1);
    }
    // On last step, buttons are handled by scan mode selection
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
          {t("common.skip")}
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
            {t("common.back")}
          </Button>
        </div>
      )}

      {/* Progress bar */}
      <div className="absolute top-16 left-1/2 -translate-x-1/2 w-full max-w-md px-8 z-10">
        <div className="h-1 bg-surface rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-primary"
            initial={{ width: "0%" }}
            animate={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>
        <p className="text-center text-xs text-muted-foreground mt-2">
          {t("profile.stepOf", {
            current: currentStep + 1,
            total: steps.length,
          })}
        </p>
      </div>

      {/* Step content */}
      <div className="flex-1 flex items-center justify-center overflow-y-auto px-8 pt-28 pb-4">
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
              formData={formData}
              updateFormData={updateFormData}
              onContinue={goToNext}
            />
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-center px-8 py-4 gap-3 flex-shrink-0">
        {isLastStep ? (
          <>
            <Button
              onClick={() => saveProfileAndComplete("entire")}
              size="lg"
              className="px-6"
            >
              {t("scanning.entireStorage")}
            </Button>
            <Button
              onClick={() => saveProfileAndComplete("folder")}
              size="lg"
              variant="secondary"
              className="px-6"
            >
              {t("scanning.specificFolder")}
            </Button>
          </>
        ) : (
          <Button onClick={goToNext} size="lg" className="px-8">
            {t("common.continue")}
          </Button>
        )}
      </div>
    </div>
  );
}
