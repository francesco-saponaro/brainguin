import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useColorScheme } from "nativewind";
import React from "react";
import { Image, Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const PENGUIN_PRO = require("@/assets/images/main.png");

export default function PaywallScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";

  const handlePurchase = () => console.log("Purchase: Yearly Plan");
  const handleRestore = () => console.log("Restore Purchases");

  return (
    <View
      className="flex-1 bg-page-light dark:bg-page-dark"
      style={{ paddingTop: 20, paddingBottom: insets.bottom }}
    >
      {/* Container to satisfy RNScreens warning (1 subview) */}
      <View
        className="flex-1 px-6 justify-between gap-[20px]"
        collapsable={false}
      >
        {/* 1. TOP SECTION (Close & Hero) */}
        <View>
          <View className="flex-row justify-end pb-2">
            <Pressable
              onPress={() => router.back()}
              className="w-10 h-10 bg-black/5 dark:bg-white/10 rounded-full items-center justify-center"
            >
              <Ionicons
                name="close"
                size={24}
                color={isDark ? "#FFF" : "#000"}
              />
            </Pressable>
          </View>

          <View className="items-center mb-4">
            <View className="relative">
              <View className="absolute -inset-4 bg-orange-500/10 rounded-full blur-2xl" />
              <Image
                source={PENGUIN_PRO}
                style={{ width: 100, height: 100 }} // Scaled down slightly to fit all screens
                resizeMode="contain"
              />
              {/* Gold Star Badge */}
              <View className="absolute -right-2 -top-2 bg-white rounded-full p-1 shadow-sm">
                <Ionicons name="star" size={20} color="#F59E0B" />
              </View>
            </View>
          </View>

          <Text className="text-text-main-light dark:text-text-main-dark font-heading text-3xl font-bold text-center leading-tight">
            Unlock Unlimited{"\n"}
            <Text className="text-orange-500">Superpowers</Text>
          </Text>
        </View>

        {/* 2. MIDDLE SECTION (Revised Features) */}
        <View className="gap-3">
          <FeatureRow
            icon="infinite"
            title="Unlimited Generations"
            desc="Create decks from any PDF, Link, or Topic."
            color="#38BDF8" // Blue
          />
          <FeatureRow
            icon="brain"
            title="Smart Learning Engine"
            desc="Spaced Repetition & Daily Study Plan."
            color="#F97316" // Orange
          />
          <FeatureRow
            icon="shield-checkmark"
            title="Ad-Free Focus Mode"
            desc="No distractions. Pure learning flow."
            color="#22C55E" // Green
          />
        </View>

        {/* 3. BOTTOM SECTION (Pricing & Footer) */}
        <View>
          <LinearGradient
            colors={["#F97316", "#EA580C"]}
            style={{ borderRadius: 24, padding: 24 }}
          >
            {/* Header: Best Value */}
            <View className="flex-row justify-between items-center mb-4">
              <View className="bg-white/20 px-3 py-1 rounded-lg">
                <Text className="text-white font-bold text-[10px] uppercase tracking-widest">
                  Best Value
                </Text>
              </View>
              {/* Original Price Strikethrough */}
              <Text className="text-white/70 text-xs font-bold line-through">
                €59.99
              </Text>
            </View>

            {/* Price Large */}
            <View className="flex-row items-baseline mb-1">
              <Text className="text-white font-heading text-4xl font-bold">
                €29.99
              </Text>
              <Text className="text-white/90 font-body text-base ml-1">
                /year
              </Text>
            </View>

            {/* Monthly Equivalent */}
            <Text className="text-white/80 font-body text-xs mb-5">
              (That's just <Text className="font-bold">€2.50 / month</Text>)
            </Text>

            {/* Main CTA Button */}
            <Pressable
              onPress={handlePurchase}
              className="bg-white w-full py-4 rounded-xl items-center active:opacity-90 shadow-sm"
            >
              <Text className="text-orange-600 font-bold text-lg">
                Unlock Yearly Access
              </Text>
            </Pressable>

            <Text className="text-white/60 text-[10px] text-center mt-3 font-medium">
              One-time payment. Cancel anytime in settings.
            </Text>
          </LinearGradient>

          {/* Footer Links */}
          <View className="flex-row justify-center gap-6 mt-5 opacity-60">
            <Pressable onPress={handleRestore}>
              <Text className="text-text-main-light dark:text-text-main-dark text-[11px] font-medium underline">
                Restore Purchase
              </Text>
            </Pressable>
            <Pressable onPress={() => {}}>
              <Text className="text-text-main-light dark:text-text-main-dark text-[11px] font-medium underline">
                Terms & Privacy
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </View>
  );
}

function FeatureRow({ icon, title, desc, color }: any) {
  return (
    <View className="flex-row items-center bg-black/5 dark:bg-white/5 p-3 rounded-xl">
      <View
        style={{ backgroundColor: color + "20" }}
        className="w-10 h-10 rounded-lg items-center justify-center mr-3"
      >
        <Ionicons name={icon} size={20} color={color} />
      </View>
      <View className="flex-1">
        <Text className="text-text-main-light dark:text-text-main-dark font-bold text-sm">
          {title}
        </Text>
        <Text className="text-text-muted-light dark:text-text-muted-dark text-xs">
          {desc}
        </Text>
      </View>
    </View>
  );
}
