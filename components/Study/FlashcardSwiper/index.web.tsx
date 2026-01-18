import { Ionicons } from "@expo/vector-icons";
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
  id: string; // We need a unique ID for the key
  front: string;
  back: string;
}

interface SwiperProps {
  cards: CardProps[];
  onFinish: () => void;
}

// --- CARD COMPONENT ---
// This component manages its own state and animation based on props.
const SwipeableCard = ({
  card,
  index,
  currentIndex,
  total,
  onSwipeComplete,
}: {
  card: CardProps;
  index: number;
  currentIndex: number;
  total: number;
  onSwipeComplete: () => void;
}) => {
  const { t } = useTranslation();
  const { width } = useWindowDimensions();
  const [isFlipped, setIsFlipped] = useState(false);

  // Is this the top card?
  const isActive = index === currentIndex;
  // Is this the card immediately behind?
  const isNext = index === currentIndex + 1;

  // Animation Values
  const translateX = useSharedValue(0);
  const rotateY = useSharedValue(0);
  const scale = useSharedValue(isNext ? 0.95 : 1); // Start smaller if next

  // Reset/Setup when status changes
  useEffect(() => {
    if (isActive) {
      // If we became active, animate to full scale
      scale.value = withSpring(1);
    }
  }, [isActive]);

  const handleFlip = () => {
    rotateY.value = withTiming(isFlipped ? 0 : 180, { duration: 300 });
    setIsFlipped(!isFlipped);
  };

  const triggerSwipe = (direction: "left" | "right") => {
    const targetX = direction === "right" ? width * 1.5 : -width * 1.5;
    translateX.value = withTiming(targetX, { duration: 300 }, () => {
      runOnJS(onSwipeComplete)();
    });
  };

  // --- GESTURES (Only enable for active card) ---
  const pan = Gesture.Pan()
    .enabled(isActive)
    .onUpdate((event) => {
      translateX.value = event.translationX;
    })
    .onEnd((event) => {
      if (Math.abs(event.translationX) > width * 0.15) {
        const direction = event.translationX > 0 ? 1 : -1;
        translateX.value = withTiming(
          direction * width * 1.5,
          { duration: 250 },
          () => {
            runOnJS(onSwipeComplete)();
          }
        );
      } else {
        translateX.value = withSpring(0, { damping: 50, stiffness: 300 });
      }
    });

  const tap = Gesture.Tap()
    .enabled(isActive)
    .maxDistance(10)
    .onEnd(() => {
      rotateY.value = withTiming(isFlipped ? 0 : 180, { duration: 300 });
      runOnJS(setIsFlipped)(!isFlipped);
    });

  const gesture = Gesture.Race(pan, tap);

  // --- ANIMATED STYLES ---
  const cardStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { scale: scale.value }, // Scale handles the "pop up" effect
      {
        rotateZ: `${interpolate(
          translateX.value,
          [-width, width],
          [-15, 15]
        )}deg`,
      },
      { rotateY: "0deg" }, // Web 3D Fix
      { perspective: 1000 },
    ],
    zIndex: isActive ? 100 : 1, // Physical Z-Index
  }));

  // ✅ OVERLAY STYLE (RESTORED)
  const overlayStyle = useAnimatedStyle(() => ({
    opacity: interpolate(
      Math.abs(translateX.value),
      [0, width * 0.25], // Start fading in, max out at 1/4 width
      [0, 0.5], // Max opacity of 0.5 so we can still see text
      Extrapolation.CLAMP
    ),
    backgroundColor: translateX.value > 0 ? "#22C55E" : "#EF4444",
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
    <GestureDetector gesture={gesture}>
      <Animated.View style={[styles.card, cardStyle]}>
        {/* ✅ OVERLAY VIEW (RESTORED) */}
        {/* Only show overlay on active card to prevent background flicker */}
        {isActive && (
          <Animated.View
            style={[StyleSheet.absoluteFill, styles.overlay, overlayStyle]}
          />
        )}

        {/* FRONT */}
        <Animated.View
          style={[StyleSheet.absoluteFill, styles.cardFace, frontStyle]}
        >
          <CardContent
            text={card.front}
            index={index}
            total={total}
            isBack={false}
            showButtons={isActive}
            onNope={() => triggerSwipe("left")}
            onLike={() => triggerSwipe("right")}
          />
        </Animated.View>

        {/* BACK */}
        <Animated.View
          style={[StyleSheet.absoluteFill, styles.cardFace, backStyle]}
        >
          <CardContent
            text={card.back}
            index={index}
            total={total}
            isBack={true}
            showButtons={isActive}
            onNope={() => triggerSwipe("left")}
            onLike={() => triggerSwipe("right")}
          />
        </Animated.View>
      </Animated.View>
    </GestureDetector>
  );
};

// --- INNER CONTENT ---
const CardContent = React.memo(
  ({ text, index, total, isBack, showButtons, onNope, onLike }: any) => {
    const { t } = useTranslation();
    return (
      <View style={styles.cardContentContainer}>
        <View style={styles.header}>
          <Text style={styles.counter}>
            {t("study.card_counter", { index: index + 1, total })}
          </Text>
          <Ionicons name="sync" size={20} color="#94A3B8" />
        </View>

        <View style={styles.content}>
          <Text style={isBack ? styles.answerText : styles.questionText}>
            {text}
          </Text>
          {!isBack && (
            <Text style={styles.hintText}>{t("study.tap_to_flip")}</Text>
          )}
        </View>

        <View style={styles.footer}>
          {showButtons ? (
            <View style={styles.buttonRow}>
              <Pressable
                onPress={(e) => {
                  e.stopPropagation();
                  onNope();
                }}
                style={[styles.actionButton, { backgroundColor: "#FEE2E2" }]}
              >
                <Ionicons name="close" size={28} color="#EF4444" />
              </Pressable>
              <Text style={styles.footerText}>
                {t("study.swipe_instruction")}
              </Text>
              <Pressable
                onPress={(e) => {
                  e.stopPropagation();
                  onLike();
                }}
                style={[styles.actionButton, { backgroundColor: "#DCFCE7" }]}
              >
                <Ionicons name="checkmark" size={28} color="#22C55E" />
              </Pressable>
            </View>
          ) : (
            <View style={{ height: 56 }} /> // Placeholder for layout stability
          )}
        </View>
      </View>
    );
  }
);

// --- MAIN CONTROLLER ---
export default function FlashcardSwiper({ cards, onFinish }: SwiperProps) {
  const [currentIndex, setCurrentIndex] = useState(0);

  const handleSwipeComplete = useCallback(() => {
    if (currentIndex >= cards.length - 1) {
      onFinish();
    } else {
      setCurrentIndex((prev) => prev + 1);
    }
  }, [currentIndex, cards.length, onFinish]);

  // WINDOWING: Only render the current card and the one immediately after it.
  const visibleCards = cards.filter(
    (_, i) => i >= currentIndex && i <= currentIndex + 1
  );

  return (
    <GestureHandlerRootView style={{ flex: 1, width: "100%" }}>
      <View style={styles.container}>
        {/* REVERSE MAPPING IS KEY */}
        {visibleCards.reverse().map((card) => {
          const originalIndex = cards.findIndex((c) => c.id === card.id);

          return (
            <SwipeableCard
              // ✅ CRITICAL: Using the unique ID as the key.
              key={card.id || originalIndex}
              card={card}
              index={originalIndex}
              currentIndex={currentIndex}
              total={cards.length}
              onSwipeComplete={handleSwipeComplete}
            />
          );
        })}
      </View>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
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
    // @ts-ignore
    backfaceVisibility: "hidden",
  },
  // ✅ OVERLAY STYLE ADDED BACK
  overlay: {
    borderRadius: 32,
    zIndex: 999,
    // Crucial: allows taps on buttons to pass through the overlay
    pointerEvents: "none",
  },
  cardFace: {
    borderRadius: 32,
    padding: 30,
    backgroundColor: "white",
    // @ts-ignore
    backfaceVisibility: "hidden",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.05)",
  },
  cardContentContainer: {
    flex: 1,
    justifyContent: "space-between",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  counter: {
    color: "#94A3B8",
    fontWeight: "bold",
    textTransform: "uppercase",
    letterSpacing: 1,
    fontSize: 12,
  },
  content: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
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
  footer: {
    justifyContent: "flex-end",
    paddingBottom: 0,
  },
  buttonRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    width: "100%",
  },
  actionButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    cursor: "pointer",
  },
  footerText: {
    color: "#94A3B8",
    fontSize: 12,
    fontWeight: "600",
    marginHorizontal: 10,
  },
});
