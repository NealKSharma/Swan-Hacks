import { StyleSheet, Text, View } from "react-native";
import { colors, radii, spacing, typography } from "@/constants/theme";
import type { HourlyTrend } from "@/types";

interface Props {
  trends: HourlyTrend[];
  dayOfWeek: number; // 0=Sun
  metric?: "avg_crowd" | "avg_noise";
  highlightHour?: number;
}

const HOURS = Array.from({ length: 14 }, (_, i) => 8 + i); // 8 AM .. 9 PM

export function TrendBars({
  trends,
  dayOfWeek,
  metric = "avg_crowd",
  highlightHour,
}: Props) {
  const dayTrends = trends.filter((t) => t.day_of_week === dayOfWeek);
  const byHour = new Map<number, HourlyTrend>();
  for (const t of dayTrends) byHour.set(t.hour, t);

  const empty = dayTrends.length === 0;

  return (
    <View style={styles.wrap} accessibilityLabel="Hourly busy-time trend">
      <View style={styles.bars}>
        {HOURS.map((h) => {
          const t = byHour.get(h);
          const v = t ? (t[metric] ?? 0) : 0;
          const pct = Math.max(0.06, Math.min(1, v / 5));
          const isHighlight = highlightHour === h;
          return (
            <View key={h} style={styles.barCol}>
              <View
                style={[
                  styles.bar,
                  {
                    height: `${pct * 100}%`,
                    backgroundColor: isHighlight ? colors.cardinal : colors.accent,
                    opacity: empty ? 0.15 : isHighlight ? 1 : 0.75,
                  },
                ]}
              />
            </View>
          );
        })}
      </View>
      <View style={styles.axis}>
        <Text style={styles.axisLabel}>8a</Text>
        <Text style={styles.axisLabel}>12p</Text>
        <Text style={styles.axisLabel}>4p</Text>
        <Text style={styles.axisLabel}>9p</Text>
      </View>
      {empty && (
        <Text style={styles.emptyHint}>
          Not enough reports yet. Trends fill in as students contribute.
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.sm,
  },
  bars: {
    flexDirection: "row",
    alignItems: "flex-end",
    height: 110,
    gap: 4,
  },
  barCol: {
    flex: 1,
    height: "100%",
    justifyContent: "flex-end",
    alignItems: "stretch",
  },
  bar: {
    width: "100%",
    borderRadius: radii.sm,
    minHeight: 4,
  },
  axis: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 2,
  },
  axisLabel: { ...typography.caption, color: colors.textMuted },
  emptyHint: { ...typography.small, color: colors.textMuted, marginTop: 4 },
});
