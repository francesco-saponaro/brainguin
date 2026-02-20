import FlashcardSwiper from "@/components/Study/FlashcardSwiper";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/store/storeUser";
import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { Image } from "expo-image";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useColorScheme } from "nativewind";
import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import CELEBRATOR_PENGUIN from "@/assets/images/celebrator.png";
import { PressableScale } from "pressto";

export default function StudyScreen() {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";
  const { id } = useLocalSearchParams(); // Can be a UUID or "daily"
  const router = useRouter();
  const { session } = useAuthStore();
  const { t } = useTranslation();

  const [deck, setDeck] = useState<any>(null);
  const [cards, setCards] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFinished, setIsFinished] = useState(false);

  // Track how many cards reviewed to determine if we need "Save & Quit" alert
  const [progress, setProgress] = useState(0);

  const [sessionStats, setSessionStats] = useState({
    hard: 0,
    medium: 0,
    easy: 0,
  });

  // Hints/Context Modal State
  const [contextModalVisible, setContextModalVisible] = useState(false);
  const [infoModalVisible, setInfoModalVisible] = useState(false);
  const [activeContext, setActiveContext] = useState("");

  const onOpenContext = (ctx: string) => {
    setActiveContext(ctx);
    setContextModalVisible(true);
  };

  // --- 1. FETCH DATA (HANDLES "DAILY" vs "SPECIFIC" MODES) ---
  useEffect(() => {
    const fetchStudyData = async () => {
      try {
        setLoading(true);
        if (!session?.user) return;

        // 🟢 SCENARIO A: DAILY REVIEW (Mix of all decks)
        if (id === "daily") {
          // 1. Set Mock Deck Info
          setDeck({
            title: t("daily_mission", "Daily Review 🎯"),
            source_type: "mix",
          });

          // 2. Fetch ALL Due Cards (Joined with Deck Title)
          const now = new Date().toISOString();
          const { data: cardData, error } = await supabase
            .from("flashcards")
            // 👇 CHANGE 1: Use "!inner" to enforce filtering on the joined table
            .select("*, decks!inner(title, is_archived)")
            .eq("user_id", session.user.id)
            .lte("next_review_at", now) // Due now or past
            .neq("status", "mastered")
            // 👇 CHANGE 2: Only show cards where deck is NOT archived
            .eq("decks.is_archived", false)
            .order("next_review_at", { ascending: true }) // Oldest due first
            .limit(50); // Cap at 50

          if (error) throw error;

          // 3. Map Data
          const mappedCards = (cardData || []).map((c: any) => ({
            ...c,
            front: c.question, // DB 'question' -> UI 'front'
            back: c.answer, // DB 'answer'   -> UI 'back'
            context: c.context,
            // Pass the source deck title so the card can display it contextually
            deckTitle: c.decks?.title,
          }));

          setCards(mappedCards);
        }

        // 🔵 SCENARIO B: SPECIFIC DECK
        else {
          // 1. Fetch Deck Details
          const { data: deckData, error: deckError } = await supabase
            .from("decks")
            .select("*")
            .eq("id", id)
            .single();

          if (deckError) throw deckError;
          setDeck(deckData);

          // 2. Fetch Cards for THIS Deck
          const { data: cardData, error: cardError } = await supabase
            .from("flashcards")
            .select("*")
            .eq("deck_id", id)
            .order("next_review_at", { ascending: true }); // Prioritize due cards

          if (cardError) throw cardError;

          // 3. Map Data
          const mappedCards = (cardData || []).map((c: any) => ({
            ...c,
            front: c.question,
            back: c.answer,
            context: c.context,
            // No deckTitle needed here as we are inside that deck
            deckTitle: null,
          }));
          setCards(mappedCards);
        }
      } catch (e) {
        console.error("Error fetching study data:", e);
      } finally {
        setLoading(false);
      }
    };

    fetchStudyData();
  }, [id, session]);

  // --- 2. IMPROVED ALGORITHM (SM-2 Simplified) ---
  const handleRateCard = async (
    cardId: string,
    rating: "hard" | "medium" | "easy",
  ) => {
    // 1. Update UI Stats
    setSessionStats((prev) => ({ ...prev, [rating]: prev[rating] + 1 }));
    setProgress((p) => p + 1);

    // 2. Find current card data to do math
    const currentCard = cards.find((c) => c.id === cardId);
    if (!currentCard) return;

    const now = new Date();
    let nextReview = new Date();

    // Variables for the algorithm
    let newInterval = 1;
    let newStatus = "learning";
    let newEase = currentCard.ease_factor || 2.5;
    let newReps = currentCard.repetition_count || 0;

    // --- LOGIC START ---
    if (rating === "hard") {
      // Reset progress
      newInterval = 0;
      newStatus = "new";
      newReps = 0;
      newEase = Math.max(1.3, newEase - 0.2); // Make card slightly "harder" for future

      // 👇 REMOVED the 10-minute delay.
      // Setting it to 1 second in the past so it is INSTANTLY due again.
      nextReview = new Date(now.getTime() - 1000);
    } else if (rating === "medium") {
      // Small bump, keep in learning
      newInterval = 1; // 1 Day
      newStatus = "learning";
      newEase = Math.max(1.3, newEase - 0.15);

      // Schedule for tomorrow
      nextReview.setDate(now.getDate() + 1);
    } else if (rating === "easy") {
      // EXPONENTIAL GROWTH 🚀
      newReps += 1;
      newEase += 0.15; // Reward ease

      if (newReps === 1) {
        newInterval = 1;
      } else if (newReps === 2) {
        newInterval = 3;
      } else {
        // The Magic Formula: Previous Interval * Ease Factor
        const prevInterval = currentCard.interval_days || 1;
        newInterval = Math.ceil(prevInterval * newEase);
      }

      // 🏆 MASTERY CHECK
      if (newInterval > 21) {
        newStatus = "mastered";
      } else {
        newStatus = "review";
      }

      // Schedule for X days from now
      nextReview.setDate(now.getDate() + newInterval);
    }
    // --- LOGIC END ---

    // 3. Save to Supabase
    if (session?.user) {
      const { error } = await supabase // 👈 Add error extraction
        .from("flashcards")
        .update({
          next_review_at: nextReview.toISOString(),
          status: newStatus,
          interval_days: newInterval,
          ease_factor: newEase,
          repetition_count: newReps,
        })
        .eq("id", cardId);

      if (error) {
        console.error("🔥 Error rating card:", error.message);
        // Optional: Show a toast so you know it failed
      }
    }
  };

  // --- DELETE CARD LOGIC ---
  const handleDeleteCard = async (cardId: string) => {
    // 1. Optimistic UI Update (Remove immediately so user doesn't wait)
    setCards((prev) => prev.filter((c) => c.id !== cardId));

    // If that was the last card, trigger finish
    if (cards.length <= 1) {
      handleSessionFinish();
    }

    // 2. Delete from DB
    if (session?.user) {
      const { error } = await supabase
        .from("flashcards")
        .delete()
        .eq("id", cardId);

      if (error) {
        console.error("🔥 Error deleting card:", error.message);
        Alert.alert(t("errors.generic"), t("errors.delete_failed"));
        // Optional: Re-fetch cards if it failed
      } else {
        // Optional: Show a quiet toast
        // Toast.show({ type: 'info', text1: 'Card deleted' });
      }
    }
  };

  const handleSessionFinish = async () => {
    if (session?.user) {
      // Only update specific deck statistics if we aren't in daily mode
      if (id !== "daily") {
        await supabase
          .from("decks")
          .update({ last_reviewed_at: new Date().toISOString() })
          .eq("id", id);
      }

      // Update User Streak
      const today = new Date().toISOString().split("T")[0];
      await supabase.rpc("update_streak", { user_date: today });
    }
    setIsFinished(true);
  };

  // --- 3. HANDLE EXIT (SAVE & QUIT) ---
  const handleExit = () => {
    // If user has rated at least 1 card but hasn't finished
    if (progress > 0 && !isFinished) {
      if (Platform.OS === "web") {
        if (
          confirm(
            t("study.quit_session_title") + "\n" + t("study.quit_session_msg"),
          )
        ) {
          router.back();
        }
      } else {
        Alert.alert(
          t("study.quit_session_title"),
          t("study.quit_session_msg"),
          [
            { text: t("common.cancel"), style: "cancel" },
            {
              text: t("study.quit_session_confirm"),
              style: "destructive",
              onPress: () => router.back(),
            },
          ],
        );
      }
    } else {
      router.back();
    }
  };

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-page-light dark:bg-page-dark items-center justify-center">
        <ActivityIndicator size="large" color="#F97316" />
      </SafeAreaView>
    );
  }

  // --- FINISHED SCREEN ---
  if (isFinished) {
    return (
      <SafeAreaView className="flex-1 bg-page-light dark:bg-page-dark">
        <ScrollView
          contentContainerStyle={{
            flexGrow: 1,
            alignItems: "center",
            justifyContent: "center",
            paddingHorizontal: 24,
            paddingVertical: 40,
          }}
          showsVerticalScrollIndicator={false}
          className="w-full"
        >
          <View className="w-full max-w-[400px] items-center">
            <Image
              source={CELEBRATOR_PENGUIN}
              style={{ width: 200, height: 200, marginBottom: 20 }}
              contentFit="contain"
            />

            <Text className="text-text-main-light dark:text-text-main-dark font-heading font-bold text-3xl text-center mb-2">
              {t("study.finished_title")}
            </Text>
            <Text className="text-text-muted-light dark:text-text-muted-dark text-center font-body mb-8 text-lg">
              {id === "daily"
                ? "You've crushed your daily goals! Come back tomorrow for more."
                : t("study.finished_desc", {
                    count: cards.length,
                    title: deck?.title,
                  })}
            </Text>

            <View className="flex-row gap-4 w-full mb-10">
              <StatBox
                label={t("study.hard")}
                value={sessionStats.hard}
                color="bg-red-100 dark:bg-red-900/30"
                textColor="text-red-600 dark:text-red-400"
              />
              <StatBox
                label={t("study.medium")}
                value={sessionStats.medium}
                color="bg-yellow-100 dark:bg-yellow-900/30"
                textColor="text-yellow-600 dark:text-yellow-400"
              />
              <StatBox
                label={t("study.easy")}
                value={sessionStats.easy}
                color="bg-green-100 dark:bg-green-900/30"
                textColor="text-green-600 dark:text-green-400"
              />
            </View>

            <PressableScale
              onPress={() => router.replace("/(tabs)/library")}
              style={{
                backgroundColor: "#F97316",
                width: "100%",
                paddingVertical: 16,
                borderRadius: 16,
                alignItems: "center",
                marginBottom: 16,
                shadowColor: "#F97316",
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.2,
                shadowRadius: 8,
                elevation: 4,
              }}
              activateOnHover
            >
              <Text className="text-white font-bold font-heading text-lg">
                {t("study.finished_btn")}
              </Text>
            </PressableScale>

            <PressableScale
              onPress={() => {
                setSessionStats({ hard: 0, medium: 0, easy: 0 });
                setProgress(0);
                setIsFinished(false);
              }}
              style={{
                paddingVertical: 12,
                paddingHorizontal: 24,
                borderRadius: 12,
              }}
              activateOnHover
            >
              <Text className="text-text-muted-light dark:text-text-muted-dark font-semibold">
                {t("study.review_again")}
              </Text>
            </PressableScale>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // --- STUDY INTERFACE ---
  return (
    <SafeAreaView className="flex-1 bg-page-light dark:bg-page-dark">
      {/* HEADER */}
      <View
        className="flex-row items-center justify-between px-6 mb-4"
        style={{ paddingTop: Platform.OS === "web" ? 30 : 10 }}
      >
        <PressableScale
          onPress={handleExit}
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
          <Ionicons name="close" size={24} color={deck ? "#64748B" : "#FFF"} />
        </PressableScale>
        <View className="items-center">
          <Text className="text-text-muted-light dark:text-text-muted-dark text-[10px] font-bold uppercase tracking-widest">
            {id === "daily" ? "DAILY MISSION" : t("study.header_small")}
          </Text>
          <Text
            className="text-text-main-light dark:text-text-main-dark font-heading font-bold text-base"
            numberOfLines={1}
          >
            {deck?.title}
          </Text>
        </View>
        <View className="w-10" /> {/* Placeholder for spacing */}
      </View>

      {/* ✅ NEW: SUBTITLE INSTRUCTION */}
      <PressableScale onPress={() => setInfoModalVisible(true)}>
        <Text className="text-text-muted-light dark:text-text-muted-dark text-xs text-center mt-2 font-medium">
          {t("study.instruction_tap")} • {t("study.instruction_swipe")} •{" "}
          <Text className="text-action font-bold">
            {t("study.how_it_works_link")}
          </Text>
        </Text>
      </PressableScale>

      {/* SWIPER AREA */}
      <View className="flex-1 px-4 pb-10 w-full max-w-[800px] self-center">
        {cards.length > 0 ? (
          <FlashcardSwiper
            cards={cards}
            onFinish={handleSessionFinish}
            onRate={handleRateCard}
            onShowContext={(ctx) => onOpenContext(ctx)}
            onDelete={(cardId) => handleDeleteCard(cardId)}
          />
        ) : (
          <View className="flex-1 items-center justify-center">
            {id === "daily" ? (
              <View className="items-center">
                <Ionicons name="checkmark-circle" size={64} color="#22C55E" />
                <Text className="text-text-main-light dark:text-text-main-dark font-heading font-bold text-xl mt-4">
                  All Caught Up!
                </Text>
                <Text className="text-text-muted-light text-center mt-2 px-8">
                  You have no cards due for review right now. Great job!
                </Text>
              </View>
            ) : (
              <Text className="text-text-muted-light font-body text-center px-8">
                {t("errors.no_cards_found", "No cards found in this deck.")}
              </Text>
            )}
          </View>
        )}
      </View>

      {/* --- HOW IT WORKS MODAL --- */}
      <Modal
        visible={infoModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setInfoModalVisible(false)}
      >
        <BlurView
          intensity={20}
          tint={isDark ? "dark" : "light"}
          style={StyleSheet.absoluteFill}
        >
          <View className="flex-1 justify-end">
            <View className="bg-page-light dark:bg-card-dark rounded-t-[32px] p-8 h-[85%] shadow-2xl border-t border-white/10">
              <View className="flex-row justify-between items-center mb-6">
                <Text className="text-text-main-light dark:text-text-main-dark font-heading font-bold text-2xl">
                  {t("study.how_it_works.title")}
                </Text>
                <Pressable
                  onPress={() => setInfoModalVisible(false)}
                  className="bg-black/5 dark:bg-white/10 p-2 rounded-full"
                >
                  <Ionicons
                    name="close"
                    size={24}
                    color={isDark ? "white" : "black"}
                  />
                </Pressable>
              </View>

              <ScrollView showsVerticalScrollIndicator={false}>
                <Text className="text-text-muted-light dark:text-text-muted-dark text-base mb-6 leading-6">
                  {t("study.how_it_works.intro_1")}{" "}
                  <Text className="font-bold text-action">
                    {t("study.how_it_works.spaced_repetition")}
                  </Text>{" "}
                  {t("study.how_it_works.intro_2")}
                </Text>

                {/* HARD */}
                <View className="flex-row mb-6 gap-4">
                  <View className="bg-red-100 dark:bg-red-900/20 w-12 h-12 rounded-full items-center justify-center">
                    <Ionicons name="refresh" size={24} color="#EF4444" />
                  </View>
                  <View className="flex-1">
                    <Text className="text-red-500 font-bold text-lg mb-1">
                      {t("study.how_it_works.hard_title")}
                    </Text>
                    <Text className="text-text-main-light dark:text-text-main-dark text-sm opacity-80">
                      {t("study.how_it_works.hard_desc_1")}{" "}
                      <Text className="font-bold">
                        {t("study.how_it_works.time_10m")}
                      </Text>
                      .
                    </Text>
                    <Text className="text-xs text-text-muted-light mt-2 font-bold uppercase tracking-wide">
                      {t("study.how_it_works.hard_gesture")}
                    </Text>
                  </View>
                </View>

                {/* MEDIUM */}
                <View className="flex-row mb-6 gap-4">
                  <View className="bg-yellow-100 dark:bg-yellow-900/20 w-12 h-12 rounded-full items-center justify-center">
                    <Ionicons name="time" size={24} color="#EAB308" />
                  </View>
                  <View className="flex-1">
                    <Text className="text-yellow-600 dark:text-yellow-500 font-bold text-lg mb-1">
                      {t("study.how_it_works.medium_title")}
                    </Text>
                    <Text className="text-text-main-light dark:text-text-main-dark text-sm opacity-80">
                      {t("study.how_it_works.medium_desc_1")}{" "}
                      <Text className="font-bold">
                        {t("study.how_it_works.time_tomorrow")}
                      </Text>
                      .
                    </Text>
                    <Text className="text-xs text-text-muted-light mt-2 font-bold uppercase tracking-wide">
                      {t("study.how_it_works.medium_action")}
                    </Text>
                  </View>
                </View>

                {/* EASY */}
                <View className="flex-row mb-6 gap-4">
                  <View className="bg-green-100 dark:bg-green-900/20 w-12 h-12 rounded-full items-center justify-center">
                    <Ionicons name="checkmark" size={24} color="#22C55E" />
                  </View>
                  <View className="flex-1">
                    <Text className="text-green-600 dark:text-green-500 font-bold text-lg mb-1">
                      {t("study.how_it_works.easy_title")}
                    </Text>
                    <Text className="text-text-main-light dark:text-text-main-dark text-sm opacity-80">
                      {t("study.how_it_works.easy_desc_1")}{" "}
                      <Text className="font-bold">
                        {t("study.how_it_works.time_4d")}
                      </Text>{" "}
                      {t("study.how_it_works.easy_desc_2")}
                    </Text>
                    <Text className="text-xs text-text-muted-light mt-2 font-bold uppercase tracking-wide">
                      {t("study.how_it_works.easy_gesture")}
                    </Text>
                  </View>
                </View>

                {/* DELETE */}
                <View className="flex-row mb-8 gap-4">
                  <View className="bg-gray-100 dark:bg-gray-800 w-12 h-12 rounded-full items-center justify-center">
                    <Ionicons name="trash" size={24} color="#94A3B8" />
                  </View>
                  <View className="flex-1">
                    <Text className="text-gray-600 dark:text-gray-400 font-bold text-lg mb-1">
                      {t("study.how_it_works.delete_title")}
                    </Text>
                    <Text className="text-text-main-light dark:text-text-main-dark text-sm opacity-80">
                      {t("study.how_it_works.delete_desc")}
                    </Text>
                    <Text className="text-xs text-text-muted-light mt-2 font-bold uppercase tracking-wide">
                      {t("study.how_it_works.delete_gesture")}
                    </Text>
                  </View>
                </View>

                <Pressable
                  onPress={() => setInfoModalVisible(false)}
                  className="bg-action py-4 rounded-xl items-center mb-8"
                >
                  <Text className="text-white font-bold text-lg">
                    {t("study.how_it_works.button_close")}
                  </Text>
                </Pressable>
              </ScrollView>
            </View>
          </View>
        </BlurView>
      </Modal>

      {/* --- CONTEXT MODAL --- */}
      <Modal
        visible={contextModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setContextModalVisible(false)}
      >
        <View style={styles.overlay}>
          <BlurView
            intensity={30}
            tint={isDark ? "dark" : "light"}
            style={StyleSheet.absoluteFill}
          />
          <View className="bg-page-light dark:bg-card-dark w-[90%] max-w-[400px] rounded-[40px] p-8 items-center border border-black/5 dark:border-white/10">
            <View className="flex-row justify-between items-center mb-6 w-full">
              <View className="flex-row items-center gap-2">
                <Ionicons name="bulb" size={24} color="#F97316" />
                <Text className="text-text-main-light dark:text-text-main-dark font-heading font-bold text-xl">
                  {t("study.hint_title")}
                </Text>
              </View>

              <PressableScale
                onPress={() => setContextModalVisible(false)}
                style={{
                  backgroundColor:
                    colorScheme === "dark"
                      ? "rgba(255,255,255,0.1)"
                      : "rgba(0,0,0,0.05)",
                  padding: 8,
                  borderRadius: 99,
                }}
                activateOnHover
              >
                <Ionicons
                  name="close"
                  size={20}
                  color={isDark ? "#94A3B8" : "#64748B"}
                />
              </PressableScale>
            </View>

            <Text className="text-text-main-light dark:text-text-main-dark font-body text-lg leading-relaxed text-center">
              {activeContext}
            </Text>

            <PressableScale
              onPress={() => setContextModalVisible(false)}
              style={{
                marginTop: 40,
                backgroundColor: "#F97316",
                width: "100%",
                paddingVertical: 16,
                borderRadius: 16,
                alignItems: "center",
              }}
              activateOnHover
            >
              <Text className="text-white font-bold text-lg">
                {t("study.hint_btn")}
              </Text>
            </PressableScale>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const StatBox = ({ label, value, color, textColor }: any) => (
  <View className={`flex-1 ${color} rounded-2xl p-4 items-center`}>
    <Text className={`font-heading font-bold text-2xl ${textColor}`}>
      {value}
    </Text>
    <Text
      className={`font-body font-bold text-xs uppercase ${textColor} opacity-80`}
    >
      {label}
    </Text>
  </View>
);

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    alignItems: "center",
    justifyContent: "center",
  },
});
