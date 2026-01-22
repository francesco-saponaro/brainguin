import { Ionicons } from "@expo/vector-icons";
import { PressableScale } from "pressto";
import React, { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import {
  Gesture,
  GestureDetector,
  GestureHandlerRootView,
} from "react-native-gesture-handler";
import Animated, {
  Extrapolation,
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";

interface CardProps {
  id: string;
  front: string;
  back: string;
  context?: string;
}

interface SwiperProps {
  cards: CardProps[];
  onFinish: () => void;
  onRate: (cardId: string, rating: "hard" | "medium" | "easy") => void;
  onShowContext: (context: string) => void;
}

// --- MAIN CARD WRAPPER ---
const SwipeableCard = ({
  card,
  index,
  currentIndex,
  total,
  onRate,
  onShowContext,
}: any) => {
  const { width } = useWindowDimensions();
  const [isFlipped, setIsFlipped] = useState(false);

  const isActive = index === currentIndex;
  const isNext = index === currentIndex + 1;

  const translateX = useSharedValue(0);
  const rotateY = useSharedValue(0);
  const scale = useSharedValue(isNext ? 0.95 : 1);

  useEffect(() => {
    if (isActive) scale.value = withSpring(1);
  }, [isActive]);

  const triggerFlip = () => {
    rotateY.value = withTiming(isFlipped ? 0 : 180, { duration: 300 });
    setIsFlipped(!isFlipped);
  };

  const triggerRate = (rating: "hard" | "medium" | "easy") => {
    const direction = rating === "hard" ? -1 : 1;
    const targetX = direction * width * 1.5;
    translateX.value = withTiming(targetX, { duration: 300 }, () => {
      runOnJS(onRate)(rating);
    });
  };

  // --- SWIPE GESTURE (Binary: Left=Hard, Right=Easy) ---
  const pan = Gesture.Pan()
    .enabled(isActive)
    .onUpdate((event) => {
      translateX.value = event.translationX;
    })
    .onEnd((event) => {
      if (Math.abs(event.translationX) > width * 0.15) {
        // ✅ UX DECISION: Swiping maps to the extremes.
        // Left (< 0) -> Hard
        // Right (> 0) -> Easy
        const rating = event.translationX > 0 ? "easy" : "hard";

        translateX.value = withTiming(
          (event.translationX > 0 ? 1 : -1) * width * 1.5,
          { duration: 250 },
          () => runOnJS(onRate)(rating),
        );
      } else {
        translateX.value = withSpring(0);
      }
    });

  // --- ANIMATED STYLES ---
  const cardStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { scale: scale.value },
      {
        rotateZ: `${interpolate(translateX.value, [-width, width], [-15, 15])}deg`,
      },
      { rotateY: "0deg" },
      { perspective: 1000 },
    ],
    zIndex: isActive ? 100 : 1,
  }));

  // Overlay only shows Red (Hard) or Green (Easy)
  const overlayStyle = useAnimatedStyle(() => ({
    opacity: interpolate(
      Math.abs(translateX.value),
      [0, width * 0.25],
      [0, 0.5],
      Extrapolation.CLAMP,
    ),
    backgroundColor: translateX.value > 0 ? "#22C55E" : "#EF4444",
    zIndex: 999,
  }));

  const frontStyle = useAnimatedStyle(() => ({
    transform: [{ rotateY: `${rotateY.value}deg` }],
    opacity: rotateY.value < 90 ? 1 : 0,
    zIndex: rotateY.value < 90 ? 1 : 0,
  }));

  const backStyle = useAnimatedStyle(() => ({
    transform: [{ rotateY: `${rotateY.value - 180}deg` }],
    opacity: rotateY.value >= 90 ? 1 : 0,
    zIndex: rotateY.value >= 90 ? 1 : 0,
  }));

  return (
    <GestureDetector gesture={pan}>
      <Animated.View style={[styles.card, cardStyle]}>
        {isActive && (
          <Animated.View
            style={[StyleSheet.absoluteFill, styles.overlay, overlayStyle]}
          />
        )}

        <Animated.View
          style={[StyleSheet.absoluteFill, styles.cardFace, frontStyle]}
        >
          <CardContent
            card={card}
            index={index}
            total={total}
            isBack={false}
            onShowContext={onShowContext}
            onFlip={triggerFlip}
            isActive={isActive}
          />
        </Animated.View>

        <Animated.View
          style={[StyleSheet.absoluteFill, styles.cardFace, backStyle]}
        >
          <CardContent
            card={card}
            index={index}
            total={total}
            isBack={true}
            onShowContext={onShowContext}
            onRate={triggerRate}
            onFlip={triggerFlip}
            isActive={isActive}
            showButtons={isActive}
          />
        </Animated.View>
      </Animated.View>
    </GestureDetector>
  );
};

