import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Stack, useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, {
  Easing,
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { Button } from "@/components/Button";
import { MetricBadge } from "@/components/MetricBadge";
import { RoomAvailabilityCard } from "@/components/RoomAvailabilityCard";
import { TrendBars } from "@/components/TrendBars";
import { ReportForm } from "@/components/ReportForm";
import { colors, radii, spacing, typography } from "@/constants/theme";
import {
  getLocationBySlugOrId,
  listRecentReports,
  listTrends,
} from "@/lib/dataSource";
import { getRoomAvailability, locationSupportsRoomAvailability } from "@/lib/libcal";
import { getCrowdLevels } from "@/services/crowdSense";
import { LIVE_REPORT_WINDOW_MINUTES, summarizeReports } from "@/utils/sensoryScore";
import { timeAgo } from "@/utils/formatting";
import type {
  HourlyTrend,
  Location,
  Report,
  RoomAvailabilityResponse,
  SensorySummary,
} from "@/types";

type Tab = "info" | "activity" | "rooms";

const POPULAR_TIMES_HOURS = Array.from({ length: 14 }, (_, i) => 8 + i);
const LIVE_SUMMARY_REFRESH_MS = 60_000;
const TAB_SPRING = { damping: 18, stiffness: 220, mass: 0.7 };

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export default function LocationDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [location, setLocation] = useState<Location | null>(null);
  const [summary, setSummary] = useState<SensorySummary | null>(null);
  const [reports, setReports] = useState<Report[]>([]);
  const [trends, setTrends] = useState<HourlyTrend[]>([]);
  const [roomAvailability, setRoomAvailability] =
    useState<RoomAvailabilityResponse | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [roomsLoading, setRoomsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>("activity");
  const handleTabChange = useCallback((next: Tab) => {
    setActiveTab(next);
  }, []);

  // Carousel measurements + animation state.
  const [panelWidth, setPanelWidth] = useState(0);
  const translateX = useSharedValue(0);
  const isFirstLayout = useRef(true);

  const supportsRooms = useMemo(
    () => (location ? locationSupportsRoomAvailability(location.slug) : false),
    [location]
  );

  // Tabs that actually render in the carousel (Rooms only when supported).
  const visibleTabs = useMemo<Tab[]>(
    () => (supportsRooms ? ["activity", "info", "rooms"] : ["activity", "info"]),
    [supportsRooms]
  );
  const activeIndex = Math.max(0, visibleTabs.indexOf(activeTab));

  // Drive the carousel's translateX from activeIndex × panelWidth. The first
  // commit (when panelWidth becomes known, or when the screen mounts) is
  // applied without animation so the page doesn't slide in on initial entry.
  useEffect(() => {
    const target = -activeIndex * panelWidth;
    if (isFirstLayout.current) {
      translateX.value = target;
      if (panelWidth > 0) isFirstLayout.current = false;
    } else {
      translateX.value = withTiming(target, {
        duration: 280,
        easing: Easing.out(Easing.cubic),
      });
    }
  }, [activeIndex, panelWidth, translateX]);

  const carouselStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  const load = useCallback(async () => {
    if (!id) return;
    const loc = await getLocationBySlugOrId(id);
    if (!loc) {
      setLocation(null);
      setRoomAvailability(null);
      setRoomsLoading(false);
      setLoading(false);
      return;
    }
    const [recent, trendData, crowdLevels] = await Promise.all([
      listRecentReports(loc.id, LIVE_REPORT_WINDOW_MINUTES, 25),
      listTrends(loc.id),
      getCrowdLevels().catch(() => []),
    ]);
    const hasRooms = locationSupportsRoomAvailability(loc.slug);
    if (hasRooms) setRoomsLoading(true);
    else {
      setRoomAvailability(null);
      setRoomsLoading(false);
    }
    setLocation(loc);
    setReports(recent);
    setTrends(trendData);
    setSummary(
      summarizeReports(
        recent,
        new Date(),
        crowdLevels.find((level) => level.zone_id === loc.slug) ?? null
      )
    );
    setLoading(false);
    if (hasRooms) {
      try {
        const rooms = await getRoomAvailability(loc.slug);
        setRoomAvailability(rooms);
      } finally {
        setRoomsLoading(false);
      }
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  // Re-pull live summaries every minute so CrowdSense + decayed manual
  // reports don't drift while the user lingers on the detail page.
  useEffect(() => {
    const interval = setInterval(() => {
      load();
    }, LIVE_SUMMARY_REFRESH_MS);
    return () => clearInterval(interval);
  }, [load]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  if (loading) {
    return (
      <View style={[styles.canvas, { paddingTop: insets.top + spacing.md }]}>
        <Stack.Screen options={{ headerShown: false }} />
        <BackRow onPress={() => router.back()} />
        <Text style={styles.muted}>Loading…</Text>
      </View>
    );
  }

  if (!location || !summary) {
    return (
      <View style={[styles.canvas, { paddingTop: insets.top + spacing.md }]}>
        <Stack.Screen options={{ headerShown: false }} />
        <BackRow onPress={() => router.back()} />
        <Text style={styles.muted}>
          We couldn&apos;t find that location. The QR code may be out of date.
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.canvas, { paddingTop: insets.top + spacing.md }]}>
      <Stack.Screen options={{ headerShown: false }} />

      <BackRow onPress={() => router.back()} />

      {/* Compact header */}
      <View style={styles.header}>
        <View style={styles.headerTitleBlock}>
          <Text style={styles.category}>{location.category}</Text>
          <Text style={styles.title}>{location.name}</Text>
          <View style={styles.headerRule} />
        </View>
      </View>

      {/* Tab pills */}
      <View style={styles.tabRow}>
        <TabPill
          label="Activity"
          active={activeTab === "activity"}
          onPress={() => handleTabChange("activity")}
        />
        <TabPill
          label="Info"
          active={activeTab === "info"}
          onPress={() => handleTabChange("info")}
        />
        {supportsRooms && (
          <TabPill
            label="Rooms"
            active={activeTab === "rooms"}
            onPress={() => handleTabChange("rooms")}
          />
        )}
      </View>

      {/* Tab panel carousel. All visible panels are stacked horizontally inside
          a translateX-animated row. We slide the row by -index × width — no
          mount/unmount per tab change, so panels never visually overlap and
          the initial render doesn't trigger a slide. */}
      <View
        style={styles.panel}
        onLayout={(e) => {
          const w = e.nativeEvent.layout.width;
          if (w > 0 && w !== panelWidth) setPanelWidth(w);
        }}
      >
        {panelWidth > 0 && (
          <Animated.View
            style={[
              styles.carousel,
              { width: panelWidth * visibleTabs.length },
              carouselStyle,
            ]}
          >
            {visibleTabs.map((tab) => (
              <View key={tab} style={{ width: panelWidth, height: "100%" }}>
                {tab === "activity" && (
                  <ActivityPanel trends={trends} summary={summary} />
                )}
                {tab === "info" && <InfoPanel location={location} />}
                {tab === "rooms" && (
                  <View style={{ flex: 1 }}>
                    <RoomAvailabilityCard
                      availability={roomAvailability}
                      loading={roomsLoading}
                    />
                  </View>
                )}
              </View>
            ))}
          </Animated.View>
        )}
      </View>

      {/* Submit button always pinned below the panel */}
      <View style={[styles.submitRow, { paddingBottom: insets.bottom + spacing.lg }]}>
        <Button
          label="Submit a quick report"
          variant="cardinal"
          onPress={() => setShowForm(true)}
        />
      </View>

      <Modal
        visible={showForm}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowForm(false)}
      >
        <ReportForm
          locationId={location.id}
          locationName={location.name}
          onClose={() => setShowForm(false)}
          onSubmitted={() => {
            load();
          }}
        />
      </Modal>
    </View>
  );
}

// ----------------------------------------------------------------
// Sub-components
// ----------------------------------------------------------------

function BackRow({ onPress }: { onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Back"
      onPress={onPress}
      style={({ pressed }) => [styles.backBtn, pressed && { opacity: 0.7 }]}
    >
      <Text style={styles.backText}>‹ Back</Text>
    </Pressable>
  );
}

function TabPill({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  // Selection drives a 0..1 progress that interpolates the pill bg + text
  // colour. Press drives a quick scale flick. Both animate independently so
  // the pill feels responsive even mid-transition.
  const sel = useSharedValue(active ? 1 : 0);
  const press = useSharedValue(0);

  useEffect(() => {
    sel.value = withTiming(active ? 1 : 0, {
      duration: 220,
      easing: Easing.out(Easing.cubic),
    });
  }, [active, sel]);

  const pillStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(
      sel.value,
      [0, 1],
      [colors.surface, colors.cardinal]
    ),
    transform: [{ scale: 1 - press.value * 0.05 }],
  }));

  const textStyle = useAnimatedStyle(() => ({
    color: interpolateColor(sel.value, [0, 1], [colors.text, "#FFFFFF"]),
  }));

  return (
    <AnimatedPressable
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      onPressIn={() => {
        press.value = withSpring(1, TAB_SPRING);
      }}
      onPressOut={() => {
        press.value = withSpring(0, TAB_SPRING);
      }}
      onPress={onPress}
      style={[styles.tabPill, pillStyle]}
    >
      <Animated.Text style={[styles.tabPillText, textStyle]}>
        {label}
      </Animated.Text>
    </AnimatedPressable>
  );
}

function SectionHeading({ children }: { children: React.ReactNode }) {
  return <Text style={styles.subHeading}>{children}</Text>;
}

function InfoPanel({ location }: { location: Location }) {
  return (
    <View style={styles.panelInner}>
      {location.description && (
        <View style={styles.infoSection}>
          <SectionHeading>Background</SectionHeading>
          <Text style={styles.bodyText} numberOfLines={5}>
            {location.description}
          </Text>
        </View>
      )}

      {location.accessibility_notes && (
        <View style={styles.infoSection}>
          <SectionHeading>Accessibility</SectionHeading>
          <Text style={styles.bodyText} numberOfLines={5}>
            {location.accessibility_notes}
          </Text>
        </View>
      )}
    </View>
  );
}

function ActivityPanel({
  trends,
  summary,
}: {
  trends: HourlyTrend[];
  summary: SensorySummary;
}) {
  const now = new Date();
  const today = now.getDay();
  const currentHour = now.getHours();
  const predictedTrends = useMemo(
    () => predictTodayTrends(trends, today),
    [trends, today]
  );

  return (
    <View style={styles.panelInner}>
      {/* Histogram on top */}
      <SectionHeading>Popular times today</SectionHeading>
      <TrendBars
        trends={predictedTrends}
        dayOfWeek={today}
        highlightHour={currentHour}
      />

      {/* Live snapshot beneath the chart */}
      <View style={{ marginTop: spacing.lg }}>
        <SectionHeading>Current activity</SectionHeading>
      </View>
      <View style={styles.metricsGrid}>
        <MetricBadge metric="noise" value={summary.noise} />
        <MetricBadge metric="crowd" value={summary.crowd} />
      </View>

      <Text style={styles.updatedText}>
        {summary.reportCount > 0
          ? `${summary.reportCount} recent report${summary.reportCount === 1 ? "" : "s"} · Updated ${timeAgo(summary.lastReportedAt)}`
          : "No recent reports yet."}
      </Text>
    </View>
  );
}

function predictTodayTrends(
  trends: HourlyTrend[],
  today: number
): HourlyTrend[] {
  if (trends.length === 0) {
    return trends;
  }

  const predictions = POPULAR_TIMES_HOURS.map((hour) => {
    const crowd = predictMetric(trends, today, hour, "avg_crowd");
    const noise = predictMetric(trends, today, hour, "avg_noise");

    if (crowd.value === null && noise.value === null) {
      return null;
    }

    const prediction: HourlyTrend = {
      id: `predicted-${today}-${hour}`,
      location_id: trends[0]?.location_id ?? "predicted",
      day_of_week: today,
      hour,
      avg_crowd: crowd.value,
      avg_noise: noise.value,
      avg_seating: null,
      avg_lighting: null,
      sample_count: Math.max(1, Math.round(Math.max(crowd.weight, noise.weight))),
    };

    return prediction;
  }).filter((trend): trend is HourlyTrend => trend !== null);

  // If historical report averages cannot produce a usable estimate,
  // leave the original data alone so TrendBars keeps its existing empty state.
  return predictions.length > 0 ? predictions : trends;
}

// Bayesian prior: sparsely-sampled cells get pulled toward the neutral
// midpoint (3 = middle of the 1..5 scale). PRIOR_PSEUDO_COUNT is the number
// of imaginary "neutral" observations we mix in. Real data quickly dominates
// once a bucket has more than a couple of reports, but a single 5/5 report
// no longer produces a wild lonely spike in the histogram.
const PRIOR_VALUE = 3;
const PRIOR_PSEUDO_COUNT = 2;

function predictMetric(
  trends: HourlyTrend[],
  dayOfWeek: number,
  hour: number,
  metric: "avg_crowd" | "avg_noise"
): { value: number | null; weight: number } {
  let weightedTotal = 0;
  let totalWeight = 0;

  const add = (value: number | null | undefined, weight: number) => {
    if (value == null || weight <= 0) return;
    weightedTotal += value * weight;
    totalWeight += weight;
  };

  for (const trend of trends) {
    const sampleWeight = Math.max(1, trend.sample_count || 1);
    const hourDistance = Math.abs(trend.hour - hour);

    // Prediction priority:
    // 1. Same day and same hour is treated as the strongest signal.
    // 2. Same day nearby hours help fill small gaps in historical report data.
    // 3. Same hour on other days is a light fallback for sparse locations.
    if (trend.day_of_week === dayOfWeek && trend.hour === hour) {
      add(trend[metric], sampleWeight * 4);
    } else if (trend.day_of_week === dayOfWeek && hourDistance <= 2) {
      add(trend[metric], sampleWeight / (hourDistance + 1));
    } else if (trend.hour === hour) {
      add(trend[metric], sampleWeight * 0.5);
    }
  }

  if (totalWeight === 0) {
    return { value: null, weight: 0 };
  }

  // Posterior mean: (Σ wᵢ·xᵢ + α·μ) / (Σ wᵢ + α)
  const posterior =
    (weightedTotal + PRIOR_PSEUDO_COUNT * PRIOR_VALUE) /
    (totalWeight + PRIOR_PSEUDO_COUNT);

  return {
    value: Math.max(1, Math.min(5, posterior)),
    weight: totalWeight,
  };
}

const styles = StyleSheet.create({
  canvas: {
    flex: 1,
    backgroundColor: colors.background,
    paddingHorizontal: spacing.lg,
  },

  // Back row
  backBtn: {
    alignSelf: "flex-start",
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: radii.pill,
    backgroundColor: colors.cardinalSoft,
    marginBottom: spacing.sm,
  },
  backText: {
    ...typography.bodyStrong,
    color: colors.cardinal,
  },

  // Header
  header: {
    marginTop: spacing.xs,
    marginBottom: spacing.lg,
  },
  headerTitleBlock: {
    alignSelf: "flex-start",
    gap: 8,
  },
  category: {
    ...typography.caption,
    color: colors.cardinal,
    textTransform: "uppercase",
    letterSpacing: 1.2,
    fontWeight: "700",
  },
  title: {
    fontSize: 30,
    fontWeight: "800",
    color: colors.text,
    letterSpacing: -0.6,
    lineHeight: 34,
    marginTop: 4,
  },
  headerRule: {
    alignSelf: "stretch",
    height: 5,
    backgroundColor: colors.gold,
    borderRadius: 2.5,
    marginTop: 4,
  },

  // Tab pills
  tabRow: {
    flexDirection: "row",
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  tabPill: {
    paddingVertical: 9,
    paddingHorizontal: 18,
    borderRadius: radii.pill,
  },
  tabPillText: {
    ...typography.bodyStrong,
  },

  // Panel — flex: 1 so it fills the space between tabs and submit. Overflow
  // hidden so any too-long content gets clipped instead of forcing scroll.
  panel: {
    flex: 1,
    overflow: "hidden",
  },
  carousel: {
    flexDirection: "row",
    height: "100%",
  },
  panelInner: {
    flex: 1,
    gap: spacing.md,
  },

  bodyText: {
    fontSize: 16,
    color: colors.text,
    lineHeight: 22,
  },
  bodySmall: {
    fontSize: 14,
    color: colors.text,
    lineHeight: 20,
  },
  subHeading: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.text,
    letterSpacing: -0.2,
  },
  metricsGrid: {
    flexDirection: "row",
    gap: spacing.sm,
  },

  updatedText: {
    ...typography.small,
    color: colors.textMuted,
  },

  infoSection: {
    gap: spacing.sm,
    marginTop: spacing.xs,
  },

  // Submit row
  submitRow: {
    paddingTop: spacing.md,
  },

  muted: {
    ...typography.body,
    color: colors.textMuted,
    marginTop: spacing.xl,
  },
});
