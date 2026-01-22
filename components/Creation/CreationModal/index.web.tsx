import { useColorScheme } from "@/hooks/use-color-scheme";
import { Ionicons } from "@expo/vector-icons";
import * as DocumentPicker from "expo-document-picker";
import { PressableScale } from "pressto";
import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type InputType = "pdf" | "url" | "topic";

interface Props {
  isVisible: boolean;
  onClose: () => void;
  initialType: InputType;
  onSubmit: (type: InputType, data: string | any) => void;
}

export default function CreationModal({
  isVisible,
  onClose,
  initialType,
  onSubmit,
}: Props) {
  const { height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const colorScheme = useColorScheme();

  const [activeType, setActiveType] = useState<InputType>(initialType);
  const [inputText, setInputText] = useState("");
  const [selectedFile, setSelectedFile] = useState<any>(null);

  // Sync initial type when modal opens
  React.useEffect(() => {
    setActiveType(initialType);
  }, [initialType, isVisible]);

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
      onSubmit("pdf", selectedFile);
    } else if (
      (activeType === "url" || activeType === "topic") &&
      inputText.length > 3
    ) {
      onSubmit(activeType, inputText);
    }
  };

  return (
    <Modal
      visible={isVisible}
      transparent
      animationType={Platform.OS !== "web" ? "slide" : "fade"}
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1 justify-end lg:justify-center items-center"
      >
        {/* Backdrop (Tap to close) */}
        <Pressable onPress={onClose} className="absolute inset-0 bg-black/60" />

        {/* Modal Container */}
        <View
          className="w-full lg:w-[600px] bg-page-light dark:bg-page-dark lg:rounded-[32px] rounded-t-[32px] overflow-hidden shadow-2xl"
          style={{ maxHeight: height * 0.85 }}
        >
          {/* Header */}
          <View className="p-6 border-b border-black/5 dark:border-white/5 flex-row justify-between items-center bg-card-light dark:bg-card-dark">
            <Text className="text-text-main-light dark:text-text-main-dark font-heading text-xl font-bold">
              {t("creation.new_creation_sprint")}
            </Text>
            {/* <Pressable
              onPress={onClose}
              className="bg-black/5 dark:bg-white/10 p-2 rounded-full"
            > */}
            <PressableScale
              onPress={onClose}
              style={{
                backgroundColor:
                  colorScheme === "dark"
                    ? "rgba(255,255,255,0.1)"
                    : "rgba(0,0,0,0.05)",
                padding: 8,
                borderRadius: 99,
              }}
              activateOnHover
            >
              <Ionicons
                name="close"
                size={20}
                color={Platform.OS === "ios" ? undefined : "#FFF"}
              />
            </PressableScale>
          </View>

          {/* Type Selector (Tabs) */}
          <View className="flex-row p-4 gap-2 bg-page-light dark:bg-page-dark">
            {[
              { id: "pdf", label: "PDF", icon: "document-text" },
              { id: "url", label: "URL", icon: "link" },
              { id: "topic", label: "Topic", icon: "bulb" },
            ].map((item) => (
              // <Pressable
              //   key={item.id}
              //   onPress={() => {
              //     setActiveType(item.id as InputType);
              //     setInputText("");
              //     setSelectedFile(null);
              //   }}
              //   className={`flex-1 flex-row items-center justify-center p-3 rounded-xl border transition-all ${
              //     activeType === item.id
              //       ? "bg-action border-action"
              //       : "bg-transparent border-black/10 dark:border-white/10"
              //   }`}
              // >
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
          <View className="p-6 min-h-[250px] justify-center">
            {/* 1. PDF INPUT */}
            {activeType === "pdf" && (
              <View className="items-center">
                {/* <Pressable
                  onPress={handleFilePick}
                  className="w-full h-40 border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-3xl items-center justify-center bg-black/5 dark:bg-white/5 mb-4 active:bg-action/5"
                > */}
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

            {/* 2. URL INPUT */}
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

            {/* 3. TOPIC INPUT */}
            {activeType === "topic" && (
              <View>
                <Text className="text-text-main-light dark:text-text-main-dark font-heading mb-2 ml-1">
                  {t("creation.what_do_you_want_to_learn")}
                </Text>
                <TextInput
                  className="bg-input-light dark:bg-input-dark p-4 rounded-xl text-text-main-light dark:text-text-main-dark font-body border border-transparent focus:border-action min-h-[120px] border border-card-light dark:border-card-dark"
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

          {/* Footer Action */}
          <View
            className="p-6 bg-page-light dark:bg-page-dark"
            style={{
              paddingBottom: Platform.OS === "ios" ? insets.bottom + 20 : 24,
            }}
            pointerEvents={
              (activeType === "pdf" ? !selectedFile : inputText.length < 3)
                ? "none"
                : "auto"
            }
          >
            {/* <Pressable
              onPress={handleSubmit}
              disabled={
                activeType === "pdf" ? !selectedFile : inputText.length < 3
              }
              className={`w-full py-4 rounded-xl items-center shadow-lg ${
                (activeType === "pdf" ? !selectedFile : inputText.length < 3)
                  ? "bg-slate-300 dark:bg-slate-700 opacity-50"
                  : "bg-action active:bg-action-hover shadow-action/30"
              }`}
            > */}
            <PressableScale
              onPress={handleSubmit}
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
                // Shadow logic
                shadowColor: "#F97316",
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: (
                  activeType === "pdf" ? !selectedFile : inputText.length < 3
                )
                  ? 0
                  : 0.2,
                shadowRadius: 8,
                elevation: (
                  activeType === "pdf" ? !selectedFile : inputText.length < 3
                )
                  ? 0
                  : 4,
              }}
            >
              <Text className="text-white font-heading font-bold text-lg">
                {t("creation.generate_flashcards")} ⚡
              </Text>
            </PressableScale>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
