import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { WelcomeSlide } from "./slides/WelcomeSlide";
import { SmartOrgSlide } from "./slides/SmartOrgSlide";
import { TemplatesSlide } from "./slides/TemplatesSlide";
import { HowItWorksSlide } from "./slides/HowItWorksSlide";
import { GetStartedSlide } from "./slides/GetStartedSlide";

interface OnboardingCarouselProps {
  onComplete: () => void;
  onSkip: () => void;
}

const slides = [
  WelcomeSlide,
  SmartOrgSlide,
  TemplatesSlide,
  HowItWorksSlide,
  GetStartedSlide,
];

export function OnboardingCarousel({
  onComplete,
  onSkip,
}: OnboardingCarouselProps) {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [direction, setDirection] = useState(0);

  const isFirstSlide = currentSlide === 0;
  const isLastSlide = currentSlide === slides.length - 1;

  const goToNext = () => {
    if (isLastSlide) {
      onComplete();
    } else {
      setDirection(1);
      setCurrentSlide((prev) => prev + 1);
    }
  };

  const goToPrev = () => {
    if (!isFirstSlide) {
      setDirection(-1);
      setCurrentSlide((prev) => prev - 1);
    }
  };

  const CurrentSlideComponent = slides[currentSlide];

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

      {/* Slide content */}
      <div className="flex-1 flex items-center justify-center overflow-hidden px-8">
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={currentSlide}
            custom={direction}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{
              x: { type: "spring", stiffness: 300, damping: 30 },
              opacity: { duration: 0.2 },
            }}
            className="w-full max-w-3xl"
          >
            <CurrentSlideComponent onContinue={goToNext} />
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between px-8 py-6">
        {/* Back button */}
        <Button
          variant="ghost"
          onClick={goToPrev}
          disabled={isFirstSlide}
          className={cn(
            "text-muted-foreground hover:text-foreground",
            isFirstSlide && "invisible"
          )}
        >
          <ChevronLeft className="w-4 h-4 mr-1" />
          Back
        </Button>

        {/* Progress dots */}
        <div className="flex items-center gap-2">
          {slides.map((_, index) => (
            <button
              key={index}
              onClick={() => {
                setDirection(index > currentSlide ? 1 : -1);
                setCurrentSlide(index);
              }}
              className={cn(
                "w-2 h-2 rounded-full transition-all duration-300",
                index === currentSlide
                  ? "w-6 bg-primary"
                  : "bg-muted hover:bg-muted-foreground"
              )}
            />
          ))}
        </div>

        {/* Next button */}
        <Button onClick={goToNext}>
          {isLastSlide ? "Get Started" : "Next"}
          {!isLastSlide && <ChevronRight className="w-4 h-4 ml-1" />}
        </Button>
      </div>
    </div>
  );
}
