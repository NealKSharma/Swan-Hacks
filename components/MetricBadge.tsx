import { StyleSheet, Text, View } from "react-native";
import { colors, radii, spacing, typography } from "@/constants/theme";
import { levelLabel, metricIcon } from "@/utils/formatting";

type Metric = "noise" | "crowd" | "seating" | "lighting";

interface Props {
  metric: Metric;
  value: number | null;
  compact?: boolean;
}

const TITLES: Record<Metric, string> = {
  noise: "Noise",
  crowd: "Crowd",
  seating: "Seating",
  lighting: "Lighting",
};

export function MetricBadge({ metric, value, compact = false }: Props) {
  const label = levelLabel(metric, value);
  return (
    <View
      style={[styles.badge, compact && styles.compact]}
      accessibilityLabel={`${TITLES[metric]}: ${label}`}
    >
      <Text style={styles.icon}>{metricIcon(metric)}</Text>
      <View style={{ flexShrink: 1 }}>
        <Text style={styles.title}>{TITLES[metric]}</Text>
        <Text style={styles.value}>{label}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: colors.surfaceMuted,
    borderRadius: radii.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    flexGrow: 1,
    flexBasis: "45%",
    minWidth: 140,
  },
  compact: { paddingVertical: 6, paddingHorizontal: 10, minWidth: 100 },
  icon: { fontSize: 20 },
  title: { ...typography.caption, color: colors.textSubtle, textTransform: "uppercase" },
  value: { ...typography.bodyStrong, color: colors.text },
});
