import { useState } from "react";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { IntroOverlay } from "@/components/IntroOverlay";
import { colors } from "@/constants/theme";
import "@/services/crowdSense";

export default function RootLayout() {
  const [introDone, setIntroDone] = useState(false);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <StatusBar style="dark" />
        <Stack
          screenOptions={{
            headerStyle: { backgroundColor: colors.background },
            headerTitleStyle: { color: colors.text, fontWeight: "700" },
            headerTintColor: colors.cardinal,
            contentStyle: { backgroundColor: colors.background },
            headerShadowVisible: false,
            // Standard iOS slide-from-right push for stack screens
            animation: "slide_from_right",
            animationDuration: 280,
          }}
        >
          <Stack.Screen
            name="(tabs)"
            options={{
              headerShown: false,
              // Coming back to the tabs from a stack push fades cleanly
              // instead of slide-flashing under the floating tab bar
              animation: "fade",
            }}
          />
          <Stack.Screen
            name="location/[id]"
            options={{ title: "", headerBackTitle: "Back" }}
          />
        </Stack>
        {!introDone && <IntroOverlay onDone={() => setIntroDone(true)} />}
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
