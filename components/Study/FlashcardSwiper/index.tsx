import { Ionicons } from "@expo/vector-icons";
import React, { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { StyleSheet, Text, useWindowDimensions, View } from "react-native";
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
}

interface SwiperProps {
  cards: CardProps[];
  onFinish: () => void;
}

// --- CARD COMPONENT (Mobile Version) ---
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
  const { width } = useWindowDimensions();
  const [isFlipped, setIsFlipped] = useState(false);

  const isActive = index === currentIndex;
  const isNext = index === currentIndex + 1;

  // Animation Values
  const translateX = useSharedValue(0);
  const rotateY = useSharedValue(0);
  const scale = useSharedValue(isNext ? 0.95 : 1);

  useEffect(() => {
    if (isActive) {
      scale.value = withSpring(1);
    }
  }, [isActive]);

  // --- GESTURES ---
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
          () => runOnJS(onSwipeComplete)()
        );
      } else {
        translateX.value = withSpring(0, { damping: 50, stiffness: 300 });
      }
    });

  const tap = Gesture.Tap()
    .enabled(isActive)
    // Small maxDistance allows scrolling/swiping without accidentally flipping
    .maxDistance(10)
    .onEnd(() => {
      rotateY.value = withTiming(isFlipped ? 0 : 180, { duration: 300 });
      runOnJS(setIsFlipped)(!isFlipped);
    });

  const gesture = Gesture.Race(pan, tap);

  // --- ANIMATIONS ---
  const cardStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { scale: scale.value },
      {
        rotateZ: `${interpolate(
          translateX.value,
          [-width, width],
          [-15, 15]
        )}deg`,
      },
      { rotateY: "0deg" },
      { perspective: 1000 },
    ],
    zIndex: isActive ? 100 : 1,
  }));

  // Color Overlay (Red/Green)
  const overlayStyle = useAnimatedStyle(() => ({
    opacity: interpolate(
      Math.abs(translateX.value),
      [0, width * 0.25],
      [0, 0.5],
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
        {/* Overlay for Color Feedback */}
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
          />
        </Animated.View>
      </Animated.View>
    </GestureDetector>
  );
};

// --- INNER CONTENT (Cleaned up for Mobile) ---
const CardContent = React.memo(
  ({
    text,
    index,
    total,
    isBack,
  }: {
    text: string;
    index: number;
    total: number;
    isBack: boolean;
  }) => {
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

        {/* Footer with just text, no buttons */}
        <View style={styles.footer}>
          {isBack ? (
            <Text style={styles.footerText}>
              {t("study.swipe_instruction")}
            </Text>
          ) : (
            // Spacer to keep layout consistent
            <View style={{ height: 20 }} />
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

  // Windowing: Render Active + Next
  const visibleCards = cards.filter(
    (_, i) => i >= currentIndex && i <= currentIndex + 1
  );

  return (
    <GestureHandlerRootView style={{ flex: 1, width: "100%" }}>
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
    backfaceVisibility: "hidden", // Standard mobile property
  },
  overlay: {
    borderRadius: 32,
    zIndex: 999,
    pointerEvents: "none",
  },
  cardFace: {
    borderRadius: 32,
    padding: 30,
    backgroundColor: "white",
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
    alignItems: "center", // Centered for mobile text
    justifyContent: "flex-end",
    paddingBottom: 0,
    height: 20,
  },
  footerText: {
    color: "#94A3B8",
    fontSize: 12,
    fontWeight: "600",
  },
});

// import { Ionicons } from "@expo/vector-icons";
// import React, { useCallback, useEffect, useState } from "react";
// import { useTranslation } from "react-i18next";
// import {
//   Pressable,
//   StyleSheet,
//   Text,
//   useWindowDimensions,
//   View,
// } from "react-native";
// import {
//   Gesture,
//   GestureDetector,
//   GestureHandlerRootView,
// } from "react-native-gesture-handler";
// import Animated, {
//   Extrapolation,
//   interpolate,
//   interpolateColor,
//   runOnJS,
//   SharedValue,
//   useAnimatedStyle,
//   useSharedValue,
//   withSpring,
//   withTiming,
// } from "react-native-reanimated";

// interface CardProps {
//   front: string;
//   back: string;
// }

// interface SwiperProps {
//   cards: CardProps[];
//   onFinish: () => void;
// }

// // --- SHARED UI COMPONENT ---
// const CardUI = ({
//   card,
//   index,
//   total,
//   isBack = false,
// }: {
//   card: CardProps;
//   index: number;
//   total: number;
//   isBack?: boolean;
// }) => {
//   const { t } = useTranslation();

//   return (
//     <View style={styles.cardContentContainer}>
//       <View style={styles.header}>
//         <Text style={styles.counter}>
//           {t("study.card_counter", { index: index + 1, total: total })}
//         </Text>
//         <Ionicons name="sync" size={20} color="#94A3B8" />
//       </View>

//       <View style={styles.content}>
//         <Text
//           // Key to preventing Android text jumps during animation
//           textBreakStrategy="simple"
//           style={isBack ? styles.answerText : styles.questionText}
//         >
//           {isBack ? card.back : card.front}
//         </Text>
//         {!isBack && (
//           <Text style={styles.hintText}>{t("study.tap_to_flip")}</Text>
//         )}
//       </View>

//       <View style={styles.footer}>
//         {isBack ? (
//           <Text style={styles.footerText}>{t("study.swipe_instruction")}</Text>
//         ) : (
//           <View style={{ height: 16 }} />
//         )}
//       </View>
//     </View>
//   );
// };

// export default function FlashcardSwiper({ cards, onFinish }: SwiperProps) {
//   const { width } = useWindowDimensions();
//   const [currentIndex, setCurrentIndex] = useState(0);

//   const translateX = useSharedValue(0);

//   const currentCard = cards[currentIndex];
//   const nextCard = cards[currentIndex + 1];

//   useEffect(() => {
//     translateX.value = 0;
//   }, [currentIndex]);

//   const handleNext = useCallback(() => {
//     if (currentIndex >= cards.length - 1) {
//       onFinish();
//     } else {
//       setCurrentIndex((prev) => prev + 1);
//     }
//   }, [currentIndex, cards.length, onFinish]);

//   // --- ANIMATION 1: Wrapper (Scale & Opacity) ---
//   const wrapperStyle = useAnimatedStyle(() => {
//     const absX = Math.abs(translateX.value);
//     return {
//       transform: [
//         {
//           scale: interpolate(
//             absX,
//             [0, width / 2],
//             [0.9, 1],
//             Extrapolation.CLAMP
//           ),
//         },
//       ],
//       opacity: interpolate(absX, [0, width / 2], [0.6, 1], Extrapolation.CLAMP),
//     };
//   });

//   // --- ANIMATION 2: Inner Face (Color & 3D Fix) ---
//   const backgroundMorphStyle = useAnimatedStyle(() => {
//     const absX = Math.abs(translateX.value);
//     return {
//       backgroundColor: interpolateColor(
//         absX,
//         [0, width / 2],
//         ["#F8FAFC", "#FFFFFF"] // Morph from Gray -> White
//       ),
//       // ✅ 3D FIX: This forces the GPU to render this text in the same context
//       // as the active card (which has rotation). This prevents font thickening glitches.
//       transform: [{ rotateY: "0deg" }],
//     };
//   });

//   if (!currentCard) return null;

//   return (
//     <GestureHandlerRootView style={{ flex: 1, width: "100%" }}>
//       <View style={styles.container}>
//         {/* --- THE NEXT CARD (BACKGROUND) --- */}
//         {nextCard && (
//           <Animated.View
//             key={`next-${currentIndex + 1}`}
//             style={[styles.card, { zIndex: -1 }, wrapperStyle]}
//           >
//             <Animated.View
//               style={[
//                 StyleSheet.absoluteFill,
//                 styles.cardFace, // ✅ Uses exact same padding/border as Active Card
//                 backgroundMorphStyle,
//               ]}
//             >
//               {/* ✅ Structure Match:
//                   We use a disabled Pressable to match the nesting of the Active Card.
//                   This ensures Flexbox behaves identically.
//               */}
//               <Pressable disabled style={{ flex: 1 }}>
//                 <CardUI
//                   card={nextCard}
//                   index={currentIndex + 1}
//                   total={cards.length}
//                 />
//               </Pressable>
//             </Animated.View>
//           </Animated.View>
//         )}

//         {/* --- THE ACTIVE CARD (FOREGROUND) --- */}
//         <DraggableCard
//           key={currentIndex}
//           card={currentCard}
//           onSwipeComplete={handleNext}
//           index={currentIndex}
//           total={cards.length}
//           translateX={translateX}
//         />
//       </View>
//     </GestureHandlerRootView>
//   );
// }

// function DraggableCard({
//   card,
//   onSwipeComplete,
//   index,
//   total,
//   translateX,
// }: {
//   card: CardProps;
//   onSwipeComplete: () => void;
//   index: number;
//   total: number;
//   translateX: SharedValue<number>;
// }) {
//   const { width } = useWindowDimensions();
//   const [isFlipped, setIsFlipped] = useState(false);
//   const rotateY = useSharedValue(0);

//   const pan = Gesture.Pan()
//     .onUpdate((event) => {
//       translateX.value = event.translationX;
//     })
//     .onEnd((event) => {
//       if (Math.abs(event.translationX) > width * 0.15) {
//         const direction = event.translationX > 0 ? 1 : -1;
//         translateX.value = withTiming(
//           direction * width * 1.5,
//           { duration: 250 },
//           () => runOnJS(onSwipeComplete)()
//         );
//       } else {
//         translateX.value = withSpring(0, {
//           damping: 50,
//           stiffness: 300,
//           mass: 1,
//           overshootClamping: true,
//         });
//       }
//     });

//   const handleFlip = () => {
//     rotateY.value = withTiming(isFlipped ? 0 : 180, { duration: 300 });
//     setIsFlipped(!isFlipped);
//   };

//   const cardStyle = useAnimatedStyle(() => ({
//     transform: [
//       { translateX: translateX.value },
//       {
//         rotateZ: `${interpolate(
//           translateX.value,
//           [-width, 0, width],
//           [-15, 0, 15]
//         )}deg`,
//       },
//     ],
//   }));

//   const frontStyle = useAnimatedStyle(() => ({
//     transform: [{ rotateY: `${rotateY.value}deg` }],
//     opacity: rotateY.value < 90 ? 1 : 0,
//     zIndex: rotateY.value < 90 ? 1 : 0,
//   }));

//   const backStyle = useAnimatedStyle(() => ({
//     transform: [{ rotateY: `${rotateY.value - 180}deg` }],
//     opacity: rotateY.value >= 90 ? 1 : 0,
//     zIndex: rotateY.value >= 90 ? 1 : 0,
//   }));

//   const overlayStyle = useAnimatedStyle(() => ({
//     opacity: interpolate(
//       Math.abs(translateX.value),
//       [0, width * 0.4],
//       [0, 0.4],
//       Extrapolation.CLAMP
//     ),
//     backgroundColor: translateX.value > 0 ? "#22C55E" : "#EF4444",
//   }));

//   return (
//     <GestureDetector gesture={pan}>
//       <Animated.View style={[styles.card, cardStyle]}>
//         <Animated.View
//           style={[StyleSheet.absoluteFill, styles.overlay, overlayStyle]}
//         />

//         <Animated.View
//           style={[StyleSheet.absoluteFill, styles.cardFace, frontStyle]}
//         >
//           <Pressable onPress={handleFlip} style={{ flex: 1 }}>
//             <CardUI card={card} index={index} total={total} isBack={false} />
//           </Pressable>
//         </Animated.View>

//         <Animated.View
//           style={[StyleSheet.absoluteFill, styles.cardFace, backStyle]}
//         >
//           <Pressable onPress={handleFlip} style={{ flex: 1 }}>
//             <CardUI card={card} index={index} total={total} isBack={true} />
//           </Pressable>
//         </Animated.View>
//       </Animated.View>
//     </GestureDetector>
//   );
// }

// const styles = StyleSheet.create({
//   container: {
//     flex: 1,
//     alignItems: "center",
//     justifyContent: "center",
//   },
//   card: {
//     width: "100%",
//     height: 500,
//     backgroundColor: "white",
//     borderRadius: 32,
//     position: "absolute",
//     shadowColor: "#000",
//     shadowOffset: { width: 0, height: 4 },
//     shadowOpacity: 0.1,
//     shadowRadius: 12,
//     elevation: 5,
//   },
//   // Ensure both Active and Next use this exact style
//   cardFace: {
//     borderRadius: 32,
//     padding: 30, // The 1px difference here was causing your jump (31 vs 30)
//     backgroundColor: "white",
//     backfaceVisibility: "hidden",
//     borderWidth: 1,
//     borderColor: "rgba(0,0,0,0.05)",
//   },
//   cardContentContainer: {
//     flex: 1,
//     justifyContent: "space-between",
//   },
//   overlay: {
//     borderRadius: 32,
//     zIndex: 999,
//     pointerEvents: "none",
//   },
//   header: {
//     flexDirection: "row",
//     justifyContent: "space-between",
//     alignItems: "center",
//   },
//   counter: {
//     color: "#94A3B8",
//     fontWeight: "bold",
//     textTransform: "uppercase",
//     letterSpacing: 1,
//     fontSize: 12,
//   },
//   content: {
//     flex: 1,
//     justifyContent: "center",
//     alignItems: "center",
//   },
//   questionText: {
//     fontSize: 28,
//     fontWeight: "bold",
//     color: "#1E293B",
//     textAlign: "center",
//     lineHeight: 34,
//   },
//   answerText: {
//     fontSize: 24,
//     color: "#334155",
//     textAlign: "center",
//     lineHeight: 32,
//   },
//   hintText: {
//     marginTop: 20,
//     color: "#CBD5E1",
//     fontWeight: "bold",
//     textTransform: "uppercase",
//     fontSize: 12,
//   },
//   footer: {
//     alignItems: "center",
//     height: 20,
//   },
//   footerText: {
//     color: "#94A3B8",
//     fontSize: 12,
//     fontWeight: "600",
//   },
// });
