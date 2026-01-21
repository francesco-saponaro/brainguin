import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/store/storeUser";
import { Ionicons } from "@expo/vector-icons";
import clsx from "clsx";
import { Image } from "expo-image";
import { useFocusEffect, useRouter } from "expo-router"; // Added useFocusEffect
import { useColorScheme } from "nativewind";
import React, { useCallback, useState } from "react"; // Added hooks
import { useTranslation } from "react-i18next";
import {
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const GREETER_PENGUIN = require("@/assets/images/greeter.png");
const PENGUIN_SIGN = require("@/assets/images/processor.png");
const TEXT_LOGO_LIGHT = require("@/assets/images/icon-text-dark.png");
const TEXT_LOGO_DARK = require("@/assets/images/icon-text-light.png");

export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colorScheme } = useColorScheme();
  const { t } = useTranslation();
  const { width } = useWindowDimensions();
  const { session, openCreationModal } = useAuthStore();

  const isDesktop = width > 1000;
  const isSmallMobile = width < 390;

  const userName =
    session?.user?.user_metadata?.full_name ||
    session?.user?.email?.split("@")[0] ||
    "Student";

  // --- STATE FOR REAL DATA ---
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState({
    streak: 0,
    dueCards: 0,
    memorized: 0,
  });

  // --- FETCH LOGIC ---
  const fetchHomeStats = async () => {
    try {
      if (!session?.user) return;

      const todayISO = new Date().toISOString();

      // 1. Get Due Cards (next_review_at <= now AND not mastered)
      const { count: dueCount } = await supabase
        .from("flashcards")
        .select("*", { count: "exact", head: true })
        .eq("user_id", session.user.id)
        .lte("next_review_at", todayISO)
        .neq("status", "mastered");

      // 2. Get Memorized Count
      const { count: masteredCount } = await supabase
        .from("flashcards")
        .select("*", { count: "exact", head: true })
        .eq("user_id", session.user.id)
        .eq("status", "mastered");

      // 3. Get Streak from Users table
      const { data: userData } = await supabase
        .from("users")
        .select("streak_count")
        .eq("id", session.user.id)
        .single();

      setStats({
        streak: userData?.streak_count || 0,
        dueCards: dueCount || 0,
        memorized: masteredCount || 0,
      });
    } catch (e) {
      console.error("Error fetching home stats:", e);
    }
  };

  // --- REFRESH ON FOCUS ---
  useFocusEffect(
    useCallback(() => {
      fetchHomeStats();
    }, [session]),
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchHomeStats();
    setRefreshing(false);
  };

  return (
    <View
      className="flex-1 bg-page-light dark:bg-page-dark"
      style={{ paddingTop: insets.top }}
    >
      <ScrollView
        className="flex-1"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#F97316"
          />
        }
        contentContainerStyle={{
          paddingLeft: isDesktop ? 300 : 20,
          paddingRight: isDesktop ? 40 : 20,
          paddingTop: isDesktop ? 40 : 20,
          paddingBottom: isDesktop ? 40 : 140,
        }}
      >
        {/* 1. HEADER */}
        <View className="flex-1 mb-10">
          {!isDesktop && (
            <View className="flex-row justify-between items-center mb-4">
              <Image
                source={
                  colorScheme === "dark" ? TEXT_LOGO_LIGHT : TEXT_LOGO_DARK
                }
                style={{ width: 140, height: 35 }}
                contentFit="contain"
              />
              {isSmallMobile && (
                <Image
                  source={GREETER_PENGUIN}
                  style={{ width: 50, height: 50 }}
                  contentFit="contain"
                />
              )}
            </View>
          )}

          <View
            className={clsx(
              "flex-row gap-4",
              isDesktop ? "items-center" : "items-end",
            )}
          >
            <View>
              <Text className="text-text-muted-light dark:text-text-muted-dark font-body text-base font-medium tracking-tight">
                {t("home.welcome_back")}, {userName}
              </Text>
              <Text className="text-text-main-light dark:text-text-main-dark font-heading text-4xl font-bold mt-1">
                Ready to Sprint?
              </Text>
            </View>
            {!isSmallMobile && !isDesktop && (
              <Image
                source={GREETER_PENGUIN}
                style={{ width: 80, height: 80 }}
                contentFit="contain"
              />
            )}
          </View>
        </View>

        {/* 2. CREATION BUTTONS */}
        <View className={`${isDesktop ? "flex-row" : "flex-col"} gap-4 mb-10`}>
          <ActionButton
            icon="document-text"
            label="PDF"
            sub="Auto-Flashcards"
            color="#38BDF8"
            onPress={() => openCreationModal("pdf")}
          />
          <ActionButton
            icon="link"
            label="URL"
            sub={t("web_articles")}
            color="#F97316"
            onPress={() => openCreationModal("url")}
          />
          <ActionButton
            icon="bulb"
            label="Topic"
            sub={t("ai_generation")}
            color="#22C55E"
            onPress={() => openCreationModal("topic")}
          />
        </View>

        {/* 3. MAIN WIDGETS SECTION */}
        <View className={`${isDesktop ? "flex-row" : "flex-col"} gap-6`}>
          {/* --- AI STUDY PLAN (DAILY MISSION) --- */}
          {/* If there are due cards, show the Blue/Orange card. If 0, show Green 'Done' card. */}
          <Pressable
            onPress={() => {
              if (stats.dueCards > 0) {
                router.push("/study/daily"); // ✅ Correct Route for Daily
              }
            }}
            disabled={stats.dueCards === 0}
            className={clsx(
              "flex-[2] relative overflow-hidden shadow-2xl min-h-[240px] justify-center",
              isSmallMobile ? "py-3 px-4 rounded-[32px]" : "p-8 rounded-[48px]",
              stats.dueCards > 0
                ? "bg-primary shadow-primary/30"
                : "bg-green-600 shadow-green-600/30", // Dynamic BG Color
            )}
          >
            {/* Background Decor */}
            <View
              className="absolute right-[-20] bottom-[-20] rounded-full bg-white/5"
              style={{
                transform: [{ scale: 1.2 }],
                width: isDesktop ? 192 : 155,
                height: isDesktop ? 192 : 155,
              }}
            />

            <View className="z-10 flex-row items-center">
              <View className="w-[65%]">
                <View className="bg-white/10 self-start px-3 py-1 rounded-full mb-3">
                  <Text className="text-accent font-heading text-[10px] font-bold tracking-[2px] uppercase">
                    {stats.dueCards > 0
                      ? t("daily_mission")
                      : t("mission_complete")}
                  </Text>
                </View>

                {/* DYNAMIC TEXT */}
                <Text className="text-white font-heading text-3xl font-bold mb-6 leading-tight">
                  {stats.dueCards > 0
                    ? `${stats.dueCards} ${t("cards_to_review")}`
                    : t("all_caught_up")}
                </Text>

                {stats.dueCards > 0 ? (
                  <View className="bg-action py-4 px-8 rounded-2xl self-start shadow-lg shadow-action/30">
                    <Text className="text-white font-heading font-bold text-lg">
                      {t("start_session")}
                    </Text>
                  </View>
                ) : (
                  <View className="bg-white/20 py-3 px-6 rounded-2xl self-start">
                    <Text className="text-white font-heading font-bold">
                      {t("great_job")} 🎉
                    </Text>
                  </View>
                )}
              </View>

              {/* MASCOT */}
              <View
                className={clsx(
                  "absolute",
                  isSmallMobile
                    ? "right-[-22] bottom-[-20]"
                    : "right-[-26] bottom-[-32]",
                )}
              >
                <Image
                  source={PENGUIN_SIGN}
                  style={{
                    width: isDesktop ? 160 : 130,
                    height: isDesktop ? 160 : 130,
                  }}
                  contentFit="contain"
                  className="opacity-95"
                />
              </View>
            </View>
          </Pressable>

          {/* STATS / STREAK */}
          <View
            className={clsx(
              "gap-4",
              isDesktop || isSmallMobile ? "flex-col" : "flex-row",
            )}
          >
            {/* 1. STREAK CARD */}
            <View className="flex-1 bg-wood p-5 rounded-[32px] relative overflow-hidden shadow-lg shadow-wood/30">
              <View className="absolute inset-0 bg-black/5 border-t border-white/20 rounded-[32px]" />
              <View className="flex-row items-center z-10">
                <View className="bg-white/20 p-3 rounded-2xl mr-3 border border-white/10">
                  <Text className="text-2xl">🔥</Text>
                </View>
                <View>
                  <Text className="text-white/60 font-body text-[10px] font-bold uppercase tracking-[2px]">
                    Streak
                  </Text>
                  <Text className="text-white font-heading font-bold text-2xl">
                    {stats.streak} {t("days")}
                  </Text>
                </View>
              </View>
              <View className="absolute right-[-10] top-[-10] opacity-10">
                <Ionicons name="flame" size={80} color="white" />
              </View>
            </View>

            {/* 2. MEMORIZED CARD */}
            <View className="flex-1 bg-card-light dark:bg-card-dark p-5 rounded-[32px] border border-black/5 dark:border-white/5 shadow-xl shadow-black/5 relative overflow-hidden">
              <View className="absolute right-[-20] top-[-20] w-24 h-24 bg-accent/10 rounded-full blur-3xl" />
              <View className="z-10">
                <View className="flex-row items-center mb-1">
                  <Ionicons
                    name="checkmark-circle"
                    size={12}
                    color="#38BDF8"
                    className="mr-1"
                  />
                  <Text className="text-text-muted-light dark:text-text-muted-dark font-body font-bold text-[10px] uppercase tracking-[2px]">
                    {t("memorized")}
                  </Text>
                </View>
                <View className="flex-row items-baseline">
                  <Text className="text-text-main-light dark:text-text-main-dark font-heading text-4xl font-bold">
                    {stats.memorized}
                  </Text>
                  <Text className="text-accent ml-2 font-body font-bold text-xs uppercase">
                    {t("cards")}
                  </Text>
                </View>
                <View className="h-1.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full mt-3 overflow-hidden">
                  <View className="h-full bg-accent w-[65%] rounded-full" />
                </View>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

