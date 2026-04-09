import PENGUINIMAGE from "@/assets/images/main.png";
import { supabase } from "@/lib/supabase";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useColorScheme } from "nativewind";
import { PressableOpacity } from "pressto";
import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ActivityIndicator,
  Image,
  Linking,
  Pressable,
  ScrollView,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Toast from "react-native-toast-message";

export default function PaywallScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colorScheme } = useColorScheme();
  const { height } = useWindowDimensions();

  const [isPurchasing, setIsPurchasing] = useState(false);

  // --- 1. STRIPE PURCHASE HANDLER ---
  const handlePurchase = async () => {
    setIsPurchasing(true);

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const user = sessionData.session?.user;

      if (!user) {
        throw new Error("You must be logged in to purchase.");
      }

      // We call a Supabase Edge Function to securely generate the Stripe URL
      const { data, error } = await supabase.functions.invoke(
        "create-stripe-checkout",
        {
          body: {
            // You will add this key to your .env file
            priceId: process.env.EXPO_PUBLIC_STRIPE_PRICE_ID_YEARLY,
          },
        },
      );

      if (error || !data?.url) {
        throw new Error("Could not initialize checkout. Please try again.");
      }

      // Redirect the browser directly to the secure Stripe Checkout Page
      window.location.href = data.url;
    } catch (e: any) {
      Toast.show({
        type: "error",
        text1: t("paywall.purchase_error_title"),
        text2: e.message,
      });
      setIsPurchasing(false);
    }
  };

  // --- 2. RESTORE / MANAGE BILLING HANDLER ---
  const handleRestore = async () => {
    setIsPurchasing(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const user = sessionData.session?.user;

      if (!user) throw new Error("Not logged in");

      // For Stripe, "Restore" usually means sending them to the Stripe Customer Portal
      // so they can manage their active subscription.
      const { data, error } = await supabase.functions.invoke(
        "create-stripe-portal",
      );

      if (error || !data?.url) {
        // Fallback: Just verify their Pro status in Supabase directly
        const { data: profile } = await supabase
          .from("profiles")
          .select("is_pro")
          .eq("id", user.id)
          .single();

        if (profile?.is_pro) {
          Toast.show({
            type: "success",
            text1: t("paywall.restore_success_title"),
            text2: t("paywall.restore_success_desc"),
          });
          router.back();
        } else {
          Toast.show({
            type: "info",
            text1: t("paywall.restore_no_purchase_title"),
            text2: t("paywall.restore_no_purchase_desc"),
          });
        }
      } else {
        // Redirect to Stripe Customer Portal
        window.location.href = data.url;
      }
    } catch (e: any) {
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

  // --- UI FALLBACKS (Since we aren't fetching RevenueCat arrays anymore) ---
  const displayPrice = "€14.99";
  const displayMonthly = "2.50 €";

  return (
    <View className="flex-1 justify-center items-center p-[20px]">
      <Pressable
        onPress={() => router.back()}
        className="absolute inset-0 bg-black/60"
      />

      <View
        className="w-full lg:w-[600px] bg-page-light dark:bg-page-dark rounded-[32px] shadow-2xl overflow-hidden"
        style={{
          height: height * 0.9,
          display: "flex",
          flexDirection: "column",
        }}
      >
        <ScrollView
          contentContainerStyle={{
            paddingHorizontal: 24,
            paddingTop: 20,
            paddingBottom: 20,
            flexGrow: 1,
            justifyContent: "center",
          }}
          showsVerticalScrollIndicator={false}
        >
          {/* 1. TOP SECTION */}
          <View className="items-center">
            <View className="flex-row justify-between items-center w-full">
              <View className="relative">
                <View className="absolute -inset-4 bg-orange-500/10 rounded-full blur-2xl" />
                <Image
                  source={PENGUINIMAGE}
                  style={{ width: 100, height: 100 }}
                  resizeMode="contain"
                />
                <View className="absolute -right-2 -top-2 bg-white rounded-full p-1 shadow-sm">
                  <Ionicons name="star" size={20} color="#F59E0B" />
                </View>
              </View>

              <View className="flex-1 mr-8">
                <Text className="text-text-main-light dark:text-text-main-dark font-heading text-3xl font-bold text-center leading-tight">
                  {t("paywall.headerTitle")}
                  {"\n"}
                  <Text className="text-orange-500">
                    {t("paywall.headerHighlight")}
                  </Text>
                </Text>
              </View>
              <PressableOpacity
                activateOnHover
                onPress={() => router.back()}
                style={{
                  width: 40,
                  height: 40,
                  backgroundColor:
                    colorScheme === "dark"
                      ? "rgba(255,255,255,0.1)"
                      : "rgba(0,0,0,0.05)",
                  borderRadius: 20,
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                }}
              >
                <Ionicons name="close" size={24} color="#64748B" />
              </PressableOpacity>
            </View>
          </View>

          {/* 2. MIDDLE SECTION */}
          <View className="mt-6 mb-4 gap-2 w-full">
            <View className="flex-row gap-2">
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
            </View>
            <View className="flex-row gap-2">
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
          </View>

          {/* 3. BOTTOM SECTION */}
          <View className="mt-auto w-full">
            <LinearGradient
              colors={["#F97316", "#EA580C"]}
              style={{
                borderRadius: 24,
                paddingHorizontal: 24,
                paddingTop: 24,
                paddingBottom: 20,
              }}
            >
              <View className="flex-row items-baseline mb-1">
                <Text className="text-white font-heading text-4xl font-bold">
                  {displayPrice}
                </Text>
                <Text className="text-white/90 font-body text-base ml-1">
                  {t("paywall.perYear")}
                </Text>
              </View>

              <Text className="text-white/80 font-body text-xs mb-5">
                {t("paywall.monthlyBreakdown", {
                  price: displayMonthly,
                })}
              </Text>

              <PressableOpacity
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
              </PressableOpacity>

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

            <View className="flex-row justify-center gap-6 mt-2">
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
    </View>
  );
}

function FeatureRow({ icon, title, desc, color, className }: any) {
  return (
    <View className="flex-row items-center bg-black/5 dark:bg-white/5 p-4 rounded-2xl border border-black/5 dark:border-white/10 flex-1">
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
