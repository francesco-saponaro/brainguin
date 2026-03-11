import ConfirmModal from "@/components/ConfirmModal";
import { Colors } from "@/constants/theme";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/store/storeUser";
import { Ionicons } from "@expo/vector-icons";
import clsx from "clsx";
import { useRouter } from "expo-router";
import { cssInterop, useColorScheme } from "nativewind";
import { PressableOpacity } from "pressto";
import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Alert,
  KeyboardAvoidingView,
  Modal,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Toast from "react-native-toast-message";

const StyledPressable = cssInterop(PressableOpacity, {
  className: "style",
});

export default function SettingsScreen() {
  const router = useRouter();
  const { session, signOut } = useAuthStore();
  const { colorScheme, setColorScheme } = useColorScheme();
  const { t, i18n } = useTranslation();
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const isDark = colorScheme === "dark";
  const isDesktop = width > 1000;

  // --- STATE ---
  const [profile, setProfile] = useState<any>(null);
  const [isEditingName, setIsEditingName] = useState(false);
  const [tempName, setTempName] = useState("");
  const [isPro, setIsPro] = useState(false);
  const [isDeleteModalVisible, setIsDeleteModalVisible] = useState(false);

  // --- 1. FETCH USER SETTINGS ---
  useEffect(() => {
    const loadSettings = async () => {
      if (!session?.user) return;

      const { data, error } = await supabase
        .from("users")
        .select("*")
        .eq("id", session.user.id)
        .single();

      if (!error && data) {
        setProfile(data);
        setTempName(data.full_name || "");
        setIsPro(data.is_pro || false);

        if (data.preferences?.theme) {
          setColorScheme(data.preferences.theme);
        }
      }
    };
    loadSettings();
  }, [session]);

  // --- 2. UPDATE HELPERS ---
  const updateProfile = async (updates: any) => {
    if (!session?.user) return;
    const { error } = await supabase
      .from("users")
      .update(updates)
      .eq("id", session.user.id);

    if (error) {
      Toast.show({
        type: "error",
        text1: t("errors.fetch_failed"),
        text2: error.message,
      });
    } else {
      setProfile((prev: any) => ({ ...prev, ...updates }));
    }
  };

  const handleSaveName = async () => {
    try {
      // 1. Update the Public Table (your existing updateProfile logic)
      await updateProfile({ full_name: tempName });

      // 2. Update Supabase Auth Metadata (CRITICAL for persistence on reload)
      const { error: authError } = await supabase.auth.updateUser({
        data: { full_name: tempName },
      });

      if (authError) throw authError;

      // 3. Close modal and show success
      setIsEditingName(false);
      Toast.show({ type: "success", text1: t("settings.name_updated_toast") });
    } catch (e: any) {
      Toast.show({
        type: "error",
        text1: "Error saving name",
        text2: e.message,
      });
    }
  };

  const handleManageSubscription = async () => {
    // 1. If they aren't Pro, just send them to the Paywall to buy it!
    if (!isPro) {
      router.push("/paywall");
      return;
    }

    try {
      Toast.show({
        type: "info",
        text1: "Loading Billing Portal...",
      });

      // 2. Ask Supabase to generate a secure Stripe Portal link
      const { data, error } = await supabase.functions.invoke(
        "create-stripe-portal",
      );

      if (error || !data?.url) {
        throw new Error("Could not load billing portal.");
      }

      // 3. Redirect the browser to Stripe's hosted portal
      window.location.href = data.url;
    } catch (e: any) {
      console.error(e);
      Toast.show({
        type: "error",
        text1: "Billing Error",
        text2: e.message || "Please contact support.",
      });
    }
  };

  const handleThemeChange = (themeKey: "light" | "dark") => {
    // 1. Update UI Immediately
    setColorScheme(themeKey);

    // 2. Persist to Database
    updateProfile({
      preferences: {
        ...profile?.preferences,
        theme: themeKey,
      },
    });
  };

  // 1. Shows the Modal
  const promptDeleteAccount = () => {
    setIsDeleteModalVisible(true);
  };

  // 2. Performs the actual deletion
  const performDeleteAccount = async () => {
    try {
      const { error } = await supabase.rpc("delete_user");
      if (error) throw error;

      // Close modal first
      setIsDeleteModalVisible(false);

      // Then sign out
      signOut();
    } catch (e: any) {
      setIsDeleteModalVisible(false);
      Alert.alert("Error", e.message);
    }
  };

  const changeLanguage = (lang: string) => {
    i18n.changeLanguage(lang);
    updateProfile({ preferences: { ...profile?.preferences, language: lang } });
  };

  const TERMS_URL =
    "https://gist.github.com/francesco-saponaro/d344c6bdaf1b47fe045772874ee35807";
  const PRIVACY_URL =
    "https://gist.github.com/francesco-saponaro/aeb8f04b6fd0b80a809fdb7119158fe5";

  const openLegal = (url: string) =>
    window.open(url, "_blank", "noopener,noreferrer");

  const SectionHeader = ({ title }: { title: string }) => (
    <Text className="text-text-muted-light dark:text-text-muted-dark font-body font-bold text-xs uppercase tracking-widest mb-3 mt-6 ml-4">
      {title}
    </Text>
  );

  const SettingRow = ({
    icon,
    label,
    value,
    onPress,
    rightElement,
    isDestructive,
  }: any) => {
    const FinalParent = onPress ? PressableOpacity : View;

    return (
      <View className="bg-card-light dark:bg-card-dark">
        <FinalParent
          onPress={onPress}
          activateOnHover={!!onPress}
          style={{
            flexDirection: "row",
            alignItems: "center",
            padding: 16,
            marginBottom: 1,
          }}
        >
          <View
            className={clsx(
              "w-10 h-10 rounded-xl items-center justify-center mr-4",
              isDestructive
                ? "bg-red-100 dark:bg-red-900/20"
                : "bg-black/5 dark:bg-white/5",
            )}
          >
            <Ionicons
              name={icon}
              size={20}
              color={isDestructive ? "#EF4444" : isDark ? "#94A3B8" : "#64748B"}
            />
          </View>

          <View className="flex-1">
            <Text
              className={clsx(
                "font-heading font-bold text-base",
                isDestructive
                  ? "text-red-500"
                  : "text-text-main-light dark:text-text-main-dark",
              )}
            >
              {label}
            </Text>
          </View>

          {rightElement
            ? rightElement
            : value && (
                <View className="flex-row items-center">
                  <Text className="text-text-muted-light dark:text-text-muted-dark font-body text-sm mr-2">
                    {value}
                  </Text>
                  {onPress && (
                    <Ionicons
                      name="chevron-forward"
                      size={16}
                      color={isDark ? "#64748B" : "#94A3B8"}
                    />
                  )}
                </View>
              )}
        </FinalParent>
      </View>
    );
  };

  return (
    <View
      className="flex-1 bg-page-light dark:bg-page-dark"
      style={{
        paddingLeft: isDesktop ? 300 : 20,
        paddingRight: 20,
        paddingTop: insets.top + 27,
      }}
    >
      <ScrollView
        contentContainerStyle={{
          paddingTop: isDesktop ? 40 : 0,
          paddingBottom: insets.bottom + 120,
        }}
        showsVerticalScrollIndicator={false}
      >
        <View className="mb-6">
          <Text className="text-text-main-light dark:text-text-main-dark font-heading text-4xl font-bold">
            {t("settings.header_title")}
          </Text>
        </View>

        {/* A. PROFILE HEADER */}
        <StyledPressable
          activateOnHover
          onPress={() => setIsEditingName(true)}
          className="mb-6 p-6 rounded-[32px] bg-card-light dark:bg-card-dark border border-black/5 dark:border-white/5 flex-row items-center"
        >
          <View className="flex-1">
            <Text className="text-text-muted-light dark:text-text-muted-dark font-body text-xs uppercase font-bold tracking-wider mb-1">
              {t("settings.signed_in_as")}
            </Text>
            <Text
              className="text-text-main-light dark:text-text-main-dark font-heading text-xl font-bold mb-1"
              numberOfLines={1}
            >
              {profile?.full_name || "Student"}
            </Text>
            <Text
              className="text-text-muted-light dark:text-text-muted-dark font-body text-sm"
              numberOfLines={1}
            >
              {session?.user.email}
            </Text>
          </View>

          <View
            style={{
              padding: 10,
              backgroundColor: isDark
                ? "rgba(255,255,255,0.1)"
                : "rgba(0,0,0,0.05)",
              borderRadius: 16,
            }}
          >
            <Ionicons name="pencil" size={20} color={Colors.brand.action} />
          </View>
        </StyledPressable>

        {/* B. SUBSCRIPTION */}
        <SectionHeader title={t("settings.section_membership")} />
        <View className=" rounded-3xl overflow-hidden border border-black/5 dark:border-white/5">
          <SettingRow
            icon="star"
            label={t("settings.plan_status")}
            rightElement={
              <View
                className={clsx(
                  "px-3 py-1 rounded-full",
                  isPro
                    ? "bg-orange-100 dark:bg-orange-900/30"
                    : "bg-slate-100 dark:bg-slate-800",
                )}
              >
                <Text
                  className={clsx(
                    "font-bold text-xs uppercase tracking-wide",
                    isPro
                      ? "text-orange-600 dark:text-orange-400"
                      : "text-slate-500 dark:text-slate-400",
                  )}
                >
                  {isPro ? t("settings.plan_pro") : t("settings.plan_free")}
                </Text>
              </View>
            }
          />
          <SettingRow
            icon="card"
            label={t("settings.manage_subscription")}
            onPress={handleManageSubscription}
          />
          <SettingRow
            icon="refresh"
            label={t("settings.restore_purchases")}
            onPress={() => router.push("/paywall")}
          />
        </View>

        {/* C. PREFERENCES */}
        <SectionHeader title={t("settings.section_preferences")} />
        <View className=" rounded-3xl overflow-hidden border border-black/5 dark:border-white/5">
          <SettingRow
            icon={isDark ? "moon" : "sunny"}
            label={t("settings.theme")}
            rightElement={
              <View className="flex-row bg-black/5 dark:bg-white/10 rounded-full p-1">
                {["light", "dark"].map((themeKey) => (
                  <PressableOpacity
                    key={themeKey}
                    onPress={() =>
                      handleThemeChange(themeKey as "light" | "dark")
                    }
                    style={{
                      paddingHorizontal: 12,
                      paddingVertical: 4,
                      borderRadius: 99,
                      backgroundColor:
                        colorScheme === themeKey
                          ? isDark
                            ? "#475569"
                            : "#FFFFFF"
                          : "transparent",
                    }}
                  >
                    <Text
                      className={clsx(
                        "text-xs font-bold capitalize",
                        colorScheme === themeKey
                          ? isDark
                            ? "text-white"
                            : "text-black"
                          : "text-text-muted-light dark:text-text-muted-dark",
                      )}
                    >
                      {themeKey}
                    </Text>
                  </PressableOpacity>
                ))}
              </View>
            }
          />

          <SettingRow
            icon="language"
            label={t("settings.language")}
            rightElement={
              <View className="flex-row gap-2">
                {["en", "es", "fr", "it"].map((lang) => (
                  <PressableOpacity
                    key={lang}
                    onPress={() => changeLanguage(lang)}
                    style={{
                      width: 32,
                      height: 32,
                      alignItems: "center",
                      justifyContent: "center",
                      borderRadius: 99,
                      borderWidth: 1,
                      borderColor:
                        i18n.language === lang
                          ? Colors.brand.action
                          : isDark
                            ? "rgba(255,255,255,0.1)"
                            : "rgba(0,0,0,0.1)",
                      backgroundColor:
                        i18n.language === lang
                          ? Colors.brand.action
                          : "transparent",
                    }}
                  >
                    <Text
                      className={clsx(
                        "text-[10px] font-bold uppercase",
                        i18n.language === lang
                          ? "text-white"
                          : "text-text-muted-light",
                      )}
                    >
                      {lang}
                    </Text>
                  </PressableOpacity>
                ))}
              </View>
            }
          />
        </View>

        {/* E. LEGAL */}
        <SectionHeader title="Legal" />
        <View className=" rounded-3xl overflow-hidden border border-black/5 dark:border-white/5">
          <SettingRow
            icon="document-text"
            label={t("privacy_policy")}
            onPress={() => openLegal(PRIVACY_URL)}
          />
          <SettingRow
            icon="book"
            label={t("terms_of_service")}
            onPress={() => openLegal(TERMS_URL)}
          />
        </View>

        {/* E. DANGER ZONE */}
        <SectionHeader title={t("settings.section_account")} />
        <View className=" rounded-3xl overflow-hidden border border-black/5 dark:border-white/5">
          <SettingRow
            icon="log-out"
            label={t("settings.log_out")}
            onPress={() => {
              signOut();
            }}
          />
          <SettingRow
            icon="trash"
            label={t("settings.delete_account")}
            isDestructive
            onPress={promptDeleteAccount}
          />
        </View>

        <Text className="text-center text-text-muted-light dark:text-text-muted-dark text-xs mt-8 mb-4 opacity-50">
          BrainGuin v1.0.0 • Made with 🧊
        </Text>
      </ScrollView>

      {/* --- CONFIRMATION MODAL FOR DELETE --- */}
      <ConfirmModal
        visible={isDeleteModalVisible}
        title={t("settings.delete_alert_title")}
        message={t("settings.delete_alert_msg")}
        confirmLabel={t("settings.delete_account")}
        isDestructive={true}
        onConfirm={performDeleteAccount}
        onCancel={() => setIsDeleteModalVisible(false)}
      />

      <Modal
        visible={isEditingName}
        transparent
        animationType="fade"
        onRequestClose={() => setIsEditingName(false)}
        statusBarTranslucent
      >
        <KeyboardAvoidingView
          behavior="padding"
          className="flex-1 bg-black/50 items-center justify-center px-6"
        >
          <View className="bg-page-light dark:bg-page-dark w-full max-w-sm rounded-3xl p-6 border border-black/5 dark:border-white/10">
            <Text className="text-text-main-light dark:text-text-main-dark font-heading text-xl font-bold mb-4">
              {t("settings.update_name_title")}
            </Text>
            <TextInput
              value={tempName}
              onChangeText={setTempName}
              className="bg-input-light dark:bg-input-dark p-4 rounded-xl text-text-main-light dark:text-text-main-dark font-body mb-6 border border-black/5 dark:border-white/5"
              placeholder={t("settings.update_name_placeholder")}
              placeholderTextColor="#94A3B8"
              autoFocus
            />
            <View className="flex-row gap-3">
              <Pressable
                onPress={() => setIsEditingName(false)}
                style={{
                  flex: 1,
                  paddingVertical: 12,
                  borderRadius: 12,
                  alignItems: "center",
                  backgroundColor: isDark ? "#475569" : "#E2E8F0",
                }}
              >
                <Text className="font-bold text-gray-600 dark:text-gray-300">
                  {t("settings.cancel_btn")}
                </Text>
              </Pressable>
              <Pressable
                onPress={handleSaveName}
                style={{
                  flex: 1,
                  paddingVertical: 12,
                  borderRadius: 12,
                  alignItems: "center",
                  backgroundColor: Colors.brand.action,
                }}
              >
                <Text className="font-bold text-white">
                  {t("settings.save_btn")}
                </Text>
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}
