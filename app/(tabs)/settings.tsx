import { Colors } from "@/constants/theme";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/store/storeUser";
import { Ionicons } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import clsx from "clsx";
import * as Linking from "expo-linking";
import * as Notifications from "expo-notifications";
import { useRouter } from "expo-router";
import { useColorScheme } from "nativewind";
import { PressableScale } from "pressto";
import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Alert,
  Modal,
  Platform,
  ScrollView,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Toast from "react-native-toast-message";

export default function SettingsScreen() {
  const router = useRouter();
  const { session, signOut } = useAuthStore();
  const { colorScheme, setColorScheme } = useColorScheme();
  const { t, i18n } = useTranslation();
  const insets = useSafeAreaInsets();
  const isDark = colorScheme === "dark";

  // --- STATE ---
  const [profile, setProfile] = useState<any>(null);
  const [isEditingName, setIsEditingName] = useState(false);
  const [tempName, setTempName] = useState("");
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [notificationTime, setNotificationTime] = useState(new Date());
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [isPro, setIsPro] = useState(false);

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
        setNotificationsEnabled(data.is_notifications_enabled || false);

        if (data.notification_time) {
          const [hours, minutes] = data.notification_time.split(":");
          const date = new Date();
          date.setHours(parseInt(hours), parseInt(minutes));
          setNotificationTime(date);
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
    await updateProfile({ full_name: tempName });
    setIsEditingName(false);
    Toast.show({ type: "success", text1: t("settings.name_updated_toast") });
  };

  const toggleNotifications = async (value: boolean) => {
    setNotificationsEnabled(value);

    if (value) {
      const { status } = await Notifications.requestPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          t("settings.notification_permission_title"),
          t("settings.notification_permission_msg"),
        );
        setNotificationsEnabled(false);
        return;
      }
      await scheduleNotification(notificationTime);
    } else {
      await Notifications.cancelAllScheduledNotificationsAsync();
    }

    updateProfile({ is_notifications_enabled: value });
  };

  const handleTimeChange = async (event: any, selectedDate?: Date) => {
    if (Platform.OS === "android") setShowTimePicker(false);

    if (selectedDate) {
      setNotificationTime(selectedDate);
      const timeString = selectedDate.toTimeString().split(" ")[0];
      await updateProfile({ notification_time: timeString });

      if (notificationsEnabled) {
        await scheduleNotification(selectedDate);
      }
    }
  };

  const scheduleNotification = async (date: Date) => {
    await Notifications.cancelAllScheduledNotificationsAsync();
    await Notifications.scheduleNotificationAsync({
      content: {
        title: "Time to Study! 🐧",
        body: "Your daily cards are ready for review.",
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.CALENDAR,
        hour: date.getHours(),
        minute: date.getMinutes(),
        repeats: true,
      },
    });
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      t("settings.delete_alert_title"),
      t("settings.delete_alert_msg"),
      [
        { text: t("common.cancel"), style: "cancel" },
        {
          text: t("common.delete"),
          style: "destructive",
          onPress: async () => {
            try {
              const { error } = await supabase.rpc("delete_user");
              if (error) throw error;
              signOut();
            } catch (e: any) {
              Alert.alert("Error", e.message);
            }
          },
        },
      ],
    );
  };

  const changeLanguage = (lang: string) => {
    i18n.changeLanguage(lang);
    updateProfile({ preferences: { ...profile?.preferences, language: lang } });
  };

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
  }: any) => (
    <PressableScale
      onPress={onPress}
      activateOnHover={!!onPress}
      style={{
        flexDirection: "row",
        alignItems: "center",
        padding: 16,
        backgroundColor: isDark ? Colors.dark.card : Colors.light.card,
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
    </PressableScale>
  );

  return (
    <View className="flex-1 bg-page-light dark:bg-page-dark">
      <ScrollView
        contentContainerStyle={{
          paddingTop: insets.top + 20,
          paddingBottom: 40,
        }}
        showsVerticalScrollIndicator={false}
      >
        <View className="px-6 mb-6">
          <Text className="text-text-main-light dark:text-text-main-dark font-heading text-4xl font-bold">
            {t("settings.header_title")}
          </Text>
        </View>

        {/* A. PROFILE HEADER */}
        <View className="mx-4 mb-6 p-6 rounded-[32px] bg-card-light dark:bg-card-dark border border-black/5 dark:border-white/5 flex-row items-center shadow-sm">
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

          <PressableScale
            onPress={() => setIsEditingName(true)}
            activateOnHover
            style={{
              padding: 10,
              backgroundColor: isDark
                ? "rgba(255,255,255,0.1)"
                : "rgba(0,0,0,0.05)",
              borderRadius: 16,
            }}
          >
            <Ionicons name="pencil" size={20} color={Colors.brand.action} />
          </PressableScale>
        </View>

        {/* B. SUBSCRIPTION */}
        <SectionHeader title={t("settings.section_membership")} />
        <View className="mx-4 rounded-3xl overflow-hidden border border-black/5 dark:border-white/5">
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
            onPress={() => {
              if (Platform.OS === "ios")
                Linking.openURL("https://apps.apple.com/account/subscriptions");
              else
                Linking.openURL(
                  "https://play.google.com/store/account/subscriptions",
                );
            }}
          />
          <SettingRow
            icon="refresh"
            label={t("settings.restore_purchases")}
            onPress={() => router.push("/paywall")}
          />
        </View>

        {/* C. PREFERENCES */}
        <SectionHeader title={t("settings.section_preferences")} />
        <View className="mx-4 rounded-3xl overflow-hidden border border-black/5 dark:border-white/5">
          <SettingRow
            icon={isDark ? "moon" : "sunny"}
            label={t("settings.theme")}
            rightElement={
              <View className="flex-row bg-black/5 dark:bg-white/10 rounded-full p-1">
                {["light", "dark", "system"].map((themeKey) => (
                  <PressableScale
                    key={themeKey}
                    onPress={() => setColorScheme(themeKey as any)}
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
                  </PressableScale>
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
                  <PressableScale
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
                  </PressableScale>
                ))}
              </View>
            }
          />
        </View>

        {/* D. NOTIFICATIONS */}
        <SectionHeader title={t("settings.section_notifications")} />
        <View className="mx-4 rounded-3xl overflow-hidden border border-black/5 dark:border-white/5">
          <SettingRow
            icon="notifications"
            label={t("settings.daily_reminder")}
            rightElement={
              <Switch
                value={notificationsEnabled}
                onValueChange={toggleNotifications}
                trackColor={{ false: "#767577", true: Colors.brand.action }}
                thumbColor={"#f4f3f4"}
              />
            }
          />
          {notificationsEnabled && (
            <SettingRow
              icon="time"
              label={t("settings.reminder_time")}
              value={notificationTime.toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })}
              onPress={() => setShowTimePicker(true)}
            />
          )}
        </View>

        {/* E. DANGER ZONE */}
        <SectionHeader title={t("settings.section_account")} />
        <View className="mx-4 rounded-3xl overflow-hidden border border-black/5 dark:border-white/5">
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
            onPress={handleDeleteAccount}
          />
        </View>

        <Text className="text-center text-text-muted-light dark:text-text-muted-dark text-xs mt-8 mb-4 opacity-50">
          BrainGuin v1.0.0 • Made with 🧊
        </Text>
      </ScrollView>

      {/* MODALS */}
      <Modal visible={isEditingName} transparent animationType="fade">
        <View className="flex-1 bg-black/50 items-center justify-center px-6">
          <View className="bg-page-light dark:bg-page-dark w-full max-w-sm rounded-3xl p-6 shadow-2xl border border-black/5 dark:border-white/10">
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
              <PressableScale
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
              </PressableScale>
              <PressableScale
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
              </PressableScale>
            </View>
          </View>
        </View>
      </Modal>

      {showTimePicker && Platform.OS === "android" && (
        <DateTimePicker
          value={notificationTime}
          mode="time"
          is24Hour={true}
          display="default"
          onChange={handleTimeChange}
        />
      )}

      {Platform.OS === "ios" && showTimePicker && (
        <Modal transparent animationType="slide">
          <View className="flex-1 justify-end">
            <View className="bg-card-light dark:bg-card-dark pb-8">
              <View className="flex-row justify-between p-4 border-b border-black/5 dark:border-white/5">
                <PressableScale onPress={() => setShowTimePicker(false)}>
                  <Text className="text-text-muted-light">
                    {t("settings.cancel_btn")}
                  </Text>
                </PressableScale>
                <PressableScale onPress={() => setShowTimePicker(false)}>
                  <Text className="text-action font-bold">Done</Text>
                </PressableScale>
              </View>
              <DateTimePicker
                value={notificationTime}
                mode="time"
                display="spinner"
                onChange={handleTimeChange}
                textColor={isDark ? "white" : "black"}
              />
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
}
