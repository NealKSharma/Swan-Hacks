import { useEffect } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { Icon, IconName } from "@/components/Icon";
import { colors } from "@/constants/theme";

const ROUTE_TO_ICON: Record<string, IconName> = {
  index: "tab-home",
  map: "tab-map",
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
            <TabItem
              key={route.key}
              focused={focused}
              iconName={iconName}
              label={label}
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
            />
          );
        })}
      </View>
    </View>
  );
}

function TabItem({
  focused,
  iconName,
  label,
  onPress,
}: {
  focused: boolean;
  iconName: IconName;
  label: string;
  onPress: () => void;
}) {
  // 0 → inactive, 1 → active. Drives the active circle + icon scale.
  const progress = useSharedValue(focused ? 1 : 0);
  const press = useSharedValue(0);

  useEffect(() => {
    progress.value = withSpring(focused ? 1 : 0, {
      damping: 16,
      stiffness: 220,
      mass: 0.7,
    });
  }, [focused, progress]);

  const bgStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [{ scale: 0.55 + 0.45 * progress.value }],
  }));

  const iconStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: 1 + 0.1 * progress.value - 0.06 * press.value },
      { translateY: -2 * progress.value },
    ],
  }));

  return (
    <Pressable
      onPressIn={() => {
        press.value = withTiming(1, { duration: 90 });
      }}
      onPressOut={() => {
        press.value = withTiming(0, { duration: 160 });
      }}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={focused ? { selected: true } : {}}
      accessibilityLabel={label}
      style={styles.item}
    >
      <Animated.View style={[styles.activeBg, bgStyle]} />
      <Animated.View style={iconStyle}>
        <Icon
          name={iconName}
          size={26}
          color={focused ? "#FFFFFF" : "rgba(255,255,255,0.6)"}
        />
      </Animated.View>
    </Pressable>
  );
}

const ACTIVE_BG = 56;

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
    height: 64,
    alignItems: "center",
    justifyContent: "center",
  },
  activeBg: {
    position: "absolute",
    width: ACTIVE_BG,
    height: ACTIVE_BG,
    borderRadius: ACTIVE_BG / 2,
    backgroundColor: "rgba(255,255,255,0.18)",
  },
});
