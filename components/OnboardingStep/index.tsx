import { Image } from "expo-image";
import React from "react";
import { Text, useWindowDimensions, View } from "react-native";
import Animated, { FadeInDown, FadeInUp } from "react-native-reanimated";

interface Props {
  title: string;
  description: string;
  image: any;
  penguinLogo: any;
  colorScheme: "light" | "dark";
}

const OnboardingStep = ({ title, description, image }: Props) => {
  const { width, height } = useWindowDimensions();
  const isLargeScreen = width > 768 && height > 600;
  const isShorterDesktop = height < 550;

  return (
    <View className="flex-1 items-center justify-center px-6 pt-10 max-w-[800px] self-center w-full">
      <Animated.View
        entering={FadeInUp.delay(200).duration(600)}
        className="mb-10"
      >
        <Image
          source={image}
          style={{
            width: isLargeScreen ? 360 : isShorterDesktop ? 220 : 280,
            height: isLargeScreen ? 360 : isShorterDesktop ? 220 : 280,
          }}
          contentFit="contain"
        />
      </Animated.View>

      <Animated.View
        entering={FadeInDown.delay(400).duration(600)}
        className="items-center gap-4"
      >
        <Text className="font-heading text-3xl font-bold text-text-main-light dark:text-text-main-dark text-center">
          {title}
        </Text>
        <Text className="font-body text-lg leading-7 text-text-muted-light dark:text-text-muted-dark text-center px-4">
          {description}
        </Text>
      </Animated.View>
    </View>
  );
};

export default OnboardingStep;
