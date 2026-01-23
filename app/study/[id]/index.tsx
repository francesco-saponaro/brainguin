import FlashcardSwiper from "@/components/Study/FlashcardSwiper";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/store/storeUser";
import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { Image } from "expo-image";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useColorScheme } from "nativewind";
import React, { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next"; // 1. Import hook
import {
  ActivityIndicator,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import CELEBRATOR_PENGUIN from "@/assets/images/celebrator.png";
import { PressableScale } from "pressto";
import { Modalize } from "react-native-modalize";

export default function StudyScreen() {
  const { colorScheme } = useColorScheme();
  const modalizeRef = useRef<Modalize>(null);
  const isDark = colorScheme === "dark";
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { session } = useAuthStore();
  const { t } = useTranslation(); // 2. Initialize hook

  const [deck, setDeck] = useState<any>(null);
  const [cards, setCards] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFinished, setIsFinished] = useState(false);

  const [sessionStats, setSessionStats] = useState({
    hard: 0,
    medium: 0,
    easy: 0,
  });

  const [contextModalVisible, setContextModalVisible] = useState(false);
  const [activeContext, setActiveContext] = useState("");

  const onOpen = (ctx: string) => {
    setActiveContext(ctx);
    modalizeRef.current?.open();
  };

  useEffect(() => {
    // const fetchDeckData = async () => {
    //   try {
    //     // Fetch Deck Info
    //     const { data: deckData } = await supabase.from('decks').select('*').eq('id', id).single();
    //     setDeck(deckData);

    //     // Fetch Cards
    //     // In real app: Fetch only 'status != mastered' if you want
    //     const { data: cardData } = await supabase.from('flashcards').select('*').eq('deck_id', id);
    //     setCards(cardData || []);
    //   } catch(e) {
    //     console.error(e);
    //   } finally {
    //     setLoading(false);
    //   }
    // };

    const fetchDeckData = async () => {
      // TODO: Replace with real Supabase fetch:
      // const { data } = await supabase.from('flashcards').select('*').eq('deck_id', id);

      // MOCK DATA (With Context added!)
      setTimeout(() => {
        setDeck({
          id: id,
          title: "The History of Samurai ⚔️",
          source_type: "topic",
        });

        setCards([
          {
            id: "1",
            front: "Who were the Samurai?",
            back: "Hereditary military nobility...",
            context: "They emerged in the Heian period.", // ✅ BUTTON WILL SHOW FOR THIS
          },
          {
            id: "2",
            front: "What is 'Bushido'?",
            back: "The 'Way of the Warrior'...",
            context: "Think of it like Chivalry for knights.", // ✅ BUTTON WILL SHOW
          },
          {
            id: "3", // No context, button will hide
            front: "What was the Katana?",
            back: "A curved, single-edged blade...",
          },
        ]);

        setLoading(false);
      }, 1000);
    };

    if (session?.user) fetchDeckData();
  }, [id, session]);

  // --- THE ALGORITHM ---
  const handleRateCard = async (
    cardId: string,
    rating: "hard" | "medium" | "easy",
  ) => {
    setSessionStats((prev) => ({ ...prev, [rating]: prev[rating] + 1 }));

    // 1. Calculate Logic
    const now = new Date();
    let nextReview = new Date();
    let status = "learning";

    if (rating === "easy") {
      nextReview.setDate(now.getDate() + 3); // +3 Days
      status = "review";
    } else if (rating === "medium") {
      nextReview.setDate(now.getDate() + 1); // +1 Day
      status = "learning";
    } else {
      nextReview.setMinutes(now.getMinutes() + 10); // +10 Mins (See it again soon)
      status = "new";
    }

    // 2. Save to Supabase (Fire & Forget)
    if (session?.user) {
      await supabase
        .from("flashcards")
        .update({
          next_review_at: nextReview.toISOString(),
          status: status,
        })
        .eq("id", cardId);
    }
  };

  const handleSessionFinish = async () => {
    if (session?.user) {
      // Update Deck "Last Reviewed"
      await supabase
        .from("decks")
        .update({ last_reviewed_at: new Date().toISOString() })
        .eq("id", id);

      // Update User Streak (Simple check)
      // Check if last_active_date was yesterday, if so increment.
      const today = new Date().toISOString().split("T")[0];
      await supabase.rpc("update_streak", { user_date: today });
    }
    setIsFinished(true);
  };

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-page-light dark:bg-page-dark items-center justify-center">
        <ActivityIndicator size="large" color="#F97316" />
      </SafeAreaView>
    );
  }

  // --- FINISHED STATE ---
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
            {/* MASCOT */}
            <Image
              source={CELEBRATOR_PENGUIN}
              style={{ width: 200, height: 200, marginBottom: 20 }}
              contentFit="contain"
            />

            <Text className="text-text-main-light dark:text-text-main-dark font-heading font-bold text-3xl text-center mb-2">
              {t("study.finished_title")}
            </Text>
            <Text className="text-text-muted-light dark:text-text-muted-dark text-center font-body mb-8 text-lg">
              {t("study.finished_desc", {
                count: cards.length,
                title: deck?.title,
              })}
            </Text>

            {/* STATS GRID */}
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

            {/* ACTIONS */}
            {/* <Pressable
              onPress={() => router.replace("/(tabs)/library")}
              className="bg-action hover:bg-orange-600 w-full py-4 rounded-2xl items-center shadow-lg shadow-orange-500/20 active:scale-95 transition-all mb-4"
            > */}
            <PressableScale
              onPress={() => router.replace("/(tabs)/library")}
              style={{
                backgroundColor: "#F97316",
                width: "100%",
                paddingVertical: 16,
                borderRadius: 16,
                alignItems: "center",
                marginBottom: 16,
                // Shadow matching shadow-orange-500/20
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

            {/* <Pressable
              onPress={() => {
                setSessionStats({ hard: 0, medium: 0, easy: 0 }); // Reset stats
                setIsFinished(false);
              }}
              className="py-3 px-6 rounded-xl active:bg-black/5 dark:active:bg-white/5"
            > */}
            <PressableScale
              onPress={() => {
                setSessionStats({ hard: 0, medium: 0, easy: 0 });
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
                Review Again
              </Text>
            </PressableScale>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-page-light dark:bg-page-dark">
      {/* HEADER */}
      <View
        className="flex-row items-center justify-between px-6 mb-4"
        style={{ paddingTop: Platform.OS === "web" ? 30 : 10 }}
      >
        {/* <Pressable
          onPress={() => router.back()}
          className="w-10 h-10 bg-black/5 dark:bg-white/10 rounded-full items-center justify-center active:bg-black/10"
        > */}
        <PressableScale
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
          <Ionicons name="close" size={24} color={deck ? "#64748B" : "#FFF"} />
        </PressableScale>

        <View className="items-center">
          <Text className="text-text-muted-light dark:text-text-muted-dark text-[10px] font-bold uppercase tracking-widest">
            {t("study.header_small")}
          </Text>
          <Text
            className="text-text-main-light dark:text-text-main-dark font-heading font-bold text-base"
            numberOfLines={1}
          >
            {deck?.title}
          </Text>
        </View>

        <View className="w-10" />
      </View>

      {/* SWIPER AREA */}
      <View className="flex-1 px-4 pb-10 w-full max-w-[800px] self-center">
        {cards.length > 0 ? (
          <FlashcardSwiper
            cards={cards}
            onFinish={handleSessionFinish}
            onRate={handleRateCard}
            // onShowContext={(ctx) => {
            //   setActiveContext(ctx);
            //   setContextModalVisible(true);
            // }}
            onShowContext={(ctx) => onOpen(ctx)}
          />
        ) : (
          <View className="flex-1 items-center justify-center">
            <Text className="text-text-muted-light">
              No cards found in this deck.
            </Text>
          </View>
        )}
      </View>

      <Modalize
        ref={modalizeRef}
        adjustToContentHeight // This makes it a "True" Bottom Sheet
        handlePosition="inside"
        modalStyle={{
          backgroundColor: isDark ? "#1E293B" : "#F8FAFC",
          borderTopLeftRadius: 32,
          borderTopRightRadius: 32,
        }}
        handleStyle={{ backgroundColor: isDark ? "#475569" : "#CBD5E1" }}
        panGestureEnabled={true}
        closeOnOverlayTap={true}
      >
        <View className="p-8 pb-20 min-h-[250px]">
          <View className="flex-row items-center gap-2 mb-4">
            <Ionicons name="bulb" size={24} color="#F97316" />
            <Text className="text-text-main-light dark:text-text-main-dark font-heading font-bold text-xl">
              {t("study.hint_title")}
            </Text>
          </View>

          <Text className="text-text-main-light dark:text-text-main-dark font-body text-lg leading-relaxed">
            {activeContext}
          </Text>
        </View>
      </Modalize>

      {/* --- CONTEXT MODAL (The Bulb Popup) --- */}
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
          <View className="bg-page-light dark:bg-card-dark w-[90%] max-w-[400px] rounded-[40px] p-8 shadow-2xl items-center border border-black/5 dark:border-white/10">
            <View className="flex-row justify-between items-center mb-6 w-full">
              <View className="flex-row items-center gap-2">
                <Ionicons name="bulb" size={24} color="#F97316" />
                <Text className="text-text-main-light dark:text-text-main-dark font-heading font-bold text-xl">
                  {t("study.hint_title")}
                </Text>
              </View>
              {/* <Pressable
                onPress={() => setContextModalVisible(false)}
                className="bg-black/5 dark:bg-white/10 p-2 rounded-full transition-all hover:bg-black/10 dark:hover:bg-white/20 active:scale-90 duration-250"
              > */}
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
                  color={isDark ? "#94A3B8" : "#64748B"} // Using muted colors from config
                />
              </PressableScale>
            </View>

            <Text className="text-text-main-light dark:text-text-main-dark font-body text-lg leading-relaxed">
              {activeContext}
            </Text>

            {/* <Pressable
              onPress={() => setContextModalVisible(false)}
              className="mt-10 bg-action hover:bg-orange-600 dark:hover:bg-orange-400 w-full py-4 rounded-2xl items-center transition-all duration-200"
            > */}
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
