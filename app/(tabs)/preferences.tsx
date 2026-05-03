import { useCallback, useEffect, useRef, useState } from "react";
import { Pressable, StyleSheet, Switch, Text, View } from "react-native";
import { useFocusEffect } from "expo-router";
import { setStatusBarStyle } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, {
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { LoadingIndicator } from "@/components/LoadingIndicator";
import { ScreenFade } from "@/components/ScreenFade";
import { colors, radii, shadows, spacing, typography } from "@/constants/theme";
import { usePreferences } from "@/lib/preferencesStore";
import {
  disableCrowdSense,
  enableCrowdSense,
  isCrowdSenseEnabled,
} from "@/services/crowdSense";
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
            <View style={styles.titleBlock}>
              <Text style={styles.bigTitle}>PREFERENCES</Text>
              <View style={styles.titleRule} />
            </View>
          </View>
          <LoadingIndicator />
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
          <View style={styles.titleBlock}>
            <Text style={styles.bigTitle}>PREFERENCES</Text>
            <View style={styles.titleRule} />
          </View>
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

          <LocationSharingPill />
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
// Location-sharing pill — drives CrowdSense on/off via the same services
// the map view used to call. White when off, cardinalSoft + cardinal text
// when on. Animated through Reanimated interpolateColor for the colour
// crossfade plus a spring-driven press scale.
// ----------------------------------------------------------------

function LocationSharingPill() {
  // Animation is driven DIRECTLY from the toggle action, not from a
  // useEffect on [enabled]. That means nothing except a completed toggle
  // can animate the pill — no mount race, no late re-render, no stray
  // state update can flash the colour. `enabled` is purely a label-state
  // signal; the visible colour is owned by the toggle's resolution.
  const [enabled, setEnabled] = useState(false);
  const [busy, setBusy] = useState(false);

  const inFlight = useRef(false);
  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const sel = useSharedValue(0);
  const press = useSharedValue(0);

  // On mount, set sel.value DIRECTLY (no animation) to whatever the
  // storage flag says. If the user later sees a remount, the pill snaps
  // straight to the right colour with no fade — never a flash.
  useEffect(() => {
    let cancelled = false;
    isCrowdSenseEnabled()
      .then((v) => {
        if (cancelled || !mountedRef.current) return;
        setEnabled(v);
        sel.value = v ? 1 : 0;
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [sel]);

  const pillStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(
      sel.value,
      [0, 1],
      [colors.surface, colors.cardinalSoft]
    ),
    transform: [{ scale: 1 - press.value * 0.04 }],
    opacity: 1 - press.value * 0.12,
  }));

  const labelStyle = useAnimatedStyle(() => ({
    color: interpolateColor(sel.value, [0, 1], [colors.text, colors.cardinal]),
  }));

  const dotStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(
      sel.value,
      [0, 1],
      [colors.textMuted, colors.cardinal]
    ),
    transform: [{ scale: 1 + sel.value * 0.15 }],
  }));

  async function toggle() {
    if (inFlight.current) return;
    inFlight.current = true;
    setBusy(true);

    try {
      if (enabled) {
        await disableCrowdSense();
      } else {
        await enableCrowdSense();
      }
    } catch {
      /* swallow — we read the actual state below regardless */
    }

    // Read the real, settled state from storage and drive both the label
    // (setEnabled) and the colour (sel.value) atomically here. Because the
    // animation lives inside the toggle and not in a useEffect, nothing
    // can re-trigger it from a stray re-render — the only path to a colour
    // change is this single point at the end of a completed user action.
    let actual = enabled;
    try {
      actual = await isCrowdSenseEnabled();
    } catch {
      /* leave actual at the previous value */
    }

    if (mountedRef.current) {
      setEnabled(actual);
      sel.value = withTiming(actual ? 1 : 0, { duration: 240 });
      setBusy(false);
    }
    inFlight.current = false;
  }

  return (
    <AnimatedPressable
      accessibilityRole="switch"
      accessibilityState={{ checked: enabled, busy }}
      accessibilityLabel="Share my location for nearby spot detection"
      onPressIn={() => {
        press.value = withSpring(1, SPRING);
      }}
      onPressOut={() => {
        press.value = withSpring(0, SPRING);
      }}
      onPress={toggle}
      disabled={busy}
      style={[styles.locationPill, pillStyle]}
    >
      <Animated.View style={[styles.locationPillDot, dotStyle]} />
      <Animated.Text style={[styles.locationPillText, labelStyle]}>
        {busy ? "…" : enabled ? "Sharing my location" : "Share my location"}
      </Animated.Text>
    </AnimatedPressable>
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
    paddingBottom: spacing.lg,
  },
  bigTitle: {
    fontSize: 44,
    fontWeight: "800",
    color: colors.cardinal,
    letterSpacing: -1.5,
    lineHeight: 48,
  },
  titleBlock: {
    alignSelf: "flex-start",
    gap: 8,
  },
  titleRule: {
    alignSelf: "stretch",
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
    gap: spacing.md,
    flexShrink: 1,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: spacing.lg,
    gap: spacing.md,
    ...shadows.card,
  },
  toggleRow: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: spacing.lg,
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

  // Location-sharing pill
  locationPill: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 12,
    paddingHorizontal: spacing.lg,
    borderRadius: radii.pill,
    ...shadows.card,
  },
  locationPillDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  locationPillText: {
    fontSize: 15,
    fontWeight: "700",
    letterSpacing: 0.3,
  },

  muted: { ...typography.body, color: colors.textMuted, marginTop: spacing.xl },
});
