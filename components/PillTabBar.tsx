import { Pressable, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { Icon, IconName } from "@/components/Icon";
import { colors } from "@/constants/theme";

const ROUTE_TO_ICON: Record<string, IconName> = {
  index: "tab-home",
  spaces: "tab-spaces",
  preferences: "tab-preferences",
  about: "tab-about",
};

export function PillTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const bottomOffset = Math.max(insets.bottom, 16);

  return (
    <View
      pointerEvents="box-none"
      style={[styles.wrap, { paddingBottom: bottomOffset }]}
    >
      <View style={styles.bar}>
        {state.routes.map((route, index) => {
          const focused = state.index === index;
          const iconName = ROUTE_TO_ICON[route.name] ?? "tab-home";
          const label = descriptors[route.key]?.options.title ?? route.name;

          return (
            <Pressable
              key={route.key}
              accessibilityRole="button"
              accessibilityState={focused ? { selected: true } : {}}
              accessibilityLabel={label}
              onPress={() => {
                const event = navigation.emit({
                  type: "tabPress",
                  target: route.key,
                  canPreventDefault: true,
                });
                if (!focused && !event.defaultPrevented) {
                  navigation.navigate(route.name, route.params);
                }
              }}
              style={({ pressed }) => [
                styles.item,
                pressed && { transform: [{ scale: 0.96 }] },
              ]}
            >
              {focused && <View style={styles.activeBg} />}
              <Icon
                name={iconName}
                size={22}
                color={focused ? "#FFFFFF" : "rgba(255,255,255,0.6)"}
              />
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const ACTIVE_BG = 48;

const styles = StyleSheet.create({
  wrap: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingTop: 12,
    paddingHorizontal: 16,
  },
  bar: {
    flexDirection: "row",
    backgroundColor: colors.cardinal,
    paddingHorizontal: 8,
    paddingVertical: 8,
    borderRadius: 999,
    shadowColor: colors.cardinalDeep,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 18,
    elevation: 10,
  },
  item: {
    flex: 1,
    height: 56,
    alignItems: "center",
    justifyContent: "center",
  },
  activeBg: {
    position: "absolute",
    width: ACTIVE_BG,
    height: ACTIVE_BG,
    borderRadius: ACTIVE_BG / 2,
    backgroundColor: "rgba(255,255,255,0.16)",
  },
});
