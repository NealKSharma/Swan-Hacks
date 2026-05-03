import { useCallback, useEffect, useMemo, useState } from "react";
import {
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useFocusEffect } from "expo-router";
import { setStatusBarStyle } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LocationCard } from "@/components/LocationCard";
import { ScreenFade } from "@/components/ScreenFade";
import { colors, radii, shadows, spacing, typography } from "@/constants/theme";
import { listAllRecentReports, listLocations } from "@/lib/dataSource";
import { rankLocations, RankedLocation } from "@/utils/recommendations";
import { usePreferences } from "@/lib/preferencesStore";
import type { Report } from "@/types";

const FILTERS = [
  "All",
  "Library",
  "Academic",
  "Student Union",
  "Dining",
  "Recreation",
  "Outdoor",
];

export default function SpacesScreen() {
  const insets = useSafeAreaInsets();
  const { prefs } = usePreferences();
  const [ranked, setRanked] = useState<RankedLocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("All");
  const [filterOpen, setFilterOpen] = useState(false);

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
    <ScreenFade>
    <View style={[styles.canvas, { paddingTop: insets.top + spacing.xl }]}>
      {/* Fixed header */}
      <View style={styles.header}>
        <Text style={styles.bigTitle}>SPACES</Text>
        <View style={styles.titleRule} />
      </View>

      {/* Subtitle row with the filter dropdown anchored on the right */}
      <View style={styles.subtitleRow}>
        <Text style={styles.intro}>
          Sorted by your preferences and how each space feels right now.
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Filter, currently ${filter}`}
          onPress={() => setFilterOpen(true)}
          style={({ pressed }) => [
            styles.filterBtn,
            pressed && { opacity: 0.85 },
          ]}
        >
          <Text style={styles.filterBtnLabel}>{filter}</Text>
          <Text style={styles.filterBtnArrow}>▾</Text>
        </Pressable>
      </View>

      {/* Scrollable list — the only scrollable region on the screen */}
      <FlatList
        data={visible}
        keyExtractor={(item) => item.location.id}
        renderItem={({ item }) => (
          <LocationCard location={item.location} summary={item.summary} />
        )}
        ItemSeparatorComponent={() => (
          <View style={styles.separator}>
            <View style={styles.separatorLine} />
          </View>
        )}
        ListHeaderComponent={<View style={styles.listHead} />}
        contentContainerStyle={[
          styles.listContent,
          { paddingBottom: insets.bottom + 130 },
        ]}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          loading ? (
            <Text style={styles.muted}>Loading…</Text>
          ) : (
            <Text style={styles.muted}>No spaces match this filter.</Text>
          )
        }
      />

      {/* Filter modal */}
      <Modal
        visible={filterOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setFilterOpen(false)}
      >
        <View style={styles.modalRoot}>
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={() => setFilterOpen(false)}
            accessibilityLabel="Close filter"
          />
          <View style={styles.modalCard}>
            <Text style={styles.modalEyebrow}>Filter</Text>
            <Text style={styles.modalTitle}>By category</Text>
            <View style={{ height: spacing.md }} />
            {FILTERS.map((f) => {
              const selected = filter === f;
              return (
                <Pressable
                  key={f}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  onPress={() => {
                    setFilter(f);
                    setFilterOpen(false);
                  }}
                  style={({ pressed }) => [
                    styles.filterOption,
                    selected && styles.filterOptionSelected,
                    pressed && !selected && { opacity: 0.85 },
                  ]}
                >
                  <Text
                    style={[
                      styles.filterOptionText,
                      selected && styles.filterOptionTextSelected,
                    ]}
                  >
                    {f}
                  </Text>
                  {selected ? <View style={styles.filterCheck} /> : null}
                </Pressable>
              );
            })}
          </View>
        </View>
      </Modal>
    </View>
    </ScreenFade>
  );
}

const styles = StyleSheet.create({
  canvas: {
    flex: 1,
    backgroundColor: colors.background,
    paddingHorizontal: 28,
  },

  // Header
  header: {
    gap: 8,
    paddingBottom: spacing.md,
  },
  bigTitle: {
    fontSize: 52,
    fontWeight: "800",
    color: colors.cardinal,
    letterSpacing: -1.5,
    lineHeight: 56,
  },
  titleRule: {
    width: 80,
    height: 5,
    backgroundColor: colors.gold,
    borderRadius: 2.5,
  },

  // Subtitle + filter row
  subtitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingBottom: spacing.lg,
  },
  intro: {
    flex: 1,
    ...typography.body,
    color: colors.text,
  },
  filterBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: radii.pill,
    backgroundColor: colors.cardinalSoft,
  },
  filterBtnLabel: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.cardinal,
    letterSpacing: 0.2,
  },
  filterBtnArrow: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.cardinal,
    marginTop: -2,
  },

  // Scrollable list window
  listContent: {
    paddingTop: 0,
    flexGrow: 1,
  },
  listHead: {
    height: spacing.lg,
  },
  separator: {
    paddingVertical: spacing.lg,
    alignItems: "stretch",
  },
  separatorLine: {
    height: 1,
    backgroundColor: "rgba(26,31,42,0.16)",
  },

  muted: {
    ...typography.body,
    color: colors.textMuted,
    textAlign: "center",
    paddingVertical: spacing.xl,
  },

  // Filter modal
  modalRoot: {
    flex: 1,
    backgroundColor: "rgba(26,31,42,0.45)",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.xl,
  },
  modalCard: {
    width: "100%",
    maxWidth: 360,
    backgroundColor: colors.surface,
    borderRadius: radii.xl,
    padding: spacing.xl,
    ...shadows.card,
  },
  modalEyebrow: {
    ...typography.caption,
    color: colors.cardinal,
    textTransform: "uppercase",
    letterSpacing: 1.6,
    fontWeight: "700",
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: "700",
    fontStyle: "italic",
    color: colors.text,
    letterSpacing: -0.3,
    marginTop: 2,
  },
  filterOption: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: radii.lg,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  filterOptionSelected: {
    backgroundColor: colors.cardinalSoft,
  },
  filterOptionText: {
    fontSize: 17,
    fontWeight: "500",
    color: colors.text,
  },
  filterOptionTextSelected: {
    color: colors.cardinal,
    fontWeight: "700",
  },
  filterCheck: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.cardinal,
  },
});