// Modernized Action Button Component (Unchanged)
function ActionButton({ icon, label, sub, color, onPress }: any) {
  return (
    <Pressable
      onPress={onPress}
      className={clsx(
        "flex-1 p-5 rounded-[32px] border shadow-md shadow-black/5 active:scale-95 transition-all duration-200 flex-row items-center",
        "bg-card-light dark:bg-card-dark border-black/5 dark:border-white/5",
        "hover:bg-slate-100",
        "dark:hover:bg-slate-800",
      )}
    >
      <View
        style={{ backgroundColor: color + "15" }}
        className="w-14 h-14 rounded-2xl items-center justify-center mr-4"
      >
        <Ionicons name={icon} size={28} color={color} />
      </View>
      <View>
        <Text className="text-text-main-light dark:text-text-main-dark font-heading text-lg font-bold leading-tight">
          {label}
        </Text>
        <Text className="text-text-muted-light dark:text-text-muted-dark font-body text-xs mt-0.5">
          {sub}
        </Text>
      </View>
    </Pressable>
  );
}

// // import { supabase } from "@/lib/supabase";
// import { useAuthStore } from "@/store/storeUser"; // 1. Import Auth Store
// import { Ionicons } from "@expo/vector-icons";
// import clsx from "clsx";
// import { Image } from "expo-image";
// import { useRouter } from "expo-router";
// import { useColorScheme } from "nativewind";
// import React from "react";
// import { useTranslation } from "react-i18next";
// import {
//   Pressable,
//   ScrollView,
//   Text,
//   useWindowDimensions,
//   View,
// } from "react-native";
// import { useSafeAreaInsets } from "react-native-safe-area-context";