// --- INNER UI ---
const CardContent = React.memo(
  ({
    card,
    index,
    total,
    isBack,
    onShowContext,
    onRate,
    onFlip,
    isActive,
    showButtons,
  }: any) => {
    const { t } = useTranslation();

    const tap = Gesture.Tap()
      .enabled(isActive)
      .maxDistance(10)
      .onEnd(() => {
        runOnJS(onFlip)();
      });

    return (
      <View style={styles.cardContentContainer}>
        {/* HEADER */}
        <View style={styles.header}>
          <Text style={styles.counter}>
            {t("study.card_counter", { index: index + 1, total })}
          </Text>
          {card.context && (
            <Pressable
              onPress={() => onShowContext(card.context)}
              style={({ pressed }) => [
                { padding: 10, opacity: pressed ? 0.5 : 1 },
              ]}
            >
              <Ionicons name="bulb-outline" size={24} color="#F97316" />
            </Pressable>
          )}
        </View>

        {/* CONTENT */}
        <GestureDetector gesture={tap}>
          <View style={styles.content}>
            <Text style={isBack ? styles.answerText : styles.questionText}>
              {isBack ? card.back : card.front}
            </Text>
            {!isBack && (
              <Text style={styles.hintText}>{t("study.tap_to_flip")}</Text>
            )}
          </View>
        </GestureDetector>

        {/* FOOTER */}
        <View style={styles.footer}>
          {isBack && showButtons ? (
            <>
              {/* EXPLANATORY TITLE */}
              <Text style={styles.footerLabel}>
                {t("study.schedule_label")}
              </Text>

              <View className="flex-row justify-between gap-2 w-full">
                <PressableScale
                  onPress={() => onRate("hard")}
                  // Pressto handles hover scaling if activateOnHover is passed
                  activateOnHover
                  style={{
                    flex: 1,
                    paddingVertical: 12,
                    borderRadius: 12,
                    alignItems: "center",
                    borderWidth: 1,
                    borderBottomWidth: 4,
                    backgroundColor: "#FEE2E2",
                    borderColor: "#EF4444",
                  }}
                >
                  <Text style={[styles.rateText, { color: "#EF4444" }]}>
                    {t("study.hard")}
                  </Text>
                  <Text style={[styles.rateSubText, { color: "#EF4444" }]}>
                    {t("study.time_short")}
                  </Text>
                </PressableScale>
                {/* HARD (Red) */}
                {/* <Pressable
                    onPress={() => onRate("hard")}
                    className="flex-1 py-3 rounded-xl items-center justify-center border border-b-4 active:scale-95 bg-red-100 border-red-500 active:bg-red-300"
                  >
                    <Text className="font-bold uppercase text-[11px] tracking-widest text-red-500">
                      {t("study.hard")}
                    </Text>
                    <Text className="font-bold text-[10px] mt-0.5 opacity-80 text-red-500">
                      {t("study.time_short")}
                    </Text>
                  </Pressable> */}

                {/* MEDIUM (Yellow) */}
                {/* <Pressable
                    onPress={() => onRate("medium")}
                    className="flex-1 py-3 rounded-xl items-center justify-center border border-b-4 active:scale-95 bg-yellow-100 border-yellow-500 active:bg-yellow-300"
                  > */}
                <PressableScale
                  onPress={() => onRate("medium")}
                  activateOnHover
                  style={{
                    flex: 1,
                    paddingVertical: 12,
                    borderRadius: 12,
                    alignItems: "center",
                    justifyContent: "center",
                    borderWidth: 1,
                    borderBottomWidth: 4,
                    backgroundColor: "#FEF9C3", // bg-yellow-100
                    borderColor: "#EAB308", // border-yellow-500
                  }}
                >
                  <Text className="font-bold uppercase text-[11px] tracking-widest text-yellow-500">
                    {t("study.medium")}
                  </Text>
                  <Text className="font-bold text-[10px] mt-0.5 opacity-80 text-yellow-500">
                    {t("study.time_med")}
                  </Text>
                </PressableScale>

                {/* EASY (Green) */}
                {/* <Pressable
                    onPress={() => onRate("easy")}
                    className="flex-1 py-3 rounded-xl items-center justify-center border border-b-4 active:scale-95 bg-green-100 border-green-500 active:bg-green-300"
                  > */}
                <PressableScale
                  onPress={() => onRate("easy")}
                  style={{
                    flex: 1,
                    paddingVertical: 12,
                    borderRadius: 12,
                    alignItems: "center",
                    justifyContent: "center",
                    borderWidth: 1,
                    borderBottomWidth: 4,
                    backgroundColor: "#DCFCE7", // bg-green-100
                    borderColor: "#22C55E", // border-green-500
                  }}
                  activateOnHover
                >
                  <Text className="font-bold uppercase text-[11px] tracking-widest text-green-500">
                    {t("study.easy")}
                  </Text>
                  <Text className="font-bold text-[10px] mt-0.5 opacity-80 text-green-500">
                    {t("study.time_long")}
                  </Text>
                </PressableScale>
              </View>

              {/* ✅ NEW: SWIPE INSTRUCTION TEXT */}
              <Text style={styles.swipeHint}>{t("study.swipe_hint_text")}</Text>
            </>
          ) : (
            <View style={{ height: 50 }} />
          )}
        </View>
      </View>
    );
  },
);

