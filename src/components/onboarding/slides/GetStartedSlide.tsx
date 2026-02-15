import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ArrowRight, Sparkles } from "lucide-react";

interface SlideProps {
  onContinue: () => void;
}

export function GetStartedSlide({ onContinue }: SlideProps) {
  return (
    <div className="flex flex-col items-center text-center space-y-8">
      {/* Celebration animation */}
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring", stiffness: 200, damping: 15 }}
        className="relative"
      >
        {/* Floating sparkles */}
        {[...Array(6)].map((_, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, scale: 0 }}
            animate={{
              opacity: [0, 1, 0],
              scale: [0.5, 1, 0.5],
              x: Math.cos((i * 60 * Math.PI) / 180) * 60,
              y: Math.sin((i * 60 * Math.PI) / 180) * 60,
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              delay: i * 0.2,
            }}
            className="absolute top-1/2 left-1/2"
          >
            <Sparkles className="w-4 h-4 text-warning" />
          </motion.div>
        ))}

        {/* Main icon */}
        <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary to-primary-hover flex items-center justify-center">
          <span className="text-4xl">🎉</span>
        </div>
      </motion.div>

      {/* Title */}
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="space-y-3"
      >
        <h2 className="text-3xl font-bold text-foreground">
          Let's personalize your experience
        </h2>
        <p className="text-lg text-muted-foreground max-w-md">
          Tell us a bit about yourself so we can customize Foldefy for your needs
        </p>
      </motion.div>

      {/* Features summary */}
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="flex flex-col items-center gap-3 text-sm text-muted-foreground"
      >
        <div className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-success" />
          <span>Personalized organization suggestions</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-primary" />
          <span>Templates matching your profession</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-warning" />
          <span>AI trained on your workflow</span>
        </div>
      </motion.div>

      {/* CTA Button */}
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.6 }}
      >
        <Button
          size="lg"
          onClick={onContinue}
          className="text-lg px-8 h-12 gap-2"
        >
          Continue to Setup
          <ArrowRight className="w-5 h-5" />
        </Button>
      </motion.div>
    </div>
  );
}
