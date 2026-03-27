import ThinkingState from "@/components/Creation/ThinkingState";
import LanguageStep from "@/components/LanguageStep";
import FlashcardSwiper from "@/components/Study/FlashcardSwiper";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/store/storeUser";
import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import * as DocumentPicker from "expo-document-picker";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { LinearGradient } from "expo-linear-gradient";
import { useNavigation } from "expo-router";
import { useColorScheme } from "nativewind";
import { PressableScale } from "pressto";
import React, { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ActivityIndicator,
  Linking,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from "react-native";
import DatePicker from "react-native-date-picker";
import { Modalize } from "react-native-modalize";
import Purchases, { PurchasesPackage } from "react-native-purchases";
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Toast from "react-native-toast-message";
import { scheduleOnRN } from "react-native-worklets";

import CelebratorPng from "@/assets/images/celebrator.png";
import NerdPng from "@/assets/images/nerd.png";
import PdfPng from "@/assets/images/pdf.png";
import SmarterPng from "@/assets/images/smarter.png";
import TimesaverPng from "@/assets/images/timesaver.png";
import { t } from "i18next";

const API_KEY =
  Platform.OS === "ios"
    ? process.env.EXPO_PUBLIC_REVENUECAT_APPLE_PRODUCTION!
    : process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_PRODUCTION!;

type InputType = "document" | "url" | "topic" | "image";

export default function OnboardingScreen() {
  const navigation = useNavigation();
  const { t, i18n } = useTranslation();
  const { colorScheme } = useColorScheme();
  const insets = useSafeAreaInsets();

  const dimensions = useWindowDimensions();
  const windowWidth = Math.max(dimensions.width, 1);

  const { session, signOut } = useAuthStore();
  const scrollRef = useRef<Animated.ScrollView>(null);

  const scrollIndex = useSharedValue(0);
  const [currentIndex, setCurrentIndex] = useState(0);

  // 🚨 Track if the user has successfully "Generated" the deck
  const [hasGenerated, setHasGenerated] = useState(false);

  // CREATION STATES
  const [activeType, setActiveType] = useState<InputType>("document");
  const [inputText, setInputText] = useState("");
  const [selectedFile, setSelectedFile] = useState<any>(null);
  const [selectedImages, setSelectedImages] = useState<
    ImagePicker.ImagePickerAsset[]
  >([]);
  const [isThinking, setIsThinking] = useState(false);

  // signOut();

  // --- STUDY ENGINE STATE ---
  const [cards, setCards] = useState<any[]>([]);
  const [activeContext, setActiveContext] = useState("");
  const [contextModalVisible, setContextModalVisible] = useState(false);

  // --- NEW: EXAM DATE STATE ---
  const examModalRef = useRef<Modalize>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [tempDate, setTempDate] = useState(new Date());

  // We need to track the ID of the newly generated deck to attach the exam date to it
  const [generatedDeckId, setGeneratedDeckId] = useState<string | null>(null);

  // --- PAYWALL STATE ---
  const [pkg, setPkg] = useState<PurchasesPackage | null>(null);
  const [isPurchasing, setIsPurchasing] = useState(false);

  // Initialize RevenueCat
  useEffect(() => {
    const setupPurchases = async () => {
      try {
        // 1. Configure the SDK
        await Purchases.configure({ apiKey: API_KEY });

        // 🚨 2. CRITICAL: Log them into RevenueCat using their Supabase ID!
        const currentUser = useAuthStore.getState().session?.user;
        if (currentUser) {
          await Purchases.logIn(currentUser.id);
        }

        // 3. Fetch offerings
        const offerings = await Purchases.getOfferings();
        if (
          offerings.current !== null &&
          offerings.current.availablePackages.length !== 0
        ) {
          setPkg(offerings.current.availablePackages[0]);
        }
      } catch (e) {
        console.log("Error fetching offerings", e);
      }
    };
    setupPurchases();
  }, []);

  useEffect(() => {
    navigation.setOptions({
      gestureEnabled: false,
      headerLeft: () => null,
    });
  }, [navigation]);

  const onboardingContent = (t: any) => [
    {
      id: "language",
      type: "language",
      title: t("onboarding.language_title", "Choose Your Language 🌍"),
      description: t(
        "onboarding.language_description",
        "Select the language...",
      ),
      image: SmarterPng,
    },
    {
      id: "welcome",
      type: "info",
      title: t("onboarding.welcome_title", "Study Smarter, Not Harder 🧠"),
      description: t("onboarding.welcome_description", "Stop wasting hours..."),
      image: SmarterPng,
    },
    {
      id: "creation",
      type: "info",
      title: t("onboarding.creation_title", "Upload Anything. Literally. 📄"),
      description: t(
        "onboarding.creation_description",
        "Got a massive PDF?...",
      ),
      image: PdfPng,
    },
    {
      id: "science",
      type: "info",
      title: t("onboarding.science_title", "Hack Your Memory ⚡"),
      description: t(
        "onboarding.science_description",
        "We use a science-backed...",
      ),
      image: NerdPng,
    },
    {
      id: "habit",
      type: "info",
      title: t("onboarding.habit_title", "Just 5 Minutes a Day ⏱️"),
      description: t("onboarding.habit_description", "Consistency is your..."),
      image: TimesaverPng,
    },
    {
      id: "try-it",
      type: "interactive-creation",
      title: t("onboarding.try_it_title", "Let’s Build Your First Deck! 🚀"),
      description: t(
        "onboarding.try_it_description",
        "Don't just take our word...",
      ),
    },
    {
      id: "result",
      type: "interactive-swipe",
      title: t("onboarding.result_title", "Boom! Your Deck is Ready 🎉"),
      description: t(
        "onboarding.result_description",
        "Active recall is the...",
      ),
    },
    {
      id: "paywall",
      type: "paywall",
      title: t("onboarding.paywall_title", "Unlock Limitless Learning 🔓"),
      description: t(
        "onboarding.paywall_description",
        "You've just seen how fast studying can be. Go Premium to unlock unlimited AI generations, unlimited daily reviews, and advanced document uploads. Invest in your brain today!",
      ),
      image: CelebratorPng,
    },
  ];

  const steps = onboardingContent(t);

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollIndex.value = event.contentOffset.x / windowWidth;
    },
    onMomentumEnd: (event) => {
      const index = Math.round(event.contentOffset.x / windowWidth);
      scheduleOnRN(setCurrentIndex, index);
    },
  });

  const goToNextPage = () => {
    if (currentIndex < steps.length - 1) {
      const nextIndex = currentIndex + 1;
      scrollRef.current?.scrollTo({
        x: nextIndex * windowWidth,
        animated: true,
      });
      setCurrentIndex(nextIndex);
    }
  };

  const completeOnboarding = async () => {
    // 🚨 FIX: Get the absolute latest user from the store state directly
    const currentUser = useAuthStore.getState().session?.user;

    console.log("Completing onboarding for user:", currentUser);

    if (!currentUser) {
      console.error("❌ No user found in session. Cannot complete onboarding.");
      Toast.show({
        type: "error",
        text1: t("errors.generic"),
        text2: "Authentication session lost. Please try again.",
      });
      return;
    }

    try {
      // 1. Save profile data
      const { error: dbError } = await supabase
        .from("users")
        .update({
          preferences: { language: i18n.language },
        })
        .eq("id", currentUser.id);

      if (dbError) {
        console.error(
          "⚠️ Failed to save language preference, but continuing onboarding:",
          dbError.message,
        );
      }

      // 2. Update Auth Metadata (The "source of truth" for your route guards)
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.updateUser({
        data: { is_onboarded: true },
      });

      if (authError) throw authError;

      // 3. Force update the local store with the new user object (including metadata)
      // We use 'true' for the second argument to signify isOnboarded = true
      const latestSession = useAuthStore.getState().session;
      if (latestSession) {
        const updatedSession = { ...latestSession, user: user ?? currentUser };
        useAuthStore.getState().setSession(updatedSession, true);
      }

      console.log("✅ Onboarding successfully completed");
    } catch (error) {
      console.error("Onboarding completion error:", error);
      Toast.show({ type: "error", text1: t("errors.generic") });
    }
  };

  const handleCreateSubmit = async (inputType: InputType, inputData: any) => {
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
        // Set the flag allowing progression
        setHasGenerated(true);

        // Scroll immediately
        const nextIndex = currentIndex + 2;
        scrollRef.current?.scrollTo({
          x: nextIndex * windowWidth,
          animated: true,
        });
        setCurrentIndex(nextIndex);
        return;
      }

      // ✅ STEP 2: PREPARE DATA
      setIsThinking(true);

      let payloadData = inputData;

      // --- HANDLE DOCUMENT CONVERSION (Modern Web API Approach) ---
      if (inputType === "document" && inputData.uri) {
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
          console.error("Document Processing Error:", fileError);
          throw new Error(t("document_processing"));
        }
      }

      console.log("Prepared Payload Data:", {
        type: inputType,
        dataPreview:
          typeof payloadData === "string"
            ? `${payloadData.slice(0, 30)}...`
            : payloadData,
      });

      // ✅ STEP 3: CALL EDGE FUNCTION
      console.log(`🚀 Sending ${inputType} to BrainGuin AI...`);

      const { data, error } = await supabase.functions.invoke(
        "generate-cards",
        {
          body: {
            inputType: inputType,
            data: payloadData,
            userId: session.user.id,
            mimeType: inputType === "document" ? inputData.mimeType : null,
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

      // 🚨 NEW: Save the deck ID to state
      setGeneratedDeckId(data.deck_id);

      // ✅ STEP 4: INCREMENT COUNT
      await supabase.rpc("increment_generation_count", {
        user_uuid: session.user.id,
      });

      // 🚨 NEW: Fetch the cards we just created
      const { data: generatedCards, error: fetchError } = await supabase
        .from("flashcards")
        .select("*")
        .eq("deck_id", data.deck_id)
        .order("created_at", { ascending: true });

      if (fetchError) throw fetchError;

      // Map them to match the FlashcardSwiper expected props
      const mappedCards = (generatedCards || []).map((c: any) => ({
        ...c,
        front: c.question,
        back: c.answer,
        context: c.context,
        deckTitle: null, // Not needed for specific deck
      }));

      setCards(mappedCards);

      setIsThinking(false);

      // Set the flag allowing progression
      setHasGenerated(true);

      // Scroll immediately
      const nextIndex = currentIndex + 1;
      scrollRef.current?.scrollTo({
        x: nextIndex * windowWidth,
        animated: true,
      });
      setCurrentIndex(nextIndex);

      // Wait for swipe animation to finish, then pop the modal!
      setTimeout(() => {
        examModalRef.current?.open();
      }, 400);
    } catch (e: any) {
      setIsThinking(false);
      console.error(e);

      // 🔄 ERROR MAPPING LOGIC
      let errorText = t("errors.generic"); // Default fallback
      const rawMsg = e.message || "";

      if (rawMsg.includes("Document text is empty")) {
        errorText = t("errors.document_empty");
      } else if (rawMsg.includes("Failed to access URL")) {
        errorText = t("errors.url_access_error");
      } else if (rawMsg.includes("Website content is too short")) {
        errorText = t("errors.url_content_error");
      } else if (rawMsg.includes("Max retries exceeded")) {
        errorText = t("errors.timeout_error");
      } else if (rawMsg === "DOCUMENT_PROCESSING_ERROR") {
        errorText = t("errors.document_processing");
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
        // 🚨 Change: Allow PDFs, Word Docs, Text files, and Images!
        type: [
          "application/pdf",
          "application/msword",
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
          "text/plain",
          "application/vnd.ms-powerpoint", // .ppt
          "application/vnd.openxmlformats-officedocument.presentationml.presentation", // .pptx
        ],
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setSelectedFile(result.assets[0]);
      }
    } catch (err) {
      Toast.show({
        type: "error",
        text1: t("creation.invalid_document"),
      });
    }
  };

  const handlePickImages = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: "images",
      allowsMultipleSelection: true,
      quality: 0.4,
      base64: true,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      if (result.assets.length > 4) {
        Toast.show({ type: "info", text1: "Limited to 4 images at a time." });
      }
      setSelectedImages(result.assets.slice(0, 4));
    }
  };

  const handleSubmit = () => {
    if (activeType === "document" && selectedFile) {
      handleCreateSubmit("document", selectedFile);
    } else if (activeType === "image" && selectedImages.length > 0) {
      const base64Array = selectedImages.map((img) => img.base64);
      handleCreateSubmit("image", base64Array);
    } else if (
      (activeType === "url" || activeType === "topic") &&
      inputText.length > 3
    ) {
      handleCreateSubmit(activeType, inputText);
    }
  };

  // --- SAVE EXAM DATE ---
  const saveExamDate = async (date: Date | null) => {
    try {
      const targetDateStr = date ? date.toISOString().split("T")[0] : null;

      if (generatedDeckId && session?.user) {
        // 1. Update Deck
        await supabase
          .from("decks")
          .update({ exam_date: targetDateStr })
          .eq("id", generatedDeckId);

        // 2. 🚨 MAGIC PULL-FORWARD LOGIC 🚨
        if (targetDateStr) {
          await supabase
            .from("flashcards")
            .update({ next_review_at: new Date().toISOString() })
            .eq("deck_id", generatedDeckId)
            .gt("next_review_at", targetDateStr);
        }
      }

      examModalRef.current?.close();
      Toast.show({
        type: "success",
        text1: "Exam Pace Set! 📅",
        text2: "Your daily reviews will now adapt to this deadline.",
      });
    } catch (e) {
      console.error(e);
    }
  };

  const handleRateCard = async (
    cardId: string,
    rating: "hard" | "medium" | "easy",
  ) => {
    // 1. Find current card
    const currentCard = cards.find((c) => c.id === cardId);
    if (!currentCard) return;

    const now = new Date();
    let nextReview = new Date();

    let newInterval = 1;
    let newStatus = "learning";
    let newEase = currentCard.ease_factor || 2.5;
    let newReps = currentCard.repetition_count || 0;

    // --- SM-2 LOGIC ---
    if (rating === "hard") {
      newInterval = 0;
      newStatus = "new";
      newReps = 0;
      newEase = Math.max(1.3, newEase - 0.2);
      nextReview = new Date(now.getTime() - 1000);
    } else if (rating === "medium") {
      newInterval = 1;
      newStatus = "learning";
      newEase = Math.max(1.3, newEase - 0.15);
      nextReview.setDate(now.getDate() + 1);
    } else if (rating === "easy") {
      newReps += 1;
      newEase += 0.15;

      if (newReps === 1) newInterval = 1;
      else if (newReps === 2) newInterval = 3;
      else {
        const prevInterval = currentCard.interval_days || 1;
        newInterval = Math.ceil(prevInterval * newEase);
      }

      if (newInterval > 21) newStatus = "mastered";
      else newStatus = "review";

      nextReview.setDate(now.getDate() + newInterval);
    }

    // 2. Save to Supabase
    if (session?.user) {
      await supabase
        .from("flashcards")
        .update({
          next_review_at: nextReview.toISOString(),
          status: newStatus,
          interval_days: newInterval,
          ease_factor: newEase,
          repetition_count: newReps,
        })
        .eq("id", cardId);
    }
  };

  const handleDeleteCard = async (cardId: string) => {
    // 1. Optimistic UI Update (Remove immediately so user doesn't wait)
    setCards((prev) => prev.filter((c) => c.id !== cardId));
  };

  const handleSessionFinish = () => {
    // Since this is onboarding, once they finish the first deck,
    // we want them to move to the Paywall.
    goToNextPage();
  };

  const handlePurchase = async () => {
    console.log("Attempting to purchase package:", pkg);
    if (!pkg) return;
    setIsPurchasing(true);

    try {
      const { customerInfo } = await Purchases.purchasePackage(pkg);

      if (customerInfo.entitlements.active["pro"]) {
        // Unlock Pro Status in DB
        // 🚨 SAFETY NET FOR RESTORE TOO
        try {
          await supabase.rpc("upgrade_user_to_pro");
        } catch (dbError) {
          console.error("DB failed on restore:", dbError);
        }

        Toast.show({
          type: "success",
          text1: t("paywall.purchase_success_title", "Welcome to Pro! 🎉"),
        });

        // Finish onboarding completely!
        completeOnboarding();
      }
    } catch (e: any) {
      if (!e.userCancelled) {
        Toast.show({
          type: "error",
          text1: t("paywall.purchase_error_title", "Purchase Failed"),
          text2: e.message,
        });
      }
    } finally {
      setIsPurchasing(false);
    }
  };

  const handleRestore = async () => {
    setIsPurchasing(true);
    try {
      console.log("⏳ Restoring purchases...");
      const customerInfo = await Purchases.restorePurchases();

      console.log(
        "🧾 Restore Complete. Customer Info:",
        JSON.stringify(customerInfo, null, 2),
      );
      console.log(
        "🔑 Active Entitlements:",
        Object.keys(customerInfo.entitlements.active),
      );

      // CHECK: Is the entitlement name actually "pro"?
      // If your logs say "premium" or "Pro", change this string!
      if (customerInfo.entitlements.active["pro"]) {
        console.log("✅ 'pro' entitlement found active!");
        // 🚨 SAFETY NET FOR RESTORE TOO
        try {
          await supabase.rpc("upgrade_user_to_pro");
        } catch (dbError) {
          console.error("DB failed on restore:", dbError);
        }

        Toast.show({
          type: "success",
          text1: t("paywall.restore_success_title"),
          text2: t("paywall.restore_success_desc"),
        });

        // Finish onboarding completely!
        completeOnboarding();
      } else {
        console.warn(
          "❌ No active 'pro' entitlement found. Found:",
          customerInfo.entitlements.active,
        );

        Toast.show({
          type: "info",
          text1: t("paywall.restore_no_purchase_title"),
          text2: t("paywall.restore_no_purchase_desc"),
        });
      }
    } catch (e: any) {
      console.error("❌ Restore Error:", e);
      Toast.show({
        type: "error",
        text1: t("paywall.restore_error_title"),
        text2: e.message,
      });
    } finally {
      setIsPurchasing(false);
    }
  };

  const getButtonConfig = () => {
    const stepType = steps[currentIndex].type;
    if (stepType === "interactive-creation")
      return {
        text: t("onboarding.generate_magic", "Generate Magic ⚡"),
        action: handleSubmit,
      };
    if (stepType === "interactive-swipe")
      return {
        text: t("onboarding.finish_review", "Finish Review"),
        action: goToNextPage,
      };
    if (stepType === "paywall")
      return {
        text: t("onboarding.unlock_premium", "Unlock Premium"),
        action: handlePurchase, // 👈 Triggers RevenueCat!
        isLoading: isPurchasing, // 👈 Disables button while buying
      };
    return { text: t("onboarding.next_button", "Next"), action: goToNextPage };
  };

  const buttonConfig = getButtonConfig();

  // 🚨 The Locking Logic:
  // If they are on index 0-5, they can scroll, BUT we must intercept if they try to go past 5 without generating.
  // We can achieve this simply by disabling scroll on Index 5 until they press the button!
  let isScrollEnabled = true;

  if (currentIndex === 5 && !hasGenerated) {
    isScrollEnabled = false; // Force them to press the button
  } else if (currentIndex >= 6) {
    isScrollEnabled = false; // Lock them on Result/Paywall
  }

  if (dimensions.width === 0) return null;

  return (
    <View className="flex-1 bg-page-light dark:bg-page-dark">
      <View className="flex-1">
        {/* Header */}
        {steps[currentIndex]?.type !== "paywall" ? (
          <View
            className="flex-row justify-between items-center px-6"
            style={{ paddingTop: insets.top + 10 }}
          >
            <Text className="font-heading font-bold text-xl text-text-main-light dark:text-text-main-dark">
              BrainGuin
            </Text>
          </View>
        ) : null}

        {/* ScrollView */}
        <Animated.ScrollView
          ref={scrollRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onScroll={scrollHandler}
          scrollEventThrottle={16}
          className="flex-1"
          scrollEnabled={isScrollEnabled}
        >
          {steps.map((step, index) => (
            <View
              key={step.id}
              style={{ width: windowWidth }}
              className="flex-1 justify-center"
            >
              {step.type === "language" && (
                <LanguageStep
                  onLanguageSelect={goToNextPage}
                  activeLanguage={i18n.language}
                />
              )}
              {step.type === "info" && (
                <AnimatedInfoStep
                  step={step}
                  index={index}
                  scrollIndex={scrollIndex}
                  windowWidth={windowWidth}
                  currentIndex={currentIndex}
                />
              )}
              {step.type === "interactive-creation" && (
                <TryItOutStep
                  step={step}
                  index={index}
                  scrollIndex={scrollIndex}
                  activeType={activeType}
                  setActiveType={setActiveType}
                  inputText={inputText}
                  setInputText={setInputText}
                  selectedFile={selectedFile}
                  setSelectedFile={setSelectedFile}
                  handleFilePick={handleFilePick}
                  selectedImages={selectedImages}
                  handlePickImages={handlePickImages}
                />
              )}
              {step.type === "interactive-swipe" && (
                <ResultSwipeStep
                  step={step}
                  index={index}
                  scrollIndex={scrollIndex}
                  cards={cards}
                  handleDeleteCard={handleDeleteCard}
                  onRate={handleRateCard}
                  onFinish={handleSessionFinish}
                  onShowContext={(ctx: string) => {
                    setActiveContext(ctx);
                    setContextModalVisible(true);
                  }}
                />
              )}
              {step.type === "paywall" && (
                <PaywallStep
                  step={step}
                  pkg={pkg}
                  index={index}
                  scrollIndex={scrollIndex}
                  isPurchasing={isPurchasing}
                  handlePurchase={handlePurchase}
                  handleRestore={handleRestore}
                />
              )}
            </View>
          ))}
        </Animated.ScrollView>

        {/* Footer Button */}
        {steps[currentIndex]?.type !== "paywall" ? (
          <View
            className="px-6 pt-4 bg-page-light dark:bg-page-dark"
            style={{ paddingBottom: insets.bottom + 10 }}
          >
            <PressableScale
              onPress={buttonConfig.action}
              activateOnHover
              style={{
                backgroundColor:
                  steps[currentIndex]?.type === "paywall"
                    ? "#0F172A"
                    : "#F97316",
                paddingVertical: 18,
                borderRadius: 16,
                alignItems: "center",
                shadowColor: "#F97316",
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.2,
                shadowRadius: 10,
                elevation: 5,
              }}
            >
              <Text className="text-white font-heading font-bold text-lg">
                {buttonConfig.text}
              </Text>
            </PressableScale>
          </View>
        ) : null}
      </View>

      {/* --- EXAM DATE MODALIZE --- */}
      <Modalize
        ref={examModalRef}
        adjustToContentHeight
        panGestureEnabled={false}
        closeOnOverlayTap={false}
        modalStyle={{
          backgroundColor: colorScheme === "dark" ? "#1E293B" : "#F8FAFC",
          borderTopLeftRadius: 32,
          borderTopRightRadius: 32,
        }}
        handlePosition="inside"
        handleStyle={{
          backgroundColor:
            colorScheme === "dark"
              ? "rgba(255,255,255,0.2)"
              : "rgba(0,0,0,0.2)",
        }}
        withHandle={false}
      >
        <View className="p-8" style={{ paddingBottom: insets.bottom + 10 }}>
          <View className="flex-row justify-between items-center mb-4">
            <Text className="text-text-main-light dark:text-text-main-dark font-heading font-bold text-2xl">
              {t("study.exam_modal.title", "When is your Exam? 📅")}
            </Text>
          </View>

          <Text className="text-text-muted-light dark:text-text-muted-dark text-base mb-6 leading-6">
            {t(
              "study.exam_modal.desc",
              "Set a date and our AI will automatically pace your daily reviews so you are 100% prepared.",
            )}
          </Text>

          <View className="gap-3 mt-2">
            <PressableScale
              onPress={() => {
                examModalRef.current?.close();
                setTimeout(() => setShowDatePicker(true), 300);
              }}
              activateOnHover
              style={{
                backgroundColor: "#F97316",
                paddingVertical: 16,
                borderRadius: 16,
                alignItems: "center",
                flexDirection: "row",
                justifyContent: "center",
                gap: 8,
              }}
            >
              <Ionicons name="calendar" size={20} color="white" />
              <Text className="text-white font-bold text-lg">
                {t("study.exam_modal.pick_date", "Pick Exam Date")}
              </Text>
            </PressableScale>

            <PressableScale
              onPress={() => {
                examModalRef.current?.close();
                saveExamDate(null);
              }}
              activateOnHover
              style={{
                paddingVertical: 16,
                borderRadius: 16,
                borderWidth: 1,
                borderColor:
                  colorScheme === "dark"
                    ? "rgba(255,255,255,0.1)"
                    : "rgba(0,0,0,0.1)",
                alignItems: "center",
              }}
            >
              <Text className="font-bold text-text-muted-light dark:text-text-muted-dark">
                {t("study.exam_modal.no_exam", "I don't have an exam")}
              </Text>
            </PressableScale>
          </View>
        </View>
      </Modalize>

      {/* --- NATIVE DATE PICKER OVERLAY --- */}
      <DatePicker
        modal
        open={showDatePicker}
        date={tempDate}
        mode="date"
        minimumDate={new Date(new Date().setDate(new Date().getDate() + 2))}
        title={t("study.exam_modal.pick_date", "Select Exam Date")}
        onConfirm={(date) => {
          setShowDatePicker(false);
          setTempDate(date);
          saveExamDate(date);
        }}
        onCancel={() => {
          setShowDatePicker(false);
        }}
      />

      {/* --- CONTEXT MODAL --- */}
      <Modal
        visible={contextModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setContextModalVisible(false)}
      >
        <View style={styles.overlay}>
          <BlurView
            intensity={30}
            tint={colorScheme === "dark" ? "dark" : "light"}
            style={StyleSheet.absoluteFill}
          />
          <View className="bg-page-light dark:bg-card-dark w-[90%] max-w-[400px] rounded-[40px] p-8 items-center border border-black/5 dark:border-white/10">
            <View className="flex-row justify-between items-center mb-6 w-full">
              <View className="flex-row items-center gap-2">
                <Ionicons name="bulb" size={24} color="#F97316" />
                <Text className="text-text-main-light dark:text-text-main-dark font-heading font-bold text-xl">
                  {t("study.hint_title", "Hint")}
                </Text>
              </View>

              <PressableScale
                onPress={() => setContextModalVisible(false)}
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
                  color={colorScheme === "dark" ? "#94A3B8" : "#64748B"}
                />
              </PressableScale>
            </View>

            <Text className="text-text-main-light dark:text-text-main-dark font-body text-lg leading-relaxed text-center">
              {activeContext}
            </Text>

            <PressableScale
              onPress={() => setContextModalVisible(false)}
              style={{
                marginTop: 40,
                backgroundColor: "#F97316",
                width: "100%",
                paddingVertical: 16,
                borderRadius: 16,
                alignItems: "center",
              }}
              activateOnHover
            >
              <Text className="text-white font-bold text-lg">
                {t("study.hint_btn", "Got it!")}
              </Text>
            </PressableScale>
          </View>
        </View>
      </Modal>

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

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    alignItems: "center",
    justifyContent: "center",
  },
});

