import FlashcardSwiper from "@/components/Study/FlashcardSwiper";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/store/storeUser";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next"; // 1. Import hook
import {
  ActivityIndicator,
  Platform,
  Pressable,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function StudyScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { session } = useAuthStore();
  const { t } = useTranslation(); // 2. Initialize hook

  const [deck, setDeck] = useState<any>(null);
  const [cards, setCards] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFinished, setIsFinished] = useState(false);

  useEffect(() => {
    const fetchDeckData = async () => {
      // SIMULATE NETWORK LOADING
      setTimeout(() => {
        setDeck({
          id: id,
          title: "The History of Samurai ⚔️",
          source_type: "topic",
        });

        setCards([
          {
            id: 1,
            front: "Who were the Samurai?",
            back: "They were the hereditary military nobility...",
          },
          {
            id: 2,
            front: "What is 'Bushido'?",
            back: "The 'Way of the Warrior'...",
          },
          {
            id: 3,
            front: "What was the Katana?",
            back: "A curved, single-edged blade...",
          },
          { id: 4, front: "When was the Meiji Restoration?", back: "1868..." },
          {
            id: 5,
            front: "What is a Ronin?",
            back: "A samurai without a lord...",
          },
        ]);

        setLoading(false);
      }, 1000);
    };

    fetchDeckData();
  }, [id]);

  const markSessionComplete = async () => {
    try {
      const { error } = await supabase
        .from("decks")
        .update({ last_reviewed_at: new Date().toISOString() })
        .eq("id", id)
        .eq("user_id", session?.user?.id);

      if (error) throw error;
      setIsFinished(true);
    } catch (e: any) {
      console.error("Failed to save session:", e.message);
      setIsFinished(true);
    }
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
      <SafeAreaView className="flex-1 bg-page-light dark:bg-page-dark items-center justify-center px-6">
        <View className="bg-white dark:bg-card-dark p-8 rounded-[40px] items-center w-full max-w-[800px] self-center">
          <Text className="text-6xl mb-4">🎉</Text>
          <Text className="text-text-main-light dark:text-text-main-dark font-heading font-bold text-2xl text-center mb-2">
            {t("study.finished_title")}
          </Text>
          <Text className="text-text-muted-light dark:text-text-muted-dark text-center font-body mb-8">
            {t("study.finished_desc", {
              count: cards.length,
              title: deck?.title,
            })}
          </Text>

          <Pressable
            onPress={() => router.replace("/(tabs)/library")}
            className="bg-action w-full py-4 rounded-2xl items-center active:scale-95 transition-all duration-200 hover:bg-orange-600"
          >
            <Text className="text-white font-bold font-heading text-lg">
              {t("study.finished_btn")}
            </Text>
          </Pressable>
        </View>
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
        <Pressable
          onPress={() => router.back()}
          className="w-10 h-10 bg-black/5 dark:bg-white/10 rounded-full items-center justify-center active:bg-black/10"
        >
          <Ionicons name="close" size={24} color={deck ? "#64748B" : "#FFF"} />
        </Pressable>

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
            onFinish={markSessionComplete} // Using the logic with translation trigger
          />
        ) : (
          <View className="flex-1 items-center justify-center">
            <Text className="text-text-muted-light">{t("study.no_cards")}</Text>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}
