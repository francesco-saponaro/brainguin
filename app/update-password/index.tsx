import PENGUIN_LOGO from "@/assets/images/main.png";
import { supabase } from "@/lib/supabase";
import { zodResolver } from "@hookform/resolvers/zod";
import { Image } from "expo-image";
import { useLocalSearchParams, useRouter } from "expo-router"; // Standard Hook
import { PressableOpacity, PressableScale } from "pressto";
import React, { useEffect, useState } from "react";
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
import { SafeAreaView } from "react-native-safe-area-context";
import Toast from "react-native-toast-message";
import { z } from "zod";

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

const UpdatePasswordScreen = () => {
  const router = useRouter();
  // ✅ NOW THIS WILL WORK because RootLayout converted # to ?
  const params = useLocalSearchParams();
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const schema = UpdatePasswordSchema(t);
  const {
    control,
    handleSubmit,
    formState: { errors, isValid },
  } = useForm<UpdatePasswordType>({
    resolver: zodResolver(schema),
    defaultValues: { password: "", confirmPassword: "" },
    mode: "onChange",
  });
  const PressableFinal =
    Platform.OS === "web" ? PressableOpacity : PressableScale;

  // Automatically restore session when params arrive
  useEffect(() => {
    const restoreSession = async () => {
      // Handle array possibility from router
      const accessToken = Array.isArray(params.access_token)
        ? params.access_token[0]
        : params.access_token;
      const refreshToken = Array.isArray(params.refresh_token)
        ? params.refresh_token[0]
        : params.refresh_token;
      const errorDesc = Array.isArray(params.error_description)
        ? params.error_description[0]
        : params.error_description;

      if (errorDesc) {
        Toast.show({
          type: "error",
          text1: "Link Error",
          text2: errorDesc.replace(/\+/g, " "),
        });
        return;
      }

      if (accessToken && refreshToken) {
        console.log("🔓 Tokens detected. Restoring session...");
        const { error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });
        if (error) console.error("Session restore failed:", error.message);
        else console.log("✅ Session restored!");
      }
    };

    restoreSession();
  }, [params]);

  const onUpdate = async (data: UpdatePasswordType) => {
    setLoading(true);
    try {
      // 1. Ensure we have a session (handled by useEffect above)
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session)
        throw new Error("Session invalid. Please click the link again.");

      // 2. Update Password
      const { error } = await supabase.auth.updateUser({
        password: data.password,
      });

      if (error) throw error;

      Toast.show({ type: "success", text1: t("auth.password_updated_title") });
      setTimeout(() => {
        // 🚀 INSTANT CHECK ON LOGIN
        const metadataOnboarded =
          session.user.user_metadata?.is_onboarded ?? false;

        if (metadataOnboarded) {
          router.replace("/(tabs)");
        } else {
          router.replace("/onboarding");
        }
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
          {/* UI Components */}
          <View className="items-center mb-8">
            <Image
              source={PENGUIN_LOGO}
              style={{ width: 80, height: 80 }}
              className="mb-4"
              contentFit="contain"
            />
            <Text className="font-heading text-2xl font-bold text-text-main-light dark:text-text-main-dark text-center">
              {t("auth.set_new_password")}
            </Text>
          </View>

          <View className="mb-4">
            <Controller
              control={control}
              name="password"
              render={({ field: { onChange, onBlur, value } }) => (
                <TextInput
                  secureTextEntry
                  placeholder="••••••••"
                  onChangeText={onChange}
                  onBlur={onBlur}
                  value={value}
                  className="bg-input-light dark:bg-input-dark p-4 rounded-xl font-body text-text-main-light dark:text-text-main-dark border border-card-light dark:border-card-dark"
                  placeholderTextColor="#94A3B8"
                />
              )}
            />
            {errors.password && (
              <Text className="text-red-500 mt-1">
                {errors.password.message}
              </Text>
            )}
          </View>

          <View className="mb-8">
            <Controller
              control={control}
              name="confirmPassword"
              render={({ field: { onChange, onBlur, value } }) => (
                <TextInput
                  secureTextEntry
                  placeholder="••••••••"
                  onChangeText={onChange}
                  onBlur={onBlur}
                  value={value}
                  className="bg-input-light dark:bg-input-dark p-4 rounded-xl font-body text-text-main-light dark:text-text-main-dark border border-card-light dark:border-card-dark"
                  placeholderTextColor="#94A3B8"
                />
              )}
            />
            {errors.confirmPassword && (
              <Text className="text-red-500 mt-1 ml-1 text-sm font-medium">
                {errors.confirmPassword.message}
              </Text>
            )}
          </View>

          <PressableFinal
            onPress={() =>
              loading || !isValid ? null : handleSubmit(onUpdate)()
            }
            style={{
              backgroundColor: "#F97316",
              padding: 16,
              borderRadius: 12,
              alignItems: "center",
              opacity: loading || !isValid ? 0.6 : 1,
              pointerEvents: loading || !isValid ? "none" : "auto",
            }}
            activateOnHover
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text className="text-white font-bold text-lg">
                {t("auth.update_password_button")}
              </Text>
            )}
          </PressableFinal>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default UpdatePasswordScreen;