// const GREETER_PENGUIN = require("@/assets/images/greeter.png");
// const PENGUIN_SIGN = require("@/assets/images/processor.png");
// const TEXT_LOGO_LIGHT = require("@/assets/images/icon-text-dark.png");
// const TEXT_LOGO_DARK = require("@/assets/images/icon-text-light.png");

// export default function HomeScreen() {
//   const router = useRouter();
//   const insets = useSafeAreaInsets();
//   const { colorScheme } = useColorScheme();
//   const { t } = useTranslation();
//   const { width } = useWindowDimensions();
//   const { session, openCreationModal } = useAuthStore(); // 2. Get User Session

//   const isDesktop = width > 1000;
//   const isSmallMobile = width < 390;

//   const userName =
//     session?.user?.user_metadata?.full_name ||
//     session?.user?.email?.split("@")[0] ||
//     "Student";

//   return (
//     <View
//       className="flex-1 bg-page-light dark:bg-page-dark"
//       style={{ paddingTop: insets.top }}
//     >
//       <ScrollView
//         className="flex-1"
//         contentContainerStyle={{
//           // We use paddingLeft only on Desktop to "push" the content away from the sidebar
//           paddingLeft: isDesktop ? 300 : 20,
//           paddingRight: isDesktop ? 40 : 20,
//           paddingTop: isDesktop ? 40 : 20,
//           paddingBottom: isDesktop ? 40 : 140, // More bottom padding for mobile bar
//         }}
//       >
//         {/* 1. REFINED HEADER WITH MASCOT */}
//         <View className="flex-1 mb-10">
//           {/* Logo & Small Mascot Row for Tiny Screens */}
//           {!isDesktop && (
//             <View className="flex-row justify-between items-center mb-4">
//               <Image
//                 source={
//                   colorScheme === "dark" ? TEXT_LOGO_LIGHT : TEXT_LOGO_DARK
//                 }
//                 style={{ width: 140, height: 35 }}
//                 contentFit="contain"
//               />
//               {isSmallMobile && (
//                 <Image
//                   source={GREETER_PENGUIN}
//                   style={{ width: 50, height: 50 }}
//                   contentFit="contain"
//                 />
//               )}
//             </View>
//           )}