export default function FlashcardSwiper({
  cards,
  onFinish,
  onRate,
  onShowContext,
}: SwiperProps) {
  const [currentIndex, setCurrentIndex] = useState(0);

  const handleRate = useCallback(
    (cardId: string, rating: any) => {
      onRate(cardId, rating);
      if (currentIndex >= cards.length - 1) onFinish();
      else setCurrentIndex((prev) => prev + 1);
    },
    [currentIndex, cards.length, onFinish, onRate],
  );

  const visibleCards = cards.filter(
    (_, i) => i >= currentIndex && i <= currentIndex + 1,
  );

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <View style={styles.container}>
        {visibleCards.reverse().map((card) => {
          const originalIndex = cards.findIndex((c) => c.id === card.id);
          return (
            <SwipeableCard
              key={card.id || originalIndex}
              card={card}
              index={originalIndex}
              currentIndex={currentIndex}
              total={cards.length}
              onRate={(r: any) => handleRate(card.id, r)}
              onShowContext={onShowContext}
            />
          );
        })}
      </View>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: "center", justifyContent: "center" },
  card: {
    width: "100%",
    height: 500,
    backgroundColor: "white",
    borderRadius: 32,
    position: "absolute",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
    backfaceVisibility: "hidden",
  },
  overlay: { borderRadius: 32, pointerEvents: "none" },
  cardFace: {
    borderRadius: 32,
    padding: 25,
    backgroundColor: "white",
    backfaceVisibility: "hidden",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.05)",
  },
  cardContentContainer: { flex: 1, justifyContent: "space-between" },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    height: 50,
  },
  content: { flex: 1, justifyContent: "center", alignItems: "center" },
  counter: { color: "#94A3B8", fontWeight: "bold", fontSize: 12 },
  questionText: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#1E293B",
    textAlign: "center",
    lineHeight: 34,
  },
  answerText: {
    fontSize: 24,
    color: "#334155",
    textAlign: "center",
    lineHeight: 32,
  },
  hintText: {
    marginTop: 20,
    color: "#CBD5E1",
    fontWeight: "bold",
    textTransform: "uppercase",
    fontSize: 12,
  },
  footer: { justifyContent: "flex-end", paddingBottom: 0 },
  ratingRow: { flexDirection: "row", justifyContent: "space-between", gap: 8 },
  rateBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
    borderWidth: 1,
    borderBottomWidth: 4,
  },
  rateText: {
    fontWeight: "bold",
    textTransform: "uppercase",
    fontSize: 11,
    letterSpacing: 1,
  },
  rateSubText: { fontWeight: "bold", fontSize: 10, marginTop: 2, opacity: 0.8 },

  footerLabel: {
    textAlign: "center",
    color: "#94A3B8",
    fontSize: 10,
    fontWeight: "bold",
    marginBottom: 10,
    textTransform: "uppercase",
    letterSpacing: 1.5,
  },
  // ✅ NEW: Swipe instruction text
  swipeHint: {
    textAlign: "center",
    color: "#CBD5E1",
    fontSize: 10,
    fontWeight: "600",
    marginTop: 12,
  },
});

