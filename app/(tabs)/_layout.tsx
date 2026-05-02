import { Tabs } from "expo-router";
import { PillTabBar } from "@/components/PillTabBar";

export default function TabsLayout() {
  return (
    <Tabs
      tabBar={(props) => <PillTabBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <Tabs.Screen name="index" options={{ title: "Home" }} />
      <Tabs.Screen name="spaces" options={{ title: "Spaces" }} />
      <Tabs.Screen name="preferences" options={{ title: "Preferences" }} />
      <Tabs.Screen name="about" options={{ title: "About" }} />
    </Tabs>
  );
}
