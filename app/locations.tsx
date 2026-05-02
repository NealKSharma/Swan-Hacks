import { useCallback, useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useFocusEffect } from "expo-router";
import { Screen } from "@/components/Screen";
import { LocationCard } from "@/components/LocationCard";
import { colors, radii, spacing, typography } from "@/constants/theme";
import {
  listAllRecentReports,
  listLocations,
} from "@/lib/dataSource";
import { rankLocations, RankedLocation } from "@/utils/recommendations";
import { usePreferences } from "@/lib/preferencesStore";
import type { Report } from "@/types";

const FILTERS = ["All", "Library", "Academic", "Student Union", "Dining", "Recreation", "Outdoor"];

export default function LocationsScreen() {
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
      load();
    }, [load])
  );

  const visible = useMemo(() => {
    if (filter === "All") return ranked;
    return ranked.filter((r) => r.location.category === filter);
  }, [ranked, filter]);

  return (
    <Screen>
      <Text style={styles.intro}>
        Sorted by your preferences and current sensory comfort.
      </Text>

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
              style={[
                styles.filterChip,
                selected && styles.filterChipSelected,
              ]}
            >
              <Text
                style={[
                  styles.filterText,
                  selected && styles.filterTextSelected,
                ]}
              >
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
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  filterText: { ...typography.bodyStrong, color: colors.text },
  filterTextSelected: { color: "#FFFFFF" },
  muted: { ...typography.body, color: colors.textMuted },
});
