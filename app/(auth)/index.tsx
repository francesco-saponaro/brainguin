import { Ionicons } from "@expo/vector-icons";
import { zodResolver } from "@hookform/resolvers/zod";
import { makeRedirectUri } from "expo-auth-session";
import { Link } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { useColorScheme } from "nativewind";
import React, { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Toast from "react-native-toast-message"; // <--- 1. IMPORT TOAST

// Internal Imports
import ForgotPasswordModal from "@/components/ForgotPasswordModal";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/store/storeUser";
import { LoginSchema, LoginSchemaType } from "@/zodSchemas";

// Handles WebBrowser cleanup on Web
WebBrowser.maybeCompleteAuthSession();

const PENGUIN_LOGO = require("@/assets/images/main.png");

const LoginScreen = () => {
  const { t } = useTranslation();
  const { colorScheme } = useColorScheme();
  const setSession = useAuthStore((state) => state.setSession);
  const [loading, setLoading] = useState(false);
  const [recoverVisible, setRecoverVisible] = useState<boolean>(false);

  const schema = LoginSchema(t);
  const {
    control,
    handleSubmit,
    formState: { errors },
    watch,
  } = useForm<LoginSchemaType>({
    resolver: zodResolver(schema),
    defaultValues: { email: "", pwd: "" },
  });

  const email = watch("email");
  const pwd = watch("pwd");
  const isFormValid = email?.trim() !== "" && pwd?.trim() !== "";

  // --- 1. EMAIL & PASSWORD LOGIN ---
  const onLogin = async (data: LoginSchemaType) => {
    setLoading(true);
    try {
      const { data: sessionData, error } =
        await supabase.auth.signInWithPassword({
          email: data.email,
          password: data.pwd,
        });

      if (error) throw error;

      if (sessionData.session) {
        setSession(sessionData.session);

        // Show Success Toast
        Toast.show({
          type: "success",
          text1: t("auth.login_success_title"),
          text2: t("auth.login_success_message"),
        });
      }
    } catch (e: any) {
      // Show Error Toast instead of Alert
      Toast.show({
        type: "error",
        text1: t("auth.login_failed"),
        text2: e.message || t("errors.generic"),
      });
    } finally {
      setLoading(false);
    }
  };

  // --- 2. SOCIAL LOGIN ---
  const onSocialLogin = async (provider: "google" | "apple") => {
    try {
      setLoading(true);

      const redirectUrl = makeRedirectUri({
        scheme: "brainguin",
        path: "auth/callback",
      });

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: provider,
        options: {
          redirectTo: redirectUrl,
          skipBrowserRedirect: Platform.OS !== "web",
        },
      });

      if (error) throw error;

      if (Platform.OS !== "web" && data.url) {
        const result = await WebBrowser.openAuthSessionAsync(
          data.url,
          redirectUrl
        );
        // Toast will likely be handled by the auth state listener,
        // but we can add one here if needed for specific flows.
      }
    } catch (e: any) {
      Toast.show({
        type: "error",
        text1: t("auth.social_login_failed"),
        text2: e.message || t("errors.generic"),
      });
    } finally {
      setLoading(false);
    }
  };

  if (recoverVisible) {
    return <ForgotPasswordModal onClose={() => setRecoverVisible(false)} />;
  }

  return (
    <SafeAreaView className="flex-1 bg-page-light dark:bg-page-dark lg:flex-row">
      {/* LEFT SIDE (Form) */}
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1 w-full lg:w-1/2"
      >
        <ScrollView
          contentContainerStyle={{
            flexGrow: 1,
            padding: 24,
            justifyContent: "center",
          }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          className="lg:max-w-md lg:self-center w-full"
        >
          {/* Mobile Logo */}
          <View className="items-center mb-8">
            <Image
              source={PENGUIN_LOGO}
              style={{ width: 100, height: 100, resizeMode: "contain" }}
              className="mb-4 lg:hidden"
            />
            <Text className="font-heading text-3xl text-text-main-light dark:text-text-main-dark font-bold text-center">
              {t("auth.welcome_back")}
            </Text>
            <Text className="font-body text-text-muted-light dark:text-text-muted-dark text-center mt-2">
              {t("auth.subtitle")}
            </Text>
          </View>

          {/* Email Input */}
          <View className="mb-4">
            <Text className="font-body text-text-main-light dark:text-text-main-dark mb-1.5 ml-1 font-medium">
              {t("auth.email_label")}
            </Text>
            <Controller
              control={control}
              name="email"
              render={({ field: { onChange, onBlur, value } }) => (
                <TextInput
                  className={`bg-input-light dark:bg-input-dark p-4 rounded-xl font-body text-text-main-light dark:text-text-main-dark border border-card-light dark:border-card-dark ${
                    errors.email ? "border-status-hard" : "border-transparent"
                  } focus:border-action`}
                  placeholder={t("auth.email_placeholder")}
                  placeholderTextColor="#94A3B8"
                  onBlur={onBlur}
                  onChangeText={onChange}
                  value={value}
                  autoCapitalize="none"
                  keyboardType="email-address"
                />
              )}
            />
            {errors.email && (
              <Text className="text-status-hard text-sm mt-1 ml-1 font-body">
                {errors.email.message}
              </Text>
            )}
          </View>

          {/* Password Input */}
          <View className="mb-2">
            <Text className="font-body text-text-main-light dark:text-text-main-dark mb-1.5 ml-1 font-medium">
              {t("auth.password_placeholder")}
            </Text>
            <Controller
              control={control}
              name="pwd"
              render={({ field: { onChange, onBlur, value } }) => (
                <TextInput
                  className={`bg-input-light dark:bg-input-dark p-4 rounded-xl font-body text-text-main-light dark:text-text-main-dark border border-card-light dark:border-card-dark ${
                    errors.pwd ? "border-status-hard" : ""
                  } focus:border-action`}
                  placeholder="••••••••"
                  placeholderTextColor="#94A3B8"
                  secureTextEntry
                  onBlur={onBlur}
                  onChangeText={onChange}
                  value={value}
                />
              )}
            />
            {errors.pwd && (
              <Text className="text-status-hard text-sm mt-1 ml-1 font-body">
                {errors.pwd.message}
              </Text>
            )}
          </View>

          <Pressable
            onPress={() => setRecoverVisible(true)}
            className="self-end mb-6"
          >
            <Text className="text-action font-body font-medium">
              {t("auth.forgot_password")}
            </Text>
          </Pressable>

          {/* Main Login Button */}
          <Pressable
            onPress={handleSubmit(onLogin)}
            disabled={loading || !isFormValid}
            className={`p-4 rounded-xl items-center shadow-sm mb-6 hover:brightness-90 transition-all duration-250 ${
              loading || !isFormValid
                ? "bg-slate-400 opacity-50"
                : "bg-action active:bg-action-hover"
            }`}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text className="text-white font-heading text-lg font-bold">
                {t("auth.login_button")}
              </Text>
            )}
          </Pressable>

          <View className="flex-row justify-center mb-8">
            <Text className="font-body text-text-muted-light dark:text-text-muted-dark mr-1">
              {t("auth.dont_have_account")}
            </Text>
            <Link href="/(auth)/signup" asChild>
              <Pressable>
                <Text className="font-heading font-bold text-action">
                  {t("auth.dont_have_account_link")}
                </Text>
              </Pressable>
            </Link>
          </View>

          {/* Divider */}
          <View className="flex-row items-center mb-6">
            <View className="flex-1 h-[1px] bg-gray-200 dark:bg-gray-700" />
            <Text className="mx-4 text-text-muted-light dark:text-text-muted-dark font-body">
              {t("auth.or_continue")}
            </Text>
            <View className="flex-1 h-[1px] bg-gray-200 dark:bg-gray-700" />
          </View>

          {/* Social Buttons */}
          <View className="flex-row gap-4 justify-center">
            <Pressable
              onPress={() => onSocialLogin("google")}
              className="flex-1 bg-white dark:bg-card-dark border border-gray-200 dark:border-gray-700 p-4 rounded-xl flex-row justify-center items-center gap-2 hover:brightness-90 transition-all duration-250"
            >
              <Ionicons
                name="logo-google"
                size={20}
                color={colorScheme === "dark" ? "#fff" : "#000"}
              />
              <Text className="font-heading font-semibold text-text-main-light dark:text-text-main-dark">
                {t("auth.google")}
              </Text>
            </Pressable>

            <Pressable
              onPress={() => onSocialLogin("apple")}
              className="flex-1 bg-black dark:bg-white border border-black dark:border-white p-4 rounded-xl flex-row justify-center items-center gap-2 hover:brightness-90 transition-all duration-250"
            >
              <Ionicons
                name="logo-apple"
                size={20}
                color={colorScheme === "dark" ? "#000" : "#fff"}
              />
              <Text className="font-heading font-semibold text-white dark:text-black">
                {t("auth.apple")}
              </Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* RIGHT SIDE (Big Penguin) */}
      <View className="hidden lg:flex lg:w-1/2 bg-primary items-center justify-center p-12 relative overflow-hidden">
        <View className="absolute top-[-100] right-[-100] w-96 h-96 bg-white opacity-5 rounded-full" />
        <View className="absolute bottom-[-50] left-[-50] w-72 h-72 bg-action opacity-10 rounded-full" />

        <Image
          source={PENGUIN_LOGO}
          style={{ width: 500, height: 500, resizeMode: "contain" }}
          // className="shadow-2xl"
        />

        {/* <Text className="text-white font-heading text-4xl font-bold text-center mt-8">
          {t("auth.hero_title")}
        </Text>
        <Text className="text-slate-300 font-body text-xl text-center mt-4 max-w-lg">
          {t("auth.hero_subtitle")}
        </Text> */}
      </View>
    </SafeAreaView>
  );
};

export default LoginScreen;
