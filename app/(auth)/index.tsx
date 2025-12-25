import AnywhereImg from "@/assets/images/Anywhere.png";
// import AuthHeroLight from "@/assets/images/auth-hero-light.png";
import AuthHero from "@/assets/images/login-new.jpg";
import OvunqueImg from "@/assets/images/Ovunque.png";
import Button from "@/components/Button";
import LoginModal from "@/components/LoginModal";
import RegisterModal from "@/components/RegisterModal";
import SocialButtonIcon from "@/components/SocialButtonIcon";
import ROUTES from "@/constants/Routes";
import { useColorScheme } from "@/hooks/useColorScheme";
import useUserStore from "@/store/storeUser";
import { getCurrentLocale } from "@/utils/locale";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Image, Platform, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function AuthScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const { t } = useTranslation();
  const currentLocale = getCurrentLocale();
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<
    "login" | "register" | null
  >(null);
  const { loginFacebook, loginApple, loginGoogle } = useUserStore();
  // const heroImage = colorScheme === "dark" ? AuthHero : AuthHeroLight;

  return (
    <SafeAreaView
      className="flex-1 bg-primario-light-nero dark:bg-primario-dark-nero w-full"
      edges={["bottom"]}
    >
      <View className="w-full flex-col h-full justify-end relative">
        <View className="absolute top-0 left-0 !h-[66%] z-0 !w-full">
          <Image
            source={AuthHero}
            className="!h-full z-0 !w-full"
            resizeMode="cover"
          />

          <LinearGradient
            colors={[
              colorScheme === "dark"
                ? "rgba(0, 0, 0, 0)" // Transparent black for dark mode
                : "rgba(247, 247, 247, 0)", // Transparent WHITE for light mode
              colorScheme === "dark"
                ? "rgba(0, 0, 0, 0.8)"
                : "rgba(247, 247, 247, 0.8)",
              colorScheme === "dark"
                ? "rgba(0, 0, 0, 1)"
                : "rgba(247, 247, 247, 1)",
            ]}
            style={{
              position: "absolute",
              bottom: 0,
              left: 0,
              right: 0,
              height: 200, // Adjust to control how much of the image gets blurred
            }}
          />
        </View>

        <View className="w-full flex-col p-[16px] z-20">
          <View className="w-full flex-col items-center justify-center mb-[10px]">
            <Text className="text-h2 font-semibold text-primario-light-bianco dark:text-primario-dark-bianco leading-tight">
              ZetaBarber
            </Text>
            <Text className="text-h2 font-semibold text-primario-light-bianco dark:text-primario-dark-bianco leading-tight">
              {t("loginHeader")}.
            </Text>
            <Image
              source={currentLocale.startsWith("it") ? OvunqueImg : AnywhereImg}
              resizeMode="contain"
              className="mt-[-10px]"
            />
          </View>

          <View className="flex-col justify-between w-full">
            <Button
              onPress={() => setIsAuthModalOpen("login")}
              title={t("loginEmail")}
              className="w-full !h-[60px] !rounded-[16px]"
            />
            <Button
              onPress={() => setIsAuthModalOpen("register")}
              title={t("registerEmail")}
              variant="transparent-neutro"
              className="w-full !h-[60px] !rounded-[16px]"
            />
          </View>

          <View className="flex flex-row justify-between w-full gap-[4px] my-[20px]">
            <View className="flex-1 h-[1px] bg-neutro-light-20 dark:bg-neutro-dark-20 self-center" />
            <Text className="text-body4 text-center text-neutro-light-60 dark:text-neutro-dark-60 font-medium">
              {t("orWith")}
            </Text>
            <View className="flex-1 h-[1px] bg-neutro-light-20 dark:bg-neutro-dark-20 self-center" />
          </View>

          <View className="w-full flex-row gap-[14px] items-center justify-between">
            <SocialButtonIcon
              variant="google"
              onPress={() =>
                loginGoogle((isRegistered) => {
                  if (!isRegistered) {
                    router.replace(ROUTES.ONBOARDING);
                  }
                })
              }
              className="flex-1"
            />
            {Platform.OS !== "web" ? (
              <SocialButtonIcon
                variant="facebook"
                onPress={() =>
                  loginFacebook((isRegistered) => {
                    if (!isRegistered) {
                      router.replace(ROUTES.ONBOARDING);
                    }
                  })
                }
                className="flex-1"
              />
            ) : null}
            {Platform.OS === "ios" ? (
              <SocialButtonIcon
                variant="apple"
                onPress={() =>
                  loginApple((isRegistered) => {
                    if (!isRegistered) {
                      router.replace(ROUTES.ONBOARDING);
                    }
                  })
                }
                className="flex-1"
              />
            ) : null}
          </View>
        </View>
      </View>

      {/* Login Modal */}
      <LoginModal
        visible={isAuthModalOpen === "login"}
        onClose={() => setIsAuthModalOpen(null)}
      />

      {/* Register Modal */}
      <RegisterModal
        visible={isAuthModalOpen === "register"}
        onClose={() => setIsAuthModalOpen(null)}
      />
    </SafeAreaView>
  );
}
