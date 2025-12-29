import AsyncStorage from "@react-native-async-storage/async-storage";
import { getLocales } from "expo-localization";
import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import { Platform } from "react-native"; // 1. Import Platform
import en from "../locales/en/translation.json";
import es from "../locales/es/translation.json";
import fr from "../locales/fr/translation.json";
import it from "../locales/it/translation.json";

const STORE_LANGUAGE_KEY = "language";

// Helper to check if we are in a browser or on a native device (not SSR)
const isClient = Platform.OS !== "web" || typeof window !== "undefined";

const languageDetector = {
  type: "languageDetector",
  async: true,
  init: () => {},
  detect: async (callback) => {
    try {
      // 💡 FIX: If we are on the server (SSR), return fallback immediately
      if (!isClient) {
        return callback("en");
      }

      // 1. Check AsyncStorage
      const savedData = await AsyncStorage.getItem(STORE_LANGUAGE_KEY);
      if (savedData) {
        return callback(savedData);
      }

      // 2. Check Device Locale
      const locales = getLocales();
      if (locales && locales.length > 0) {
        const bestLanguage = locales[0].languageCode;
        return callback(bestLanguage || "it");
      }

      return callback("en");
    } catch (error) {
      callback("en");
    }
  },
  cacheUserLanguage: async (language) => {
    try {
      // 💡 FIX: Only attempt to save if we are on the client
      if (isClient) {
        await AsyncStorage.setItem(STORE_LANGUAGE_KEY, language);
      }
    } catch (error) {
      console.warn("Error saving language", error);
    }
  },
};

i18n
  .use(languageDetector)
  .use(initReactI18next)
  .init({
    compatibilityJSON: "v3",
    fallbackLng: "en",
    resources: {
      en: { translation: en },
      it: { translation: it },
      fr: { translation: fr },
      es: { translation: es },
    },
    supportedLngs: ["en", "it", "fr", "es"],
    nonExplicitSupportedLngs: true,
    load: "languageOnly",
    interpolation: {
      escapeValue: false,
    },
  });

export default i18n;

// import AsyncStorage from "@react-native-async-storage/async-storage";
// import { getLocales } from "expo-localization";
// import i18n from "i18next";
// import { initReactI18next } from "react-i18next";
// import en from "../locales/en/translation.json";
// import es from "../locales/es/translation.json";
// import fr from "../locales/fr/translation.json";
// import it from "../locales/it/translation.json";

// const STORE_LANGUAGE_KEY = "language";

// const languageDetector = {
//   type: "languageDetector",
//   async: true,
//   init: () => {},
//   detect: async (callback) => {
//     try {
//       // 1. Check AsyncStorage (Works on iOS, Android AND Web)
//       const savedData = await AsyncStorage.getItem(STORE_LANGUAGE_KEY);

//       if (savedData) {
//         return callback(savedData);
//       }

//       // 2. Check Device Locale
//       const locales = getLocales();
//       if (locales && locales.length > 0) {
//         const bestLanguage = locales[0].languageCode;
//         return callback(bestLanguage || "it");
//       }

//       return callback("it");
//     } catch (error) {
//       callback("it");
//     }
//   },
//   cacheUserLanguage: async (language) => {
//     try {
//       // Works on all platforms
//       await AsyncStorage.setItem(STORE_LANGUAGE_KEY, language);
//     } catch (error) {
//       console.warn("Error saving language", error);
//     }
//   },
// };

// i18n
//   .use(languageDetector)
//   .use(initReactI18next)
//   .init({
//     compatibilityJSON: "v3",
//     fallbackLng: "it",
//     resources: {
//       en: { translation: en },
//       it: { translation: it },
//       fr: { translation: fr },
//       es: { translation: es },
//     },
//     supportedLngs: ["en", "it", "fr", "es"],
//     nonExplicitSupportedLngs: true,
//     load: "languageOnly",
//     interpolation: {
//       escapeValue: false,
//     },
//   });

// export default i18n;
