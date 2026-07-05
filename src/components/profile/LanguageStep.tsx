import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import type { ProfileFormData } from "./ProfileSetup";

interface LanguageStepProps {
  formData: ProfileFormData;
  updateFormData: (updates: Partial<ProfileFormData>) => void;
  onContinue: () => void;
}

const languages = [
  { id: "en", label: "English", code: "GB" },
  { id: "ro", label: "Romana", code: "RO" },
  { id: "fr", label: "Francais", code: "FR" },
  { id: "de", label: "Deutsch", code: "DE" },
  { id: "es", label: "Espanol", code: "ES" },
];

function FlagIcon({ code, className }: { code: string; className?: string }) {
  const flagUrl = `https://flagcdn.com/w80/${code.toLowerCase()}.png`;
  return (
    <img
      src={flagUrl}
      alt={code}
      className={cn("rounded-sm object-cover", className)}
      width={40}
      height={30}
      loading="eager"
    />
  );
}

export function LanguageStep({
  formData,
  updateFormData,
}: LanguageStepProps) {
  const { t, i18n } = useTranslation();

  const handleSelect = (langId: string) => {
    updateFormData({ language: langId });
    i18n.changeLanguage(langId);
  };

  return (
    <div className="flex flex-col items-center text-center space-y-8">
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="space-y-3"
      >
        <h2 className="text-3xl font-bold text-foreground">
          {t("profile.language.title")}
        </h2>
        <p className="text-lg text-muted-foreground">
          {t("profile.language.subtitle")}
        </p>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full max-w-2xl">
        {languages.map((lang, index) => {
          const isSelected = formData.language === lang.id;

          return (
            <motion.button
              key={lang.id}
              initial={{ y: 30, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.1 + index * 0.08 }}
              onClick={() => handleSelect(lang.id)}
              className={cn(
                "flex flex-col items-center gap-4 p-6 rounded-xl border-2 transition-all",
                "hover:border-primary/50 hover:bg-surface-hover",
                isSelected
                  ? "border-primary bg-primary/5"
                  : "border-border bg-surface"
              )}
            >
              <div
                className={cn(
                  "w-16 h-16 rounded-full flex items-center justify-center transition-colors overflow-hidden",
                  isSelected ? "bg-primary/20" : "bg-surface-hover"
                )}
              >
                <FlagIcon code={lang.code} className="w-10 h-7" />
              </div>

              <div className="space-y-1">
                <h3 className="font-semibold text-foreground">{lang.label}</h3>
              </div>

              <div
                className={cn(
                  "w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors",
                  isSelected
                    ? "border-primary bg-primary"
                    : "border-muted-foreground"
                )}
              >
                {isSelected && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="w-2 h-2 rounded-full bg-white"
                  />
                )}
              </div>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
