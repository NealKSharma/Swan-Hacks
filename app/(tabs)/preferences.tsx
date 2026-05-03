import { useCallback } from "react";
import { Pressable, StyleSheet, Switch, Text, View } from "react-native";
import { useFocusEffect } from "expo-router";
import { setStatusBarStyle } from "expo-status-bar";
import { Screen } from "@/components/Screen";
import { ScreenFade } from "@/components/ScreenFade";
import { colors, radii, spacing, typography } from "@/constants/theme";
import { usePreferences } from "@/lib/preferencesStore";
import type { Level } from "@/types";
import { levelLabel } from "@/utils/formatting";

const LEVELS: Level[] = [1, 2, 3, 4, 5];

export default function PreferencesScreen() {
  const { prefs, update, loaded } = usePreferences();

  useFocusEffect(
    useCallback(() => {
      setStatusBarStyle("dark");
    }, [])
  );

  if (!loaded) {
    return (
      <ScreenFade>
        <Screen contentContainerStyle={{ paddingTop: spacing.xl }}>
          <Text style={styles.muted}>Loading…</Text>
        </Screen>
      </ScreenFade>
    );
  }

  return (
    <ScreenFade>
    <Screen contentContainerStyle={{ paddingTop: spacing.xl }}>
      <View style={styles.header}>
        <View style={styles.headerBlob} />
        <Text style={styles.eyebrow}>Personalize</Text>
        <Text style={styles.title}>Preferences</Text>
        <Text style={styles.intro}>
          Set your sensory preferences. CySense uses these to recommend better-fit
          spaces. Preferences stay on your device.
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Maximum noise you&apos;re OK with</Text>
        <Text style={styles.helper}>Currently: {levelLabel("noise", prefs.maxNoise)}</Text>
        <Scale
          value={prefs.maxNoise}
          onChange={(v) => update({ maxNoise: v })}
          leftCue="Silent"
          rightCue="Very loud"
        />
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Maximum crowd you&apos;re OK with</Text>
        <Text style={styles.helper}>Currently: {levelLabel("crowd", prefs.maxCrowd)}</Text>
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
    </Screen>
    </ScreenFade>
  );
}

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
        {LEVELS.map((n) => {
          const selected = value === n;
          return (
            <Pressable
              key={n}
              onPress={() => onChange(n)}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              accessibilityLabel={`Set to ${n}`}
              style={[styles.dot, selected && styles.dotSelected]}
            >
              <Text style={[styles.dotLabel, selected && styles.dotLabelSelected]}>{n}</Text>
            </Pressable>
          );
        })}
      </View>
      <View style={styles.cues}>
        <Text style={styles.cue}>{leftCue}</Text>
        <Text style={styles.cue}>{rightCue}</Text>
      </View>
    </View>
  );
}

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

const styles = StyleSheet.create({
  header: { gap: 4, paddingBottom: spacing.sm },
  headerBlob: {
    position: "absolute",
    top: -20,
    right: -10,
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: colors.cardinalSoft,
  },
  eyebrow: {
    ...typography.caption,
    color: colors.cardinal,
    textTransform: "uppercase",
    letterSpacing: 1.4,
  },
  title: { ...typography.display, color: colors.text },
  intro: { ...typography.body, color: colors.textSubtle },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.sm,
  },
  toggleRow: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: "row",
    alignItems: "center",
  },
  cardTitle: { ...typography.heading, color: colors.text },
  helper: { ...typography.small, color: colors.textSubtle },
  scale: { flexDirection: "row", gap: spacing.sm },
  dot: {
    flex: 1,
    height: 48,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  dotSelected: { backgroundColor: colors.cardinal, borderColor: colors.cardinal },
  dotLabel: { ...typography.bodyStrong, color: colors.text },
  dotLabelSelected: { color: "#FFFFFF" },
  cues: { flexDirection: "row", justifyContent: "space-between" },
  cue: { ...typography.caption, color: colors.textMuted },
  muted: { ...typography.body, color: colors.textMuted },
});
