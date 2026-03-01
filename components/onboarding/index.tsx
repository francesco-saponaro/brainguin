import Celebration from "@/components/Celebration";
import LanguageStep from "@/components/LanguageStep";
import OnboardingStep from "@/components/OnboardingStep";
import StepIndicator from "@/components/StepIndicator";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/store/storeUser";
import { Image } from "expo-image";
import { useColorScheme } from "nativewind";
import React, { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  NativeScrollEvent,
  NativeSyntheticEvent,
  ScrollView,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";

// --- Penguin Images ---
import CELEBRATOR_PENGUIN from "@/assets/images/celebrator.png";
import GREETER_PENGUIN from "@/assets/images/greeter.png";
import PENGUIN_LOGO from "@/assets/images/main.png";
import PDF_PENGUIN from "@/assets/images/pdf.png";
import PROCESSOR_PENGUIN from "@/assets/images/processor.png";

import TEXT_LOGO_LIGHT from "@/assets/images/icon-text-dark.png";
import TEXT_LOGO_DARK from "@/assets/images/icon-text-light.png";
import { PressableScale } from "pressto";

const onboardingContent = (t: any) => [
  {
    key: "language",
    title: t("onboarding.language_title"),
    description: t("onboarding.language_description"),
    image: PENGUIN_LOGO,
  },
  {
    key: "welcome",
    title: t("onboarding.welcome_title"),
    description: t("onboarding.welcome_description"),
    image: GREETER_PENGUIN,
  },
  {
    key: "creation-sprint",
    title: t("onboarding.creation_sprint_title"),
    description: t("onboarding.creation_sprint_description"),
    image: PDF_PENGUIN,
  },
  {
    key: "brain-to-flashcard",
    title: t("onboarding.flashcard_title"),
    description: t("onboarding.flashcard_description"),
    // image: PROCESSOR_PENGUIN,
    image: PENGUIN_LOGO,
  },
  {
    key: "spaced-repetition",
    title: t("onboarding.spaced_repetition_title"),
    description: t("onboarding.spaced_repetition_description"),
    image: PROCESSOR_PENGUIN,
  },
  {
    key: "success",
    title: t("onboarding.success_title"),
    description: t("onboarding.success_description"),
    image: CELEBRATOR_PENGUIN,
  },
];

export default function OnboardingScreen() {
  const { signOut } = useAuthStore();
  const { t, i18n } = useTranslation();
  const { colorScheme } = useColorScheme();
  const { session } = useAuthStore();
  const { width: windowWidth } = useWindowDimensions();

  const [currentPage, setCurrentPage] = useState(0);
  const scrollRef = useRef<ScrollView>(null);

  const buttonOpacity = useSharedValue(0);
  const buttonTranslateY = useSharedValue(50);
  const skipOpacity = useSharedValue(1);
  const skipTranslateY = useSharedValue(0);

  const allSteps = onboardingContent(t);
  const isLastPage = currentPage === allSteps.length - 1;

  // Sync animations
  React.useEffect(() => {
    buttonOpacity.value = withTiming(currentPage === 0 ? 0 : 1, {
      duration: 300,
    });
    buttonTranslateY.value = withTiming(currentPage === 0 ? 50 : 0, {
      duration: 300,
    });

    if (currentPage === 0 || isLastPage) {
      skipOpacity.value = withTiming(0, { duration: 300 });
      skipTranslateY.value = withTiming(20, { duration: 300 });
    } else {
      skipOpacity.value = withTiming(1, { duration: 300 });
      skipTranslateY.value = withTiming(0, { duration: 300 });
    }
  }, [currentPage, isLastPage]);

  // Handle manual scroll/swipe
  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const offset = event.nativeEvent.contentOffset.x;
    const page = Math.round(offset / windowWidth);
    if (page !== currentPage) {
      setCurrentPage(page);
    }
  };

  const goToNextPage = () => {
    if (currentPage < allSteps.length - 1) {
      const nextStep = currentPage + 1;
      scrollRef.current?.scrollTo({
        x: nextStep * windowWidth,
        animated: true,
      });
      setCurrentPage(nextStep);
    } else {
      completeOnboarding();
    }
  };

  const completeOnboarding = async () => {
    if (!session?.user) return;

    try {
      // 1. Save ONLY profile data (Language) to public 'users' table
      const { error: dbError } = await supabase
        .from("users")
        .update({
          preferences: { language: i18n.language }, // 👈 Saving as JSON
        })
        .eq("id", session.user.id);

      if (dbError) throw dbError;

      // 2. Save the Onboarding Flag to Auth Metadata (Fast access for Guards)
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.updateUser({
        data: { is_onboarded: true }, // 👈 Flag lives here now
      });

      if (authError) throw authError;

      // 3. Update local store to redirect immediately
      // We pass 'true' manually so we don't have to wait for a refresh
      useAuthStore.getState().setSession(session, true);
    } catch (error) {
      console.error("Onboarding error:", error);
    }
  };

  const animatedButtonStyles = useAnimatedStyle(() => ({
    opacity: buttonOpacity.value,
    transform: [{ translateY: buttonTranslateY.value }],
  }));

  const animatedSkipButtonStyles = useAnimatedStyle(() => ({
    opacity: skipOpacity.value,
    transform: [{ translateY: skipTranslateY.value }],
  }));

  return (
    <SafeAreaView className="flex-1 bg-page-light dark:bg-page-dark">
      <Celebration isActive={isLastPage} />

      <View className="flex-1">
        <View className="justify-between items-center flex-row px-6 pt-4 absolute top-0 left-0 right-0 z-10 w-full">
          <Image
            source={colorScheme === "dark" ? TEXT_LOGO_LIGHT : TEXT_LOGO_DARK}
            style={{
              width: 130,
              height: 40,
            }}
            contentFit="contain"
          />
          <Animated.View style={animatedSkipButtonStyles}>
            {/* <Pressable
              onPress={completeOnboarding}
              disabled={currentPage === 0 || isLastPage}
              className="hover:brightness-90 transition-all duration-250"
            > */}
            <PressableScale
              onPress={completeOnboarding}
              activateOnHover
              style={{ opacity: currentPage === 0 || isLastPage ? 0.5 : 1 }}
            >
              <Text className="text-text-muted-light dark:text-text-muted-dark font-body text-base">
                {t("onboarding.skip")}
              </Text>
            </PressableScale>
          </Animated.View>
        </View>

        <ScrollView
          ref={scrollRef}
          horizontal
          pagingEnabled
          scrollEnabled={currentPage !== 0 && !isLastPage}
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={handleScroll}
          // Optimization for Web performance
          scrollEventThrottle={16}
          className="flex-1"
        >
          {allSteps.map((step) => (
            <View
              key={step.key}
              style={{
                width: windowWidth,
                overflow: "hidden", // 👈 ADD THIS: Prevents Web "bleeding" from next/prev slides
              }}
              className="flex-1"
            >
              {step.key === "language" ? (
                <LanguageStep
                  onLanguageSelect={goToNextPage}
                  activeLanguage={i18n.language}
                />
              ) : (
                <OnboardingStep
                  title={step.title}
                  description={step.description}
                  image={step.image}
                  penguinLogo={PENGUIN_LOGO}
                  colorScheme={colorScheme ?? "light"}
                />
              )}
            </View>
          ))}
        </ScrollView>

        {/* Footer Area */}
        <View className="px-6 pb-8 bg-page-light dark:bg-page-dark max-w-[800px] self-center w-full">
          <StepIndicator
            totalSteps={allSteps.length}
            currentStep={currentPage}
          />

          <View className="flex-row gap-4 mt-4">
            {currentPage > 0 && (
              <View className="flex-1">
                {/* <Pressable
                  onPress={() => {
                    const prevStep = currentPage - 1;
                    scrollRef.current?.scrollTo({
                      x: prevStep * windowWidth,
                      animated: true,
                    });
                    setCurrentPage(prevStep);
                  }}
                  className="bg-white dark:bg-card-dark border border-gray-200 dark:border-gray-700 p-4 rounded-xl flex-row justify-center items-center gap-2 hover:brightness-90 transition-all duration-250 w-fit"
                > */}
                <PressableScale
                  activateOnHover
                  onPress={() => {
                    const prevStep = currentPage - 1;
                    scrollRef.current?.scrollTo({
                      x: prevStep * windowWidth,
                      animated: true,
                    });
                    setCurrentPage(prevStep);
                  }}
                  style={{
                    backgroundColor:
                      colorScheme === "dark" ? "#334155" : "#FFFFFF",
                    padding: 16,
                    borderRadius: 12,
                    borderWidth: 1,
                    borderColor: colorScheme === "dark" ? "#475569" : "#E5E7EB",
                    flexDirection: "row",
                    justifyContent: "center",
                    alignItems: "center",
                  }}
                >
                  <Text className="text-text-muted-light dark:text-text-muted-dark font-heading text-lg font-bold">
                    {t("onboarding.prev_button")}
                  </Text>
                </PressableScale>
              </View>
            )}

            <Animated.View
              style={[animatedButtonStyles, { flex: currentPage > 0 ? 2 : 1 }]}
            >
              <PressableScale
                onPress={goToNextPage}
                activateOnHover
                style={{
                  padding: 16,
                  borderRadius: 12,
                  alignItems: "center",
                  backgroundColor: isLastPage ? "#0F172A" : "#F97316",
                  shadowColor: "#000",
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.1,
                  shadowRadius: 4,
                  elevation: 2,
                }}
              >
                <Text className="text-white font-heading text-lg font-bold">
                  {isLastPage
                    ? t("onboarding.start_sprint_button")
                    : t("onboarding.next_button")}
                </Text>
              </PressableScale>
            </Animated.View>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}
