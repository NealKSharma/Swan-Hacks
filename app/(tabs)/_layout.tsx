import { Tabs } from "expo-router";
import { PillTabBar } from "@/components/PillTabBar";

export default function TabsLayout() {
  return (
    <Tabs
      tabBar={(props) => <PillTabBar {...props} />}
      screenOptions={{
        headerShown: false,
        // No tab animation: instant swap. Both "fade" and "shift" in
        // @react-navigation/bottom-tabs v7 can intermittently leave a
        // destination tab not rendering when its tree contains heavy
        // Reanimated content (snap pager, draggable sliders, FlatList).
        // Removing the animation eliminates the variable. Each screen
        // has its own internal motion already.
        animation: "none",
        lazy: false,
      }}
    >
      <Tabs.Screen name="index" options={{ title: "Home" }} />
      <Tabs.Screen name="spaces" options={{ title: "Spaces" }} />
      <Tabs.Screen name="preferences" options={{ title: "Preferences" }} />
      <Tabs.Screen name="about" options={{ title: "About" }} />
    </Tabs>
  );
}
