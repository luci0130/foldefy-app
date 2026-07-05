import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import en from "./locales/en.json";
import ro from "./locales/ro.json";
import fr from "./locales/fr.json";
import de from "./locales/de.json";
import es from "./locales/es.json";

i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    ro: { translation: ro },
    fr: { translation: fr },
    de: { translation: de },
    es: { translation: es },
  },
  lng: "en",
  fallbackLng: "en",
  interpolation: {
    escapeValue: false,
  },
});

export default i18n;
