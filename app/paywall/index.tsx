import PENGUINIMAGE from "@/assets/images/main.png";
import { supabase } from "@/lib/supabase";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useColorScheme } from "nativewind";
import { PressableOpacity, PressableScale } from "pressto";
import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next"; // Added i18n hook
import {
  ActivityIndicator,
  Dimensions,
  Image,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import Purchases, { PurchasesPackage } from "react-native-purchases";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Toast from "react-native-toast-message";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");

// 🔑 REPLACE WITH YOUR REAL KEY FROM REVENUECAT
const API_KEY =
  Platform.OS === "ios"
    ? process.env.EXPO_PUBLIC_REVENUECAT_APPLE_PRODUCTION!
    : "goog_YOUR_ANDROID_KEY";

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
          text1: t("paywall.purchaseSuccessTitle"),
          text2: t("paywall.purchaseSuccessDesc"),
        });
      }
    } catch (e: any) {
      if (!e.userCancelled) {
        Toast.show({
          type: "error",
          text1: t("paywall.purchaseErrorTitle"),
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
      const customerInfo = await Purchases.restorePurchases();
      if (customerInfo.entitlements.active["pro"]) {
        await supabase.rpc("upgrade_user_to_pro");
        Toast.show({
          type: "success",
          text1: t("paywall.restoreSuccessTitle"),
          text2: t("paywall.restoreSuccessDesc"),
        });
        router.back();
      } else {
        Toast.show({
          type: "info",
          text1: t("paywall.restoreNoPurchaseTitle"),
          text2: t("paywall.restoreNoPurchaseDesc"),
        });
      }
    } catch (e: any) {
      Toast.show({
        type: "error",
        text1: t("paywall.restoreErrorTitle"),
        text2: e.message,
      });
    } finally {
      setIsPurchasing(false);
    }
  };

  return (
    <ScrollView
      className="bg-page-light dark:bg-page-dark"
      contentContainerStyle={{
        paddingHorizontal: 24,
        paddingTop: 20,
        paddingBottom: insets.bottom + 40,
        minHeight: SCREEN_HEIGHT * 0.8,
      }}
      showsVerticalScrollIndicator={false}
      bounces={false}
    >
      {/* 1. TOP SECTION */}
      <View className="items-center">
        <View className="flex-row justify-end w-full">
          <PressableFinal
            onPress={() => router.back()}
            activateOnHover
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
            }}
          >
            <Ionicons name="close" size={24} color="#64748B" />
          </PressableFinal>
        </View>

        <View className="relative mt-4">
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

        <Text className="text-text-main-light dark:text-text-main-dark font-heading text-3xl font-bold text-center leading-tight mt-4">
          {t("paywall.headerTitle")}
          {"\n"}
          <Text className="text-orange-500">
            {t("paywall.headerHighlight")}
          </Text>
        </Text>
      </View>

      {/* 2. MIDDLE SECTION */}
      <View className="my-8 space-y-3 gap-3 max-w-[800px] mx-auto w-full">
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
      <View className="mt-auto max-w-[800px] mx-auto w-full">
        <LinearGradient
          colors={["#F97316", "#EA580C"]}
          style={{ borderRadius: 24, padding: 24 }}
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
            <Text className="text-white font-heading text-4xl font-bold">
              {/* ✅ REAL PRICE FROM STORE */}
              {pkg ? pkg.product.priceString : "€29.99"}
            </Text>
            <Text className="text-white/90 font-body text-base ml-1">
              {t("paywall.perYear")}
            </Text>
          </View>

          <Text className="text-white/80 font-body text-xs mb-5">
            {t("paywall.monthlyBreakdown", {
              price: `${pkg ? (pkg.product.price / 12).toFixed(2) : "2.50"} ${pkg?.product.currencyCode || "€"}`,
            })}
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
        </LinearGradient>

        <View className="flex-row justify-center gap-6 mt-6 opacity-60">
          <Pressable onPress={handleRestore}>
            <Text className="text-text-main-light dark:text-text-main-dark text-[11px] font-medium underline">
              {t("paywall.restore")}
            </Text>
          </Pressable>
          <Pressable onPress={() => {}}>
            <Text className="text-text-main-light dark:text-text-main-dark text-[11px] font-medium underline">
              {t("paywall.terms")}
            </Text>
          </Pressable>
        </View>
      </View>
    </ScrollView>
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
// import { Ionicons } from "@expo/vector-icons";
// import { LinearGradient } from "expo-linear-gradient";
// import { useRouter } from "expo-router";
// import { useColorScheme } from "nativewind";
// import React from "react";
// import { Image, Pressable, Text, View } from "react-native";
// import { useSafeAreaInsets } from "react-native-safe-area-context";

// const PENGUIN_PRO = require("@/assets/images/main.png");

// export default function PaywallScreen() {
//   const router = useRouter();
//   const insets = useSafeAreaInsets();
//   const { colorScheme } = useColorScheme();
//   const isDark = colorScheme === "dark";

//   const handlePurchase = () => console.log("Purchase: Yearly Plan");
//   const handleRestore = () => console.log("Restore Purchases");

//   return (
//     <View
//       className="flex-1 bg-page-light dark:bg-page-dark"
//       style={{ paddingTop: 20, paddingBottom: insets.bottom }}
//     >
//       {/* Container to satisfy RNScreens warning (1 subview) */}
//       <View
//         className="flex-1 px-6 justify-between gap-[20px]"
//         collapsable={false}
//       >
//         {/* 1. TOP SECTION (Close & Hero) */}
//         <View>
//           <View className="flex-row justify-end pb-2">
//             <Pressable
//               onPress={() => router.back()}
//               className="w-10 h-10 bg-black/5 dark:bg-white/10 rounded-full items-center justify-center"
//             >
//               <Ionicons
//                 name="close"
//                 size={24}
//                 color={isDark ? "#FFF" : "#000"}
//               />
//             </Pressable>
//           </View>

//           <View className="items-center mb-4">
//             <View className="relative">
//               <View className="absolute -inset-4 bg-orange-500/10 rounded-full blur-2xl" />
//               <Image
//                 source={PENGUIN_PRO}
//                 style={{ width: 100, height: 100 }} // Scaled down slightly to fit all screens
//                 resizeMode="contain"
//               />
//               {/* Gold Star Badge */}
//               <View className="absolute -right-2 -top-2 bg-white rounded-full p-1 shadow-sm">
//                 <Ionicons name="star" size={20} color="#F59E0B" />
//               </View>
//             </View>
//           </View>

//           <Text className="text-text-main-light dark:text-text-main-dark font-heading text-3xl font-bold text-center leading-tight">
//             Unlock Unlimited{"\n"}
//             <Text className="text-orange-500">Superpowers</Text>
//           </Text>
//         </View>

//         {/* 2. MIDDLE SECTION (Revised Features) */}
//         <View className="gap-3">
//           <FeatureRow
//             icon="infinite"
//             title="Unlimited Generations"
//             desc="Create decks from any PDF, Link, or Topic."
//             color="#38BDF8" // Blue
//           />
//           <FeatureRow
//             icon="brain"
//             title="Smart Learning Engine"
//             desc="Spaced Repetition & Daily Study Plan."
//             color="#F97316" // Orange
//           />
//           <FeatureRow
//             icon="shield-checkmark"
//             title="Ad-Free Focus Mode"
//             desc="No distractions. Pure learning flow."
//             color="#22C55E" // Green
//           />
//         </View>

//         {/* 3. BOTTOM SECTION (Pricing & Footer) */}
//         <View>
//           <LinearGradient
//             colors={["#F97316", "#EA580C"]}
//             style={{ borderRadius: 24, padding: 24 }}
//           >
//             {/* Header: Best Value */}
//             <View className="flex-row justify-between items-center mb-4">
//               <View className="bg-white/20 px-3 py-1 rounded-lg">
//                 <Text className="text-white font-bold text-[10px] uppercase tracking-widest">
//                   Best Value
//                 </Text>
//               </View>
//               {/* Original Price Strikethrough */}
//               <Text className="text-white/70 text-xs font-bold line-through">
//                 €59.99
//               </Text>
//             </View>

//             {/* Price Large */}
//             <View className="flex-row items-baseline mb-1">
//               <Text className="text-white font-heading text-4xl font-bold">
//                 €29.99
//               </Text>
//               <Text className="text-white/90 font-body text-base ml-1">
//                 /year
//               </Text>
//             </View>

//             {/* Monthly Equivalent */}
//             <Text className="text-white/80 font-body text-xs mb-5">
//               (That's just <Text className="font-bold">€2.50 / month</Text>)
//             </Text>

//             {/* Main CTA Button */}
//             <Pressable
//               onPress={handlePurchase}
//               className="bg-white w-full py-4 rounded-xl items-center active:opacity-90 shadow-sm"
//             >
//               <Text className="text-orange-600 font-bold text-lg">
//                 Unlock Yearly Access
//               </Text>
//             </Pressable>

//             <Text className="text-white/60 text-[10px] text-center mt-3 font-medium">
//               One-time payment. Cancel anytime in settings.
//             </Text>
//           </LinearGradient>

//           {/* Footer Links */}
//           <View className="flex-row justify-center gap-6 mt-5 opacity-60">
//             <Pressable onPress={handleRestore}>
//               <Text className="text-text-main-light dark:text-text-main-dark text-[11px] font-medium underline">
//                 Restore Purchase
//               </Text>
//             </Pressable>
//             <Pressable onPress={() => {}}>
//               <Text className="text-text-main-light dark:text-text-main-dark text-[11px] font-medium underline">
//                 Terms & Privacy
//               </Text>
//             </Pressable>
//           </View>
//         </View>
//       </View>
//     </View>
//   );
// }

// function FeatureRow({ icon, title, desc, color }: any) {
//   return (
//     <View className="flex-row items-center bg-black/5 dark:bg-white/5 p-3 rounded-xl">
//       <View
//         style={{ backgroundColor: color + "20" }}
//         className="w-10 h-10 rounded-lg items-center justify-center mr-3"
//       >
//         <Ionicons name={icon} size={20} color={color} />
//       </View>
//       <View className="flex-1">
//         <Text className="text-text-main-light dark:text-text-main-dark font-bold text-sm">
//           {title}
//         </Text>
//         <Text className="text-text-muted-light dark:text-text-muted-dark text-xs">
//           {desc}
//         </Text>
//       </View>
//     </View>
//   );
// }
