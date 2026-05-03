// Per-screen entrance animation driven by react-navigation focus, not by
// the bottom-tabs navigator's own transition. This keeps `animation: "none"`
// on the Tabs (which avoids the v7 fade-leaves-tab-stuck-at-opacity-0 bug)
// while still giving the user a smooth fade + lift when each tab appears.

import { ReactNode, useEffect } from "react";
import { useIsFocused } from "@react-navigation/native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

interface Props {
  children: ReactNode;
}

export function ScreenFade({ children }: Props) {
  const isFocused = useIsFocused();
  const opacity = useSharedValue(isFocused ? 1 : 0);
  const translate = useSharedValue(isFocused ? 0 : 8);

  useEffect(() => {
    if (isFocused) {
      opacity.value = withTiming(1, {
        duration: 220,
        easing: Easing.out(Easing.cubic),
      });
      translate.value = withTiming(0, {
        duration: 220,
        easing: Easing.out(Easing.cubic),
      });
    } else {
      // Reset instantly on blur so the next focus animates in cleanly.
      opacity.value = 0;
      translate.value = 8;
    }
  }, [isFocused, opacity, translate]);

  const animStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translate.value }],
  }));

  return (
    <Animated.View style={[{ flex: 1 }, animStyle]}>{children}</Animated.View>
  );
}
