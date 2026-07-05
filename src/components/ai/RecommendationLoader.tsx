import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { Folder, Sparkles } from "lucide-react";

export function RecommendationLoader() {
  const { t } = useTranslation();
  const [stepIndex, setStepIndex] = useState(0);

  const steps = [
    t("ai.analyzingStep"),
    t("ai.generatingStep"),
    t("ai.finalizingStep"),
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setStepIndex((prev) => (prev + 1) % steps.length);
    }, 3000);
    return () => clearInterval(interval);
  }, [steps.length]);

  return (
    <div className="flex flex-col items-center text-center space-y-8">
      {/* Animated icon */}
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring", stiffness: 200, damping: 15 }}
        className="relative"
      >
        <motion.div
          className="w-24 h-24 rounded-2xl bg-primary/10 flex items-center justify-center"
          animate={{ scale: [1, 1.05, 1] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          <Folder className="w-12 h-12 text-primary" />
        </motion.div>

        {/* Floating sparkles */}
        {[0, 1, 2, 3].map((i) => (
          <motion.div
            key={i}
            className="absolute"
            initial={{ opacity: 0 }}
            animate={{
              opacity: [0, 1, 0],
              x: [0, (i % 2 === 0 ? 1 : -1) * 30],
              y: [0, -40 - i * 10],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              delay: i * 0.5,
            }}
            style={{
              top: "50%",
              left: "50%",
            }}
          >
            <Sparkles className="w-4 h-4 text-warning" />
          </motion.div>
        ))}
      </motion.div>

      {/* Status text */}
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="space-y-4"
      >
        <h2 className="text-2xl font-bold text-foreground">
          {t("ai.generating")}
        </h2>

        <motion.p
          key={stepIndex}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className="text-sm text-muted-foreground"
        >
          {steps[stepIndex]}
        </motion.p>
      </motion.div>

      {/* Progress bar */}
      <div className="w-64 h-1 bg-surface rounded-full overflow-hidden">
        <motion.div
          className="h-full bg-primary rounded-full"
          animate={{ x: ["-100%", "100%"] }}
          transition={{
            duration: 1.5,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          style={{ width: "40%" }}
        />
      </div>
    </div>
  );
}
