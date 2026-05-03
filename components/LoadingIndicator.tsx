// Centered "Loading" text with three cardinal dots that pulse in sequence.
// Used everywhere the app needs to show a loading state — single source of
// truth so the look stays consistent.

import { useEffect } from "react";
import { StyleSheet, Text, View, ViewStyle } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import { colors } from "@/constants/theme";

interface Props {
  label?: string;
  style?: ViewStyle;
}

const CYCLE_MS = 1200;

export function LoadingIndicator({ label = "Loading", style }: Props) {
  // One shared progress value drives all three dots; each dot reads it
  // through a phase offset so they peak at different points in the cycle.
  const t = useSharedValue(0);

  useEffect(() => {
    t.value = withRepeat(
      withTiming(1, { duration: CYCLE_MS, easing: Easing.linear }),
      -1,
      false
    );
  }, [t]);

  const dot1 = useAnimatedStyle(() => ({ opacity: pulse(t.value, 0.0) }));
  const dot2 = useAnimatedStyle(() => ({ opacity: pulse(t.value, 0.33) }));
  const dot3 = useAnimatedStyle(() => ({ opacity: pulse(t.value, 0.66) }));

  return (
    <View style={[styles.wrap, style]} accessibilityLabel={`${label}…`}>
      <View style={styles.row}>
        <Text style={styles.label}>{label}</Text>
        <Animated.Text style={[styles.dot, dot1]}>.</Animated.Text>
        <Animated.Text style={[styles.dot, dot2]}>.</Animated.Text>
        <Animated.Text style={[styles.dot, dot3]}>.</Animated.Text>
      </View>
    </View>
  );
}

// Triangle-wave pulse, peaks at phase, valley at phase+0.5 (mod 1).
// Output: 0.2 (dim) ↔ 1.0 (bright). Worklet — runs on the UI thread.
function pulse(t: number, phase: number): number {
  "worklet";
  const v = (t - phase + 1) % 1;
  // peak at v=0; over the first 0.5 of the cycle the dot fades from 1 → 0.2,
  // then stays dim through the back half.
  const tri = v < 0.5 ? 1 - v * 2 : 0;
  return 0.2 + 0.8 * tri;
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  row: {
    flexDirection: "row",
    alignItems: "baseline",
  },
  label: {
    fontSize: 22,
    fontWeight: "800",
    color: colors.cardinal,
    letterSpacing: 0.4,
  },
  dot: {
    fontSize: 22,
    fontWeight: "800",
    color: colors.cardinal,
    marginLeft: 2,
  },
});
