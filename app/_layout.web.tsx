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
import { Stack, useRootNavigationState, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useColorScheme } from "nativewind";
import { PressablesConfig } from "pressto";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Linking, Platform, View } from "react-native";
import { Host } from "react-native-portalize";
import "react-native-reanimated";
import { SafeAreaProvider } from "react-native-safe-area-context";
import Toast from "react-native-toast-message";
import "../global.css";

export const unstable_settings = {
  anchor: "(tabs)",
};

export default function RootLayout() {
  const navigationState = useRootNavigationState();
  const router = useRouter();
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
  const { colorScheme, setColorScheme } = useColorScheme();
  const { session, setSession, isOnboarded } = useAuthStore();
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [isI18nInitialized, setIsI18nInitialized] = useState(false);
  const [isPreferencesSynced, setIsPreferencesSynced] = useState(false);

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

  // 4. SYNC USER PREFERENCES (Language & Theme)
  useEffect(() => {
    if (!isAuthReady || !isI18nInitialized) return;

    const syncUserPreferences = async () => {
      try {
        if (session?.user?.id) {
          // ✅ FIX: Select 'preferences' JSON column instead of 'language'
          const { data } = await supabase
            .from("users")
            .select("preferences")
            .eq("id", session.user.id)
            .single();

          if (data?.preferences) {
            const { language, theme } = data.preferences;

            // A. Sync Language
            if (language && i18n.language !== language) {
              // console.log(`🌐 Syncing language to: ${language}`);
              await i18n.changeLanguage(language);
            }

            // B. Sync Theme
            if (theme) {
              // console.log(`🎨 Syncing theme to: ${theme}`);
              setColorScheme(theme); // 'light' | 'dark' | 'system'
            }
          }
        }
      } catch (e) {
        console.error("Preference sync failed", e);
      } finally {
        setIsPreferencesSynced(true);
      }
    };

    syncUserPreferences();
  }, [session, isAuthReady, isI18nInitialized]);

  const appIsReady =
    fontsLoaded &&
    isAuthReady &&
    isI18nInitialized &&
    isPreferencesSynced &&
    navigationState?.key;

  if (!appIsReady) {
    return null;
  }

  return (
    <View style={{ flex: 1 }}>
      <Host>
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
                <Stack.Protected guard={isAuthReady && !session?.user}>
                  <Stack.Screen
                    name="(auth)"
                    options={{ headerShown: false }}
                  />
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
                  <Stack.Screen
                    name="(tabs)"
                    options={{ headerShown: false }}
                  />
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
      </Host>
    </View>
  );
}

// eas build --platform ios --profile development
