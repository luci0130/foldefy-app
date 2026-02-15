import { motion } from "framer-motion";
import { FolderOpen } from "lucide-react";

interface SlideProps {
  onContinue?: () => void;
}

export function WelcomeSlide(_props: SlideProps) {
  return (
    <div className="flex flex-col items-center text-center space-y-8">
      {/* Animated logo */}
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="relative"
      >
        <motion.div
          animate={{
            boxShadow: [
              "0 0 20px rgba(99, 102, 241, 0.3)",
              "0 0 40px rgba(99, 102, 241, 0.5)",
              "0 0 20px rgba(99, 102, 241, 0.3)",
            ],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          className="w-24 h-24 rounded-2xl bg-gradient-to-br from-primary to-primary-hover flex items-center justify-center"
        >
          <FolderOpen className="w-12 h-12 text-white" />
        </motion.div>
      </motion.div>

      {/* Title */}
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.2, duration: 0.5 }}
        className="space-y-3"
      >
        <h1 className="text-4xl font-bold text-foreground">
          Welcome to <span className="gradient-text">Foldefy</span>
        </h1>
        <p className="text-xl text-muted-foreground max-w-md">
          Your intelligent file organization assistant
        </p>
      </motion.div>

      {/* Decorative elements */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4, duration: 0.5 }}
        className="flex items-center gap-8 pt-4"
      >
        {[
          { icon: "📁", label: "Smart Organization" },
          { icon: "🤖", label: "AI-Powered" },
          { icon: "⚡", label: "Fast & Efficient" },
        ].map((item, index) => (
          <motion.div
            key={item.label}
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.5 + index * 0.1, duration: 0.3 }}
            className="flex flex-col items-center gap-2 text-sm text-muted-foreground"
          >
            <span className="text-2xl">{item.icon}</span>
            <span>{item.label}</span>
          </motion.div>
        ))}
      </motion.div>
    </div>
  );
}
