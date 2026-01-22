import { Colors } from "@/constants/theme";
import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { GlassView, isLiquidGlassAvailable } from "expo-glass-effect";
import { Image } from "expo-image";
import { Tabs } from "expo-router";
import { useColorScheme } from "nativewind";
import { PressableScale } from "pressto";
import React from "react";
import {
  Platform,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";

import TEXT_LOGO_LIGHT from "@/assets/images/icon-text-dark.png";
import TEXT_LOGO_DARK from "@/assets/images/icon-text-light.png";
import PENGUIN_SIGN from "@/assets/images/main.png";

// --- CUSTOM TAB BAR COMPONENT ---
function CustomTabBar({ state, descriptors, navigation }: any) {
  const { width } = useWindowDimensions();
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";
  const isDesktop = width > 1000;
  const theme = isDark ? Colors.dark : Colors.light;

  if (isDesktop) {
    // ... (Desktop Sidebar Code remains the same, but let's ensure background handles themes)
    return (
      <View
        style={[styles.desktopSidebar, { backgroundColor: theme.background }]}
      >
        <View className="items-center mb-12 gap-4">
          <Image
            source={isDark ? TEXT_LOGO_LIGHT : TEXT_LOGO_DARK}
            style={{ width: 130, height: 40 }}
            contentFit="contain"
          />
          <Image
            source={PENGUIN_SIGN}
            style={{ width: 120, height: 120 }}
            contentFit="contain"
          />
        </View>

        <View className="flex-1 gap-4">
          {state.routes.map((route: any, index: number) => {
            const { options } = descriptors[route.key];
            const isFocused = state.index === index;
            return (
              // <PressableScale
              //   key={route.key}
              //   onPress={() => navigation.navigate(route.name)}
              //   className={`flex-row items-center px-6 py-4 rounded-2xl mx-4 ${
              //     isFocused ? "bg-action/10" : "bg-transparent"
              //   }`}
              // >
              <PressableScale
                key={route.key}
                activateOnHover
                onPress={() => navigation.navigate(route.name)}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  paddingHorizontal: 24,
                  paddingVertical: 16,
                  borderRadius: 16,
                  marginHorizontal: 16,
                  backgroundColor: isFocused
                    ? `${Colors.brand.action}1A` // 10% opacity orange
                    : "transparent",
                }}
              >
                <Ionicons
                  name={
                    options.tabBarIcon
                      ? options.tabBarIcon({
                          color: isFocused ? "#F97316" : "#94A3B8",
                        }).props.name
                      : "help"
                  }
                  size={24}
                  color={isFocused ? "#F97316" : isDark ? "#94A3B8" : "#64748B"}
                />
                <Text
                  className={`ml-4 font-heading font-bold text-lg ${
                    isFocused
                      ? "text-action"
                      : "text-text-muted-light dark:text-text-muted-dark"
                  }`}
                >
                  {options.title}
                </Text>
              </PressableScale>
            );
          })}
        </View>
      </View>
    );
  }

  // --- MOBILE GLASS BAR WITH FALLBACK ---
  const useLiquid = isLiquidGlassAvailable();

  return (
    <View style={styles.mobileGlassContainer}>
      {useLiquid ? (
        // 🚀 Native Liquid Glass (iOS 26+)
        <GlassView
          style={StyleSheet.absoluteFill}
          glassEffectStyle="regular"
          tintColor={isDark ? "#1E293B" : "#F8FAFC"}
        />
      ) : (
        // ❄️ Standard Frosted Blur (Android / Older iOS / Web)
        <BlurView
          intensity={Platform.OS === "ios" ? 80 : 100}
          tint={isDark ? "dark" : "light"}
          style={StyleSheet.absoluteFill}
        />
      )}

      <View className="flex-row h-full items-center justify-around px-4">
        {state.routes.map((route: any, index: number) => {
          const isFocused = state.index === index;
          return (
            <Pressable
              key={route.key}
              onPress={() => navigation.navigate(route.name)}
              className="items-center justify-center flex-1 h-full"
            >
              <Ionicons
                name={
                  descriptors[route.key].options.tabBarIcon({
                    color: isFocused ? "#F97316" : "#94A3B8",
                  }).props.name
                }
                size={26}
                color={isFocused ? "#F97316" : "#94A3B8"}
              />
              {isFocused && (
                <View className="w-1.5 h-1.5 bg-action rounded-full mt-1" />
              )}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

export default function TabLayout() {
  return (
    <Tabs
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarIcon: () => <Ionicons name="home-sharp" />,
        }}
      />
      <Tabs.Screen
        name="library"
        options={{
          title: "Library",
          tabBarIcon: () => <Ionicons name="library-sharp" />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: "Settings",
          tabBarIcon: () => <Ionicons name="settings-sharp" />,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  desktopSidebar: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    width: 280,
    backgroundColor: "white",
    borderRightWidth: 1,
    borderRightColor: "rgba(0,0,0,0.05)",
    paddingTop: 40,
    zIndex: 100,
  },
  mobileGlassContainer: {
    position: "absolute",
    bottom: 30,
    left: 20,
    right: 20,
    height: 75,
    borderRadius: 38,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
});