// {Platform.OS === "web" ? (
//   <View style={styles.ratingRow}>
//     <Pressable
//       onPress={() => onRate("hard")}
//       style={({ pressed, hovered }: any) => [
//         styles.rateBtn,
//         {
//           backgroundColor:
//             pressed || hovered ? "#FCA5A5" : "#FEE2E2", // Darker Red on Hover
//           borderColor: "#EF4444",
//           transform: [{ scale: pressed ? 0.95 : 1 }],
//         },
//       ]}
//     >
//       <Text style={[styles.rateText, { color: "#EF4444" }]}>
//         {t("study.hard")}
//       </Text>
//       <Text style={[styles.rateSubText, { color: "#EF4444" }]}>
//         {t("study.time_short")} {/* Replaces "10m" */}
//       </Text>
//     </Pressable>

//     <Pressable
//       onPress={() => onRate("medium")}
//       style={({ pressed, hovered }: any) => [
//         styles.rateBtn,
//         {
//           backgroundColor:
//             pressed || hovered ? "#FDE047" : "#FEF9C3", // Darker Yellow on Hover
//           borderColor: "#EAB308",
//           transform: [{ scale: pressed ? 0.95 : 1 }],
//         },
//       ]}
//     >
//       <Text style={[styles.rateText, { color: "#EAB308" }]}>
//         {t("study.medium")}
//       </Text>
//       <Text style={[styles.rateSubText, { color: "#EAB308" }]}>
//         {t("study.time_med")} {/* Replaces "24h" */}
//       </Text>
//     </Pressable>

//     <Pressable
//       onPress={() => onRate("easy")}
//       style={({ pressed, hovered }: any) => [
//         styles.rateBtn,
//         {
//           backgroundColor:
//             pressed || hovered ? "#86EFAC" : "#DCFCE7", // Darker Green on Hover
//           borderColor: "#22C55E",
//           transform: [{ scale: pressed ? 0.95 : 1 }],
//         },
//       ]}
//     >
//       <Text style={[styles.rateText, { color: "#22C55E" }]}>
//         {t("study.easy")}
//       </Text>
//       <Text style={[styles.rateSubText, { color: "#22C55E" }]}>
//         {t("study.time_long")} {/* Replaces "3d" */}
//       </Text>
//     </Pressable>
//   </View>
// ) : (