//           <View
//             className={clsx(
//               "flex-row gap-4",
//               isDesktop ? "items-center" : "items-end"
//             )}
//           >
//             <View>
//               <Text className="text-text-muted-light dark:text-text-muted-dark font-body text-base font-medium tracking-tight">
//                 {t("home.welcome_back")}, {userName}
//               </Text>
//               <Text className="text-text-main-light dark:text-text-main-dark font-heading text-4xl font-bold mt-1">
//                 Ready to Sprint?
//               </Text>
//             </View>
//             {/* Show Mascot here ONLY if it's NOT a tiny screen */}
//             {!isSmallMobile && !isDesktop && (
//               <Image
//                 source={GREETER_PENGUIN}
//                 style={{ width: 80, height: 80 }}
//                 contentFit="contain"
//               />
//             )}
//           </View>
//         </View>

//         {/* 2. CREATION BUTTONS (Modern Glass/Minimal Style) */}
//         <View className={`${isDesktop ? "flex-row" : "flex-col"} gap-4 mb-10`}>
//           <ActionButton
//             icon="document-text"
//             label="PDF"
//             sub="Auto-Flashcards"
//             color="#38BDF8"
//             onPress={() => openCreationModal("pdf")}
//           />
//           <ActionButton
//             icon="link"
//             label="URL"
//             sub="Web Articles"
//             color="#F97316"
//             onPress={() => openCreationModal("url")}
//           />
//           <ActionButton
//             icon="bulb"
//             label="Topic"
//             sub="AI Generation"
//             color="#22C55E"
//             onPress={() => openCreationModal("topic")}
//           />
//         </View>

//         {/* 3. MAIN WIDGETS SECTION */}
//         <View className={`${isDesktop ? "flex-row" : "flex-col"} gap-6`}>
//           {/* AI STUDY PLAN (Liquid-Inspired Primary Widget) */}
//           <View
//             className={clsx(
//               "flex-[2] bg-primary relative overflow-hidden shadow-2xl shadow-primary/30 min-h-[240px] justify-center",
//               isSmallMobile ? "py-3 px-4 rounded-[32px]" : "p-8 rounded-[48px]"
//             )}
//           >
//             {/* Background Decorative Element (The "Nest") */}
//             <View
//               className="absolute right-[-20] bottom-[-20] rounded-full bg-white/5"
//               style={{
//                 transform: [{ scale: 1.2 }],
//                 width: isDesktop ? 192 : 155,
//                 height: isDesktop ? 192 : 155,
//               }}
//             />

//             <View className="z-10 flex-row items-center">
//               {/* LEFT: TEXT CONTENT (65% width to ensure no overlap) */}
//               <View className="w-[65%]">
//                 <View className="bg-white/10 self-start px-3 py-1 rounded-full mb-3">
//                   <Text className="text-accent font-heading text-[10px] font-bold tracking-[2px] uppercase">
//                     Daily Mission
//                   </Text>
//                 </View>

//                 <Text className="text-white font-heading text-3xl font-bold mb-6 leading-tight">
//                   32 Cards to Review
//                 </Text>

//                 <Pressable className="bg-action py-4 px-8 rounded-2xl self-start active:scale-95 transition-all shadow-lg shadow-action/30">
//                   <Text className="text-white font-heading font-bold text-lg">
//                     Start Session
//                   </Text>
//                 </Pressable>
//               </View>

//               {/* RIGHT: THE MASCOT (Carefully sized and anchored) */}
//               <View
//                 className={clsx(
//                   "absolute",
//                   isSmallMobile
//                     ? "right-[-22] bottom-[-20]"
//                     : "right-[-26] bottom-[-32]"
//                 )}
//               >
//                 <Image
//                   source={PENGUIN_SIGN}
//                   style={{
//                     width: isDesktop ? 160 : 130,
//                     height: isDesktop ? 160 : 130,
//                   }}
//                   contentFit="contain"
//                   className="opacity-95"
//                 />
//               </View>
//             </View>
//           </View>

