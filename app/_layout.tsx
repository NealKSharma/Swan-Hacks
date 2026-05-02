import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { colors } from "@/constants/theme";

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: colors.background },
          headerTitleStyle: { color: colors.text, fontWeight: "700" },
          headerTintColor: colors.cardinal,
          contentStyle: { backgroundColor: colors.background },
          headerShadowVisible: false,
        }}
      >
        <Stack.Screen name="index" options={{ title: "CySense" }} />
        <Stack.Screen name="locations" options={{ title: "Browse spaces" }} />
        <Stack.Screen name="preferences" options={{ title: "Your preferences" }} />
        <Stack.Screen name="about" options={{ title: "About CySense" }} />
        <Stack.Screen
          name="location/[id]"
          options={{ title: "", headerBackTitle: "Back" }}
        />
      </Stack>
    </SafeAreaProvider>
  );
}
