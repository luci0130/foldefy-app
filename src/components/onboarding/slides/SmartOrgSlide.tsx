import { motion } from "framer-motion";
import { FileText, FolderOpen, Sparkles, ArrowRight } from "lucide-react";

interface SlideProps {
  onContinue?: () => void;
}

export function SmartOrgSlide(_props: SlideProps) {
  const files = [
    { name: "report.pdf", color: "text-red-400" },
    { name: "photo.jpg", color: "text-green-400" },
    { name: "invoice.xlsx", color: "text-blue-400" },
    { name: "notes.txt", color: "text-gray-400" },
  ];

  const folders = [
    { name: "Documents", files: 12 },
    { name: "Images", files: 24 },
    { name: "Finance", files: 8 },
  ];

  return (
    <div className="flex flex-col items-center text-center space-y-8">
      {/* Title */}
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="space-y-3"
      >
        <h2 className="text-3xl font-bold text-foreground">
          AI-Powered Organization
        </h2>
        <p className="text-lg text-muted-foreground max-w-md">
          Foldefy analyzes your files and suggests the perfect folder structure
        </p>
      </motion.div>

      {/* Animation */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="flex items-center gap-8 py-8"
      >
        {/* Scattered files */}
        <div className="relative w-32 h-32">
          {files.map((file, index) => (
            <motion.div
              key={file.name}
              initial={{
                x: Math.random() * 60 - 30,
                y: Math.random() * 60 - 30,
                rotate: Math.random() * 30 - 15,
              }}
              animate={{
                x: Math.random() * 60 - 30,
                y: Math.random() * 60 - 30,
                rotate: Math.random() * 30 - 15,
              }}
              transition={{
                duration: 3,
                repeat: Infinity,
                repeatType: "reverse",
                delay: index * 0.2,
              }}
              className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
            >
              <div className="flex items-center gap-1 bg-surface px-2 py-1 rounded border border-border">
                <FileText className={`w-4 h-4 ${file.color}`} />
                <span className="text-xs text-foreground">{file.name}</span>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Arrow with AI sparkle */}
        <motion.div
          animate={{
            scale: [1, 1.1, 1],
          }}
          transition={{
            duration: 1.5,
            repeat: Infinity,
          }}
          className="flex items-center gap-2"
        >
          <ArrowRight className="w-8 h-8 text-primary" />
          <Sparkles className="w-6 h-6 text-warning animate-pulse" />
        </motion.div>

        {/* Organized folders */}
        <div className="space-y-2">
          {folders.map((folder, index) => (
            <motion.div
              key={folder.name}
              initial={{ x: 50, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.5 + index * 0.15 }}
              className="flex items-center gap-2 bg-surface px-3 py-2 rounded-lg border border-border"
            >
              <FolderOpen className="w-5 h-5 text-primary" />
              <span className="text-sm text-foreground">{folder.name}</span>
              <span className="text-xs text-muted-foreground ml-auto">
                {folder.files} files
              </span>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* Features */}
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.6 }}
        className="flex gap-6 text-sm text-muted-foreground"
      >
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-success" />
          <span>Smart categorization</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-primary" />
          <span>Custom rules</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-warning" />
          <span>Preview changes</span>
        </div>
      </motion.div>
    </div>
  );
}
