import { Ionicons } from "@expo/vector-icons";
import { zodResolver } from "@hookform/resolvers/zod";
import * as AppleAuthentication from "expo-apple-authentication";
import { makeRedirectUri } from "expo-auth-session";
import { Image } from "expo-image";
import { Link } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { useColorScheme } from "nativewind";
import React, { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import {
  ActivityIndicator,
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
import { supabase } from "@/lib/supabase";
import { SignupSchema, SignupSchemaType } from "@/zodSchemas";

WebBrowser.maybeCompleteAuthSession();

import PENGUIN_LOGO from "@/assets/images/greeter.png";
import TEXT_LOGO from "@/assets/images/icon-text-dark.png";
import { PressableOpacity, PressableScale } from "pressto";

const SignupScreen = () => {
  const { t } = useTranslation();
  const { colorScheme } = useColorScheme();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const schema = SignupSchema(t);
  const {
    control,
    handleSubmit,
    formState: { errors },
    watch,
  } = useForm<SignupSchemaType>({
    resolver: zodResolver(schema),
    defaultValues: { email: "", pwd: "", confirmPwd: "" },
  });

  const email = watch("email");
  const pwd = watch("pwd");
  const confirmPwd = watch("confirmPwd");

  // Logic: Enable button only if all fields have content
  const isFormValid =
    email?.trim() !== "" && pwd?.trim() !== "" && confirmPwd?.trim() !== "";

  const PressableFinal =
    Platform.OS === "web" ? PressableOpacity : PressableScale;

  // --- 1. EMAIL SIGNUP ---
  const onSignup = async (data: SignupSchemaType) => {
    setLoading(true);
    try {
      const { data: sessionData, error } = await supabase.auth.signUp({
        email: data.email,
        password: data.pwd,
      });

      if (error) throw error;

      // Supabase usually requires email verification by default.
      if (sessionData.session) {
        // Show Success Toast
        Toast.show({
          type: "success",
          text1: t("auth.signup_success_title"),
          text2: t("auth.signup_success_message"),
        });
      }
    } catch (e: any) {
      // Show Error Toast
      Toast.show({
        type: "error",
        text1: t("auth.signup_failed"),
        text2: e.message || t("errors.generic"),
      });
    } finally {
      setLoading(false);
    }
  };

  // --- 2. SOCIAL LOGIN ---
  const onGoogleLogin = async () => {
    setLoading(true);
    try {
      const redirectUrl =
        Platform.OS === "web"
          ? window.location.origin
          : makeRedirectUri({
              scheme: "brainguin",
              path: "auth/callback",
            });

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: redirectUrl,
          skipBrowserRedirect: Platform.OS !== "web", // Let Web handle it automatically
        },
      });

      if (error) throw error;

      // --- MOBILE FLOW ---
      if (Platform.OS !== "web" && data?.url) {
        const result = await WebBrowser.openAuthSessionAsync(
          data.url,
          redirectUrl,
        );

        if (result.type === "success" && result.url) {
          const fragment = result.url.split("#")[1] || result.url.split("?")[1];
          const params = new URLSearchParams(fragment);
          const access_token = params.get("access_token");
          const refresh_token = params.get("refresh_token");

          if (access_token && refresh_token) {
            // 2. Set Supabase Session
            const { data: sessionData, error: sessionError } =
              await supabase.auth.setSession({
                access_token,
                refresh_token,
              });

            if (sessionError) throw sessionError;

            // 🚨 ADDED: Explicitly tell the user we are done
            if (sessionData.session) {
              // Ensure the store is updated manually just in case the listener is slow
              Toast.show({
                type: "success",
                text1: t("auth.login_success_title"),
              });
            }
          }
        }
      }
      // --- WEB FLOW ---
      // On Web, Supabase redirects the entire window, so code after this point
      // usually won't even execute as the page reloads.
    } catch (e: any) {
      Toast.show({
        type: "error",
        text1: t("auth.social_login_failed"),
        text2: e.message,
      });
    } finally {
      setLoading(false);
    }
  };

  const onAppleLogin = async () => {
    try {
      setLoading(true);
      // 1. Request Credentials from Apple
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });

      if (credential.identityToken) {
        // 2. Exchange Apple ID Token for Supabase Session
        const { data, error } = await supabase.auth.signInWithIdToken({
          provider: "apple",
          token: credential.identityToken,
        });

        if (error) throw error;

        // 3. Set Session in Zustand and check Onboarding
        if (data.session) {
          Toast.show({
            type: "success",
            text1: t("auth.login_success_title"),
          });
        }
      }
    } catch (e: any) {
      // Don't show error if user just cancelled the modal
      if (e.code !== "ERR_REQUEST_CANCELED") {
        Toast.show({
          type: "error",
          text1: t("auth.social_login_failed"),
          text2: e.message || t("errors.generic"),
        });
      }
    } finally {
      setLoading(false);
    }
  };

  // Logic to check if we should show Apple Login
  // (Usually available on all browsers for web, but some prefer Safari checks)
  const isApple =
    Platform.OS === "ios" ||
    /Apple|Safari/.test(navigator.vendor) ||
    /iPhone|iPad|Mac/.test(navigator.userAgent);

  return (
    <SafeAreaView className="flex-1 bg-page-light dark:bg-page-dark lg:flex-row">
      {/* LEFT SIDE (Form) */}
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="w-full lg:w-1/2"
      >
        <ScrollView
          contentContainerStyle={{
            flexGrow: 1,
            padding: 24,
            // justifyContent: "center",
          }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          className="lg:max-w-md lg:self-center w-full"
        >
          <View className="flex-1 justify-center">
            {/* Mobile Logo */}
            <View className="items-center mb-8">
              <Image
                source={PENGUIN_LOGO}
                style={{ width: 120, height: 120, marginBottom: 10 }}
                contentFit="contain"
                className="lg:hidden"
              />
              <Text className="font-heading text-3xl text-text-main-light dark:text-text-main-dark font-bold text-center leading-tight">
                {t("auth.create_account")}
              </Text>
              <Text className="font-body text-text-muted-light dark:text-text-muted-dark text-center leading-tight">
                {t("auth.hook_ai_power")}
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
                      errors.email ? "border-status-hard" : ""
                    } focus:border-action outline-none`}
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
            <View className="mb-4">
              <Text className="font-body text-text-main-light dark:text-text-main-dark mb-1.5 ml-1 font-medium">
                {t("auth.password_label")}
              </Text>
              <Controller
                control={control}
                name="pwd"
                render={({ field: { onChange, onBlur, value } }) => (
                  <View className="relative justify-center">
                    <TextInput
                      className={`bg-input-light dark:bg-input-dark p-4 pr-12 rounded-xl font-body text-text-main-light dark:text-text-main-dark border border-card-light dark:border-card-dark ${
                        errors.pwd ? "border-status-hard" : ""
                      } focus:border-action outline-none`}
                      placeholder="••••••••"
                      placeholderTextColor="#94A3B8"
                      secureTextEntry={!showPassword}
                      onBlur={onBlur}
                      onChangeText={onChange}
                      value={value}
                    />
                    <Pressable
                      onPress={() => setShowPassword(!showPassword)}
                      className="absolute right-4 p-1"
                    >
                      <Ionicons
                        name={showPassword ? "eye-off-outline" : "eye-outline"}
                        size={22}
                        color={colorScheme === "dark" ? "#94A3B8" : "#64748B"}
                      />
                    </Pressable>
                  </View>
                )}
              />
              {errors.pwd && (
                <Text className="text-status-hard text-sm mt-1 ml-1 font-body">
                  {errors.pwd.message}
                </Text>
              )}
            </View>

            {/* Confirm Password Input */}
            <View className="mb-8">
              <Text className="font-body text-text-main-light dark:text-text-main-dark mb-1.5 ml-1 font-medium">
                {t("auth.confirm_password_label")}
              </Text>
              <Controller
                control={control}
                name="confirmPwd"
                render={({ field: { onChange, onBlur, value } }) => (
                  <View className="relative justify-center">
                    <TextInput
                      className={`bg-input-light dark:bg-input-dark p-4 pr-12 rounded-xl font-body text-text-main-light dark:text-text-main-dark border border-card-light dark:border-card-dark ${
                        errors.confirmPwd ? "border-status-hard" : ""
                      } focus:border-action outline-none`}
                      placeholder="••••••••"
                      placeholderTextColor="#94A3B8"
                      secureTextEntry={!showPassword}
                      onBlur={onBlur}
                      onChangeText={onChange}
                      value={value}
                    />
                    {/* We repeat the icon here so the user can toggle from either field */}
                    <Pressable
                      onPress={() => setShowPassword(!showPassword)}
                      className="absolute right-4 p-1"
                    >
                      <Ionicons
                        name={showPassword ? "eye-off-outline" : "eye-outline"}
                        size={22}
                        color={colorScheme === "dark" ? "#94A3B8" : "#64748B"}
                      />
                    </Pressable>
                  </View>
                )}
              />
              {errors.confirmPwd && (
                <Text className="text-status-hard text-sm mt-1 ml-1 font-body">
                  {errors.confirmPwd.message}
                </Text>
              )}
            </View>

            {/* Signup Button */}
            <PressableFinal
              onPress={() =>
                loading || !isFormValid ? null : handleSubmit(onSignup)()
              }
              activateOnHover
              style={{
                padding: 16,
                borderRadius: 12,
                alignItems: "center",
                marginBottom: 24,
                backgroundColor:
                  loading || !isFormValid ? "#94A3B8" : "#F97316",
                opacity: loading || !isFormValid ? 0.5 : 1,
                shadowColor: "#F97316",
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: loading || !isFormValid ? 0 : 0.2,
                shadowRadius: 8,
                elevation: loading || !isFormValid ? 0 : 4,
              }}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text className="text-white font-heading text-lg font-bold">
                  {t("auth.create_account_button")}
                </Text>
              )}
            </PressableFinal>

            {/* Login Link */}
            <View className="flex-row justify-center mb-8">
              <Text className="font-body text-text-muted-light dark:text-text-muted-dark mr-1">
                {t("auth.already_have_account")}
              </Text>
              <Link href="/(auth)" asChild>
                <Pressable>
                  <Text className="font-heading font-bold text-action">
                    {t("auth.login_link")}
                  </Text>
                </Pressable>
              </Link>
            </View>

            {/* Divider */}
            <View className="flex-row items-center mb-6">
              <View className="flex-1 h-[1px] bg-gray-200 dark:bg-gray-700" />
              <Text className="mx-4 text-text-muted-light dark:text-text-muted-dark font-body">
                {t("auth.or_signup_with")}
              </Text>
              <View className="flex-1 h-[1px] bg-gray-200 dark:bg-gray-700" />
            </View>

            {/* Social Buttons */}
            <View className="flex-row gap-4 justify-center">
              {/* <Pressable
              onPress={onGoogleLogin}
              className={clsx(
                "flex-1 p-4 rounded-xl flex-row justify-center items-center gap-2 border transition-all duration-200 active:scale-95",
                "bg-white dark:bg-card-dark border-gray-200 dark:border-gray-700",
                "hover:bg-slate-100 dark:hover:bg-slate-800",
              )}
            > */}
              <PressableFinal
                onPress={onGoogleLogin}
                style={{
                  flex: 1,
                  padding: 16,
                  borderRadius: 12,
                  flexDirection: "row",
                  justifyContent: "center",
                  alignItems: "center",
                  borderWidth: 1,
                  backgroundColor:
                    colorScheme === "dark" ? "#334155" : "#FFFFFF",
                  borderColor: colorScheme === "dark" ? "#374151" : "#E5E7EB",
                  gap: 4,
                }}
                activateOnHover
              >
                <Ionicons
                  name="logo-google"
                  size={20}
                  color={colorScheme === "dark" ? "#fff" : "#000"}
                />
                <Text className="font-heading font-semibold text-text-main-light dark:text-text-main-dark">
                  {t("auth.google")}
                </Text>
              </PressableFinal>

              {isApple ? (
                // <Pressable
                //   onPress={onAppleLogin}
                //   className={clsx(
                //     "flex-1 p-4 rounded-xl flex-row justify-center items-center gap-2 border transition-all duration-200 active:scale-95",
                //     "bg-black dark:bg-white border-black dark:border-white",
                //     "hover:bg-slate-900 dark:hover:bg-slate-100",
                //   )}
                // >
                <PressableFinal
                  onPress={onAppleLogin}
                  style={{
                    flex: 1,
                    padding: 16,
                    borderRadius: 12,
                    flexDirection: "row",
                    justifyContent: "center",
                    alignItems: "center",
                    borderWidth: 1,
                    backgroundColor:
                      colorScheme === "dark" ? "#FFFFFF" : "#000000",
                    borderColor: colorScheme === "dark" ? "#FFFFFF" : "#000000",
                    gap: 4,
                  }}
                  activateOnHover
                >
                  <Ionicons
                    name="logo-apple"
                    size={20}
                    color={colorScheme === "dark" ? "#000" : "#fff"}
                  />
                  <Text className="font-heading font-semibold text-white dark:text-black">
                    {t("auth.apple")}
                  </Text>
                </PressableFinal>
              ) : null}
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* RIGHT SIDE (Big Penguin) */}
      <View className="hidden lg:flex lg:w-1/2 bg-primary items-center justify-center p-12 relative overflow-hidden">
        <View className="absolute top-[-100] right-[-100] w-96 h-96 bg-white opacity-5 rounded-full" />
        <View className="absolute bottom-[-50] left-[-50] w-72 h-72 bg-action opacity-10 rounded-full" />

        <Image
          source={TEXT_LOGO}
          style={{
            width: "100%",
            maxWidth: 380,
            height: "100%",
            maxHeight: 100,
          }}
          contentFit="contain"
        />
        <Image
          source={PENGUIN_LOGO}
          style={{
            maxWidth: 400,
            width: "100%",
            height: "100%",
            maxHeight: 400,
          }}
          contentFit="contain"
        />
      </View>
    </SafeAreaView>
  );
};

export default SignupScreen;
