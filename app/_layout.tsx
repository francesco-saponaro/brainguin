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
import Constants from "expo-constants";
import * as Haptics from "expo-haptics";
import { Stack, useRootNavigationState, useRouter } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useColorScheme } from "nativewind";
import { PressablesConfig } from "pressto";
import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Alert, Linking, Platform, Text, TextInput, View } from "react-native";
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
  const [isMaintenance, setIsMaintenance] = useState(false);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [isI18nInitialized, setIsI18nInitialized] = useState(false);
  const [isPreferencesSynced, setIsPreferencesSynced] = useState(false); // Renamed for clarity

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

  // 5. THE VERSION GUARD
  useEffect(() => {
    if (!appIsReady) return;

    const checkStatus = async () => {
      const { data } = await supabase.from("app_settings").select("*").single();

      if (data) {
        // 1. Check Maintenance Mode first
        if (data.maintenance_mode) {
          setIsMaintenance(true);
          return; // Stop here, don't even check version
        }

        // 2. Check Version (as we did before)
        const currentVersion = Constants.expoConfig?.version || "1.0.0";
        const minVersion =
          Platform.OS === "ios"
            ? data.min_version_ios
            : data.min_version_android;
        const isOutdated =
          currentVersion.localeCompare(minVersion, undefined, {
            numeric: true,
          }) < 0;

        if (isOutdated) {
          Alert.alert(
            t("updates.required_title"),
            t("updates.required_body"),
            [
              {
                text: t("updates.button"),
                onPress: () => {
                  const APP_STORE_ID = "6758918032"; // You get this from App Store Connect
                  const PLAY_STORE_ID = "com.brainguin.app"; // This is your 'package' name

                  const url =
                    Platform.OS === "ios"
                      ? `https://apps.apple.com/app/id${APP_STORE_ID}`
                      : `market://details?id=${PLAY_STORE_ID}`;

                  Linking.openURL(url).catch(() => {
                    // Fallback for Android if Play Store app is missing
                    if (Platform.OS === "android") {
                      Linking.openURL(
                        `https://play.google.com/store/apps/details?id=${PLAY_STORE_ID}`,
                      );
                    }
                  });
                },
              },
            ],
            { cancelable: false },
          );
        }
      }
    };

    checkStatus();
  }, [appIsReady]);

  // 3. Render Maintenance Screen if active
  if (isMaintenance) {
    return (
      <SafeAreaProvider>
        <View
          style={{
            flex: 1,
            justifyContent: "center",
            alignItems: "center",
            backgroundColor: colorScheme === "dark" ? "#1E293B" : "#F8FAFC",
          }}
        >
          <Text
            style={{
              fontSize: 24,
              fontWeight: "bold",
              color: colorScheme === "dark" ? "white" : "black",
            }}
          >
            {t("maintenance.title", "Under Maintenance")}
          </Text>
          <Text
            style={{
              marginTop: 10,
              textAlign: "center",
              paddingHorizontal: 20,
            }}
          >
            {t(
              "maintenance.body",
              "BrainGuin is getting a quick tune-up. We'll be back in a few minutes!",
            )}
          </Text>
        </View>
      </SafeAreaProvider>
    );
  }

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
              <Stack.Protected guard={isAuthReady && !session?.user}>
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
// eas update --branch production --message "Fixed translation bug in RootLayout"

// 3. Setting up the "Preview" Channel
// To test an OTA update on your own phone before the customers see it, you should create a Preview Build. This is a production-like app that looks at a different "mailbox" for updates.

// Step 1: Create the Preview Build

// Bash
// eas build --platform all --profile preview
// Install this build on your test device.

// Step 2: Push an Update to Preview
// When you have a fix ready, send it only to the preview builds first:

// Bash
// eas update --channel preview --message "Testing fix for ZetaBarber"
// Step 3: Promote to Production
// Once you've confirmed the fix works on your preview app, send it to the real users:

// Bash
// eas update --channel production --message "Official fix for version 2.00.24"

//How it works:
// Store Build (The Shell): When you change native code (like adding a new plugin in app.json or changing the splash screen), you must rebuild the app and submit it to the store.
// OTA Update (The JS): When you only change your React components, CSS, or logic (like in your RootLayout), you can push an update instantly.

// 2. The Versioning LogicWhen managing an app like BrainGuin, you should follow this mental map:Change TypeWhat to update in app.jsonMethodSmall UI/Logic fixNone (keep version same)eas update (Instant)New FeatureIncrement version (e.g., 1.1.0)eas build (Store Review)Native Plugin ChangeIncrement version & runtimeVersioneas build (Required)

// Scenario,What you do,Does it need Store Review?
// Fixing a Bug,eas update,No. Instant for users.
// Changing Text/Styles,eas update,No. Instant for users.
// Adding a Native Plugin,eas build,Yes. Must submit to Apple/Google.
// Changing App Icon,eas build,Yes. Must submit to Apple/Google.
// Changing the Widget Layout,eas build,Yes. Must submit to Apple/Google.

// To trigger that blocking alert for your users so they actually go to the store and download your new build, follow this 2-step sequence:

// Step 1: Push the new version to the Stores
// Change the version in your app.json (e.g., from 1.0.0 to 1.1.0).

// Run eas build --platform all --profile production.

// Submit and wait for Apple/Google to approve it.

// Step 2: Update Supabase (The "Trigger")
// Once the new version is live in the stores, go to your Supabase dashboard and update your app_settings table:

// Set min_version_ios to 1.1.0.

// Set min_version_android to 1.1.0.

// What happens next?
// Existing users (on 1.0.0): The next time they open the app, your RootLayout logic will see that 1.0.0 is older than the min_version (1.1.0) in Supabase. The Alert will pop up, blocking them until they click "Update" and download the new version.

// New users (on 1.1.0): They won't see any alert because their version matches or exceeds the minimum.

// ⚠️ One Important Warning
// Do not update the Supabase field until the new version is actually "Live" or "Ready for Sale" in the stores.

// If you update Supabase while Apple is still "Reviewing" your app, your current users will get the "Update Required" alert, but when they go to the App Store, they will only see the old version. They'll be stuck in a loop where they can't update and can't use the app!
