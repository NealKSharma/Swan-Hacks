import { useCallback, useEffect, useMemo, useState } from "react";
import {
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { setStatusBarStyle } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, {
  Easing,
  FadeIn,
  FadeOut,
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import { CrowdSenseMapView } from "@/components/CrowdSenseMapView";
import { Icon } from "@/components/Icon";
import { LocationCard } from "@/components/LocationCard";
import { ScreenFade } from "@/components/ScreenFade";
import { colors, radii, shadows, spacing, typography } from "@/constants/theme";
import { listAllRecentReports, listLocations } from "@/lib/dataSource";
import {
  findClosestHotspot,
  getCrowdLevels,
  getCurrentCrowdSenseLocation,
  isCrowdSenseEnabled,
  listCrowdSenseHotspots,
} from "@/services/crowdSense";
import { rankLocations, RankedLocation } from "@/utils/recommendations";
import { LIVE_REPORT_WINDOW_MINUTES } from "@/utils/sensoryScore";
import { usePreferences } from "@/lib/preferencesStore";
import type { CrowdLevel, Hotspot, Report } from "@/types";

const SPRING = { damping: 16, stiffness: 220, mass: 0.7 };
const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

type SortBy = "recommended" | "name" | "type" | "noise" | "crowd";
type SortDir = "asc" | "desc";
type ViewMode = "list" | "map";

const SORT_OPTIONS: { value: SortBy; label: string }[] = [
  { value: "recommended", label: "Recommended" },
  { value: "name", label: "Name" },
  { value: "type", label: "Type" },
  { value: "noise", label: "Noise" },
  { value: "crowd", label: "Crowd" },
];

const SORT_LABEL: Record<SortBy, string> = {
  recommended: "Recommended",
  name: "Name",
  type: "Type",
  noise: "Noise",
  crowd: "Crowd",
};
const LIVE_SUMMARY_REFRESH_MS = 60_000;

export default function SpacesScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { prefs } = usePreferences();
  const [ranked, setRanked] = useState<RankedLocation[]>([]);
  const [loading, setLoading] = useState(true);

  const [sortBy, setSortBy] = useState<SortBy>("recommended");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [sortOpen, setSortOpen] = useState(false);

  // ---- CrowdSense map view state (additive — does not affect list mode) ----
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [hotspots, setHotspots] = useState<Hotspot[]>([]);
  const [crowdLevels, setCrowdLevels] = useState<CrowdLevel[]>([]);
  const [closestSpot, setClosestSpot] = useState<{ name: string } | null>(
    null
  );

  // Pulls the user's current foreground position and computes the closest
  // hotspot — but only if location sharing is currently enabled. No-ops
  // silently otherwise (so we never trigger a permission dialog from this
  // screen — that's the Preferences toggle's job).
  const refreshClosestSpot = useCallback(async () => {
    try {
      if (!(await isCrowdSenseEnabled())) {
        setClosestSpot(null);
        return;
      }
      const coords = await getCurrentCrowdSenseLocation();
      const match = await findClosestHotspot(coords);
      setClosestSpot(match ? { name: match.hotspot.name } : null);
    } catch {
      setClosestSpot(null);
    }
  }, []);

  const load = useCallback(async () => {
    const [locations, reports, levels] = await Promise.all([
      listLocations(),
      listAllRecentReports(LIVE_REPORT_WINDOW_MINUTES),
      getCrowdLevels().catch(() => [] as CrowdLevel[]),
    ]);
    const map = new Map<string, Report[]>();
    for (const r of reports) {
      const arr = map.get(r.location_id) ?? [];
      arr.push(r);
      map.set(r.location_id, arr);
    }
    setCrowdLevels(levels);
    setRanked(rankLocations(locations, map, prefs, crowdLevelMap(levels)));
    setLoading(false);
  }, [prefs]);

  useEffect(() => {
    load();
  }, [load]);

  // Re-pull live summaries every minute so CrowdSense + decayed manual
  // reports don't get stale while the user lingers on the spaces tab.
  useEffect(() => {
    const interval = setInterval(() => {
      load();
    }, LIVE_SUMMARY_REFRESH_MS);
    return () => clearInterval(interval);
  }, [load]);

  useFocusEffect(
    useCallback(() => {
      setStatusBarStyle("dark");
      load();
      // Re-check the closest study space whenever the user comes back to
      // this tab — this is how toggling location ON in Preferences reflects
      // here without forcing a list/map round-trip.
      if (viewMode === "map") {
        refreshClosestSpot();
      }
    }, [load, refreshClosestSpot, viewMode])
  );

  // Lazy-load map data (hotspots + crowd levels) when the user first toggles
  // into Map mode. Permission for live location lives in Preferences, so we
  // only attempt a foreground reading here if CrowdSense is already enabled
  // (no unprompted permission dialog from this screen).
  useEffect(() => {
    if (viewMode !== "map") return;
    let cancelled = false;
    (async () => {
      try {
        const [levels, hotspotRows] = await Promise.all([
          getCrowdLevels(),
          listCrowdSenseHotspots(),
        ]);
        if (cancelled) return;
        setCrowdLevels(levels);
        setHotspots(hotspotRows);
        if (!cancelled) await refreshClosestSpot();
      } catch {
        /* silent — list mode still works */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [viewMode]);

  const levelsByZone = useMemo(() => {
    const m = new Map<string, CrowdLevel>();
    for (const l of crowdLevels) m.set(l.zone_id, l);
    return m;
  }, [crowdLevels]);

  // Per-location summaries keyed by slug (= zone_id) so the map popups
  // can show the same status / noise / crowd labels as the list view.
  const summariesByZone = useMemo(() => {
    const m = new Map<string, RankedLocation["summary"]>();
    for (const item of ranked) m.set(item.location.slug, item.summary);
    return m;
  }, [ranked]);

  const visible = useMemo(() => {
    const sorted = [...ranked];
    switch (sortBy) {
      case "recommended":
        break;
      case "name":
        sorted.sort((a, b) => a.location.name.localeCompare(b.location.name));
        break;
      case "type":
        sorted.sort((a, b) =>
          a.location.category.localeCompare(b.location.category)
        );
        break;
      case "noise":
        sorted.sort(
          (a, b) => (a.summary.noise ?? 0) - (b.summary.noise ?? 0)
        );
        break;
      case "crowd":
        sorted.sort(
          (a, b) => (a.summary.crowd ?? 0) - (b.summary.crowd ?? 0)
        );
        break;
    }
    if (sortDir === "desc") sorted.reverse();
    return sorted;
  }, [ranked, sortBy, sortDir]);

  const sortBtnText = `${SORT_LABEL[sortBy]} ${sortDir === "asc" ? "↑" : "↓"}`;

  return (
    <ScreenFade>
      <View style={[styles.canvas, { paddingTop: insets.top + spacing.xl }]}>
        {/* Fixed header — title left, view-mode toggle right */}
        <View style={styles.header}>
          <View style={styles.headerRow}>
            <View style={styles.titleBlock}>
              <Text style={styles.bigTitle}>SPACES</Text>
              <View style={styles.titleRule} />
            </View>
            <ViewModeToggle
              mode={viewMode}
              onToggle={() =>
                setViewMode(viewMode === "list" ? "map" : "list")
              }
            />
          </View>
        </View>

        {/* List / Map crossfade. Both modes share the same panel slot via
            absoluteFill, so toggling the icon fades one out and the other in
            cleanly without shifting layout. */}
        <View style={styles.viewModePanel}>
          <Animated.View
            key={viewMode}
            entering={FadeIn.duration(220).easing(Easing.out(Easing.cubic))}
            exiting={FadeOut.duration(160).easing(Easing.in(Easing.cubic))}
            style={StyleSheet.absoluteFill}
          >
            {viewMode === "list" ? (
              <>
                {/* Subtitle + sort dropdown */}
                <View style={styles.subtitleRow}>
                  <Text style={styles.intro}>
                    Sorted by your preferences and how each space feels right now.
                  </Text>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Sort, currently ${sortBtnText}`}
                    onPress={() => setSortOpen(true)}
                    hitSlop={8}
                    style={({ pressed }) => [
                      styles.filterBtn,
                      pressed && { opacity: 0.7 },
                    ]}
                  >
                    <Icon name="filter-sort" size={28} color={colors.cardinal} />
                  </Pressable>
                </View>

                {/* Scrollable list — the only scrollable region in list mode */}
                <FlatList
                  data={visible}
                  keyExtractor={(item) => item.location.id}
                  renderItem={({ item }) => (
                    <LocationCard
                      location={item.location}
                      summary={item.summary}
                    />
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
                      <Text style={styles.muted}>No spaces yet.</Text>
                    )
                  }
                />
              </>
            ) : (
              // ---- Map mode ----
              <View
                style={[
                  styles.mapPanel,
                  { paddingBottom: insets.bottom + 130 },
                ]}
              >
                <View style={styles.mapWrap}>
                  <CrowdSenseMapView
                    hotspots={hotspots}
                    levelsByZone={levelsByZone}
                    summariesByZone={summariesByZone}
                    onHotspotOpen={(id) => router.push(`/location/${id}`)}
                  />
                </View>
                {closestSpot ? (
                  <Text style={styles.closestText}>
                    Closest study space: {closestSpot.name}
                  </Text>
                ) : null}
              </View>
            )}
          </Animated.View>
        </View>

        {/* Sort modal — list mode only */}
        <Modal
          visible={sortOpen}
          transparent
          animationType="fade"
          onRequestClose={() => setSortOpen(false)}
        >
          <View style={styles.modalRoot}>
            <Pressable
              style={StyleSheet.absoluteFill}
              onPress={() => setSortOpen(false)}
              accessibilityLabel="Close sort"
            />
            <View style={styles.modalCard}>
              <Text style={styles.sectionLabel}>Sort by</Text>
              {SORT_OPTIONS.map((opt) => (
                <SortOptionRow
                  key={opt.value}
                  label={opt.label}
                  selected={sortBy === opt.value}
                  onPress={() => setSortBy(opt.value)}
                />
              ))}

              <View style={{ height: spacing.lg }} />
              <Text style={styles.sectionLabel}>Direction</Text>
              <View style={{ height: spacing.md }} />
              <View style={styles.dirRow}>
                <DirChip
                  label="↑  Ascending"
                  active={sortDir === "asc"}
                  onPress={() => setSortDir("asc")}
                />
                <DirChip
                  label="↓  Descending"
                  active={sortDir === "desc"}
                  onPress={() => setSortDir("desc")}
                />
              </View>

              <View style={{ height: spacing.xl }} />

              <Pressable
                accessibilityRole="button"
                onPress={() => setSortOpen(false)}
                style={({ pressed }) => [
                  styles.doneBtn,
                  pressed && { opacity: 0.9 },
                ]}
              >
                <Text style={styles.doneBtnText}>Done</Text>
              </Pressable>
            </View>
          </View>
        </Modal>
      </View>
    </ScreenFade>
  );
}

// ----------------------------------------------------------------
// View-mode toggle (icon in title row — flips between list/map)
// ----------------------------------------------------------------

function ViewModeToggle({
  mode,
  onToggle,
}: {
  mode: ViewMode;
  onToggle: () => void;
}) {
  // The icon shown is the mode you would switch TO.
  const nextIcon = mode === "list" ? "spaces-map" : "spaces-list";
  const press = useSharedValue(0);
  const pop = useSharedValue(1);

  // Quick pop animation whenever the mode changes.
  useEffect(() => {
    pop.value = 0.85;
    pop.value = withSpring(1, SPRING);
  }, [mode, pop]);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pop.value * (1 - press.value * 0.08) }],
    opacity: 1 - press.value * 0.25,
  }));

  return (
    <AnimatedPressable
      accessibilityRole="button"
      accessibilityLabel={
        mode === "list" ? "Switch to map view" : "Switch to list view"
      }
      onPressIn={() => {
        press.value = withSpring(1, SPRING);
      }}
      onPressOut={() => {
        press.value = withSpring(0, SPRING);
      }}
      onPress={onToggle}
      hitSlop={12}
      style={[styles.viewToggleBtn, animStyle]}
    >
      <Icon name={nextIcon} size={26} color={colors.cardinal} />
    </AnimatedPressable>
  );
}

// ----------------------------------------------------------------
// Sort modal animated rows
// ----------------------------------------------------------------

function SortOptionRow({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  const sel = useSharedValue(selected ? 1 : 0);
  const press = useSharedValue(0);
  useEffect(() => {
    sel.value = withSpring(selected ? 1 : 0, SPRING);
  }, [selected, sel]);
  const rowStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(
      sel.value,
      [0, 1],
      ["rgba(0,0,0,0)", colors.cardinalSoft]
    ),
    transform: [{ scale: 1 - 0.02 * press.value }],
  }));
  const labelStyle = useAnimatedStyle(() => ({
    color: interpolateColor(sel.value, [0, 1], [colors.text, colors.cardinal]),
    fontWeight: sel.value > 0.5 ? "700" : "500",
  }));
  const dotStyle = useAnimatedStyle(() => ({
    transform: [{ scale: sel.value }],
    opacity: sel.value,
  }));
  return (
    <AnimatedPressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      onPressIn={() => {
        press.value = withSpring(1, SPRING);
      }}
      onPressOut={() => {
        press.value = withSpring(0, SPRING);
      }}
      style={[styles.optionRow, rowStyle]}
    >
      <Animated.Text style={[styles.optionText, labelStyle]}>
        {label}
      </Animated.Text>
      <Animated.View style={[styles.optionCheck, dotStyle]} />
    </AnimatedPressable>
  );
}

function DirChip({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  const sel = useSharedValue(active ? 1 : 0);
  const press = useSharedValue(0);
  useEffect(() => {
    sel.value = withSpring(active ? 1 : 0, SPRING);
  }, [active, sel]);
  const chipStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(
      sel.value,
      [0, 1],
      [colors.surfaceMuted, colors.cardinal]
    ),
    transform: [{ scale: 1 + 0.02 * sel.value - 0.04 * press.value }],
  }));
  const textStyle = useAnimatedStyle(() => ({
    color: interpolateColor(sel.value, [0, 1], [colors.text, "#FFFFFF"]),
  }));
  return (
    <AnimatedPressable
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      onPress={onPress}
      onPressIn={() => {
        press.value = withSpring(1, SPRING);
      }}
      onPressOut={() => {
        press.value = withSpring(0, SPRING);
      }}
      style={[styles.dirChip, chipStyle]}
    >
      <Animated.Text style={[styles.dirChipText, textStyle]}>
        {label}
      </Animated.Text>
    </AnimatedPressable>
  );
}

function crowdLevelMap(crowdLevels: CrowdLevel[]): Map<string, CrowdLevel> {
  const map = new Map<string, CrowdLevel>();
  for (const level of crowdLevels) map.set(level.zone_id, level);
  return map;
}

// ----------------------------------------------------------------
// Styles
// ----------------------------------------------------------------

const styles = StyleSheet.create({
  canvas: {
    flex: 1,
    backgroundColor: colors.background,
    paddingHorizontal: 28,
  },

  header: {
    gap: 8,
    paddingBottom: spacing.md,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  bigTitle: {
    fontSize: 44,
    fontWeight: "800",
    color: colors.cardinal,
    letterSpacing: -1.5,
    lineHeight: 48,
  },
  titleBlock: {
    gap: 8,
  },
  titleRule: {
    alignSelf: "stretch",
    height: 5,
    backgroundColor: colors.gold,
    borderRadius: 2.5,
  },

  // List / Map view-mode toggle (icon button in title row)
  viewToggleBtn: {
    alignItems: "center",
    justifyContent: "center",
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.cardinalSoft,
  },

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
    alignItems: "center",
    justifyContent: "center",
    padding: 4,
  },

  // List
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

  // Crossfade slot for list / map content. Both modes are absolutely
  // positioned inside, so toggling fades cleanly without layout shift.
  viewModePanel: {
    flex: 1,
    position: "relative",
  },

  // Map mode
  mapPanel: {
    flex: 1,
    gap: spacing.md,
    justifyContent: "center",
  },
  mapWrap: {
    borderRadius: radii.lg,
    overflow: "hidden",
    ...shadows.card,
  },
  closestText: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.cardinal,
    letterSpacing: 0.2,
    textAlign: "center",
    marginTop: spacing.md,
  },

  // Sort modal
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
  sectionLabel: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.text,
    textTransform: "uppercase",
    letterSpacing: 1.2,
    marginBottom: 6,
  },

  optionRow: {
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: radii.md,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  optionText: {
    fontSize: 16,
  },
  optionCheck: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.cardinal,
  },

  dirRow: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  dirChip: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: radii.pill,
    alignItems: "center",
  },
  dirChipText: {
    fontSize: 14,
    fontWeight: "700",
    letterSpacing: 0.4,
  },

  doneBtn: {
    paddingVertical: 14,
    borderRadius: radii.pill,
    backgroundColor: colors.cardinal,
    alignItems: "center",
  },
  doneBtnText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#FFFFFF",
    letterSpacing: 0.4,
  },
});
