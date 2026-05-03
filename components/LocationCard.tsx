import { Pressable, StyleSheet, Text, View } from "react-native";
import { Link } from "expo-router";
import { colors, radii, shadows, spacing, typography } from "@/constants/theme";
import { Icon } from "@/components/Icon";
import { SensoryStatusPill } from "@/components/SensoryStatusPill";
import { MetricBadge } from "@/components/MetricBadge";
import type { Location, SensorySummary } from "@/types";

interface Props {
  location: Location;
  summary: SensorySummary;
}

export function LocationCard({ location, summary }: Props) {
  return (
    <Link href={`/location/${location.slug}`} asChild>
      <Pressable
        accessibilityRole="link"
        accessibilityLabel={`${location.name}. ${summary.status}. Tap for details.`}
        style={({ pressed }) => [styles.card, pressed && { opacity: 0.88 }]}
      >
        <View style={styles.header}>
          <View style={{ flex: 1, paddingRight: spacing.xl }}>
            <Text style={styles.category}>{location.category}</Text>
            <Text style={styles.name}>{location.name}</Text>
          </View>
          <SensoryStatusPill status={summary.status} />
        </View>

        <View style={styles.metrics}>
          <MetricBadge metric="noise" value={summary.noise} compact />
          <MetricBadge metric="crowd" value={summary.crowd} compact />
        </View>

        <View style={styles.cta}>
          <Text style={styles.ctaText}>Click for details</Text>
          <Icon name="chevron-right" size={14} color={colors.cardinal} />
        </View>
      </Pressable>
    </Link>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: spacing.lg,
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
    color: colors.cardinal,
    textTransform: "uppercase",
    letterSpacing: 1,
    fontWeight: "700",
  },
  name: {
    fontSize: 22,
    fontWeight: "700",
    color: colors.text,
    letterSpacing: -0.4,
    marginTop: 2,
  },
  metrics: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    marginTop: 6,
  },
  cta: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-end",
    gap: 2,
    marginTop: spacing.sm,
  },
  ctaText: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.cardinal,
    letterSpacing: 0.2,
  },
});
