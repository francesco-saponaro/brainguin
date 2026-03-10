import PENGUIN_LOGO from "@/assets/images/main.png";
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
import { Image } from "expo-image";
import * as Notifications from "expo-notifications";
import { Stack, useRootNavigationState, useRouter } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useColorScheme } from "nativewind";
import { PressablesConfig } from "pressto";
import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Linking,
  Platform,
  Pressable,
  Text,
  TextInput,
  View,
} from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { Host } from "react-native-portalize";
import "react-native-reanimated";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
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

  // --- STATE MANAGEMENT ---
  const [isSystemChecking, setIsSystemChecking] = useState(true);
  const [blockerStatus, setBlockerStatus] = useState<
    "maintenance" | "update_required" | null
  >(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [isI18nInitialized, setIsI18nInitialized] = useState(false);
  const [isPreferencesSynced, setIsPreferencesSynced] = useState(false);

  // 1. 🚀 PRIORITY CHECK: Maintenance & Version
  // This runs FIRST. If blocked, we stop everything else.
  const checkSystemStatus = async () => {
    try {
      if (Platform.OS === "web") return false;

      const { data } = await supabase.from("app_settings").select("*").single();

      if (data) {
        // A. Maintenance Check
        if (data.maintenance_mode) {
          setBlockerStatus("maintenance");
          return true; // 🛑 Blocked
        }

        // B. Version Check
        const currentVersion = Constants.expoConfig?.version || "1.0.0";
        const minVersion =
          Platform.OS === "ios"
            ? data.min_version_ios
            : data.min_version_android;

        // Simple string comparison (You might want semver here if versions get complex)
        const isOutdated =
          currentVersion.localeCompare(minVersion, undefined, {
            numeric: true,
            sensitivity: "base",
          }) < 0;

        if (isOutdated) {
          setBlockerStatus("update_required");
          return true; // 🛑 Blocked
        }
      }
      return false; // ✅ Not blocked
    } catch (error) {
      console.warn("System check failed (offline?)", error);
      return false; // Default to allowing app access if check fails
    } finally {
      setIsSystemChecking(false);
    }
  };

  // 2. THE AUTH INITIALIZER & LISTENER
  useEffect(() => {
    const initializeAuth = async () => {
      if (Platform.OS === "android") {
        await Notifications.setNotificationChannelAsync("default", {
          name: "Default",
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: "#F8FAFC",
        });
      }

      // Check System Status
      const isBlocked = await checkSystemStatus();
      if (isBlocked) return; // 🛑 STOP: Don't fetch user if maintenance/update

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
  }, []);

  // 3. 👤 AUTH LISTENER (Only runs if passed bootstrap)
  useEffect(() => {
    if (blockerStatus) return; // Don't listen if blocked

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
  }, [blockerStatus]);

  // 4. THE DEEP LINK INTERCEPTOR TO CATCH PASSWORD RESET LINKS
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

  // 5. i18n INITIALIZATION HANDLER
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

  // 6. SYNC USER PREFERENCES (Language & Theme)
  useEffect(() => {
    // 1. Wait for Auth to finish initializing before doing anything
    if (!isAuthReady || !isI18nInitialized) return;

    // 2. If Auth is done, but there is NO USER, we are "synced" by default.
    // (We don't need to fetch anything, so unblock the splash screen)
    if (!session?.user?.id) {
      setIsPreferencesSynced(true);
      return;
    }

    // 3. If we HAVE a user, actually fetch their preferences
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
  }, [session?.user?.id, isAuthReady, isI18nInitialized]);

  // --- LAYOUT HANDLERS ---
  // Handler A: For Blocking Screens (Update / Maintenance)
  //
  // Only waits for Fonts & i18n. IGNORES user state.
  const onLayoutBlockerView = useCallback(async () => {
    if (fontsLoaded && isI18nInitialized) {
      await SplashScreen.hideAsync();
    }
  }, [fontsLoaded, isI18nInitialized]);

  // Handler B: For Main App
  // Waits for everything
  const appIsReady =
    fontsLoaded &&
    isAuthReady &&
    isI18nInitialized &&
    isPreferencesSynced &&
    navigationState?.key;

  const onLayoutMainView = useCallback(async () => {
    if (appIsReady) {
      await SplashScreen.hideAsync();
    }
  }, [appIsReady]);

  // 🛑 BLOCKER VIEW (Rendered immediately if needed)
  if (blockerStatus && !isSystemChecking) {
    const isMaintenance = blockerStatus === "maintenance";
    const title = isMaintenance
      ? t("maintenance.title")
      : t("updates.required_title");
    const body = isMaintenance
      ? t("maintenance.body")
      : t("updates.required_body");

    // Safety check for fonts
    if (!fontsLoaded || !isI18nInitialized) return null;

    return (
      <SafeAreaProvider>
        {/* ✅ Attach the BLOCKER layout handler here */}
        <SafeAreaView
          style={{
            flex: 1,
            backgroundColor: colorScheme === "dark" ? "#1E293B" : "#F8FAFC",
            justifyContent: "center",
            alignItems: "center",
            flexDirection: "column",
            gap: 16,
          }}
          onLayout={onLayoutBlockerView}
        >
          <Image
            source={PENGUIN_LOGO}
            style={{ width: 200, height: 200 }}
            contentFit="contain"
          />

          <View className="items-center gap-1 px-8">
            <Text
              style={{
                fontSize: 24,
                fontWeight: "bold",
                color: colorScheme === "dark" ? "white" : "black",
              }}
            >
              {title}
            </Text>
            <Text
              style={{
                textAlign: "center",
                paddingHorizontal: 32,
                color: colorScheme === "dark" ? "#CBD5E1" : "#475569",
                marginBottom: 24,
              }}
            >
              {body}
            </Text>
          </View>

          {/* Show Update Button if it's an update */}
          {!isMaintenance && (
            <Pressable
              onPress={() => {
                const APP_ID =
                  Platform.OS === "ios" ? "6758918032" : "com.brainguin.app";
                const url =
                  Platform.OS === "ios"
                    ? `https://apps.apple.com/app/id${APP_ID}`
                    : `market://details?id=${APP_ID}`;
                Linking.openURL(url);
              }}
              style={{
                backgroundColor: "#F97316",
                paddingVertical: 12,
                paddingHorizontal: 24,
                borderRadius: 12,
              }}
            >
              <Text className="text-white font-heading text-lg font-bold">
                {t("updates.button")}
              </Text>
            </Pressable>
          )}
        </SafeAreaView>
      </SafeAreaProvider>
    );
  }

  if (!appIsReady) {
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }} onLayout={onLayoutMainView}>
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
                  ) : Platform.OS === "android" ? (
                    <Stack.Screen
                      name="creation-modal/index"
                      options={{
                        presentation: "formSheet",
                        headerShown: false,
                        sheetGrabberVisible: true,
                        sheetCornerRadius: 24,
                        sheetAllowedDetents: [0.9],
                        contentStyle: {
                          backgroundColor:
                            colorScheme === "dark" ? "#1E293B" : "#F8FAFC",
                        },
                      }}
                    />
                  ) : (
                    <Stack.Screen
                      name="creation-modal/index"
                      options={{
                        presentation: "modal",
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
                  ) : Platform.OS === "android" ? (
                    <Stack.Screen
                      name="paywall/index"
                      options={{
                        presentation: "formSheet",
                        headerShown: false,
                        sheetGrabberVisible: true,
                        sheetCornerRadius: 24,
                        sheetAllowedDetents: [0.9],
                        contentStyle: {
                          backgroundColor:
                            colorScheme === "dark" ? "#1E293B" : "#F8FAFC",
                        },
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
    </GestureHandlerRootView>
  );
}

// eas build --profile production --platform ios --auto-submit
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
