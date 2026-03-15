import CelebratorPng from "@/assets/images/celebrator.png";
import { supabase } from "@/lib/supabase";
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useColorScheme } from "nativewind";
import { PressableOpacity, PressableScale } from "pressto";
import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next"; // Added i18n hook
import {
  ActivityIndicator,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import Purchases, { PurchasesPackage } from "react-native-purchases";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Toast from "react-native-toast-message";

// 🔑 REPLACE WITH YOUR REAL KEY FROM REVENUECAT
const API_KEY =
  Platform.OS === "ios"
    ? process.env.EXPO_PUBLIC_REVENUECAT_APPLE_PRODUCTION!
    : process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_PRODUCTION!;

export default function PaywallScreen() {
  const { t } = useTranslation(); // Initialize translation
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colorScheme } = useColorScheme();

  const [pkg, setPkg] = useState<PurchasesPackage | null>(null);
  const [isPurchasing, setIsPurchasing] = useState(false);

  const PressableFinal =
    Platform.OS === "web" ? PressableOpacity : PressableScale;

  // 1. INITIALIZE & FETCH PRODUCTS
  useEffect(() => {
    const setup = async () => {
      try {
        await Purchases.configure({ apiKey: API_KEY });
        const offerings = await Purchases.getOfferings();

        // We want the 'current' offering (configured in RevenueCat dashboard)
        if (
          offerings.current !== null &&
          offerings.current.availablePackages.length !== 0
        ) {
          setPkg(offerings.current.availablePackages[0]);
        }
      } catch (e) {
        console.log("Error fetching offerings", e);
      }
    };
    setup();
  }, []);

  // 2. PURCHASE HANDLER
  const handlePurchase = async () => {
    if (!pkg) return;
    setIsPurchasing(true);

    try {
      const { customerInfo } = await Purchases.purchasePackage(pkg);

      // Check if they unlocked 'pro' entitlement
      if (customerInfo.entitlements.active["pro"]) {
        // 'pro' must match RevenueCat Entitlement ID
        // ✅ SUCCESS! Update Supabase
        await supabase.rpc("upgrade_user_to_pro");

        Toast.show({
          type: "success",
          text1: t("paywall.purchase_success_title"),
          text2: t("paywall.purchase_success_desc"),
        });

        router.back();
      }
    } catch (e: any) {
      if (!e.userCancelled) {
        Toast.show({
          type: "error",
          text1: t("paywall.purchase_error_title"),
          text2: e.message,
        });
      }
    } finally {
      setIsPurchasing(false);
    }
  };

  // 3. RESTORE HANDLER
  // 3. RESTORE HANDLER (DEBUG VERSION)
  const handleRestore = async () => {
    setIsPurchasing(true);
    try {
      console.log("⏳ Restoring purchases...");
      const customerInfo = await Purchases.restorePurchases();

      console.log(
        "🧾 Restore Complete. Customer Info:",
        JSON.stringify(customerInfo, null, 2),
      );
      console.log(
        "🔑 Active Entitlements:",
        Object.keys(customerInfo.entitlements.active),
      );

      // CHECK: Is the entitlement name actually "pro"?
      // If your logs say "premium" or "Pro", change this string!
      if (customerInfo.entitlements.active["pro"]) {
        console.log("✅ 'pro' entitlement found active!");
        await supabase.rpc("upgrade_user_to_pro");

        Toast.show({
          type: "success",
          text1: t("paywall.restore_success_title"),
          text2: t("paywall.restore_success_desc"),
        });
        router.back();
      } else {
        console.warn(
          "❌ No active 'pro' entitlement found. Found:",
          customerInfo.entitlements.active,
        );

        Toast.show({
          type: "info",
          text1: t("paywall.restore_no_purchase_title"),
          text2: t("paywall.restore_no_purchase_desc"),
        });
      }
    } catch (e: any) {
      console.error("❌ Restore Error:", e);
      Toast.show({
        type: "error",
        text1: t("paywall.restore_error_title"),
        text2: e.message,
      });
    } finally {
      setIsPurchasing(false);
    }
  };

  const TERMS_URL =
    "https://gist.github.com/francesco-saponaro/d344c6bdaf1b47fe045772874ee35807";
  const PRIVACY_URL =
    "https://gist.github.com/francesco-saponaro/aeb8f04b6fd0b80a809fdb7119158fe5";

  const openLegal = (url: string) => Linking.openURL(url);

  return (
    <View className="flex-1 bg-page-light dark:bg-page-dark">
      {/* 1. FIXED HEADER (Outside ScrollView) */}
      {/* <View className="pt-4 pb-4 px-6 border-b border-black/5 dark:border-white/5 flex-row justify-end items-center w-full">
        <PressableFinal
          onPress={() => router.back()}
          style={{
            backgroundColor:
              colorScheme === "dark"
                ? "rgba(255,255,255,0.1)"
                : "rgba(0,0,0,0.05)",
            padding: 8,
            borderRadius: 99,
          }}
        >
          <Ionicons
            name="close"
            size={20}
            color={colorScheme === "dark" ? "#FFF" : "#000"}
          />
        </PressableFinal>
      </View> */}

      {/* 2. SCROLLABLE CONTENT */}
      <ScrollView
        className="flex-1"
        contentContainerStyle={{
          paddingHorizontal: 24,
          paddingTop: 20,
          paddingBottom: insets.bottom + 40,
        }}
        showsVerticalScrollIndicator={false}
        bounces={true}
      >
        {/* PENGUIN SECTION */}
        <View className="mb-4 items-center">
          <Image
            source={CelebratorPng}
            style={{ width: 85, height: 85, zIndex: 10, marginBottom: 10 }}
            contentFit="contain"
          />

          <View>
            <Text className="text-text-main-light dark:text-text-main-dark font-heading text-4xl font-black text-center leading-tight">
              {t("paywall.headerTitle", "Unlock Limitless\n")}
            </Text>
            <Text className="font-heading text-4xl font-black text-center leading-tight text-orange-500">
              {t("paywall.headerHighlight", "Learning")}
            </Text>
          </View>
        </View>

        {/* FEATURES SECTION */}
        <View className="mb-8 space-y-2 gap-2 w-full">
          <FeatureRow
            icon="document-text"
            title={t("paywall.feat_upload_title", "Upload Anything")}
            desc={t(
              "paywall.feat_upload_desc",
              "Instantly convert infinite PDFs, links, or text into cards.",
            )}
            color="#38BDF8"
          />
          <FeatureRow
            icon="calendar"
            title={t("paywall.feat_exam_title", "Exam Pacing Mode")}
            desc={t(
              "paywall.feat_exam_desc",
              "Set a deadline and let the AI build your daily study schedule.",
            )}
            color="#8B5CF6"
          />
          <FeatureRow
            icon="brain"
            title={t("paywall.feat_algo_title", "Smart Spaced Repetition")}
            desc={t(
              "paywall.feat_algo_desc",
              "Unlock the full memory algorithm to never forget a fact.",
            )}
            color="#F97316"
          />
          <FeatureRow
            icon="flame"
            title={t("paywall.feat_habit_title", "Unlimited Daily Stack")}
            desc={t(
              "paywall.feat_habit_desc",
              "Keep your streak alive and master thousands of cards.",
            )}
            color="#22C55E"
          />
        </View>

        {/* PRICING CARD SECTION */}
        <View className="max-w-[800px] mx-auto w-full">
          <LinearGradient
            colors={["#F97316", "#EA580C"]}
            style={{
              borderRadius: 24,
              paddingHorizontal: 24,
              paddingTop: 24,
              paddingBottom: 20,
            }}
          >
            <View className="flex-row justify-between items-center mb-4">
              <View className="bg-white/20 px-3 py-1 rounded-lg">
                <Text className="text-white font-bold text-[10px] uppercase tracking-widest">
                  {t("paywall.bestValue")}
                </Text>
              </View>
              <Text className="text-white/70 text-xs font-bold line-through">
                €59.99
              </Text>
            </View>

            <View className="flex-row items-baseline mb-1">
              {pkg ? (
                <Text className="text-white font-heading text-4xl font-bold">
                  {pkg.product.priceString || "€29.99"}
                </Text>
              ) : null}
              <Text className="text-white/90 font-body text-base ml-1">
                {t("paywall.perYear")}
              </Text>
            </View>

            <Text className="text-white/80 font-body text-xs mb-5">
              {pkg
                ? t("paywall.monthlyBreakdown", {
                    // 1. We take the numeric price and divide by 12
                    // 2. We use Intl.NumberFormat to automatically handle the symbol position and decimals
                    price: new Intl.NumberFormat(undefined, {
                      style: "currency",
                      currency: pkg.product.currencyCode,
                    }).format(pkg.product.price / 12),
                  })
                : null}
            </Text>

            <PressableFinal
              onPress={isPurchasing ? undefined : handlePurchase}
              activateOnHover
              style={{
                backgroundColor: "white",
                width: "100%",
                paddingVertical: 16,
                borderRadius: 12,
                alignItems: "center",
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: 0.05,
                shadowRadius: 2,
                elevation: 2,
                opacity: isPurchasing ? 0.7 : 1,
              }}
            >
              {isPurchasing ? (
                <ActivityIndicator color="#EA580C" />
              ) : (
                <Text className="text-orange-600 font-bold text-lg">
                  {t("paywall.cta")}
                </Text>
              )}
            </PressableFinal>

            <Text className="text-white/60 text-[10px] text-center mt-3 font-medium">
              {t("paywall.guarantee")}
            </Text>

            <Pressable
              onPress={handleRestore}
              className="cursor-pointer w-fit mt-2 self-center"
            >
              <Text className="text-text-main-light text-white/60 text-[11px] font-medium underline">
                {t("paywall.restore")}
              </Text>
            </Pressable>
          </LinearGradient>

          <View className="flex-row justify-center gap-6 mt-6 opacity-60">
            <Pressable
              onPress={() => openLegal(PRIVACY_URL)}
              className="cursor-pointer"
            >
              <Text className="text-text-main-light dark:text-text-main-dark text-[11px] font-medium underline">
                {t("privacy")}
              </Text>
            </Pressable>
            <Pressable
              onPress={() => openLegal(TERMS_URL)}
              className="cursor-pointer"
            >
              <Text className="text-text-main-light dark:text-text-main-dark text-[11px] font-medium underline">
                {t("terms")}
              </Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

function FeatureRow({ icon, title, desc, color }: any) {
  return (
    <View className="flex-row items-center bg-black/5 dark:bg-white/5 p-4 rounded-2xl border border-black/5 dark:border-white/10">
      <View
        style={{ backgroundColor: color + "20" }}
        className="w-12 h-12 rounded-xl items-center justify-center mr-4"
      >
        <Ionicons name={icon} size={22} color={color} />
      </View>
      <View className="flex-1">
        <Text className="text-text-main-light dark:text-text-main-dark font-bold text-sm leading-tight">
          {title}
        </Text>
        <Text className="text-text-muted-light dark:text-text-muted-dark text-xs mt-0.5 leading-tight">
          {desc}
        </Text>
      </View>
    </View>
  );
}
