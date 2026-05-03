import { StyleSheet, Text, View } from "react-native";
import { colors, radii, spacing, typography } from "@/constants/theme";
import { Icon } from "@/components/Icon";
import { levelLabel, metricIconName } from "@/utils/formatting";

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
      <View style={styles.iconWrap}>
        <Icon name={metricIconName(metric)} size={18} color={colors.textSubtle} />
      </View>
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
  compact: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    minWidth: 0,
    flexBasis: 0,
    flexShrink: 1,
  },
  iconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  title: { ...typography.caption, color: colors.textSubtle, textTransform: "uppercase" },
  value: { ...typography.bodyStrong, color: colors.text },
});
