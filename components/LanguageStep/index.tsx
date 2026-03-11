import { Ionicons } from "@expo/vector-icons";
import { useColorScheme } from "nativewind";
import { PressableOpacity, PressableScale } from "pressto";
import React from "react";
import { useTranslation } from "react-i18next";
import { Platform, ScrollView, Text, View } from "react-native";
import CountryFlag from "react-native-country-flag"; // 🆕 Import the flag library
import { useSafeAreaInsets } from "react-native-safe-area-context";

const LANGUAGES = [
  { code: "en", label: "English", isoCode: "gb" }, // ISO codes for the icons
  { code: "es", label: "Español", isoCode: "es" },
  { code: "fr", label: "Français", isoCode: "fr" },
  { code: "it", label: "Italiano", isoCode: "it" },
];

interface Props {
  onLanguageSelect: () => void;
  activeLanguage: string;
}

const FinalPressable =
  Platform.OS === "web" ? PressableOpacity : PressableScale; // 🆕 Use the same component for both platforms

const LanguageStep = ({ onLanguageSelect, activeLanguage }: Props) => {
  const insets = useSafeAreaInsets();
  const { i18n, t } = useTranslation();
  const { colorScheme } = useColorScheme();

  const handleSelect = (code: string) => {
    i18n.changeLanguage(code);
    onLanguageSelect();
  };

  return (
    <ScrollView
      className="pb-2"
      contentContainerStyle={{
        justifyContent: "center",
        flexGrow: 1,
        paddingBottom: insets.bottom,
        paddingTop: insets.top,
      }}
      contentContainerClassName="px-6"
    >
      <Text className="font-heading text-3xl font-bold text-text-main-light dark:text-text-main-dark text-center mb-2 px-4">
        {t("onboarding.language_title") || "Select Language"}
      </Text>
      <Text className="font-body text-base text-text-muted-light dark:text-text-muted-dark text-center mb-10 px-4">
        {t("onboarding.language_description") ||
          "Choose your preferred language for study materials"}
      </Text>

      <View className="gap-4 max-w-[800px] self-center w-full">
        {LANGUAGES.map((lang) => (
          // <Pressable
          //   key={lang.code}
          //   onPress={() => handleSelect(lang.code)}
          //   className={`flex-row items-center p-5 rounded-2xl border-2 transition-all duration-200 active:scale-[0.98] ${
          //     activeLanguage === lang.code
          //       ? "border-action bg-action/5"
          //       : "border-card-light dark:border-card-dark bg-card-light dark:bg-card-dark hover:border-action/50 hover:bg-slate-50 dark:hover:bg-slate-800"
          //   }`}
          // >
          <FinalPressable
            key={lang.code}
            activateOnHover
            onPress={() => handleSelect(lang.code)}
            style={{
              flexDirection: "row",
              alignItems: "center",
              padding: 20,
              borderRadius: 16,
              borderWidth: 2,
              // Background Color Logic
              backgroundColor:
                activeLanguage === lang.code
                  ? "#F973161A" // Action Orange with 10% opacity
                  : colorScheme === "dark"
                    ? "#334155"
                    : "#FFFFFF",
              // Border Color Logic
              borderColor:
                activeLanguage === lang.code
                  ? "#F97316"
                  : colorScheme === "dark"
                    ? "#334155"
                    : "#FFFFFF",
            }}
          >
            {/* 🆕 Using the high-quality flag icon here */}
            <View className="mr-4 shadow-sm">
              <CountryFlag
                isoCode={lang.isoCode}
                size={25}
                style={{ borderRadius: 4 }}
              />
            </View>

            <Text
              className={`flex-1 font-heading text-lg ${
                activeLanguage === lang.code
                  ? "text-action font-bold"
                  : "text-text-main-light dark:text-text-main-dark"
              }`}
            >
              {lang.label}
            </Text>

            {activeLanguage === lang.code && (
              <Ionicons name="checkmark-circle" size={24} color="#F97316" />
            )}
          </FinalPressable>
        ))}
      </View>
    </ScrollView>
  );
};

export default LanguageStep;
