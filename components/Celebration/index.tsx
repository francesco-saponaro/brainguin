import React from "react";
import { StyleSheet, View } from "react-native";
import ConfettiCannon from "react-native-confetti-cannon";

interface Props {
  isActive: boolean;
}

const Celebration = ({ isActive }: Props) => {
  if (!isActive) return null;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <ConfettiCannon
        count={200}
        origin={{ x: -10, y: 0 }} // Explosion starts from top left
        fadeOut={true}
        fallSpeed={3000}
        colors={["#F97316", "#38BDF8", "#0F172A", "#22C55E"]} // Your Brand Colors: Orange, Blue, Slate, Green
      />
    </View>
  );
};

export default Celebration;
