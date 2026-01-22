import { supabase } from "@/lib/supabase";
import { Ionicons } from "@expo/vector-icons";
import { zodResolver } from "@hookform/resolvers/zod";
import { useColorScheme } from "nativewind";
import { PressableScale } from "pressto";
import React, { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import Toast from "react-native-toast-message"; // <--- 1. IMPORT TOAST
import { z } from "zod";

// --- Validation Schema with i18n ---
const ForgotPasswordSchema = (t: any) =>
  z.object({
    email: z.string().email({ message: t("formValidations.invalidEmail") }),
  });

type ForgotPasswordType = z.infer<ReturnType<typeof ForgotPasswordSchema>>;

interface Props {
  onClose: () => void;
}

const ForgotPasswordModal = ({ onClose }: Props) => {
  const { t } = useTranslation();
  const { colorScheme } = useColorScheme();
  const [loading, setLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const schema = ForgotPasswordSchema(t); // Pass t to schema
  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordType>({
    resolver: zodResolver(schema),
    defaultValues: { email: "" },
  });

  // --- Supabase Recovery Logic ---
  const onResetPassword = async (data: ForgotPasswordType) => {
    setLoading(true);
    try {
      const resetPasswordURL =
        Platform.OS === "web"
          ? "http://localhost:8081/update-password"
          : "brainguin://link-to-reset-password";

      const { error } = await supabase.auth.resetPasswordForEmail(data.email, {
        redirectTo: resetPasswordURL,
      });

      if (error) throw error;

      setIsSuccess(true);

      // Optional: Show a success Toast as well
      Toast.show({
        type: "success",
        text1: t("auth.email_sent"),
        text2: t("auth.check_inbox"),
      });
    } catch (e: any) {
      // Use Toast for errors
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
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      className="flex-1 bg-page-light dark:bg-page-dark"
    >
      <ScrollView
        contentContainerStyle={{
          flexGrow: 1,
          padding: 24,
          justifyContent: "center",
        }}
      >
        {/* Close Button */}
        {/* <Pressable
          onPress={onClose}
          className={clsx(
            "absolute top-12 left-6 p-2 rounded-full z-10 transition-all duration-200 active:scale-90",
            "bg-slate-100 dark:bg-slate-800",
            "hover:bg-slate-200 dark:hover:bg-slate-700"
          )}
        > */}
        <PressableScale
          onPress={onClose}
          style={{
            position: "absolute",
            top: 48,
            left: 24,
            padding: 8,
            borderRadius: 99,
            zIndex: 10,
            backgroundColor: colorScheme === "dark" ? "#1E293B" : "#F1F5F9",
          }}
          activateOnHover
        >
          <Ionicons name="close" size={24} color="#64748B" />
        </PressableScale>

        <View className="items-center max-w-md self-center w-full">
          {/* Icon */}
          <View className="bg-orange-100 dark:bg-slate-800 p-6 rounded-full mb-6">
            <Ionicons name="lock-open" size={40} color="#F97316" />
          </View>

          <Text className="font-heading text-3xl font-bold text-text-main-light dark:text-text-main-dark text-center mb-2">
            {t("auth.forgot_password")}
          </Text>

          <Text className="font-body text-text-muted-light dark:text-text-muted-dark text-center mb-8 px-4">
            {isSuccess
              ? t("auth.recovery_link_sent")
              : t("auth.recovery_instructions")}
          </Text>

          {isSuccess ? (
            // --- SUCCESS STATE ---
            // <Pressable
            //   onPress={onClose}
            //   className={clsx(
            //     "w-full p-4 rounded-xl items-center shadow-sm transition-all duration-200 active:scale-95",
            //     "bg-action hover:bg-orange-600 dark:hover:bg-orange-400 shadow-action/30",
            //   )}
            // >
            <PressableScale
              onPress={onClose}
              style={{
                width: "100%",
                padding: 16,
                borderRadius: 12,
                alignItems: "center",
                backgroundColor: "#F97316",
                shadowColor: "#F97316",
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.2,
                shadowRadius: 8,
                elevation: 4,
              }}
              activateOnHover
            >
              <Text className="text-white font-heading text-lg font-bold">
                {t("auth.back_to_login")}
              </Text>
            </PressableScale>
          ) : (
            // --- FORM STATE ---
            <View className="w-full">
              {/* Email Input */}
              <View className="mb-6">
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

              {/* Submit Button */}
              {/* <Pressable
                onPress={handleSubmit(onResetPassword)}
                disabled={loading}
                className={clsx(
                  "w-full p-4 rounded-xl items-center shadow-sm transition-all duration-200 active:scale-95",
                  loading
                    ? "bg-slate-400 opacity-50"
                    : "bg-action hover:bg-orange-600 dark:hover:bg-orange-400 shadow-action/30",
                )}
              > */}
              <PressableScale
                onPress={() => handleSubmit(onResetPassword)()}
                style={{
                  width: "100%",
                  padding: 16,
                  borderRadius: 12,
                  alignItems: "center",
                  backgroundColor: loading ? "#94A3B8" : "#F97316",
                  opacity: loading ? 0.5 : 1,
                  shadowColor: "#F97316",
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: loading ? 0 : 0.2,
                  shadowRadius: 8,
                  elevation: loading ? 0 : 4,
                }}
                activateOnHover
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text className="text-white font-heading text-lg font-bold">
                    {t("auth.send_reset_link")}
                  </Text>
                )}
              </PressableScale>
            </View>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

export default ForgotPasswordModal;