// --- ANIMATED INFO COMPONENT ---
function AnimatedInfoStep({ step, index, scrollIndex, windowWidth }: any) {
  const insets = useSafeAreaInsets();
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";

  // 🚨 2. THE 3D TUMBLING CRYSTAL BLOCK MATH
  const cardStyle = useAnimatedStyle(() => {
    const distance = index - scrollIndex.value;
    const inputRange = [-1, 0, 1];

    const translateX = interpolate(
      distance,
      inputRange,
      [-windowWidth, 0, windowWidth],
      Extrapolation.CLAMP,
    );
    const translateY = interpolate(
      distance,
      inputRange,
      [250, 0, 250],
      Extrapolation.CLAMP,
    );

    // The 360 Flip
    const rotateY = interpolate(
      distance,
      inputRange,
      [-360, 0, 360],
      Extrapolation.CLAMP,
    );

    // 🚨 NEW: A subtle Z-tilt. This makes the fast 360 spin feel much slower,
    // more graceful, and aerodynamic (like a tumbling leaf rather than a spinning coin)
    const rotateZ = interpolate(
      distance,
      inputRange,
      [-25, 0, 25],
      Extrapolation.CLAMP,
    );

    const scale = interpolate(
      distance,
      inputRange,
      [0.4, 1, 0.4],
      Extrapolation.CLAMP,
    );
    const opacity = interpolate(
      distance,
      inputRange,
      [0, 1, 0],
      Extrapolation.CLAMP,
    );

    return {
      opacity,
      transform: [
        { perspective: 1000 },
        { translateX },
        { translateY },
        { scale },
        { rotateY: `${rotateY}deg` },
        { rotateZ: `${rotateZ}deg` },
      ],
    };
  });

  const textStyle = useAnimatedStyle(() => {
    const distance = index - scrollIndex.value;
    const inputRange = [-1, 0, 1];

    const translateY = interpolate(
      distance,
      inputRange,
      [80, 0, 80],
      Extrapolation.CLAMP,
    );
    const opacity = interpolate(
      distance,
      inputRange,
      [0, 1, 0],
      Extrapolation.CLAMP,
    );

    return { opacity, transform: [{ translateY }] };
  });

  return (
    <ScrollView
      contentContainerStyle={{
        flexGrow: 1,
        alignItems: "center",
        justifyContent: "center",
        paddingTop: insets.top,
        paddingBottom: insets.bottom,
      }}
      showsVerticalScrollIndicator={false}
      contentContainerClassName="px-6"
    >
      {/* 🚨 3D CRYSTAL CARD */}
      <Animated.View
        style={[
          cardStyle,
          {
            width: 260,
            height: 260,
            marginBottom: 40,
            borderRadius: 40,
            alignItems: "center",
            justifyContent: "center",
            overflow: "hidden",
            backfaceVisibility: "visible", // Keeps the crystal clear on both sides
          },
        ]}
      >
        {/* 1. Crystal Base (Replaces BlurView for flawless 3D rendering) */}
        <LinearGradient
          colors={
            isDark
              ? ["rgba(255,255,255,0.15)", "rgba(255,255,255,0.02)"]
              : ["rgba(255,255,255,0.9)", "rgba(255,255,255,0.4)"]
          }
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />

        {/* 2. Diagonal Surface Glare (The polished glass shine) */}
        <LinearGradient
          colors={["transparent", "rgba(255,255,255,0.9)", "transparent"]}
          locations={[0.3, 0.5, 0.7]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[StyleSheet.absoluteFill, { opacity: isDark ? 0.15 : 0.6 }]}
        />

        {/* 3. The Penguin Image */}
        {step.image ? (
          <Image
            source={step.image}
            style={{ width: 170, height: 170, zIndex: 10 }}
            contentFit="contain"
            transition={300}
          />
        ) : (
          <Ionicons
            name="image-outline"
            size={64}
            color="#94A3B8"
            style={{ zIndex: 10 }}
          />
        )}

        {/* 🚨 4. THE THICKNESS & BEVEL LAYER 🚨 */}
        {/* This is what makes it look like a physical, thick block of crystal */}
        <View
          style={[
            StyleSheet.absoluteFill,
            {
              borderRadius: 40,
              // TOP/LEFT: Sharp bright highlight where light hits the edge
              borderTopWidth: 2,
              borderLeftWidth: 2,
              borderTopColor: "rgba(255,255,255,0.9)",
              borderLeftColor: "rgba(255,255,255,0.5)",

              // BOTTOM/RIGHT: Massive thickness simulating light refraction
              borderBottomWidth: 14,
              borderRightWidth: 8,
              borderBottomColor: isDark
                ? "rgba(15, 23, 42, 0.8)"
                : "rgba(203, 213, 225, 0.7)",
              borderRightColor: isDark
                ? "rgba(30, 41, 59, 0.6)"
                : "rgba(226, 232, 240, 0.5)",
            },
          ]}
          pointerEvents="none"
        />
      </Animated.View>

      {/* TEXT CONTENT */}
      <Animated.View style={[textStyle]} className="w-full items-center px-4">
        <Text className="text-3xl font-heading font-bold text-text-main-light dark:text-text-main-dark text-center mb-4 leading-tight">
          {step.title}
        </Text>
        <Text className="text-base font-body text-text-muted-light dark:text-text-muted-dark text-center leading-relaxed">
          {step.description}
        </Text>

        {step.id === "creation" ? (
          <View className="mt-8 flex-row justify-center w-full px-2 max-w-[400px] self-center">
            {/* Left Column (3 rows) */}
            <View className="flex-col gap-y-4 flex-1 items-start pr-2">
              <Text className="text-[15px] font-heading font-bold text-text-main-light dark:text-text-main-dark tracking-wide">
                <Text className="text-[#F97316]">•</Text> PDF
              </Text>
              <Text className="text-[15px] font-heading font-bold text-text-main-light dark:text-text-main-dark tracking-wide">
                <Text className="text-[#F97316]">•</Text> PowerPoint
              </Text>
              <Text className="text-[15px] font-heading font-bold text-text-main-light dark:text-text-main-dark tracking-wide leading-tight">
                <Text className="text-[#F97316]">•</Text> Word, Text, etc.
              </Text>
            </View>

            {/* Right Column (3 rows) */}
            <View className="flex-col gap-y-4 flex-1 items-start pl-2">
              <Text className="text-[15px] font-heading font-bold text-text-main-light dark:text-text-main-dark tracking-wide">
                <Text className="text-[#F97316]">•</Text>{" "}
                {t("onboarding.websites", "Websites/Articles")}
              </Text>
              <Text className="text-[15px] font-heading font-bold text-text-main-light dark:text-text-main-dark tracking-wide">
                <Text className="text-[#F97316]">•</Text>{" "}
                {t("onboarding.youtubevideos", "YouTube Videos")}
              </Text>
              <Text className="text-[15px] font-heading font-bold text-text-main-light dark:text-text-main-dark tracking-wide">
                <Text className="text-[#F97316]">•</Text>{" "}
                {t("onboarding.photos", "Photos")}
              </Text>
            </View>
          </View>
        ) : null}
      </Animated.View>
    </ScrollView>
  );
}

