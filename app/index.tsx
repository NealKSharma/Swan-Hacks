import { useCallback, useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Link, useFocusEffect, useRouter } from "expo-router";
import { Screen } from "@/components/Screen";
import { LocationCard } from "@/components/LocationCard";
import { Button } from "@/components/Button";
import { colors, radii, spacing, typography } from "@/constants/theme";
import {
  dataSourceMode,
  listAllRecentReports,
  listLocations,
} from "@/lib/dataSource";
import { rankLocations, RankedLocation } from "@/utils/recommendations";
import { usePreferences } from "@/lib/preferencesStore";
import type { Report } from "@/types";

export default function HomeScreen() {
  const router = useRouter();
  const { prefs } = usePreferences();
  const [ranked, setRanked] = useState<RankedLocation[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const [locations, reports] = await Promise.all([
      listLocations(),
      listAllRecentReports(120),
    ]);
    const reportsByLocation = new Map<string, Report[]>();
    for (const r of reports) {
      const arr = reportsByLocation.get(r.location_id) ?? [];
      arr.push(r);
      reportsByLocation.set(r.location_id, arr);
    }
    setRanked(rankLocations(locations, reportsByLocation, prefs));
    setLoading(false);
  }, [prefs]);

  useEffect(() => {
    load();
  }, [load]);

  // Refresh on screen focus so newly-submitted reports appear immediately.
  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const top = ranked.slice(0, 3);

  return (
    <Screen
      contentContainerStyle={{}}
    >
      <View style={styles.hero}>
        <Text style={styles.eyebrow}>Iowa State University</Text>
        <Text style={styles.headline}>Find a calmer place to study</Text>
        <Text style={styles.sub}>
          Live, crowdsourced sensory info for campus spaces — noise, crowd,
          seating, and lighting. Anonymous. Privacy-first.
        </Text>
        {dataSourceMode === "mock" && (
          <View style={styles.demoChip}>
            <Text style={styles.demoChipText}>Demo data — Supabase not configured</Text>
          </View>
        )}
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Best quiet spots now</Text>
          <Link href="/locations" asChild>
            <Pressable accessibilityRole="link">
              <Text style={styles.sectionLink}>See all →</Text>
            </Pressable>
          </Link>
        </View>

        {loading ? (
          <Text style={styles.muted}>Loading…</Text>
        ) : top.length === 0 ? (
          <Text style={styles.muted}>No locations yet.</Text>
        ) : (
          top.map((r) => (
            <LocationCard
              key={r.location.id}
              location={r.location}
              summary={r.summary}
              reasons={r.reasons}
            />
          ))
        )}
      </View>

      <View style={styles.quickRow}>
        <Button
          label="Browse all spaces"
          variant="primary"
          onPress={() => router.push("/locations")}
          style={{ flex: 1 }}
        />
        <Button
          label="Preferences"
          variant="secondary"
          onPress={() => router.push("/preferences")}
          style={{ flex: 1 }}
        />
      </View>

      <Link href="/about" asChild>
        <Pressable accessibilityRole="link" style={styles.aboutLink}>
          <Text style={styles.aboutLinkText}>How CySense protects your privacy →</Text>
        </Pressable>
      </Link>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: {
    backgroundColor: colors.surface,
    borderRadius: radii.xl,
    padding: spacing.xl,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.sm,
  },
  eyebrow: {
    ...typography.caption,
    color: colors.cardinal,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  headline: { ...typography.display, color: colors.text },
  sub: { ...typography.body, color: colors.textSubtle },
  demoChip: {
    alignSelf: "flex-start",
    marginTop: spacing.sm,
    backgroundColor: colors.cardinalSoft,
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: radii.pill,
  },
  demoChipText: { ...typography.caption, color: colors.cardinal },
  section: { gap: spacing.md },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "baseline",
  },
  sectionTitle: { ...typography.title, color: colors.text },
  sectionLink: { ...typography.bodyStrong, color: colors.accent },
  muted: { ...typography.body, color: colors.textMuted },
  quickRow: { flexDirection: "row", gap: spacing.md },
  aboutLink: { paddingVertical: spacing.sm },
  aboutLinkText: { ...typography.body, color: colors.accent },
});
