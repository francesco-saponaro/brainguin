import { useColorScheme } from "@/hooks/use-color-scheme";
import { useAuthStore } from "@/store/storeUser";
import "@/utils/i18n";
import i18n from "@/utils/i18n";
import { Inter_400Regular, Inter_500Medium } from "@expo-google-fonts/inter";
import {
  Poppins_600SemiBold,
  Poppins_700Bold,
  useFonts,
} from "@expo-google-fonts/poppins";
import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from "@react-navigation/native";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import React, { useCallback, useEffect, useState } from "react";
import { Text, TextInput } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import "react-native-reanimated";
import { SafeAreaProvider } from "react-native-safe-area-context";
import Toast from "react-native-toast-message";
import "../global.css";

export const unstable_settings = {
  anchor: "(tabs)",
};

// --- 💡 START GLOBAL FONT SCALING OVERRIDE (TypeScript Fix) 💡 ---
// Fix 1: Use 'as any' to tell TypeScript to treat Text as a type that allows defaultProps
(Text as any).defaultProps = (Text as any).defaultProps || {};
(Text as any).defaultProps.allowFontScaling = false;

// Fix 2: Use 'as any' for TextInput as well
(TextInput as any).defaultProps = (TextInput as any).defaultProps || {};
(TextInput as any).defaultProps.allowFontScaling = false;

SplashScreen.preventAutoHideAsync();
SplashScreen.setOptions({
  fade: true, // ✅ Fade enabled, uses default 400ms
});

export default function RootLayout() {
  const colorScheme = useColorScheme();
  let [fontsLoaded] = useFonts({
    Poppins_600SemiBold,
    Poppins_700Bold,
    Inter_400Regular,
    Inter_500Medium,
    // Map the font family names to match your tailwind config:
    Poppins: Poppins_600SemiBold,
    Inter: Inter_400Regular,
  });
  const { user } = useAuthStore();
  const [isI18nInitialized, setIsI18nInitialized] = useState(false);
  const [isCheckingUser, setIsCheckingUser] = useState(true);

  useEffect(() => {
    setTimeout(() => {
      setIsCheckingUser(false);
    }, 2000);
  }, []);

  // 1. Wait for i18n to initialize before showing ANYTHING
  // This prevents the "Flash" of the wrong language
  useEffect(() => {
    if (i18n.isInitialized) {
      setIsI18nInitialized(true);
    } else {
      i18n.on("initialized", () => {
        setIsI18nInitialized(true);
      });
    }
  }, []);

  // 2. Sync User Preference (Only runs if User logs in/changes)
  // useEffect(() => {
  //   if (user?.lang) {
  //     const currentLang = i18n.language;
  //     const userLang = user.lang.toLowerCase();

  //     // Only change if different to avoid loops
  //     if (currentLang !== userLang) {
  //       // console.log(`Syncing language to user preference: ${userLang}`);
  //       i18n.changeLanguage(userLang);
  //       // The detector's cacheUserLanguage will automatically save this to AsyncStorage
  //     }
  //   }
  // }, [user?.lang]);

  const appIsReady = fontsLoaded && !isCheckingUser && isI18nInitialized;
  console.log(appIsReady, "appIsrefay");

  const onLayoutRootView = useCallback(async () => {
    if (appIsReady) {
      // This tells the splash screen to hide immediately!
      await SplashScreen.hideAsync();
    }
  }, [appIsReady]);

  if (!appIsReady) {
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }} onLayout={onLayoutRootView}>
      <SafeAreaProvider>
        <ThemeProvider
          value={colorScheme === "dark" ? DarkTheme : DefaultTheme}
        >
          <Stack>
            <Stack.Protected guard={!!user}>
              <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            </Stack.Protected>
            <Stack.Protected guard={!user}>
              <Stack.Screen name="(auth)" options={{ headerShown: false }} />
            </Stack.Protected>
            <Stack.Screen
              name="modal"
              options={{ presentation: "modal", title: "Modal" }}
            />
          </Stack>

          <Toast />
          <StatusBar style="auto" />
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
