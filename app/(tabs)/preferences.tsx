import { useCallback, useEffect } from "react";
import { Pressable, StyleSheet, Switch, Text, View } from "react-native";
import { useFocusEffect } from "expo-router";
import { setStatusBarStyle } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, {
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import { ScreenFade } from "@/components/ScreenFade";
import { colors, radii, shadows, spacing, typography } from "@/constants/theme";
import { usePreferences } from "@/lib/preferencesStore";
import type { Level } from "@/types";

const LEVELS: Level[] = [1, 2, 3, 4, 5];
const SPRING = { damping: 16, stiffness: 220, mass: 0.7 };
const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export default function PreferencesScreen() {
  const insets = useSafeAreaInsets();
  const { prefs, update, loaded } = usePreferences();

  useFocusEffect(
    useCallback(() => {
      setStatusBarStyle("dark");
    }, [])
  );

  if (!loaded) {
    return (
      <ScreenFade>
        <View style={[styles.canvas, { paddingTop: insets.top + spacing.xl }]}>
          <View style={styles.header}>
            <Text style={styles.bigTitle}>PREFERENCES</Text>
            <View style={styles.titleRule} />
          </View>
          <Text style={styles.muted}>Loading…</Text>
        </View>
      </ScreenFade>
    );
  }

  return (
    <ScreenFade>
      <View
        style={[
          styles.canvas,
          {
            paddingTop: insets.top + spacing.xl,
            paddingBottom: insets.bottom + 130,
          },
        ]}
      >
        <View style={styles.header}>
          <Text style={styles.bigTitle}>PREFERENCES</Text>
          <View style={styles.titleRule} />
          <Text style={styles.intro}>
            CySense uses these to recommend better-fit spaces. Preferences stay
            on your device.
          </Text>
        </View>

        <View style={styles.cardStack}>
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Maximum noise you&apos;re OK with</Text>
            <Scale
              value={prefs.maxNoise}
              onChange={(v) => update({ maxNoise: v })}
              leftCue="Silent"
              rightCue="Very loud"
            />
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Maximum crowd you&apos;re OK with</Text>
            <Scale
              value={prefs.maxCrowd}
              onChange={(v) => update({ maxCrowd: v })}
              leftCue="Empty"
              rightCue="Packed"
            />
          </View>

          <ToggleRow
            title="Prefer quieter spaces"
            description="Boost very quiet places in your recommendations."
            value={prefs.preferQuiet}
            onChange={(v) => update({ preferQuiet: v })}
          />
        </View>
      </View>
    </ScreenFade>
  );
}

// ----------------------------------------------------------------
// Scale (1-5 selector) with Reanimated cell transitions.
// ----------------------------------------------------------------

function Scale({
  value,
  onChange,
  leftCue,
  rightCue,
}: {
  value: Level;
  onChange: (v: Level) => void;
  leftCue: string;
  rightCue: string;
}) {
  return (
    <View style={{ gap: spacing.sm }}>
      <View style={styles.scale}>
        {LEVELS.map((n) => (
          <ScaleCell
            key={n}
            value={n}
            selected={value === n}
            onPress={() => onChange(n)}
          />
        ))}
      </View>
      <View style={styles.cues}>
        <Text style={styles.cue}>{leftCue}</Text>
        <Text style={styles.cue}>{rightCue}</Text>
      </View>
    </View>
  );
}

function ScaleCell({
  value,
  selected,
  onPress,
}: {
  value: Level;
  selected: boolean;
  onPress: () => void;
}) {
  // 0 = unselected, 1 = selected. Drives bg color, label color, scale.
  const sel = useSharedValue(selected ? 1 : 0);
  // 0 = released, 1 = pressed. Drives a tactile "press in" scale.
  const press = useSharedValue(0);

  useEffect(() => {
    sel.value = withSpring(selected ? 1 : 0, SPRING);
  }, [selected, sel]);

  const cellStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(
      sel.value,
      [0, 1],
      [colors.surfaceMuted, colors.cardinal]
    ),
    transform: [
      { scale: 1 + 0.04 * sel.value - 0.06 * press.value },
    ],
  }));

  const labelStyle = useAnimatedStyle(() => ({
    color: interpolateColor(sel.value, [0, 1], [colors.text, "#FFFFFF"]),
  }));

  return (
    <AnimatedPressable
      onPressIn={() => {
        press.value = withSpring(1, SPRING);
      }}
      onPressOut={() => {
        press.value = withSpring(0, SPRING);
      }}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      accessibilityLabel={`Set to ${value}`}
      style={[styles.dot, cellStyle]}
    >
      <Animated.Text style={[styles.dotLabel, labelStyle]}>{value}</Animated.Text>
    </AnimatedPressable>
  );
}

// ----------------------------------------------------------------
// Toggle row
// ----------------------------------------------------------------

function ToggleRow({
  title,
  description,
  value,
  onChange,
}: {
  title: string;
  description: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <View style={styles.toggleRow}>
      <View style={{ flex: 1, paddingRight: spacing.md }}>
        <Text style={styles.cardTitle}>{title}</Text>
        <Text style={styles.helper}>{description}</Text>
      </View>
      <Switch
        value={value}
        onValueChange={onChange}
        trackColor={{ false: colors.border, true: colors.cardinal }}
        accessibilityLabel={title}
      />
    </View>
  );
}

// ----------------------------------------------------------------
// Styles
// ----------------------------------------------------------------

const styles = StyleSheet.create({
  canvas: {
    flex: 1,
    backgroundColor: colors.background,
    paddingHorizontal: 28,
  },

  header: {
    gap: 8,
    paddingBottom: spacing.xl,
  },
  bigTitle: {
    fontSize: 44,
    fontWeight: "800",
    color: colors.cardinal,
    letterSpacing: -1.5,
    lineHeight: 48,
  },
  titleRule: {
    width: 80,
    height: 5,
    backgroundColor: colors.gold,
    borderRadius: 2.5,
  },
  intro: {
    ...typography.body,
    color: colors.text,
    marginTop: 4,
  },

  cardStack: {
    gap: spacing.lg,
    flexShrink: 1,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: spacing.xl,
    gap: spacing.lg,
    ...shadows.card,
  },
  toggleRow: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: spacing.xl,
    flexDirection: "row",
    alignItems: "center",
    ...shadows.card,
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: colors.text,
    letterSpacing: -0.2,
  },
  helper: { ...typography.small, color: colors.textSubtle },

  scale: { flexDirection: "row", gap: spacing.sm },
  dot: {
    flex: 1,
    height: 48,
    borderRadius: radii.md,
    alignItems: "center",
    justifyContent: "center",
  },
  dotLabel: {
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: 0.2,
  },
  cues: { flexDirection: "row", justifyContent: "space-between" },
  cue: { ...typography.caption, color: colors.textMuted },

  muted: { ...typography.body, color: colors.textMuted, marginTop: spacing.xl },
});
