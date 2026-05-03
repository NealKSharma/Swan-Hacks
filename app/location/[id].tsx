import { useCallback, useEffect, useState } from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { Stack, useFocusEffect, useLocalSearchParams } from "expo-router";
import { Screen } from "@/components/Screen";
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

export default function LocationDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [location, setLocation] = useState<Location | null>(null);
  const [summary, setSummary] = useState<SensorySummary | null>(null);
  const [reports, setReports] = useState<Report[]>([]);
  const [trends, setTrends] = useState<HourlyTrend[]>([]);
  const [roomAvailability, setRoomAvailability] =
    useState<RoomAvailabilityResponse | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [roomsLoading, setRoomsLoading] = useState(false);

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
    const supportsRooms = locationSupportsRoomAvailability(loc.slug);
    if (supportsRooms) {
      setRoomsLoading(true);
    } else {
      setRoomAvailability(null);
      setRoomsLoading(false);
    }
    setLocation(loc);
    setReports(recent);
    setTrends(trendData);
    setSummary(summarizeReports(recent));
    setLoading(false);
    if (supportsRooms) {
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
      <Screen reserveTabBar={false}>
        <Text style={styles.muted}>Loading…</Text>
      </Screen>
    );
  }

  if (!location || !summary) {
    return (
      <Screen reserveTabBar={false}>
        <Stack.Screen options={{ title: "Not found" }} />
        <Text style={styles.muted}>
          We couldn&apos;t find that location. The QR code may be out of date.
        </Text>
      </Screen>
    );
  }

  const now = new Date();
  const dayOfWeek = now.getDay();
  const hour = now.getHours();

  return (
    <Screen reserveTabBar={false}>
      <Stack.Screen options={{ title: location.name }} />

      <View style={styles.header}>
        <Text style={styles.category}>{location.category}</Text>
        <Text style={styles.title}>{location.name}</Text>
        <View style={{ flexDirection: "row" }}>
          <SensoryStatusPill status={summary.status} size="lg" />
        </View>
        <Text style={styles.updated}>
          {summary.reportCount > 0
            ? `${summary.reportCount} report${summary.reportCount === 1 ? "" : "s"} • Updated ${timeAgo(summary.lastReportedAt)}`
            : "No recent reports yet"}
        </Text>
      </View>

      {location.description && (
        <Text style={styles.description}>{location.description}</Text>
      )}

      <View style={styles.metricsGrid}>
        <MetricBadge metric="noise" value={summary.noise} />
        <MetricBadge metric="crowd" value={summary.crowd} />
      </View>

      {location.accessibility_notes && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Accessibility</Text>
          <Text style={styles.cardBody}>{location.accessibility_notes}</Text>
        </View>
      )}

      <View style={styles.card}>
        <View style={styles.cardHeaderRow}>
          <Text style={styles.cardTitle}>Popular times today</Text>
          <Text style={styles.cardCaption}>{dayLabel(dayOfWeek)}</Text>
        </View>
        <TrendBars trends={trends} dayOfWeek={dayOfWeek} highlightHour={hour} />
        <Text style={styles.cardCaptionSubtle}>
          Based on aggregated reports. Fills in as more students contribute.
        </Text>
      </View>

      <RoomAvailabilityCard
        availability={roomAvailability}
        loading={roomsLoading}
      />

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Recent anonymous reports</Text>
        {reports.length === 0 ? (
          <Text style={styles.cardBodyMuted}>
            No reports in the last two hours. Be the first.
          </Text>
        ) : (
          reports.slice(0, 6).map((r) => (
            <View key={r.id} style={styles.reportRow}>
              <Text style={styles.reportTime}>{timeAgo(r.created_at)}</Text>
              <Text style={styles.reportLine}>
                Noise {r.noise_level}/5 • Crowd {r.crowd_level}/5
              </Text>
            </View>
          ))
        )}
      </View>

      <Button
        label="Submit a quick report"
        variant="cardinal"
        onPress={() => setShowForm(true)}
      />

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
    </Screen>
  );
}

function dayLabel(d: number): string {
  return (
    ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][d] ??
    "Today"
  );
}

const styles = StyleSheet.create({
  header: { gap: spacing.sm },
  category: {
    ...typography.caption,
    color: colors.cardinal,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  title: { ...typography.display, color: colors.text },
  updated: { ...typography.small, color: colors.textMuted },
  description: { ...typography.body, color: colors.textSubtle },
  metricsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.sm,
  },
  cardHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "baseline",
  },
  cardTitle: { ...typography.heading, color: colors.text },
  cardCaption: { ...typography.small, color: colors.textSubtle },
  cardCaptionSubtle: { ...typography.small, color: colors.textMuted },
  cardBody: { ...typography.body, color: colors.textSubtle },
  cardBodyMuted: { ...typography.body, color: colors.textMuted },
  reportRow: {
    paddingVertical: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: 2,
  },
  reportTime: { ...typography.caption, color: colors.textMuted },
  reportLine: { ...typography.body, color: colors.text },
  muted: { ...typography.body, color: colors.textMuted },
});
