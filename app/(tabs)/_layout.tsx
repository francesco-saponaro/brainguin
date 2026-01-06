import { Ionicons } from "@expo/vector-icons";
import { GlassView } from "expo-glass-effect";
import { Tabs } from "expo-router";
import { useColorScheme } from "nativewind";
import React from "react";
import { Platform, StyleSheet } from "react-native";

export default function TabLayout() {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";

  // Desktop vs Mobile logic
  const isDesktop = Platform.OS === "web";

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: "#F97316", // Penguin Orange
        tabBarInactiveTintColor: isDark ? "#94A3B8" : "#64748B",
        tabBarShowLabel: !isDesktop, // Hide labels on desktop for a cleaner look
        tabBarStyle: isDesktop ? styles.desktopSidebar : styles.mobileGlassBar,
        tabBarBackground: () =>
          Platform.OS === "ios" ? (
            <GlassView
              style={StyleSheet.absoluteFill}
              glassEffectStyle="regular"
              tintColor={isDark ? "#1E293B" : "#F8FAFC"}
            />
          ) : null,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarIcon: ({ color }) => (
            <Ionicons name="home-sharp" size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="library"
        options={{
          title: "Library",
          tabBarIcon: ({ color }) => (
            <Ionicons name="library-sharp" size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: "Settings",
          tabBarIcon: ({ color }) => (
            <Ionicons name="settings-sharp" size={24} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  mobileGlassBar: {
    position: "absolute",
    bottom: 30,
    left: 20,
    right: 20,
    height: 70,
    borderRadius: 35,
    borderTopWidth: 0,
    elevation: 0,
    paddingBottom: Platform.OS === "ios" ? 0 : 10,
    overflow: "hidden", // Essential for the Glass effect to clip to border radius
  },
  desktopSidebar: {
    // Standard sidebar look for Web
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    width: 80,
    height: "100%",
    flexDirection: "column",
    borderRightWidth: 1,
    borderRightColor: "#E2E8F0",
    backgroundColor: "white", // Web doesn't support liquid glass, so we keep it clean
  },
});
