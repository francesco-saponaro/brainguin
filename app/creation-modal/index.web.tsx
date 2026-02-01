import ThinkingState from "@/components/Creation/ThinkingState";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/store/storeUser";
import { Ionicons } from "@expo/vector-icons";
import * as DocumentPicker from "expo-document-picker";
import { useLocalSearchParams, useRouter } from "expo-router";
import { PressableOpacity } from "pressto";
import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Modal,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from "react-native";
import Toast from "react-native-toast-message";

type InputType = "pdf" | "url" | "topic";

export default function CreationModal() {
  const { type } = useLocalSearchParams<{ type: InputType }>();
  const router = useRouter();
  const { height } = useWindowDimensions();
  const { t } = useTranslation();
  const { session } = useAuthStore();
  const colorScheme = useColorScheme();
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
      // 🛑 STEP 1: CHECK LIMITS (The Gatekeeper)
      const { data: limitData, error: limitError } = await supabase.rpc(
        "check_user_limit",
        { user_uuid: session.user.id },
      );

      if (limitError) throw limitError;

      // 🛑 STEP 2: IF LIMIT REACHED -> SHOW PAYWALL
      if (limitData.limit_reached) {
        router.replace("/paywall");
        return;
      }

      // ✅ STEP 3: LIMIT OK -> PROCEED
      setIsThinking(true);

      let payloadData = inputData;

      // --- HANDLE PDF CONVERSION (Web Standard) ---
      if (inputType === "pdf" && inputData.uri) {
        try {
          // 1. Fetch the local blob from the browser
          const response = await fetch(inputData.uri);
          const blob = await response.blob();

          // 2. Convert Blob to Base64 using FileReader
          const base64 = await new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => {
              // Result: "data:application/pdf;base64,JVBER..."
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

      // ✅ STEP 4: CALL EDGE FUNCTION
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

      // ✅ STEP 5: INCREMENT COUNT
      await supabase.rpc("increment_generation_count", {
        user_uuid: session.user.id,
      });

      setIsThinking(false);

      Toast.show({
        type: "success",
        text1: "Success!",
        text2: `Generated ${data.card_count} cards.`,
      });

      // Navigate to the new deck
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
        // CopyToCache is ignored on web, but harmless to keep
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
    <View className="flex-1 justify-center items-center p-[20px]">
      {/* Backdrop */}
      <Pressable
        onPress={() => router.back()}
        className="absolute inset-0 bg-black/60"
      />

      {/* Modal Container */}
      <View
        className="w-full lg:w-[600px] bg-page-light dark:bg-page-dark rounded-[32px] shadow-2xl overflow-hidden"
        style={{
          height: height * 0.85,
          display: "flex",
          flexDirection: "column", // Ensures children respect flex rules
        }}
      >
        {/* 1. Header (Static) */}
        <View className="p-6 border-b border-black/5 dark:border-white/5 flex-row justify-between items-center bg-card-light dark:bg-card-dark">
          <Text className="text-text-main-light dark:text-text-main-dark font-heading text-xl font-bold">
            {t("creation.new_creation_sprint")}
          </Text>
          <PressableOpacity
            onPress={() => router.back()}
            activateOnHover
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
          </PressableOpacity>
        </View>

        {/* 2. Scrollable Content (Flex-1) */}
        <ScrollView
          // @ts-ignore - Web specific prop
          className="flex-1"
          style={{ flex: 1 }} // Explicit flex for Web engine
          contentContainerStyle={{ flexGrow: 1 }}
          showsVerticalScrollIndicator={true}
        >
          <View className="p-4">
            {/* Type Selector (Tabs) */}
            <View className="flex-row gap-2 mb-6">
              {[
                { id: "pdf", label: "PDF", icon: "document-text" },
                { id: "url", label: "URL", icon: "link" },
                { id: "topic", label: "Topic", icon: "bulb" },
              ].map((item) => (
                <PressableOpacity
                  activateOnHover
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
                    className={`ml-2 font-heading font-bold ${activeType === item.id ? "text-white" : "text-text-muted-light dark:text-text-muted-dark"}`}
                  >
                    {item.label}
                  </Text>
                </PressableOpacity>
              ))}
            </View>

            {/* Input Area */}
            <View>
              {activeType === "pdf" && (
                <View>
                  <Text className="text-text-main-light dark:text-text-main-dark font-heading mb-2 ml-1">
                    {t("creation.upload_your_pdf")}
                  </Text>
                  <PressableOpacity
                    activateOnHover
                    onPress={handleFilePick}
                    style={{
                      width: "100%",
                      height: 240,
                      borderWidth: 2,
                      borderStyle: "dashed",
                      borderColor:
                        colorScheme === "dark" ? "#475569" : "#CBD5E1",
                      borderRadius: 24,
                      alignItems: "center",
                      justifyContent: "center",
                      backgroundColor:
                        colorScheme === "dark"
                          ? "rgba(255,255,255,0.05)"
                          : "rgba(0,0,0,0.05)",
                    }}
                  >
                    {selectedFile ? (
                      <>
                        <Ionicons name="document" size={48} color="#F97316" />
                        <Text className="text-text-main-light dark:text-text-main-dark font-heading font-bold mt-2">
                          {selectedFile.name}
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
                  </PressableOpacity>
                </View>
              )}

              {activeType === "url" && (
                <View>
                  <Text className="text-text-main-light dark:text-text-main-dark font-heading mb-2 ml-1">
                    {t("creation.paste_link")}
                  </Text>
                  <TextInput
                    className="bg-input-light dark:bg-input-dark p-4 rounded-xl text-text-main-light dark:text-text-main-dark font-body focus:border-action border border-card-light dark:border-card-dark"
                    // @ts-ignore - Web specific
                    style={{ outlineStyle: "none" }}
                    placeholder="https://wikipedia.org/wiki/Penguin"
                    placeholderTextColor="#94A3B8"
                    value={inputText}
                    onChangeText={setInputText}
                  />
                </View>
              )}

              {activeType === "topic" && (
                <View>
                  <Text className="text-text-main-light dark:text-text-main-dark font-heading mb-2 ml-1">
                    {t("creation.paste_topic_description")}
                  </Text>
                  <TextInput
                    className="bg-input-light dark:bg-input-dark p-4 rounded-xl text-text-main-light dark:text-text-main-dark font-body focus:border-action border border-card-light dark:border-card-dark"
                    multiline
                    numberOfLines={10}
                    // @ts-ignore - Web specific
                    style={{
                      height: 240,
                      outlineStyle: "none",
                      textAlignVertical: "top",
                    }}
                    placeholder={t(
                      "creation.e.g._the_history_of_the_samurai_quantum_mechanics_101...",
                    )}
                    placeholderTextColor="#94A3B8"
                    value={inputText}
                    onChangeText={setInputText}
                  />
                </View>
              )}
            </View>
          </View>
        </ScrollView>

        {/* 3. Footer (Static) */}
        <View className="p-6 border-t border-black/5 dark:border-white/5 bg-page-light dark:bg-page-dark">
          <PressableOpacity
            activateOnHover
            onPress={handleSubmit}
            // disabled={(activeType === "pdf" ? !selectedFile : inputText.length < 3)}
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
            }}
          >
            <Text className="text-white font-heading font-bold text-lg">
              {t("creation.generate_flashcards")} ⚡
            </Text>
          </PressableOpacity>
        </View>
      </View>

      <Modal visible={isThinking} transparent={true} animationType="fade">
        <ThinkingState />
      </Modal>
    </View>
  );
}