// --- TRY IT OUT COMPONENT ---
function TryItOutStep({
  step,
  index,
  scrollIndex,
  activeType,
  setActiveType,
  inputText,
  setInputText,
  selectedFile,
  setSelectedFile,
  handleFilePick,
  selectedImages, // 👈 NEW
  handlePickImages, // 👈 NEW
}: any) {
  const insets = useSafeAreaInsets();
  const { colorScheme } = useColorScheme();
  const { t } = useTranslation();

  const textStyle = useAnimatedStyle(() => {
    // Math is now perfectly stable: [-1, 0, 1] relative to the index
    const inputRange = [index - 1, index, index + 1];

    const opacity = interpolate(
      scrollIndex.value,
      inputRange,
      [0, 1, 0],
      Extrapolation.CLAMP,
    );
    return { opacity };
  });

  return (
    <Animated.ScrollView
      style={textStyle}
      contentContainerStyle={{
        flexGrow: 1,
        alignItems: "center",
        paddingTop: insets.top,
        paddingBottom: insets.bottom,
      }}
      contentContainerClassName="px-6"
      showsVerticalScrollIndicator={false}
    >
      <Text className="text-3xl font-heading font-bold text-text-main-light dark:text-text-main-dark mb-4 leading-tight">
        {step.title}
      </Text>
      <Text className="text-base font-body text-text-muted-light dark:text-text-muted-dark mb-8 leading-relaxed">
        {step.description}
      </Text>

      {/* Type Selector (Tabs) */}
      <View className="flex-row py-4 gap-2 bg-page-light dark:bg-page-dark w-full">
        {[
          { id: "document", label: "Doc", icon: "document-text" },
          { id: "image", label: "Image", icon: "camera" },
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
              className={`ml-1 font-heading font-bold ${
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
      <View className="py-6 justify-center w-full">
        {activeType === "document" && (
          <View>
            <Text className="text-text-main-light dark:text-text-main-dark font-heading mb-2 ml-1">
              {t("creation.upload_your_document")}
            </Text>
            <PressableScale
              onPress={handleFilePick}
              style={{
                width: "100%",
                height: 200,
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
                    {t("creation.tap_to_select_document")}
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
              style={{ height: 200 }}
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

        {activeType === "image" && (
          <View>
            <Text className="text-text-main-light dark:text-text-main-dark font-heading mb-2 ml-1">
              {t("creation.upload_notes")}
            </Text>
            <PressableScale
              onPress={handlePickImages}
              style={{
                width: "100%",
                height: 200,
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
              <Ionicons name="images" size={48} color="#94A3B8" />
              <Text className="text-text-muted-light dark:text-text-muted-dark font-body font-bold mt-2">
                {t("creation.tap_to_select_images")}
              </Text>
            </PressableScale>

            {selectedImages?.length > 0 && (
              <View className="flex-row items-center justify-center gap-3 mt-2 flex-wrap w-full">
                {selectedImages.map((img: any, index: number) => (
                  <View
                    key={index}
                    className="rounded-xl overflow-hidden border-2 border-[#F97316] shadow-sm"
                  >
                    <Image
                      source={{ uri: img.uri }}
                      style={{ width: 64, height: 64 }}
                      contentFit="cover"
                      transition={200}
                    />
                  </View>
                ))}
              </View>
            )}
          </View>
        )}
      </View>
    </Animated.ScrollView>
  );
}

// --- RESULT SWIPE COMPONENT ---
function ResultSwipeStep({
  step,
  index,
  scrollIndex,
  cards,
  handleDeleteCard,
  onRate,
  onFinish,
  onShowContext,
}: any) {
  const insets = useSafeAreaInsets();
  const containerStyle = useAnimatedStyle(() => {
    const inputRange = [index - 1, index, index + 1];

    const scale = interpolate(
      scrollIndex.value,
      inputRange,
      [0.8, 1, 0.8],
      Extrapolation.CLAMP,
    );
    const opacity = interpolate(
      scrollIndex.value,
      inputRange,
      [0, 1, 0],
      Extrapolation.CLAMP,
    );
    return { opacity, transform: [{ scale }] };
  });

  return (
    <Animated.ScrollView
      style={containerStyle}
      contentContainerStyle={{
        flexGrow: 1,
        alignItems: "center",
        justifyContent: "center",
        paddingTop: insets.top,
        paddingBottom: insets.bottom,
      }}
      showsVerticalScrollIndicator={false}
    >
      <Text className="text-3xl font-heading font-bold text-text-main-light dark:text-text-main-dark text-center mb-2 px-6">
        {step.title}
      </Text>
      <Text className="text-base font-body text-text-muted-light dark:text-text-muted-dark text-center mb-2 px-10">
        {step.description}
      </Text>

      {/* 🚨 INJECTED FLASHCARD SWIPER 🚨 */}
      <View className="flex-1 w-full max-w-[800px] mb-10">
        {cards && cards.length > 0 ? (
          <FlashcardSwiper
            cards={cards}
            onFinish={onFinish}
            onRate={onRate}
            onShowContext={onShowContext}
            onDelete={handleDeleteCard} // Disabled for onboarding
            isOnboarding={true} // NEW PROP TO UNLOCK SPECIAL BEHAVIORS
          />
        ) : (
          <View className="w-full h-[300px] aspect-[3/4] bg-card-light dark:bg-card-dark rounded-[40px] border border-black/10 dark:border-white/10 shadow-xl items-center justify-center p-8">
            <ActivityIndicator size="large" color="#F97316" />
            <Text className="mt-4 font-body text-text-muted-light">
              Loading magic...
            </Text>
          </View>
        )}
      </View>
    </Animated.ScrollView>
  );
}

// --- STATIC COMPONENTS ---
// --- PAYWALL COMPONENT ---
function PaywallStep({
  step,
  pkg,
  index,
  scrollIndex,
  isPurchasing,
  handlePurchase,
  handleRestore,
}: any) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();

  const TERMS_URL =
    "https://gist.github.com/francesco-saponaro/d344c6bdaf1b47fe045772874ee35807";
  const PRIVACY_URL =
    "https://gist.github.com/francesco-saponaro/aeb8f04b6fd0b80a809fdb7119158fe5";
  const openLegal = (url: string) => Linking.openURL(url);

  // Smooth entrance animation for the final step
  const containerStyle = useAnimatedStyle(() => {
    const distance = index - scrollIndex.value;
    const opacity = interpolate(
      distance,
      [-1, 0, 1],
      [0, 1, 0],
      Extrapolation.CLAMP,
    );
    const translateY = interpolate(
      distance,
      [-1, 0, 1],
      [-50, 0, 50],
      Extrapolation.CLAMP,
    );
    return { opacity, transform: [{ translateY }] };
  });

  return (
    <Animated.ScrollView
      style={containerStyle}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{
        flexGrow: 1,
        justifyContent: "center",
        paddingTop: insets.top + 40,
        paddingBottom: insets.bottom + 20,
      }}
      contentContainerClassName="px-6"
    >
      {/* 🚨 NEW AGGRESSIVE HEADER 🚨 */}
      <View className="mb-4 items-center">
        <Image
          source={step.image}
          style={{ width: 85, height: 85, zIndex: 10, marginBottom: 10 }}
          contentFit="contain"
        />

        <View>
          <Text className="text-text-main-light dark:text-text-main-dark font-heading text-4xl font-black text-center leading-tight">
            {t("paywall.headerTitle", "Unlock Limitless\n")}
          </Text>
          <Text className="font-heading text-4xl font-black text-center leading-tight text-orange-500">
            {t("paywall.headerHighlight", "Learning")}
          </Text>
        </View>
      </View>

      <View className="mb-4 space-y-2 gap-2 w-full">
        <FeatureRow
          icon="document-text"
          title={t("paywall.feat_upload_title", "Upload Anything")}
          desc={t(
            "paywall.feat_upload_desc",
            "Instantly convert infinite PDFs, links, or text into cards.",
          )}
          color="#38BDF8"
        />
        <FeatureRow
          icon="calendar"
          title={t("paywall.feat_exam_title", "Exam Pacing Mode")}
          desc={t(
            "paywall.feat_exam_desc",
            "Set a deadline and let the AI build your daily study schedule.",
          )}
          color="#8B5CF6"
        />
        <FeatureRow
          icon="brain"
          title={t("paywall.feat_algo_title", "Smart Spaced Repetition")}
          desc={t(
            "paywall.feat_algo_desc",
            "Unlock the full memory algorithm to never forget a fact.",
          )}
          color="#F97316"
        />
        <FeatureRow
          icon="flame"
          title={t("paywall.feat_habit_title", "Unlimited Daily Stack")}
          desc={t(
            "paywall.feat_habit_desc",
            "Keep your streak alive and master thousands of cards.",
          )}
          color="#22C55E"
        />
      </View>

      <LinearGradient
        colors={["#F97316", "#EA580C"]}
        style={{
          borderRadius: 24,
          paddingHorizontal: 24,
          paddingTop: 24,
          paddingBottom: 20,
        }}
      >
        <View className="flex-row justify-between items-center mb-4">
          <View className="bg-white/20 px-3 py-1 rounded-lg">
            <Text className="text-white font-bold text-[10px] uppercase tracking-widest">
              {t("paywall.bestValue", "Best Value")}
            </Text>
          </View>
          <Text className="text-white/70 text-xs font-bold line-through">
            €59.99
          </Text>
        </View>

        <View className="flex-row items-baseline mb-1">
          {pkg ? (
            <Text className="text-white font-heading text-4xl font-bold">
              {pkg.product.priceString || "€29.99"}
            </Text>
          ) : null}
          <Text className="text-white/90 font-body text-base ml-1">
            {t("paywall.perYear", "/ year")}
          </Text>
        </View>

        <Text className="text-white/80 font-body text-xs mb-2">
          {pkg
            ? t("paywall.monthlyBreakdown", {
                // 1. We take the numeric price and divide by 12
                // 2. We use Intl.NumberFormat to automatically handle the symbol position and decimals
                price: new Intl.NumberFormat(undefined, {
                  style: "currency",
                  currency: pkg.product.currencyCode,
                }).format(pkg.product.price / 12),
              })
            : null}
        </Text>

        <PressableScale
          onPress={isPurchasing ? undefined : handlePurchase}
          activateOnHover
          style={{
            backgroundColor: "white",
            width: "100%",
            paddingVertical: 16,
            borderRadius: 12,
            alignItems: "center",
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.05,
            shadowRadius: 2,
            elevation: 2,
            opacity: isPurchasing ? 0.7 : 1,
          }}
        >
          {isPurchasing ? (
            <ActivityIndicator color="#EA580C" />
          ) : (
            <Text className="text-orange-600 font-bold text-lg">
              {t("paywall.cta")}
            </Text>
          )}
        </PressableScale>

        <Text className="text-white/60 text-[10px] font-medium mt-4 text-center">
          {t("paywall.guarantee", "Cancel anytime. No questions asked.")}
        </Text>

        <Pressable onPress={handleRestore} className="w-fit mt-2 self-center">
          <Text className="text-text-main-light text-white/60 text-[11px] font-medium underline">
            {t("paywall.restore")}
          </Text>
        </Pressable>
      </LinearGradient>

      <View className="flex-row justify-center gap-6 mt-6 opacity-60">
        <PressableScale onPress={() => openLegal(PRIVACY_URL)}>
          <Text className="text-text-main-light dark:text-text-main-dark text-[11px] font-medium underline">
            {t("privacy", "Privacy Policy")}
          </Text>
        </PressableScale>
        <PressableScale onPress={() => openLegal(TERMS_URL)}>
          <Text className="text-text-main-light dark:text-text-main-dark text-[11px] font-medium underline">
            {t("terms", "Terms of Service")}
          </Text>
        </PressableScale>
      </View>
    </Animated.ScrollView>
  );
}

function FeatureRow({ icon, title, desc, color }: any) {
  return (
    <View className="flex-row items-center bg-black/5 dark:bg-white/5 p-4 rounded-2xl border border-black/5 dark:border-white/10">
      <View
        style={{ backgroundColor: color + "20" }}
        className="w-12 h-12 rounded-xl items-center justify-center mr-4"
      >
        <Ionicons name={icon} size={22} color={color} />
      </View>
      <View className="flex-1">
        <Text className="text-text-main-light dark:text-text-main-dark font-bold text-sm leading-tight">
          {title}
        </Text>
        <Text className="text-text-muted-light dark:text-text-muted-dark text-xs mt-0.5 leading-tight">
          {desc}
        </Text>
      </View>
    </View>
  );
}
