import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { useTranslation } from "react-i18next";
import {
  Image,
  Pressable,
  ScrollView,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const PENGUIN_SIGN = require("@/assets/images/main.png");

export default function HomeScreen() {
  const { t } = useTranslation();
  const { width } = useWindowDimensions();
  const isDesktop = width > 768;

  return (
    <SafeAreaView className="flex-1 bg-page-light dark:bg-page-dark">
      <ScrollView
        className="flex-1"
        contentContainerStyle={{
          paddingHorizontal: isDesktop ? 60 : 24,
          paddingTop: 20,
          paddingBottom: 120, // Space for the floating tab bar
        }}
      >
        {/* 1. WELCOME HEADER */}
        <View className="mb-10">
          <Text className="text-text-muted-light dark:text-text-muted-dark font-body text-lg">
            {t("home.welcome_back")}, User
          </Text>
          <Text className="text-text-main-light dark:text-text-main-dark font-heading text-4xl font-bold">
            Ready to Sprint? 🐧
          </Text>
        </View>

        {/* 2. CREATION BUTTONS (Top Row) */}
        <View className={`${isDesktop ? "flex-row" : "flex-col"} gap-4 mb-10`}>
          <ActionButton
            icon="document-text"
            label="PDF"
            sub="Upload documents"
            color="#38BDF8"
          />
          <ActionButton
            icon="link"
            label="URL"
            sub="Article or Video"
            color="#F97316"
          />
          <ActionButton
            icon="bulb"
            label="Topic"
            sub="Generate from prompt"
            color="#22C55E"
          />
        </View>

        <View className={`${isDesktop ? "flex-row" : "flex-col"} gap-6`}>
          {/* 3. AI STUDY PLAN (Primary Widget) */}
          <View className="flex-[2] bg-primary p-8 rounded-[40px] relative overflow-hidden min-h-[200px]">
            <View className="z-10">
              <Text className="text-accent font-heading font-bold tracking-widest mb-2 uppercase">
                Your Daily Mission
              </Text>
              <Text className="text-white font-heading text-3xl font-bold mb-6">
                32 Cards to Review
              </Text>
              <Pressable className="bg-action py-4 px-8 rounded-2xl self-start active:scale-95 transition-all">
                <Text className="text-white font-heading font-bold text-lg">
                  Start Session
                </Text>
              </Pressable>
            </View>
            <Image
              source={PENGUIN_SIGN}
              className="absolute right-[-20] bottom-[-30] w-48 h-48 opacity-90"
              resizeMode="contain"
            />
          </View>

          {/* 4. STATS / STREAK (Secondary Widget) */}
          <View className="flex-1 gap-4">
            <View className="bg-wood p-6 rounded-[32px] items-center justify-center">
              <Text className="text-4xl mb-2">🔥</Text>
              <Text className="text-white font-heading font-bold text-xl text-center">
                5 Day Streak
              </Text>
            </View>
            <View className="bg-card-light dark:bg-card-dark p-6 rounded-[32px] border border-slate-100 dark:border-slate-800">
              <Text className="text-text-muted-light dark:text-text-muted-dark font-body font-bold mb-1">
                MEMORIZED
              </Text>
              <Text className="text-text-main-light dark:text-text-main-dark font-heading text-3xl font-bold">
                142
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// Sub-component for buttons
function ActionButton({ icon, label, sub, color }: any) {
  return (
    <Pressable className="flex-1 bg-card-light dark:bg-card-dark p-6 rounded-[32px] shadow-sm border border-slate-100 dark:border-slate-800 active:scale-95 transition-all">
      <View
        style={{ backgroundColor: color + "20" }}
        className="w-14 h-14 rounded-2xl items-center justify-center mb-4"
      >
        <Ionicons name={icon} size={30} color={color} />
      </View>
      <Text className="text-text-main-light dark:text-text-main-dark font-heading text-xl font-bold">
        {label}
      </Text>
      <Text className="text-text-muted-light dark:text-text-muted-dark font-body text-sm">
        {sub}
      </Text>
    </Pressable>
  );
}
