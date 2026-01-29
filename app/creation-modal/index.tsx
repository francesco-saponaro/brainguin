import ThinkingState from "@/components/Creation/ThinkingState";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/store/storeUser";
import { Ionicons } from "@expo/vector-icons";
import * as DocumentPicker from "expo-document-picker";
// ❌ REMOVED: import * as FileSystem from "expo-file-system";
import { useLocalSearchParams, useRouter } from "expo-router";
import { PressableScale } from "pressto";
import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Keyboard,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Toast from "react-native-toast-message";

type InputType = "pdf" | "url" | "topic";

export default function CreationModal() {
  const insets = useSafeAreaInsets();
  const { type } = useLocalSearchParams<{ type: InputType }>();
  const router = useRouter();
  const colorScheme = useColorScheme();
  const { t } = useTranslation();
  const { session } = useAuthStore();
  const [isThinking, setIsThinking] = useState(false);

  const [activeType, setActiveType] = useState<InputType>(type || "pdf");
  const [inputText, setInputText] = useState("");
  const [selectedFile, setSelectedFile] = useState<any>(null);

  const handleCreateSubmit = async (
    inputType: "pdf" | "url" | "topic",
    inputData: any,
  ) => {
    if (!session?.user) {
      Toast.show({ type: "error", text1: t("login_required") });
      return;
    }

    try {
      // 🛑 STEP 1: CHECK LIMITS
      const { data: limitData, error: limitError } = await supabase.rpc(
        "check_user_limit",
        { user_uuid: session.user.id },
      );

      if (limitError) throw limitError;

      if (limitData.limit_reached) {
        router.replace("/paywall");
        return;
      }

      // ✅ STEP 2: PREPARE DATA
      setIsThinking(true);

      let payloadData = inputData;

      // --- HANDLE PDF CONVERSION (Modern Web API Approach) ---
      if (inputType === "pdf" && inputData.uri) {
        try {
          // 1. Fetch the file (works with content:// and file://)
          const response = await fetch(inputData.uri);
          const blob = await response.blob();

          // 2. Convert Blob to Base64 using FileReader
          const base64 = await new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => {
              // reader.result is like "data:application/pdf;base64,JVBER..."
              // We split to get just the Base64 string
              const base64String = (reader.result as string).split(",")[1];
              resolve(base64String);
            };
            reader.onerror = reject;
            reader.readAsDataURL(blob);
          });

          payloadData = base64;
        } catch (fileError) {
          console.error("PDF Processing Error:", fileError);
          throw new Error(t("pdf_processing"));
        }
      }

      // ✅ STEP 3: CALL EDGE FUNCTION
      console.log(`🚀 Sending ${inputType} to BrainGuin AI...`);

      const { data, error } = await supabase.functions.invoke(
        "generate-cards",
        {
          body: {
            inputType: inputType,
            data: payloadData,
            userId: session.user.id,
          },
        },
      );

      if (error) {
        console.error("Edge Function Error:", error);
        throw new Error(error.message || t("ai_generation"));
      }

      if (data?.error) {
        throw new Error(data.error);
      }

      console.log("✅ Deck Created ID:", data.deck_id);

      // ✅ STEP 4: INCREMENT COUNT
      await supabase.rpc("increment_generation_count", {
        user_uuid: session.user.id,
      });

      setIsThinking(false);

      Toast.show({
        type: "success",
        text1: "Success!",
        text2: `Generated ${data.card_count} cards.`,
      });

      router.replace(`/study/${data.deck_id}`);
    } catch (e: any) {
      setIsThinking(false);
      console.error(e);

      // 🔄 ERROR MAPPING LOGIC
      let errorText = t("errors.generic"); // Default fallback
      const rawMsg = e.message || "";

      if (rawMsg.includes("PDF text is empty")) {
        errorText = t("errors.pdf_empty");
      } else if (rawMsg.includes("Failed to access URL")) {
        errorText = t("errors.url_access_error");
      } else if (rawMsg.includes("Website content is too short")) {
        errorText = t("errors.url_content_error");
      } else if (rawMsg.includes("Max retries exceeded")) {
        errorText = t("errors.timeout_error");
      } else if (rawMsg === "PDF_PROCESSING_ERROR") {
        errorText = t("errors.pdf_processing");
      } else if (rawMsg === "AI_FAILURE") {
        errorText = t("errors.ai_failure");
      }

      Toast.show({
        type: "error",
        text1: t("errors.generic"), // "Something went wrong" header
        text2: errorText, // The specific localized message
      });
    }
  };

  const handleFilePick = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: "application/pdf",
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setSelectedFile(result.assets[0]);
      }
    } catch (err) {
      Toast.show({
        type: "error",
        text1: t("creation.invalid_pdf"),
      });
    }
  };

  const handleSubmit = () => {
    if (activeType === "pdf" && selectedFile) {
      handleCreateSubmit("pdf", selectedFile);
    } else if (
      (activeType === "url" || activeType === "topic") &&
      inputText.length > 3
    ) {
      handleCreateSubmit(activeType, inputText);
    }
  };

  useEffect(() => {
    setActiveType(type || "pdf");
  }, [type]);

  return (
    <View className="flex-1 bg-page-light dark:bg-page-dark flex-col justify-between">
      <Pressable
        style={{ ...StyleSheet.absoluteFillObject }}
        onPress={Keyboard.dismiss}
      />

      {/* Header */}
      <View className="pt-9 pb-6 px-6 border-b border-black/5 dark:border-white/5 flex-row justify-between items-center w-full">
        <Text className="text-text-main-light dark:text-text-main-dark font-heading text-xl font-bold">
          {t("creation.new_creation_sprint")}
        </Text>

        <PressableScale
          onPress={() => router.back()}
          style={{
            backgroundColor:
              colorScheme === "dark"
                ? "rgba(255,255,255,0.1)"
                : "rgba(0,0,0,0.05)",
            padding: 8,
            borderRadius: 99,
          }}
        >
          <Ionicons
            name="close"
            size={20}
            color={colorScheme === "dark" ? "#FFF" : "#000"}
          />
        </PressableScale>
      </View>

      <ScrollView
        className="w-full"
        showsVerticalScrollIndicator={false}
        // 1. Ensures the scrollview takes up the necessary space
        contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 24 }}
        // 2. Dismisses keyboard when dragging (helpful for UX)
        keyboardDismissMode="on-drag"
        keyboardShouldPersistTaps="handled"
      >
        {/* Type Selector (Tabs) */}
        <View className="flex-row py-4 gap-2 bg-page-light dark:bg-page-dark w-full">
          {[
            { id: "pdf", label: "PDF", icon: "document-text" },
            { id: "url", label: "URL", icon: "link" },
            { id: "topic", label: "Topic", icon: "bulb" },
          ].map((item) => (
            <PressableScale
              key={item.id}
              onPress={() => {
                setActiveType(item.id as InputType);
                setInputText("");
                setSelectedFile(null);
              }}
              style={{
                flex: 1,
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
                padding: 12,
                borderRadius: 12,
                borderWidth: 1,
                backgroundColor:
                  activeType === item.id ? "#F97316" : "transparent",
                borderColor:
                  activeType === item.id
                    ? "#F97316"
                    : colorScheme === "dark"
                      ? "rgba(255,255,255,0.1)"
                      : "rgba(0,0,0,0.1)",
              }}
            >
              <Ionicons
                name={item.icon as any}
                size={18}
                color={activeType === item.id ? "white" : "#94A3B8"}
              />
              <Text
                className={`ml-2 font-heading font-bold ${
                  activeType === item.id
                    ? "text-white"
                    : "text-text-muted-light dark:text-text-muted-dark"
                }`}
              >
                {item.label}
              </Text>
            </PressableScale>
          ))}
        </View>

        {/* Input Content Area */}
        <View className="py-6 justify-center">
          {activeType === "pdf" && (
            <View>
              <Text className="text-text-main-light dark:text-text-main-dark font-heading mb-2 ml-1">
                {t("creation.upload_your_pdf")}
              </Text>
              <PressableScale
                onPress={handleFilePick}
                style={{
                  width: "100%",
                  height: 240,
                  borderWidth: 2,
                  borderStyle: "dashed",
                  borderColor: colorScheme === "dark" ? "#475569" : "#CBD5E1",
                  borderRadius: 24,
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor:
                    colorScheme === "dark"
                      ? "rgba(255,255,255,0.05)"
                      : "rgba(0,0,0,0.05)",
                  marginBottom: 16,
                }}
              >
                {selectedFile ? (
                  <>
                    <Ionicons name="document" size={48} color="#F97316" />
                    <Text
                      className="text-text-main-light dark:text-text-main-dark font-heading font-bold mt-2 text-center px-4"
                      numberOfLines={1}
                    >
                      {selectedFile.name}
                    </Text>
                    <Text className="text-text-muted-light dark:text-text-muted-dark text-xs mt-1">
                      {t("creation.tap_to_change_file")}
                    </Text>
                  </>
                ) : (
                  <>
                    <Ionicons
                      name="cloud-upload-outline"
                      size={48}
                      color="#94A3B8"
                    />
                    <Text className="text-text-muted-light dark:text-text-muted-dark font-body font-bold mt-2">
                      {t("creation.tap_to_select_pdf")}
                    </Text>
                  </>
                )}
              </PressableScale>
            </View>
          )}

          {activeType === "url" && (
            <View>
              <Text className="text-text-main-light dark:text-text-main-dark font-heading mb-2 ml-1">
                {t("creation.paste_link")}
              </Text>
              <TextInput
                className="bg-input-light dark:bg-input-dark p-4 rounded-xl text-text-main-light dark:text-text-main-dark font-body focus:border-action outline-none border border-card-light dark:border-card-dark"
                placeholder="https://wikipedia.org/wiki/Penguin"
                placeholderTextColor="#94A3B8"
                value={inputText}
                onChangeText={setInputText}
                autoCapitalize="none"
                keyboardType="url"
              />
            </View>
          )}

          {activeType === "topic" && (
            <View>
              <Text className="text-text-main-light dark:text-text-main-dark font-heading mb-2 ml-1">
                {t("creation.paste_topic_description")}
              </Text>
              <TextInput
                className="bg-input-light dark:bg-input-dark p-4 rounded-xl text-text-main-light dark:text-text-main-dark font-body border border-transparent focus:border-action outline-none border border-card-light dark:border-card-dark"
                style={{ height: 240 }}
                placeholder={t(
                  "creation.e.g._the_history_of_the_samurai_quantum_mechanics_101...",
                )}
                placeholderTextColor="#94A3B8"
                value={inputText}
                onChangeText={setInputText}
                multiline
                textAlignVertical="top"
                scrollEnabled={true} // ✅ Allows internal scrolling
                {...(Platform.OS === "android"
                  ? { nestedScrollEnabled: true }
                  : {})}
              />
            </View>
          )}
        </View>
      </ScrollView>

      <View
        style={{
          paddingBottom: insets.bottom,
          paddingTop: 10,
          paddingHorizontal: 24,
        }}
        pointerEvents={
          (activeType === "pdf" ? !selectedFile : inputText.length < 3)
            ? "none"
            : "auto"
        }
      >
        <PressableScale
          onPress={handleSubmit}
          activateOnHover
          style={{
            width: "100%",
            paddingVertical: 16,
            borderRadius: 12,
            alignItems: "center",
            backgroundColor: (
              activeType === "pdf" ? !selectedFile : inputText.length < 3
            )
              ? colorScheme === "dark"
                ? "#334155"
                : "#CBD5E1"
              : "#F97316",
            opacity: (
              activeType === "pdf" ? !selectedFile : inputText.length < 3
            )
              ? 0.5
              : 1,
            shadowColor: "#F97316",
            shadowOffset: { width: 0, height: 10 },
            shadowOpacity: (
              activeType === "pdf" ? !selectedFile : inputText.length < 3
            )
              ? 0
              : 0.2,
            shadowRadius: 20,
            elevation: (
              activeType === "pdf" ? !selectedFile : inputText.length < 3
            )
              ? 0
              : 5,
          }}
        >
          <Text className="text-white font-heading font-bold text-lg">
            {t("creation.generate_flashcards")} ⚡
          </Text>
        </PressableScale>
      </View>

      <Modal
        visible={isThinking}
        transparent={true}
        animationType="fade"
        statusBarTranslucent={true}
      >
        <ThinkingState />
      </Modal>
    </View>
  );
}
