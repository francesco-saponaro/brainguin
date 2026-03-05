import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/store/storeUser";
import { Ionicons } from "@expo/vector-icons";
import { useColorScheme } from "nativewind";
import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ActivityIndicator,
  Keyboard,
  Platform,
  Pressable,
  Text,
  TextInput,
  View,
} from "react-native";
import { Modalize } from "react-native-modalize";
import { Portal } from "react-native-portalize";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Toast from "react-native-toast-message";

interface FeedbackModalProps {
  modalRef: React.RefObject<any>; // Using any or Modalize | null
}

export default function FeedbackModal({ modalRef }: FeedbackModalProps) {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const { session } = useAuthStore();

  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (message.trim().length < 5) {
      Toast.show({
        type: "error",
        text1: t("feedback.too_short", "Message too short!"),
      });
      return;
    }

    Keyboard.dismiss();
    setIsSubmitting(true);

    try {
      // 🚨 Calls the Resend Edge Function
      const { error } = await supabase.functions.invoke("feedback-email", {
        body: {
          userEmail: session?.user?.email || "Unknown Email",
          userId: session?.user?.id || "Unauthenticated",
          message: message.trim(),
        },
      });

      if (error) throw error;

      Toast.show({
        type: "success",
        text1: t("feedback.success", "Feedback sent! Thank you 💙"),
      });

      setMessage("");
      modalRef.current?.close();
    } catch (error) {
      console.error("Feedback error:", error);
      Toast.show({
        type: "error",
        text1: t("errors.generic"),
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Portal>
      <Modalize
        ref={modalRef}
        keyboardAvoidingBehavior={Platform.OS === "ios" ? "padding" : "height"}
        adjustToContentHeight
        panGestureEnabled={true}
        closeOnOverlayTap={true}
        modalStyle={{
          backgroundColor: isDark ? "#1E293B" : "#F8FAFC",
          borderTopLeftRadius: 32,
          borderTopRightRadius: 32,
          zIndex: 9999999999,
        }}
        childrenStyle={{
          paddingHorizontal: 24,
          paddingTop: 30,
          // Apply inset padding here to ensure it pushes content up
          paddingBottom: insets.bottom,
        }}
        handlePosition="inside"
        handleStyle={{
          backgroundColor: isDark ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.2)",
        }}
      >
        <View className="flex-row justify-between items-center mb-4 mt-2">
          <View className="flex-row items-center gap-2">
            <View className="bg-action/20 p-2 rounded-xl">
              <Ionicons name="paper-plane" size={24} color="#F97316" />
            </View>
            <Text className="text-text-main-light dark:text-text-main-dark font-heading font-bold text-2xl">
              {t("feedback.title", "Send Feedback")}
            </Text>
          </View>
          <Pressable
            onPress={() => modalRef.current?.close()}
            style={{
              backgroundColor: isDark
                ? "rgba(255,255,255,0.1)"
                : "rgba(0,0,0,0.05)",
              padding: 8,
              borderRadius: 99,
            }}
          >
            <Ionicons
              name="close"
              size={20}
              color={isDark ? "#94A3B8" : "#64748B"}
            />
          </Pressable>
        </View>

        <Text className="text-text-muted-light dark:text-text-muted-dark text-base mb-6 leading-relaxed">
          {t(
            "feedback.desc",
            "We are constantly trying to improve. Tell us what you love, what you hate, or what feature you want next!",
          )}
        </Text>

        <TextInput
          className="bg-input-light dark:bg-input-dark p-4 rounded-2xl text-text-main-light dark:text-text-main-dark font-body border border-black/5 dark:border-white/5"
          style={{ height: 150, textAlignVertical: "top" }}
          placeholder={t("feedback.placeholder", "Type your ideas here...")}
          placeholderTextColor="#94A3B8"
          value={message}
          onChangeText={setMessage}
          multiline
        />

        <Pressable
          onPress={isSubmitting ? undefined : handleSubmit}
          style={{
            marginTop: 24,
            backgroundColor: "#F97316",
            width: "100%",
            paddingVertical: 16,
            borderRadius: 16,
            alignItems: "center",
            opacity: isSubmitting ? 0.7 : 1,
          }}
        >
          {isSubmitting ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text className="text-white font-bold text-lg">
              {t("feedback.submit", "Send Message")}
            </Text>
          )}
        </Pressable>
      </Modalize>
    </Portal>
  );
}
