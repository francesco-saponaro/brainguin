import { Ionicons } from "@expo/vector-icons";
import { zodResolver } from "@hookform/resolvers/zod";
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
  TouchableOpacity,
  View,
} from "react-native";
import Toast from "react-native-toast-message"; // <--- 1. IMPORT TOAST
import { z } from "zod";

import { supabase } from "@/lib/supabase";

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
      const { error } = await supabase.auth.resetPasswordForEmail(data.email, {
        redirectTo: "brainguin://auth/update-password",
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
        <TouchableOpacity
          onPress={onClose}
          className="absolute top-12 left-6 p-2 rounded-full bg-slate-100 dark:bg-slate-800 z-10"
        >
          <Ionicons name="close" size={24} color="#64748B" />
        </TouchableOpacity>

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
            <TouchableOpacity
              onPress={onClose}
              className="w-full bg-action p-4 rounded-xl items-center shadow-sm"
            >
              <Text className="text-white font-heading text-lg font-bold">
                {t("auth.back_to_login")}
              </Text>
            </TouchableOpacity>
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
                      className={`bg-input-light dark:bg-input-dark p-4 rounded-xl font-body text-text-main-light dark:text-text-main-dark border ${
                        errors.email
                          ? "border-status-hard"
                          : "border-transparent"
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
              <TouchableOpacity
                onPress={handleSubmit(onResetPassword)}
                disabled={loading}
                className={`w-full p-4 rounded-xl items-center shadow-sm ${
                  loading ? "bg-slate-400" : "bg-action active:bg-action-hover"
                }`}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text className="text-white font-heading text-lg font-bold">
                    {t("auth.send_reset_link")}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

export default ForgotPasswordModal;
