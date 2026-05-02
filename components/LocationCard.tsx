import { Pressable, StyleSheet, Text, View } from "react-native";
import { Link } from "expo-router";
import { colors, radii, shadows, spacing, typography } from "@/constants/theme";
import { SensoryStatusPill } from "@/components/SensoryStatusPill";
import { MetricBadge } from "@/components/MetricBadge";
import { timeAgo } from "@/utils/formatting";
import type { Location, SensorySummary } from "@/types";

interface Props {
  location: Location;
  summary: SensorySummary;
  reasons?: string[];
}

export function LocationCard({ location, summary, reasons }: Props) {
  return (
    <Link href={`/location/${location.slug}`} asChild>
      <Pressable
        accessibilityRole="link"
        accessibilityLabel={`${location.name}. ${summary.status}. Tap for details.`}
        style={({ pressed }) => [styles.card, pressed && { opacity: 0.85 }]}
      >
        <View style={styles.header}>
          <View style={{ flex: 1, paddingRight: spacing.sm }}>
            <Text style={styles.category}>{location.category}</Text>
            <Text style={styles.name}>{location.name}</Text>
          </View>
          <SensoryStatusPill status={summary.status} />
        </View>

        <View style={styles.metrics}>
          <MetricBadge metric="noise" value={summary.noise} compact />
          <MetricBadge metric="crowd" value={summary.crowd} compact />
          <MetricBadge metric="seating" value={summary.seating} compact />
        </View>

        {reasons && reasons.length > 0 && (
          <View style={styles.reasonRow}>
            {reasons.slice(0, 2).map((r) => (
              <Text key={r} style={styles.reasonChip}>
                {r}
              </Text>
            ))}
          </View>
        )}

        <Text style={styles.footer}>
          {summary.reportCount > 0
            ? `${summary.reportCount} report${summary.reportCount === 1 ? "" : "s"} • Updated ${timeAgo(summary.lastReportedAt)}`
            : "No recent reports — tap to be the first"}
        </Text>
      </Pressable>
    </Link>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.md,
    ...shadows.card,
  },
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
  },
  category: {
    ...typography.caption,
    color: colors.textSubtle,
    textTransform: "uppercase",
  },
  name: { ...typography.heading, color: colors.text, marginTop: 2 },
  metrics: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  reasonRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  reasonChip: {
    ...typography.small,
    color: colors.text,
    backgroundColor: colors.accentSoft,
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: radii.pill,
    overflow: "hidden",
  },
  footer: { ...typography.small, color: colors.textMuted },
});
