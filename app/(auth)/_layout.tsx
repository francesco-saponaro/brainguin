import { Stack } from "expo-router";

export default function AuthLayout() {
  return (
    <Stack>
      <Stack.Screen
        name="index"
        options={{ title: "Login", headerShown: false }}
      />
      <Stack.Screen
        name="signup"
        options={{ title: "Signup", headerShown: false }}
      />
      <Stack.Screen
        name="update-password"
        options={{ title: "Update Password", headerShown: false }}
      />
    </Stack>
  );
}