//           {/* STATS / STREAK (Modern Split Widgets) */}
//           <View
//             className={clsx(
//               "gap-4",
//               isDesktop || isSmallMobile ? "flex-col" : "flex-row"
//             )}
//           >
//             {/* 1. THE STREAK CARD (The "Wooden Plaque") */}
//             <View className="flex-1 bg-wood p-5 rounded-[32px] relative overflow-hidden shadow-lg shadow-wood/30">
//               {/* Subtle Wood Texture Overlay (Inner Glow) */}
//               <View className="absolute inset-0 bg-black/5 border-t border-white/20 rounded-[32px]" />

//               <View className="flex-row items-center z-10">
//                 <View className="bg-white/20 p-3 rounded-2xl mr-3 border border-white/10">
//                   <Text className="text-2xl">🔥</Text>
//                 </View>
//                 <View>
//                   <Text className="text-white/60 font-body text-[10px] font-bold uppercase tracking-[2px]">
//                     Streak
//                   </Text>
//                   <Text className="text-white font-heading font-bold text-2xl">
//                     5 Days
//                   </Text>
//                 </View>
//               </View>

//               {/* Decorative element: small wooden 'texture' lines */}
//               <View className="absolute right-[-10] top-[-10] opacity-10">
//                 <Ionicons name="flame" size={80} color="white" />
//               </View>
//             </View>

//             {/* 2. THE MEMORIZED CARD (The "Ice Stat") */}
//             <View className="flex-1 bg-card-light dark:bg-card-dark p-5 rounded-[32px] border border-black/5 dark:border-white/5 shadow-xl shadow-black/5 relative overflow-hidden">
//               {/* Background Glow */}
//               <View className="absolute right-[-20] top-[-20] w-24 h-24 bg-accent/10 rounded-full blur-3xl" />

//               <View className="z-10">
//                 <View className="flex-row items-center mb-1">
//                   <Ionicons
//                     name="checkmark-circle"
//                     size={12}
//                     color="#38BDF8"
//                     className="mr-1"
//                   />
//                   <Text className="text-text-muted-light dark:text-text-muted-dark font-body font-bold text-[10px] uppercase tracking-[2px]">
//                     Memorized
//                   </Text>
//                 </View>

//                 <View className="flex-row items-baseline">
//                   <Text className="text-text-main-light dark:text-text-main-dark font-heading text-4xl font-bold">
//                     142
//                   </Text>
//                   <Text className="text-accent ml-2 font-body font-bold text-xs uppercase">
//                     Cards
//                   </Text>
//                 </View>

//                 {/* Mini Progress Bar (Non-functional, for aesthetics) */}
//                 <View className="h-1.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full mt-3 overflow-hidden">
//                   <View className="h-full bg-accent w-[65%] rounded-full" />
//                 </View>
//               </View>
//             </View>
//           </View>
//         </View>
//       </ScrollView>
//     </View>
//   );
// }

// // Modernized Action Button Component
// function ActionButton({ icon, label, sub, color, onPress }: any) {
//   return (
//     <Pressable
//       onPress={onPress}
//       className={clsx(
//         "flex-1 p-5 rounded-[32px] border shadow-md shadow-black/5 active:scale-95 transition-all duration-200 flex-row items-center",
//         // Base Colors
//         "bg-card-light dark:bg-card-dark border-black/5 dark:border-white/5",
//         // Light Mode Hover: Solid shift to a slightly deeper slate
//         "hover:bg-slate-100",
//         // Dark Mode Hover: Solid shift to a slightly lighter/vibrant slate to "glow"
//         "dark:hover:bg-slate-800"
//       )}
//     >
//       <View
//         style={{ backgroundColor: color + "15" }}
//         className="w-14 h-14 rounded-2xl items-center justify-center mr-4"
//       >
//         <Ionicons name={icon} size={28} color={color} />
//       </View>
//       <View>
//         <Text className="text-text-main-light dark:text-text-main-dark font-heading text-lg font-bold leading-tight">
//           {label}
//         </Text>
//         <Text className="text-text-muted-light dark:text-text-muted-dark font-body text-xs mt-0.5">
//           {sub}
//         </Text>
//       </View>
//     </Pressable>
//   );
// }
