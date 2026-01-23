import ThinkingState from "@/components/Creation/ThinkingState";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { Ionicons } from "@expo/vector-icons";
import * as DocumentPicker from "expo-document-picker";
import { useLocalSearchParams, useRouter } from "expo-router";
import { PressableScale } from "pressto";
import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Keyboard,
  Modal,
  Platform,
  Pressable,
  Text,
  TextInput,
  View,
} from "react-native";
import Toast from "react-native-toast-message";

type InputType = "pdf" | "url" | "topic";

export default function CreationModal() {
  const { type } = useLocalSearchParams<{ type: InputType }>();
  const router = useRouter();
  const colorScheme = useColorScheme();
  const { t } = useTranslation();
  const [isThinking, setIsThinking] = useState(false);

  const [activeType, setActiveType] = useState<InputType>(type || "pdf");
  const [inputText, setInputText] = useState("");
  const [selectedFile, setSelectedFile] = useState<any>(null);

  const handleCreateSubmit = async (
    type: "pdf" | "url" | "topic",
    inputData: any,
  ) => {
    setIsThinking(true); // Open Thinking Penguin

    try {
      // let payload = inputData;

      // // 1. If PDF, convert file to Base64 so AI can read it
      // if (type === "pdf" && inputData.uri) {
      //   try {
      //     // 1. Fetch the local file URI as a blob
      //     const response = await fetch(inputData.uri);
      //     const blob = await response.blob();

      //     // 2. Convert Blob to Base64
      //     // We use a Promise with FileReader (Standard Web API)
      //     const base64: string = await new Promise((resolve, reject) => {
      //       const reader = new FileReader();
      //       reader.onload = () => {
      //         // reader.result looks like: "data:application/pdf;base64,JVBER..."
      //         // We split to get only the base64 content for the AI
      //         const base64String = (reader.result as string).split(",")[1];
      //         resolve(base64String);
      //       };
      //       reader.onerror = reject;
      //       reader.readAsDataURL(blob);
      //     });

      //     payload = base64;
      //   } catch (fileError) {
      //     console.error("Failed to process file with modern API:", fileError);
      //     throw new Error("Could not read the PDF file.");
      //   }
      // }

      // // 2. Call the AI
      // console.log(`🚀 Sending ${type} to AI...`);

      // // Make sure we pass userId!
      // if (!session?.user?.id) {
      //   throw new Error("User not logged in");
      // }

      // const { data, error } = await supabase.functions.invoke(
      //   "generate-cards",
      //   {
      //     body: { inputType: type, data: payload, userId: session.user.id },
      //   }
      // );

      // if (error) throw error;
      // if (data.error) throw new Error(data.error);

      // console.log("✅ Deck Created ID:", data.deck_id);

      setTimeout(() => {
        // TODO: In Day 4, we will navigate to the Flashcard Screen with this data
        Toast.show({
          type: "success",
          text1: "Success!",
          // text2: `Generated ${data.flashcards?.length || 0} cards.`,
        });

        // 4. Navigate to the Deck (We will build this route in Day 4)
        // router.push(`/study/${data.deck_id}`);
        router.replace(`/study/10`);
      }, 5000);

      // TODO: In Day 4, we will navigate to the Flashcard Screen with this data
      // Toast.show({
      //   type: "success",
      //   text1: "Success!",
      //   // text2: `Generated ${data.flashcards?.length || 0} cards.`,
      // });

      // // 4. Navigate to the Deck (We will build this route in Day 4)
      // // router.push(`/study/${data.deck_id}`);
      // router.push(`/study/10`);
    } catch (e: any) {
      console.error(e);
      Toast.show({
        type: "error",
        text1: t("errors.generic"),
        text2: e.message,
      });
    }
  };

  const handleFilePick = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: "application/pdf",
        copyToCacheDirectory: true,
      });

      if (result.assets && result.assets.length > 0) {
        setSelectedFile(result.assets[0]);
      }
    } catch (err) {
      console.log("Unknown Error: ", err);
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
    <View className="flex-1 bg-page-light dark:bg-page-dark px-6">
      <Pressable onPress={Keyboard.dismiss}>
        {/* Header */}
        <View className="pt-9 pb-6 border-b border-black/5 dark:border-white/5 flex-row justify-between items-center w-full">
          <Text className="text-text-main-light dark:text-text-main-dark font-heading text-xl font-bold">
            {t("creation.new_creation_sprint")}
          </Text>
        </View>

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
        <View className="py-6 min-h-[250px] justify-center">
          {activeType === "pdf" && (
            <View className="items-center">
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
                className="bg-input-light dark:bg-input-dark p-4 rounded-xl text-text-main-light dark:text-text-main-dark font-body focus:border-action border border-card-light dark:border-card-dark"
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
                {t("creation.what_do_you_want_to_learn")}
              </Text>
              <TextInput
                className="bg-input-light dark:bg-input-dark p-4 rounded-xl text-text-main-light dark:text-text-main-dark font-body border border-transparent focus:border-action min-h-60 border border-card-light dark:border-card-dark"
                placeholder={t(
                  "creation.e.g._the_history_of_the_samurai_quantum_mechanics_101...",
                )}
                placeholderTextColor="#94A3B8"
                value={inputText}
                onChangeText={setInputText}
                multiline
                textAlignVertical="top"
              />
            </View>
          )}
        </View>

        <View
          style={{
            paddingBottom: Platform.OS === "ios" ? 30 : 20,
            paddingTop: 10,
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
              // Shadow matching shadow-action/30
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
      </Pressable>

      <Modal
        visible={isThinking}
        transparent={true}
        animationType="fade"
        statusBarTranslucent={true} // Ensures it covers the status bar area too
      >
        {/* Your Penguin component now floats over the ENTIRE screen */}
        <ThinkingState />
      </Modal>
    </View>
  );
}
