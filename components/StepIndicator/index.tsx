import React from "react";
import { View } from "react-native";
import Animated, {
  useAnimatedStyle,
  withSpring,
} from "react-native-reanimated";

interface Props {
  totalSteps: number;
  currentStep: number;
}

const StepIndicator = ({ totalSteps, currentStep }: Props) => {
  return (
    <View className="flex-row justify-center items-center gap-2 mb-4">
      {Array.from({ length: totalSteps }).map((_, index) => {
        const isActive = index === currentStep;

        const animatedStyle = useAnimatedStyle(() => ({
          width: withSpring(isActive ? 24 : 8),
          opacity: withSpring(isActive ? 1 : 0.3),
        }));

        return (
          <Animated.View
            key={index}
            style={animatedStyle}
            className={`h-2 rounded-full ${
              isActive
                ? "bg-action"
                : "bg-text-muted-light dark:bg-text-muted-dark"
            }`}
          />
        );
      })}
    </View>
  );
};

export default StepIndicator;
