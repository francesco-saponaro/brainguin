import { supabase } from "@/lib/supabase";
import { Ionicons } from "@expo/vector-icons";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Toast from "react-native-toast-message"; // <--- 1. IMPORT TOAST
import { z } from "zod";

// --- Validation Schema with i18n ---
const UpdatePasswordSchema = (t: any) =>
  z
    .object({
      password: z
        .string()
        .min(6, { message: t("formValidations.passwordTooShort") }),
      confirmPassword: z
        .string()
        .min(1, { message: t("formValidations.passwordRequired") }),
    })
    .refine((data) => data.password === data.confirmPassword, {
      message: t("formValidations.passwordsDoNotMatch"),
      path: ["confirmPassword"],
    });

type UpdatePasswordType = z.infer<ReturnType<typeof UpdatePasswordSchema>>;

const PENGUIN_LOGO = require("@/assets/images/main.png");

const UpdatePasswordScreen = () => {
  const router = useRouter();
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);

  const schema = UpdatePasswordSchema(t);
  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<UpdatePasswordType>({
    resolver: zodResolver(schema),
    defaultValues: { password: "", confirmPassword: "" },
  });

  // --- Update Logic ---
  const onUpdate = async (data: UpdatePasswordType) => {
    setLoading(true);
    try {
      // Supabase function to update the LOGGED IN user's password
      const { error } = await supabase.auth.updateUser({
        password: data.password,
      });

      if (error) throw error;

      // Show Success Toast
      Toast.show({
        type: "success",
        text1: t("auth.password_updated_title"),
        text2: t("auth.password_updated_message"),
      });

      // Navigate back after a short delay
      setTimeout(() => {
        router.replace("/(tabs)/home");
      }, 1500);
    } catch (e: any) {
      Toast.show({
        type: "error",
        text1: t("errors.generic"),
        text2: e.message,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-page-light dark:bg-page-dark">
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1"
      >
        <ScrollView
          contentContainerStyle={{
            flexGrow: 1,
            padding: 24,
            justifyContent: "center",
          }}
          className="max-w-md self-center w-full"
        >
          {/* Header */}
          <View className="items-center mb-8">
            <Image
              source={PENGUIN_LOGO}
              style={{ width: 80, height: 80, resizeMode: "contain" }}
              className="mb-4"
            />
            <Text className="font-heading text-2xl font-bold text-text-main-light dark:text-text-main-dark text-center">
              {t("auth.set_new_password")}
            </Text>
            <Text className="font-body text-text-muted-light dark:text-text-muted-dark text-center mt-2 px-4">
              {t("auth.set_new_password_subtitle")}
            </Text>
          </View>

          {/* New Password Input */}
          <View className="mb-4">
            <Text className="font-body text-text-main-light dark:text-text-main-dark mb-1.5 ml-1 font-medium">
              {t("auth.new_password_label")}
            </Text>
            <Controller
              control={control}
              name="password"
              render={({ field: { onChange, onBlur, value } }) => (
                <TextInput
                  className={`bg-input-light dark:bg-input-dark p-4 rounded-xl font-body text-text-main-light dark:text-text-main-dark border ${
                    errors.password
                      ? "border-status-hard"
                      : "border-transparent"
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
            {errors.password && (
              <Text className="text-status-hard text-sm mt-1 ml-1 font-body">
                {errors.password.message}
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
              name="confirmPassword"
              render={({ field: { onChange, onBlur, value } }) => (
                <TextInput
                  className={`bg-input-light dark:bg-input-dark p-4 rounded-xl font-body text-text-main-light dark:text-text-main-dark border ${
                    errors.confirmPassword
                      ? "border-status-hard"
                      : "border-transparent"
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
            {errors.confirmPassword && (
              <Text className="text-status-hard text-sm mt-1 ml-1 font-body">
                {errors.confirmPassword.message}
              </Text>
            )}
          </View>

          {/* Update Button */}
          <TouchableOpacity
            onPress={handleSubmit(onUpdate)}
            disabled={loading}
            className={`w-full p-4 rounded-xl items-center shadow-sm flex-row justify-center gap-2 ${
              loading ? "bg-slate-400" : "bg-action active:bg-action-hover"
            }`}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons
                  name="checkmark-circle-outline"
                  size={24}
                  color="white"
                />
                <Text className="text-white font-heading text-lg font-bold">
                  {t("auth.update_password_button")}
                </Text>
              </>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default UpdatePasswordScreen;
