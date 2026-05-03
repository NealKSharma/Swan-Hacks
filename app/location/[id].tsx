import { useCallback, useEffect, useMemo, useState } from "react";
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
import { Button } from "@/components/Button";
import { MetricBadge } from "@/components/MetricBadge";
import { RoomAvailabilityCard } from "@/components/RoomAvailabilityCard";
import { SensoryStatusPill } from "@/components/SensoryStatusPill";
import { TrendBars } from "@/components/TrendBars";
import { ReportForm } from "@/components/ReportForm";
import { colors, radii, spacing, typography } from "@/constants/theme";
import {
  getLocationBySlugOrId,
  listRecentReports,
  listTrends,
} from "@/lib/dataSource";
import { getRoomAvailability, locationSupportsRoomAvailability } from "@/lib/libcal";
import { summarizeReports } from "@/utils/sensoryScore";
import { timeAgo } from "@/utils/formatting";
import type {
  HourlyTrend,
  Location,
  Report,
  RoomAvailabilityResponse,
  SensorySummary,
} from "@/types";

type Tab = "info" | "activity" | "rooms";

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
  const [activeTab, setActiveTab] = useState<Tab>("info");

  const supportsRooms = useMemo(
    () => (location ? locationSupportsRoomAvailability(location.slug) : false),
    [location]
  );

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
    const [recent, trendData] = await Promise.all([
      listRecentReports(loc.id, 120, 25),
      listTrends(loc.id),
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
    setSummary(summarizeReports(recent));
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
        <View style={{ flex: 1, paddingRight: spacing.md }}>
          <Text style={styles.category}>{location.category}</Text>
          <Text style={styles.title}>{location.name}</Text>
        </View>
        <SensoryStatusPill status={summary.status} size="md" />
      </View>

      {/* Tab pills */}
      <View style={styles.tabRow}>
        <TabPill
          label="Info"
          active={activeTab === "info"}
          onPress={() => setActiveTab("info")}
        />
        <TabPill
          label="Activity"
          active={activeTab === "activity"}
          onPress={() => setActiveTab("activity")}
        />
        {supportsRooms && (
          <TabPill
            label="Rooms"
            active={activeTab === "rooms"}
            onPress={() => setActiveTab("rooms")}
          />
        )}
      </View>

      {/* Static panel — fills remaining space, no scroll */}
      <View style={styles.panel}>
        {activeTab === "info" && (
          <InfoPanel location={location} summary={summary} />
        )}
        {activeTab === "activity" && (
          <ActivityPanel reports={reports} trends={trends} />
        )}
        {activeTab === "rooms" && (
          <View style={{ flex: 1 }}>
            <RoomAvailabilityCard
              availability={roomAvailability}
              loading={roomsLoading}
            />
          </View>
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
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.tabPill,
        active && styles.tabPillActive,
        pressed && !active && { opacity: 0.85 },
      ]}
    >
      <Text style={[styles.tabPillText, active && styles.tabPillTextActive]}>
        {label}
      </Text>
    </Pressable>
  );
}

function InfoPanel({
  location,
  summary,
}: {
  location: Location;
  summary: SensorySummary;
}) {
  return (
    <View style={styles.panelInner}>
      {location.description && (
        <Text style={styles.bodyText} numberOfLines={5}>
          {location.description}
        </Text>
      )}

      <View style={styles.metricsGrid}>
        <MetricBadge metric="noise" value={summary.noise} />
        <MetricBadge metric="crowd" value={summary.crowd} />
      </View>

      <Text style={styles.updatedText}>
        {summary.reportCount > 0
          ? `${summary.reportCount} report${summary.reportCount === 1 ? "" : "s"} · Updated ${timeAgo(summary.lastReportedAt)}`
          : "No recent reports yet."}
      </Text>

      {location.accessibility_notes && (
        <View style={styles.accessibilityBlock}>
          <Text style={styles.subHeading}>Accessibility</Text>
          <Text style={styles.bodySmall} numberOfLines={5}>
            {location.accessibility_notes}
          </Text>
        </View>
      )}
    </View>
  );
}

function ActivityPanel({
  reports,
  trends,
}: {
  reports: Report[];
  trends: HourlyTrend[];
}) {
  const now = new Date();
  return (
    <View style={styles.panelInner}>
      <Text style={styles.subHeading}>Popular times today</Text>
      <Text style={styles.subCaption}>{dayLabel(now.getDay())}</Text>
      <TrendBars
        trends={trends}
        dayOfWeek={now.getDay()}
        highlightHour={now.getHours()}
      />

      <Text style={[styles.subHeading, { marginTop: spacing.lg }]}>
        Recent anonymous reports
      </Text>
      {reports.length === 0 ? (
        <Text style={styles.bodySmall}>No reports in the last two hours.</Text>
      ) : (
        reports.slice(0, 3).map((r) => (
          <View key={r.id} style={styles.reportRow}>
            <Text style={styles.reportTime}>{timeAgo(r.created_at)}</Text>
            <Text style={styles.reportLine}>
              Noise {r.noise_level}/5 · Crowd {r.crowd_level}/5
            </Text>
          </View>
        ))
      )}
    </View>
  );
}

function dayLabel(d: number): string {
  return (
    ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][d] ??
    "Today"
  );
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
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginTop: spacing.xs,
    marginBottom: spacing.lg,
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
    backgroundColor: colors.surface,
  },
  tabPillActive: {
    backgroundColor: colors.cardinal,
  },
  tabPillText: {
    ...typography.bodyStrong,
    color: colors.text,
  },
  tabPillTextActive: {
    color: "#FFFFFF",
  },

  // Panel — flex: 1 so it fills the space between tabs and submit. Overflow
  // hidden so any too-long content gets clipped instead of forcing scroll.
  panel: {
    flex: 1,
    overflow: "hidden",
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
  subCaption: {
    ...typography.small,
    color: colors.textSubtle,
    marginTop: -spacing.sm,
  },

  metricsGrid: {
    flexDirection: "row",
    gap: spacing.sm,
  },

  updatedText: {
    ...typography.small,
    color: colors.textMuted,
  },

  accessibilityBlock: {
    marginTop: spacing.sm,
    gap: 4,
  },

  // Recent reports
  reportRow: {
    paddingVertical: 6,
    gap: 2,
  },
  reportTime: { ...typography.caption, color: colors.textMuted },
  reportLine: { ...typography.body, color: colors.text },

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
