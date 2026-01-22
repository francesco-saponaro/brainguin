import { Ionicons } from "@expo/vector-icons";
import clsx from "clsx";
import { BlurView } from "expo-blur";
import { PressableScale } from "pressto";
import React from "react";
import { useTranslation } from "react-i18next"; // 1. Import hook
import { Modal, StyleSheet, Text, View } from "react-native";

interface ConfirmModalProps {
  visible: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  isDestructive?: boolean;
}

export default function ConfirmModal({
  visible,
  title,
  message,
  confirmLabel = "Confirm",
  onConfirm,
  onCancel,
  isDestructive = false,
}: ConfirmModalProps) {
  const { t } = useTranslation(); // 2. Initialize hook

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <BlurView intensity={20} tint="dark" style={StyleSheet.absoluteFill} />

        <View className="bg-page-light dark:bg-card-dark w-[90%] max-w-[400px] rounded-[40px] p-8 shadow-2xl items-center border border-black/5 dark:border-white/10">
          <View
            className={clsx(
              "w-20 h-20 rounded-full items-center justify-center mb-6",
              isDestructive ? "bg-red-500/10" : "bg-action/10",
            )}
          >
            <Ionicons
              name={isDestructive ? "alert-circle" : "help-circle"}
              size={44}
              color={isDestructive ? "#EF4444" : "#F97316"}
            />
          </View>

          <Text className="text-text-main-light dark:text-text-main-dark font-heading text-2xl font-bold text-center mb-3">
            {title}
          </Text>

          <Text className="text-text-muted-light dark:text-text-muted-dark font-body text-center mb-10 leading-6">
            {message}
          </Text>

          <View className="w-full gap-3">
            {/* CONFIRM BUTTON (Confirm or Delete) */}
            {/* <Pressable
              onPress={onConfirm}
              className={clsx(
                "w-full py-5 rounded-3xl items-center shadow-lg active:scale-95 transition-all duration-200",
                isDestructive
                  ? "bg-red-500 hover:bg-red-600" // Red shifts to deep red
                  : "bg-action hover:bg-orange-600", // Orange shifts to deep orange
              )}
            > */}
            <PressableScale
              onPress={onConfirm}
              style={{
                width: "100%",
                paddingVertical: 20,
                borderRadius: 24,
                alignItems: "center",
                backgroundColor: isDestructive ? "#EF4444" : "#F97316",
                // Shadow matching shadow-lg
                shadowColor: isDestructive ? "#EF4444" : "#F97316",
                shadowOffset: { width: 0, height: 10 },
                shadowOpacity: 0.2,
                shadowRadius: 15,
                elevation: 5,
              }}
              activateOnHover
            >
              <Text className="text-white font-heading font-bold text-lg">
                {confirmLabel}
              </Text>
            </PressableScale>

            {/* CANCEL BUTTON */}
            {/* <Pressable
              onPress={onCancel}
              className={clsx(
                "w-full py-5 rounded-3xl items-center transition-all duration-200 active:scale-95",
                // Neutral grey hover that works for both light and dark themes
                "hover:bg-black/5 dark:hover:bg-white/10",
              )}
            > */}
            <PressableScale
              onPress={onCancel}
              style={{
                width: "100%",
                paddingVertical: 20,
                borderRadius: 24,
                alignItems: "center",
              }}
              activateOnHover
            >
              <Text className="text-text-muted-light dark:text-text-muted-dark font-body font-bold text-lg">
                {t("common.cancel")}
              </Text>
            </PressableScale>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    alignItems: "center",
    justifyContent: "center",
  },
});
