import { BlurView } from "expo-blur";
import { Image } from "expo-image";
import React, { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Platform, Text, View } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";

const PROCESSOR_PENGUIN = require("@/assets/images/processor.png");

export default function ThinkingState() {
  const [messageIndex, setMessageIndex] = React.useState(0);
  const { t } = useTranslation();

  const LOADING_MESSAGES = [
    t("creation.reading"),
    t("creation.extracting"),
    t("creation.drafting"),
    t("creation.checking"),
    t("creation.almost_ready"),
  ];

  // Animation Values
  const scale = useSharedValue(1);
  const rotate = useSharedValue(0);

  useEffect(() => {
    // 1. Breathing Animation (Scale)
    scale.value = withRepeat(
      withSequence(
        withTiming(1.1, { duration: 1000, easing: Easing.inOut(Easing.ease) }),
        withTiming(1, { duration: 1000, easing: Easing.inOut(Easing.ease) })
      ),
      -1, // Infinite loop
      true // Reverse
    );

    // 2. Subtle Jiggle (Rotation)
    rotate.value = withRepeat(
      withSequence(
        withTiming(2, { duration: 150 }),
        withTiming(-2, { duration: 150 }),
        withTiming(0, { duration: 150 }),
        withTiming(0, { duration: 2000 }) // Pause between jiggles
      ),
      -1,
      false
    );

    // 3. Cycle Messages
    const interval = setInterval(() => {
      setMessageIndex((prev) => (prev + 1) % LOADING_MESSAGES.length);
    }, 2500);

    return () => clearInterval(interval);
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }, { rotate: `${rotate.value}deg` }],
  }));

  return (
    <View
      className="absolute inset-0 items-center justify-center"
      style={{
        zIndex: 9999, // 🚀 High enough to beat the Sidebar's 100
        elevation: 10, // For Android
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
      }}
    >
      {/* Glass Background Backdrop */}
      <BlurView
        intensity={90}
        tint="dark"
        style={{ position: "absolute", width: "100%", height: "100%" }}
      />

      <View className="items-center">
        {/* Glow Effect */}
        {Platform.OS === "web" ? (
          <View className="absolute w-64 h-64 bg-accent/20 rounded-full blur-3xl animate-pulse" />
        ) : null}

        <Animated.View style={animatedStyle}>
          <Image
            source={PROCESSOR_PENGUIN}
            style={{ width: 180, height: 180 }}
            contentFit="contain"
          />
        </Animated.View>

        <Text className="text-white font-heading text-2xl font-bold mt-8 mb-2">
          {t("creation.thinking")}
        </Text>

        <Text className="text-accent font-body text-base font-medium tracking-wide">
          {LOADING_MESSAGES[messageIndex]}
        </Text>
      </View>
    </View>
  );
}
