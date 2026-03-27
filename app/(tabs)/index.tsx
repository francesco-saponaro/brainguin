import GREETER_PENGUIN from "@/assets/images/greeter.png";
import TEXT_LOGO_LIGHT from "@/assets/images/icon-text-dark.png";
import TEXT_LOGO_DARK from "@/assets/images/icon-text-light.png";
import PENGUIN_SIGN from "@/assets/images/processor.png";
import FeedbackModal from "@/components/FeedbackModal";
import { Colors } from "@/constants/theme";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/store/storeUser";
import { AndroidWidget } from "@/widget/AndroidWidget";
import { ExtensionStorage } from "@bacons/apple-targets";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import clsx from "clsx";
import { Image } from "expo-image";
import { useFocusEffect, useRouter } from "expo-router"; // Added useFocusEffect
import { useColorScheme } from "nativewind";
import { PressableOpacity, PressableScale } from "pressto";
import React, { useCallback, useRef, useState } from "react"; // Added hooks
import { useTranslation } from "react-i18next";
import {
  InteractionManager,
  Platform,
  RefreshControl,
  ScrollView,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { requestWidgetUpdate } from "react-native-android-widget";
import { Modalize } from "react-native-modalize";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const APP_GROUP_ID = "group.com.brainguin.app";
const storage = new ExtensionStorage(APP_GROUP_ID);

export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colorScheme } = useColorScheme();
  const { t } = useTranslation();
  const { width } = useWindowDimensions();
  const { session, signOut } = useAuthStore();

  const feedbackModalRef = useRef<Modalize>(null);

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
    total: 0,
  });

  const Pressable = Platform.OS === "web" ? PressableOpacity : PressableScale;

  const openCreationModal = (type: string) => {
    router.push({
      pathname: "/creation-modal",
      params: { type },
    });
  };

  // --- FETCH LOGIC IN HOME PAGE ---
  const fetchHomeStats = async () => {
    // 1. Wait for interactions/navigation to finish
    // This ensures the Navigation Container is ready and the screen transition is done
    await new Promise((resolve) =>
      InteractionManager.runAfterInteractions(() => resolve(null)),
    );

    try {
      if (!session?.user) return;

      const todayISO = new Date().toISOString();

      // 1. Get Due Cards (next_review_at <= now AND not mastered)
      const { count: dueCount } = await supabase
        .from("flashcards")
        // 👇 CHANGE 1: Use !inner to join decks
        .select("*, decks!inner(is_archived)", { count: "exact", head: true })
        .eq("user_id", session.user.id)
        .lte("next_review_at", todayISO)
        .neq("status", "mastered")
        // 👇 CHANGE 2: Only show cards where deck is NOT archived
        .eq("decks.is_archived", false);

      // 2. Get Memorized Count
      const { count: masteredCount } = await supabase
        .from("flashcards")
        .select("*", { count: "exact", head: true })
        .eq("user_id", session.user.id)
        .eq("status", "mastered");

      const { count: totalCount } = await supabase
        .from("flashcards")
        .select("*", { count: "exact", head: true })
        .eq("user_id", session.user.id);

      // 3. Get Streak from Users table
      const { data: userData } = await supabase
        .from("users")
        .select("streak_count")
        .eq("id", session.user.id)
        .single();

      console.log(dueCount);

      const stats = {
        streak: userData?.streak_count || 0,
        dueCards: dueCount || 0,
        memorized: masteredCount || 0,
        total: totalCount || 0,
      };

      setStats(stats);

      // 1. iOS UPDATE (Keep this)
      if (Platform.OS === "ios") {
        storage.set("stats", JSON.stringify(stats));
        ExtensionStorage.reloadWidget();
      }

      // 2. ANDROID UPDATE (Add this)
      // We explicitly tell Android: "Render the widget named 'Android' with THESE props"
      if (Platform.OS === "android") {
        requestWidgetUpdate({
          widgetName: "Android",
          props: {
            dueCards: stats.dueCards,
          },
          renderWidget: () => <AndroidWidget dueCards={stats.dueCards} />,
          widgetNotFound: () => {
            // Called if the user hasn't added the widget to their home screen yet
            console.log("Android widget not active");
          },
        } as any);

        AsyncStorage.setItem(
          "widget_last_data",
          JSON.stringify({
            dueCards: stats.dueCards,
          }),
        );
      }
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

  const memorizedPercentage =
    stats.total > 0 ? Math.min((stats.memorized / stats.total) * 100, 100) : 0;

  return (
    <View
      className="flex-1 bg-page-light dark:bg-page-dark"
      style={{ paddingTop: insets.top }}
    >
      {/* {stats.dueCards > 0 && (
        <WidgetPreview
          renderWidget={() => <AndroidWidget dueCards={stats.dueCards} />}
          width={320}
          height={160} // Adjusted height to match minHeight usually seen on Android
        />
      )} */}
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
          paddingBottom: isDesktop ? 40 : insets.bottom + 120,
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
              {/* 🚨 FEEDBACK TRIGGER BUTTON */}
              <PressableScale
                onPress={() => feedbackModalRef.current?.open()}
                style={{
                  backgroundColor:
                    colorScheme === "dark"
                      ? "rgba(255,255,255,0.1)"
                      : "rgba(0,0,0,0.05)",
                  padding: 6,
                  borderRadius: 10,
                }}
              >
                <Ionicons
                  name="chatbubble-ellipses-outline"
                  size={20}
                  color={colorScheme === "dark" ? "#94A3B8" : "#64748B"}
                />
              </PressableScale>
              {/* {isSmallMobile && (
                <Image
                  source={GREETER_PENGUIN}
                  style={{ width: 50, height: 50 }}
                  contentFit="contain"
                />
              )} */}
            </View>
          )}

          <View
            className={clsx(
              "flex-row gap-4 justify-between",
              isDesktop ? "items-center" : "items-end",
            )}
          >
            <View>
              <View className="flex-row items-center">
                <Text className="text-text-muted-light dark:text-text-muted-dark font-body text-base font-medium tracking-tight flex-1">
                  {t("home.welcome_back")}, {userName}
                </Text>
              </View>
              <Text className="text-text-main-light dark:text-text-main-dark font-heading text-3xl font-bold mt-1">
                Ready to Sprint?
              </Text>
            </View>
            {isDesktop ? (
              <PressableScale
                onPress={() => feedbackModalRef.current?.open()}
                style={{
                  backgroundColor:
                    colorScheme === "dark"
                      ? "rgba(255,255,255,0.1)"
                      : "rgba(0,0,0,0.05)",
                  padding: 6,
                  borderRadius: 10,
                }}
              >
                <Ionicons
                  name="chatbubble-ellipses-outline"
                  size={20}
                  color={colorScheme === "dark" ? "#94A3B8" : "#64748B"}
                />
              </PressableScale>
            ) : null}
            {
              // !isSmallMobile &&
              !isDesktop && (
                <Image
                  source={GREETER_PENGUIN}
                  style={{ width: 80, height: 80 }}
                  contentFit="contain"
                />
              )
            }
          </View>
        </View>

        {/* 2. CREATION BUTTONS */}
        <View className={`${isDesktop ? "flex-row" : "flex-col"} gap-4 mb-10`}>
          <ActionButton
            icon="document-text"
            label={t("document")}
            sub={t("load_document")}
            color="#38BDF8"
            onPress={() => openCreationModal("document")}
          />
          <ActionButton
            icon="camera"
            label={t("image")}
            sub={t("creation.upload_notes")}
            color="#EAB308"
            onPress={() => openCreationModal("image")}
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
            sub={t("ai_generation_load")}
            color="#22C55E"
            onPress={() => openCreationModal("topic")}
          />
        </View>

        {/* 3. MAIN WIDGETS SECTION */}
        <View
          className={`${isDesktop ? "flex-row" : "flex-col"} gap-6`}
          pointerEvents={stats.dueCards === 0 ? "none" : "auto"}
        >
          {/* --- AI STUDY PLAN (DAILY MISSION) --- */}
          <Pressable
            onPress={() => {
              if (stats.dueCards > 0) {
                router.push("/study/daily");
              }
            }}
            activateOnHover
            style={{
              flex: 2,

              borderRadius: isSmallMobile ? 32 : 48,
              shadowColor:
                stats.dueCards > 0 ? Colors.brand.primary : "#16a34a",
              shadowOffset: { width: 0, height: 20 },
              shadowOpacity: 0.3,
              shadowRadius: 30,
              elevation: 10,
            }}
          >
            <View
              style={{
                flex: 2,
                position: "relative",
                overflow: "hidden",
                minHeight: 240,
                justifyContent: "center",
                padding: isSmallMobile ? 16 : 26,
                borderRadius: isSmallMobile ? 32 : 48,
                backgroundColor:
                  stats.dueCards > 0 ? Colors.brand.primary : "#16a34a",
              }}
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
                    <View className="bg-action py-4 px-8 rounded-2xl self-start">
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
            <View className="flex-1 bg-wood py-5 px-3 rounded-[32px] relative overflow-hidden">
              <View className="absolute inset-0 bg-black/5 border-t border-white/20 rounded-[32px]" />
              <View className="flex-row items-center z-10 justify-center">
                <View className="bg-white/20 p-3 rounded-2xl mr-2 border border-white/10">
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
            <View className="flex-1 bg-card-light dark:bg-card-dark p-5 rounded-[32px] border border-black/5 dark:border-white/5 relative overflow-hidden">
              <View className="absolute right-[-20] top-[-20] w-24 h-24 bg-accent/10 rounded-full blur-3xl" />
              <View className="z-10">
                <View className="flex-row items-center mb-2">
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
                <View className="flex-row items-center">
                  <Text className="text-text-main-light dark:text-text-main-dark font-heading text-4xl font-bold">
                    {stats.memorized}
                  </Text>
                  <Text className="text-accent ml-2 font-body font-bold text-xs uppercase">
                    {t("cards")}
                  </Text>
                </View>
                <View className="h-1.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full mt-2 overflow-hidden">
                  <View
                    className="h-full bg-accent rounded-full"
                    style={{ width: `${memorizedPercentage}%` }}
                  />
                </View>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>

      <FeedbackModal modalRef={feedbackModalRef} />
    </View>
  );
}

// Modernized Action Button Component (Unchanged)
function ActionButton({ icon, label, sub, color, onPress }: any) {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";
  const Pressable = Platform.OS === "web" ? PressableOpacity : PressableScale;

  return (
    <Pressable
      onPress={onPress}
      activateOnHover
      style={{
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        padding: 20,
        borderRadius: 32,
        borderWidth: 1,
        backgroundColor: isDark ? Colors.dark.card : Colors.light.card,
        borderColor: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)",
        // Optional shadow for depth
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
        elevation: 2,
      }}
    >
      <View
        style={{ backgroundColor: color + "15" }}
        className="w-14 h-14 rounded-2xl items-center justify-center mr-4"
      >
        <Ionicons name={icon} size={28} color={color} />
      </View>
      <View className="flex-1">
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
