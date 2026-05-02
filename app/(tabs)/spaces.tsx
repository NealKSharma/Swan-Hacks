import { useCallback, useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useFocusEffect } from "expo-router";
import { setStatusBarStyle } from "expo-status-bar";
import { Screen } from "@/components/Screen";
import { LocationCard } from "@/components/LocationCard";
import { colors, radii, spacing, typography } from "@/constants/theme";
import { listAllRecentReports, listLocations } from "@/lib/dataSource";
import { rankLocations, RankedLocation } from "@/utils/recommendations";
import { usePreferences } from "@/lib/preferencesStore";
import type { Report } from "@/types";

const FILTERS = ["All", "Library", "Academic", "Student Union", "Dining", "Recreation", "Outdoor"];

export default function SpacesScreen() {
  const { prefs } = usePreferences();
  const [ranked, setRanked] = useState<RankedLocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("All");

  const load = useCallback(async () => {
    const [locations, reports] = await Promise.all([
      listLocations(),
      listAllRecentReports(120),
    ]);
    const map = new Map<string, Report[]>();
    for (const r of reports) {
      const arr = map.get(r.location_id) ?? [];
      arr.push(r);
      map.set(r.location_id, arr);
    }
    setRanked(rankLocations(locations, map, prefs));
    setLoading(false);
  }, [prefs]);

  useEffect(() => {
    load();
  }, [load]);

  useFocusEffect(
    useCallback(() => {
      setStatusBarStyle("dark");
      load();
    }, [load])
  );

  const visible = useMemo(() => {
    if (filter === "All") return ranked;
    return ranked.filter((r) => r.location.category === filter);
  }, [ranked, filter]);

  return (
    <Screen contentContainerStyle={{ paddingTop: spacing.xl }}>
      <View style={styles.header}>
        <View style={styles.headerBlob} />
        <Text style={styles.eyebrow}>Browse</Text>
        <Text style={styles.title}>Spaces</Text>
        <Text style={styles.intro}>
          Sorted by your preferences and current sensory comfort.
        </Text>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterRow}
      >
        {FILTERS.map((f) => {
          const selected = filter === f;
          return (
            <Pressable
              key={f}
              onPress={() => setFilter(f)}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              style={[styles.filterChip, selected && styles.filterChipSelected]}
            >
              <Text style={[styles.filterText, selected && styles.filterTextSelected]}>
                {f}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {loading ? (
        <Text style={styles.muted}>Loading…</Text>
      ) : visible.length === 0 ? (
        <Text style={styles.muted}>No spaces match this filter.</Text>
      ) : (
        <View style={{ gap: spacing.md }}>
          {visible.map((r) => (
            <LocationCard
              key={r.location.id}
              location={r.location}
              summary={r.summary}
              reasons={r.reasons}
            />
          ))}
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    gap: 4,
    paddingBottom: spacing.sm,
    overflow: "visible",
  },
  headerBlob: {
    position: "absolute",
    top: -20,
    right: -10,
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: colors.goldSoft,
  },
  eyebrow: {
    ...typography.caption,
    color: colors.cardinal,
    textTransform: "uppercase",
    letterSpacing: 1.4,
  },
  title: { ...typography.display, color: colors.text },
  intro: { ...typography.body, color: colors.textSubtle },
  filterRow: { gap: spacing.sm, paddingRight: spacing.lg, paddingVertical: 4 },
  filterChip: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  filterChipSelected: {
    backgroundColor: colors.cardinal,
    borderColor: colors.cardinal,
  },
  filterText: { ...typography.bodyStrong, color: colors.text },
  filterTextSelected: { color: "#FFFFFF" },
  muted: { ...typography.body, color: colors.textMuted },
});
