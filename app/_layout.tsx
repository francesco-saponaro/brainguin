import { useColorScheme } from "@/hooks/use-color-scheme";
import { supabase } from "@/lib/supabase";
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
import * as Haptics from "expo-haptics";
import { Stack, useRouter } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { PressablesConfig } from "pressto";
import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Linking, Platform, Text, TextInput } from "react-native";
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
  const router = useRouter();
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
  const { t } = useTranslation();
  const { session, setSession, isOnboarded } = useAuthStore();
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [isI18nInitialized, setIsI18nInitialized] = useState(false);
  const [isLangSynced, setIsLangSynced] = useState(false);

  // 1. THE AUTH INITIALIZER & LISTENER
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        supabase.auth.getSession().then(({ data: { session } }) => {
          if (session) {
            console.log(session, "fetched session in layout");
            const metadataOnboarded =
              session.user.user_metadata?.is_onboarded ?? false;
            setSession(session, metadataOnboarded);
          } else {
            setSession(null, false);
          }
        });
      } catch (e: any) {
        console.error("Auth init error", e);
        Toast.show({
          type: "error",
          text1: t("auth.social_login_failed"),
          text2: e.message,
        });
      } finally {
        setIsAuthReady(true);
      }
    };

    initializeAuth();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (authEvent, session) => {
      if (authEvent === "SIGNED_IN" || authEvent === "TOKEN_REFRESHED") {
        if (session) {
          // 🚀 INSTANT CHECK ON LOGIN
          const metadataOnboarded =
            session.user.user_metadata?.is_onboarded ?? false;
          setSession(session, metadataOnboarded);
        } else {
          setSession(null, false);
        }
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // 2. THE DEEP LINK INTERCEPTOR TO CATCH PASSWORD RESET LINKS
  // This catches the URL before Expo Router strips the hash (#)
  useEffect(() => {
    const handleDeepLink = (event: { url: string }) => {
      let url = event.url;
      // console.log("🔗 [RootLayout] Deep Link Detected:", url);

      // Check if this is the Update Password link
      if (url && url.includes("link-to-reset-password")) {
        // Fix the URL: Convert Fragment (#) to Query (?)
        // Supabase sends: .../link-to-reset-password#access_token=...
        // Expo Router needs: .../link-to-reset-password?access_token=...
        if (url.includes("#")) {
          // console.log("♻️ Converting URL Hash to Query Params...");
          url = url.replace("#", "?");
        }

        // Parse path and query
        // We manually construct the path to ensure the router understands it
        const queryIndex = url.indexOf("?");
        const queryString = queryIndex !== -1 ? url.substring(queryIndex) : "";
        const cleanPath = `/update-password${queryString}`;

        // console.log("🚀 [RootLayout] Redirecting to:", cleanPath);

        // Force the router to go to the clean URL
        // The timeout ensures the navigation tree is ready
        setTimeout(() => {
          router.replace(cleanPath as any);
        }, 100);
      }
    };

    // Listen for Warm Starts
    const subscription = Linking.addEventListener("url", handleDeepLink);

    // Listen for Cold Starts
    Linking.getInitialURL().then((url) => {
      if (url) handleDeepLink({ url });
    });

    return () => subscription.remove();
  }, []);

  // 3. i18n INITIALIZATION HANDLER
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

  // 4. Sync User Language Preference
  useEffect(() => {
    // ✋ Don't run until we know Auth and i18n are actually ready
    if (!isAuthReady || !isI18nInitialized) return;

    const syncUserLanguage = async () => {
      try {
        if (session?.user?.id) {
          // A. User is logged in: Fetch their language
          const { data } = await supabase
            .from("users")
            .select("language")
            .eq("id", session.user.id)
            .single();

          if (data?.language) {
            const currentLang = i18n.language;
            const dbLang = data.language;

            if (currentLang !== dbLang) {
              console.log(`🌐 Syncing language to: ${dbLang}`);
              await i18n.changeLanguage(dbLang);
            }
          }
        }
      } catch (e) {
        console.error("Language sync failed", e);
      } finally {
        // B. Whether we fetched it, failed, or user wasn't logged in...
        // We are now "Synced". Release the Splash Screen.
        setIsLangSynced(true);
      }
    };

    syncUserLanguage();
  }, [session, isAuthReady, isI18nInitialized]);

  const appIsReady =
    fontsLoaded && isAuthReady && isI18nInitialized && isLangSynced;

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
          <PressablesConfig
            globalHandlers={{
              onPress: () => {
                Haptics.selectionAsync();
              },
            }}
            // animationType="spring"
            // animationConfig={{ damping: 20, stiffness: 150 }}
          >
            <Stack>
              {/* 1. If not logged in: show Auth */}
              <Stack.Protected guard={!session?.user}>
                <Stack.Screen name="(auth)" options={{ headerShown: false }} />
              </Stack.Protected>

              {/* 2. If logged in but NOT onboarded: show Onboarding */}
              <Stack.Protected guard={!!session?.user && !isOnboarded}>
                <Stack.Screen
                  name="onboarding/index"
                  options={{ headerShown: false }}
                />
              </Stack.Protected>

              {/* 3. If logged in AND onboarded: show Main App */}
              <Stack.Protected guard={!!session?.user && isOnboarded}>
                <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
                <Stack.Screen
                  name="study/[id]/index"
                  options={{ headerShown: false }}
                />
                {Platform.OS === "web" ? (
                  <Stack.Screen
                    name="creation-modal/index"
                    options={{
                      presentation: "transparentModal", // Native slide-up behavior
                      animation: "fade",
                      headerTitle: "Creation Modal",
                      headerShown: false,
                    }}
                  />
                ) : (
                  <Stack.Screen
                    name="creation-modal/index"
                    options={{
                      presentation: "modal", // Native slide-up behavior
                      animation: "slide_from_bottom",
                      headerShown: false,
                      sheetGrabberVisible: true,
                      sheetCornerRadius: 24,
                      sheetAllowedDetents: "fitToContents",
                      contentStyle: {
                        backgroundColor:
                          colorScheme === "dark" ? "#1E293B" : "#F8FAFC",
                      },
                    }}
                  />
                )}

                {Platform.OS === "web" ? (
                  <Stack.Screen
                    name="paywall/index"
                    options={{
                      presentation: "transparentModal", // Native slide-up behavior
                      animation: "fade",
                      headerTitle: "Paywall",
                      headerShown: false,
                    }}
                  />
                ) : (
                  <Stack.Screen
                    name="paywall/index"
                    options={{
                      presentation: "modal", // Native slide-up behavior
                      animation: "slide_from_bottom",
                      headerShown: false,
                      sheetGrabberVisible: true,
                      sheetCornerRadius: 24,
                      sheetAllowedDetents: "fitToContents",
                      contentStyle: {
                        backgroundColor:
                          colorScheme === "dark" ? "#1E293B" : "#F8FAFC",
                      },
                    }}
                  />
                )}
              </Stack.Protected>

              {/* 4. Update Password (Public/Recovery) */}
              <Stack.Screen
                name="update-password/index"
                options={{ headerShown: false }}
              />
            </Stack>

            <Toast />
            <StatusBar style="auto" />
          </PressablesConfig>
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

// eas build --platform ios --profile development
