import PENGUINIMAGE from "@/assets/images/main.png";
import { supabase } from "@/lib/supabase";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useColorScheme } from "nativewind";
import { PressableOpacity } from "pressto";
import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ActivityIndicator,
  Dimensions,
  Image,
  Linking,
  Pressable,
  ScrollView,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
// ✅ IMPORT WEB SDK & TYPES
import { Package, Purchases } from "@revenuecat/purchases-js";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Toast from "react-native-toast-message";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");

export default function PaywallScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colorScheme } = useColorScheme();
  const { height } = useWindowDimensions();

  const [pkg, setPkg] = useState<Package | null>(null);
  const [isPurchasing, setIsPurchasing] = useState(false);

  // 1. INITIALIZE & FETCH PRODUCTS
  useEffect(() => {
    const setup = async () => {
      try {
        // ✅ 1. Get User ID from Supabase so the purchase is linked
        const { data } = await supabase.auth.getSession();
        const appUserId = data.session?.user.id || null;

        // ✅ 2. Configure (appUserId is REQUIRED on Web)
        if (!Purchases.isConfigured()) {
          Purchases.configure({
            apiKey: process.env.EXPO_PUBLIC_REVENUECAT_WEB_PRODUCTION!,
            appUserId: appUserId!, // <--- This fixes the first error
          });
        }

        // ✅ 3. Get the Shared Instance (Fixes "Property does not exist" error)
        const purchases = Purchases.getSharedInstance();

        // ✅ 4. Fetch Offerings from the Instance
        const offerings = await purchases.getOfferings();

        if (
          offerings.current !== null &&
          offerings.current.availablePackages.length !== 0
        ) {
          const yearlyPkg = offerings.current.availablePackages.find(
            (p) => p.identifier === "yearly",
          );
          setPkg(yearlyPkg || offerings.current.availablePackages[0]);
        }
      } catch (e) {
        console.log("Error fetching web offerings", e);
      }
    };
    setup();
  }, []);

  // 2. PURCHASE HANDLER
  const handlePurchase = async () => {
    if (!pkg) return;
    setIsPurchasing(true);

    try {
      // ✅ FIX 3: Use instance method
      const purchases = Purchases.getSharedInstance();
      const { customerInfo } = await purchases.purchasePackage(pkg);

      if (customerInfo.entitlements.active["pro"]) {
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
  const handleRestore = async () => {
    setIsPurchasing(true);
    try {
      // ✅ FIX 4: Use instance method
      const purchases = Purchases.getSharedInstance();
      const customerInfo = await purchases.getCustomerInfo();

      if (customerInfo.entitlements.active["pro"]) {
        await supabase.rpc("upgrade_user_to_pro");
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

  return (
    <View className="flex-1 justify-center items-center p-[20px]">
      {/* Backdrop */}
      <Pressable
        onPress={() => router.back()}
        className="absolute inset-0 bg-black/60"
      />

      {/* Modal Container */}
      <View
        className="w-full lg:w-[600px] bg-page-light dark:bg-page-dark rounded-[32px] shadow-2xl overflow-hidden"
        style={{
          height: height * 0.95,
          display: "flex",
          flexDirection: "column", // Ensures children respect flex rules
        }}
      >
        <ScrollView
          contentContainerStyle={{
            paddingHorizontal: 24,
            paddingTop: 20,
            paddingBottom: insets.bottom + 40,
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
          <View className="mt-6 mb-4 space-y-1 gap-1 w-full">
            <FeatureRow
              icon="infinite"
              title={t("paywall.feat1Title")}
              desc={t("paywall.feat1Desc")}
              color="#38BDF8"
            />
            <FeatureRow
              icon="brain"
              title={t("paywall.feat2Title")}
              desc={t("paywall.feat2Desc")}
              color="#F97316"
            />
            <FeatureRow
              icon="shield-checkmark"
              title={t("paywall.feat3Title")}
              desc={t("paywall.feat3Desc")}
              color="#22C55E"
            />
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
              {/* <View className="flex-row justify-between items-center mb-4">
                <View className="bg-white/20 px-3 py-1 rounded-lg">
                  <Text className="text-white font-bold text-[10px] uppercase tracking-widest">
                    {t("paywall.bestValue")}
                  </Text>
                </View>
                <Text className="text-white/70 text-xs font-bold line-through">
                  €59.99
                </Text>
              </View> */}

              <View className="flex-row items-baseline mb-1">
                <Text className="text-white font-heading text-4xl font-bold">
                  {/* ✅ WEB FIX: Use 'rcBillingProduct' and format the price manually */}
                  {pkg && pkg.webBillingProduct?.price
                    ? new Intl.NumberFormat("en-US", {
                        style: "currency",
                        currency: pkg.webBillingProduct.price.currency,
                      }).format(pkg.webBillingProduct.price.amountMicros)
                    : "€29.99"}
                </Text>
                <Text className="text-white/90 font-body text-base ml-1">
                  {t("paywall.perYear")}
                </Text>
              </View>

              <Text className="text-white/80 font-body text-xs mb-5">
                {t("paywall.monthlyBreakdown", {
                  /* ✅ WEB FIX: Calculate monthly cost from 'rcBillingProduct' */
                  price:
                    pkg && pkg.webBillingProduct?.price
                      ? `${(pkg.webBillingProduct.price.amountMicros / 12).toFixed(2)} ${pkg.webBillingProduct.price.currency}`
                      : "2.50 €",
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

function FeatureRow({ icon, title, desc, color }: any) {
  return (
    <View className="flex-row items-center bg-black/5 dark:bg-white/5 p-2 rounded-2xl border border-black/5 dark:border-white/10">
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
