import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Platform,
  Pressable,
  StyleSheet,
  Switch,
  Text,
  View,
} from "react-native";
import { router, useFocusEffect } from "expo-router";
import { setStatusBarStyle } from "expo-status-bar";
import { Button } from "@/components/Button";
import { CrowdSenseMapView } from "@/components/CrowdSenseMapView";
import { Screen } from "@/components/Screen";
import { colors, radii, shadows, spacing, typography } from "@/constants/theme";
import {
  checkNearbyStudySpotNow,
  disableCrowdSense,
  enableCrowdSense,
  getCrowdLevels,
  isCrowdSenseEnabled,
  listCrowdSenseHotspots,
} from "@/services/crowdSense";
import { distanceMeters } from "@/utils/geo";
import type { CrowdLevel, Hotspot, NearbyHotspotMatch } from "@/types";

type ViewMode = "map" | "list";

const PRIVACY_COPY =
  "CySense uses opt-in anonymous location snapshots to estimate how busy campus study spaces are. We only save the campus zone you are near, not your exact GPS location. We never show individual users or store movement history.";

export default function CrowdSenseMapScreen() {
  const [enabled, setEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [checkingNearby, setCheckingNearby] = useState(false);
  const [nearby, setNearby] = useState<NearbyHotspotMatch | null>(null);
  const [crowdLevels, setCrowdLevels] = useState<CrowdLevel[]>([]);
  const [hotspots, setHotspots] = useState<Hotspot[]>([]);
  const [currentLocation, setCurrentLocation] = useState<{
    latitude: number;
    longitude: number;
    accuracy: number | null;
  } | null>(null);
  const [selectedHotspotId, setSelectedHotspotId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("map");
  const [updatingSensing, setUpdatingSensing] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [enabledValue, levels, hotspotRows] = await Promise.all([
        isCrowdSenseEnabled(),
        getCrowdLevels(),
        listCrowdSenseHotspots(),
      ]);
      setEnabled(enabledValue);
      setCrowdLevels(levels);
      setHotspots(hotspotRows);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load CrowdSense.");
    } finally {
      setLoading(false);
    }
  }, []);

  const checkCurrentSpot = useCallback(async ({ silent = false } = {}) => {
    if (!silent) {
      setCheckingNearby(true);
      setError(null);
      setMessage(null);
    }

    try {
      const result = await checkNearbyStudySpotNow();
      setNearby(result.nearby);
      setCurrentLocation(result.currentLocation);
      if (result.nearby) {
        setSelectedHotspotId(result.nearby.hotspot.id);
        if (!silent) {
          setMessage(
            `You are inside the ${result.nearby.hotspot.name} hotspot. Anonymous snapshot sent.`
          );
        }
      } else if (!silent) {
        setMessage(
          result.closest
            ? `Closest hotspot: ${result.closest.hotspot.name}, about ${formatDistance(result.closest.distanceMeters)} away.`
            : "No current hotspot match."
        );
      }
      await load();
    } catch (checkError) {
      if (!silent) {
        setError(
          checkError instanceof Error ? checkError.message : "Unable to check nearby study spot."
        );
      }
    } finally {
      if (!silent) setCheckingNearby(false);
    }
  }, [load]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!enabled || loading || currentLocation) return;
    void checkCurrentSpot({ silent: true });
  }, [checkCurrentSpot, currentLocation, enabled, loading]);

  useFocusEffect(
    useCallback(() => {
      setStatusBarStyle("dark");
      load();
    }, [load])
  );

  const levelsByZone = useMemo(
    () => new Map(crowdLevels.map((level) => [level.zone_id, level])),
    [crowdLevels]
  );

  const visibleHotspots = useMemo(() => {
    const rows = hotspots.map((hotspot) => ({
      hotspot,
      distance:
        currentLocation == null
          ? null
          : distanceMeters(
              currentLocation.latitude,
              currentLocation.longitude,
              hotspot.latitude,
              hotspot.longitude
            ),
    }));

    return rows.sort((a, b) => {
      if (a.distance == null && b.distance == null) return a.hotspot.name.localeCompare(b.hotspot.name);
      if (a.distance == null) return 1;
      if (b.distance == null) return -1;
      return a.distance - b.distance;
    });
  }, [currentLocation, hotspots]);

  async function handleToggle(nextValue: boolean) {
    setError(null);
    setMessage(null);

    setUpdatingSensing(true);
    try {
      if (nextValue) {
        const result = await enableCrowdSense();
        setEnabled(true);
        await checkCurrentSpot({ silent: true });
        if (result.message) setMessage(result.message);
      } else {
        await disableCrowdSense();
        setEnabled(false);
        setNearby(null);
        setCurrentLocation(null);
        setMessage("CrowdSense turned off. You can turn this off anytime.");
      }
    } catch (toggleError) {
      setEnabled(false);
      setNearby(null);
      setCurrentLocation(null);
      setError(
        toggleError instanceof Error ? toggleError.message : "Unable to change CrowdSense."
      );
    } finally {
      setUpdatingSensing(false);
    }
  }

  async function handleCheckNearby() {
    if (!enabled) {
      setError("Turn on anonymous sensing first so CySense can ask for location access.");
      return;
    }
    await checkCurrentSpot();
  }

  function handleHotspotPress(hotspotId: string) {
    if (selectedHotspotId === hotspotId) {
      router.push(`/location/${hotspotId}`);
      return;
    }
    setSelectedHotspotId(hotspotId);
  }

  const nearbyLevel = nearby
    ? levelsByZone.get(nearby.hotspot.id)?.level ?? "Quiet"
    : null;

  return (
    <Screen contentContainerStyle={styles.screen}>
      <View style={styles.header}>
        <View>
          <Text style={styles.eyebrow}>CrowdSense</Text>
          <Text style={styles.title}>Campus Crowd Map</Text>
        </View>
      </View>

      <Pressable
        onPress={() => setViewMode((current) => (current === "map" ? "list" : "map"))}
        accessibilityRole="button"
        style={styles.switchViewPill}
      >
        <Text style={styles.switchViewText}>
          {viewMode === "map" ? "Switch to list" : "Switch to map"}
        </Text>
      </Pressable>

      {viewMode === "map" ? (
        <View style={styles.mapStack}>
          <View style={styles.mapWrap}>
            <CrowdSenseMapView
              hotspots={hotspots}
              levelsByZone={levelsByZone}
              currentLocation={enabled ? currentLocation : null}
              selectedHotspotId={selectedHotspotId}
              onHotspotPress={handleHotspotPress}
            />
            <Button
              label={
                !enabled
                  ? "Turn on sensing to check"
                  : checkingNearby
                    ? "Checking..."
                    : "Check my spot"
              }
              onPress={handleCheckNearby}
              disabled={checkingNearby || !enabled}
              variant="cardinal"
              style={styles.mapCheckButton}
            />
          </View>
          {nearby ? (
            <View style={styles.insideBanner}>
              <View style={styles.insideHeader}>
                <Text style={styles.insideEyebrow}>You are here</Text>
                <CrowdPill level={nearbyLevel ?? "Quiet"} />
              </View>
              <Text style={styles.insideTitle}>{nearby.hotspot.name}</Text>
              <Text style={styles.insideBody}>
                {quietnessCriteria(nearbyLevel ?? "Quiet")}{" "}
                {crowdCriteria(nearbyLevel ?? "Quiet")}
              </Text>
            </View>
          ) : null}
        </View>
      ) : (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Study hotspots</Text>
          <View style={styles.list}>
            {loading ? (
              <Text style={styles.body}>Loading crowd levels...</Text>
            ) : (
              visibleHotspots.map(({ hotspot, distance }) => {
                const level = levelsByZone.get(hotspot.id)?.level ?? "Quiet";
                const isNearby = nearby?.hotspot.id === hotspot.id;
                return (
                  <Pressable
                    key={hotspot.id}
                    onPress={() => router.push(`/location/${hotspot.id}`)}
                    accessibilityRole="link"
                    style={[styles.hotspotCard, isNearby && styles.hotspotCardNearby]}
                  >
                    <View style={styles.hotspotHeader}>
                      <View style={styles.hotspotCopy}>
                        <Text style={styles.hotspotName}>{hotspot.name}</Text>
                        <Text style={styles.hotspotMeta}>
                          {distance == null
                            ? hotspot.category
                            : `${hotspot.category} - ${formatDistance(distance)} away`}
                        </Text>
                      </View>
                      <CrowdPill level={level} />
                    </View>
                    <Text style={styles.body}>{crowdCriteria(level)}</Text>
                    {isNearby ? (
                      <Text style={styles.success}>You are inside this hotspot right now.</Text>
                    ) : null}
                  </Pressable>
                );
              })
            )}
          </View>
        </View>
      )}

      <View style={styles.panel}>
        <View style={styles.toggleRow}>
          <View style={styles.toggleCopy}>
            <Text style={styles.panelTitle}>Anonymous sensing</Text>
            <Text style={styles.body}>{PRIVACY_COPY}</Text>
            <Text style={styles.toggleHint}>
              {Platform.OS === "web"
                ? "Web supports manual checks only."
                : "Background sensing needs a development or native build."}
            </Text>
          </View>
          <Switch
            value={enabled}
            onValueChange={handleToggle}
            disabled={updatingSensing}
            trackColor={{ false: colors.border, true: colors.cardinalSoft }}
            thumbColor={enabled ? colors.cardinal : "#FFFFFF"}
          />
        </View>
      </View>

      {(message || error) && (
        <View style={styles.statusCard}>
          {message ? <Text style={styles.success}>{message}</Text> : null}
          {error ? <Text style={styles.error}>{error}</Text> : null}
        </View>
      )}
    </Screen>
  );
}

function CrowdPill({ level }: { level: CrowdLevel["level"] }) {
  return (
    <View style={[styles.levelPill, levelPillStyle(level)]}>
      <Text style={styles.levelPillText}>{displayCrowdLevel(level)}</Text>
    </View>
  );
}

function displayCrowdLevel(level: CrowdLevel["level"]) {
  return level === "Overcrowded" ? "Over crowded" : level;
}

function crowdCriteria(level: CrowdLevel["level"]) {
  switch (level) {
    case "Quiet":
      return "Very low activity. Best for deep focus.";
    case "Calm":
      return "Light activity. Good for steady study.";
    case "Busy":
      return "Noticeable activity. Expect some movement and sound.";
    case "Crowded":
      return "High activity. Seating and quiet may be harder to find.";
    case "Overcrowded":
      return "Very high activity. Consider another nearby space.";
  }
}

function quietnessCriteria(level: CrowdLevel["level"]) {
  switch (level) {
    case "Quiet":
      return "Quiet level: very quiet.";
    case "Calm":
      return "Quiet level: calm.";
    case "Busy":
      return "Quiet level: mixed.";
    case "Crowded":
      return "Quiet level: limited.";
    case "Overcrowded":
      return "Quiet level: low.";
  }
}

function formatDistance(distance: number) {
  if (distance < 1000) return `${Math.round(distance)}m`;
  return `${(distance / 1000).toFixed(1)}km`;
}

function levelPillStyle(level: CrowdLevel["level"]) {
  switch (level) {
    case "Quiet":
      return { backgroundColor: "#E6F4EC", borderColor: "#A7D1B9" };
    case "Calm":
      return { backgroundColor: "#E9F5EF", borderColor: "#B3D7C0" };
    case "Busy":
      return { backgroundColor: "#FBF0D0", borderColor: "#E6CC85" };
    case "Crowded":
      return { backgroundColor: "#F6E4D8", borderColor: "#D7A984" };
    case "Overcrowded":
      return { backgroundColor: "#FBE5E8", borderColor: "#E7B1BA" };
  }
}

const styles = StyleSheet.create({
  screen: {
    paddingTop: spacing.xl,
  },
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: spacing.md,
  },
  eyebrow: {
    ...typography.caption,
    color: colors.cardinal,
    textTransform: "uppercase",
    letterSpacing: 1.4,
  },
  title: {
    ...typography.display,
    color: colors.text,
  },
  switchViewPill: {
    alignSelf: "stretch",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: radii.pill,
    borderWidth: 1.5,
    borderColor: colors.text,
    paddingHorizontal: spacing.lg,
    paddingVertical: 10,
    minHeight: 44,
    justifyContent: "center",
  },
  switchViewText: {
    ...typography.bodyStrong,
    color: colors.cardinal,
    fontWeight: "800",
  },
  mapStack: {
    gap: spacing.md,
  },
  mapWrap: {
    position: "relative",
  },
  mapCheckButton: {
    position: "absolute",
    alignSelf: "center",
    bottom: spacing.lg,
    borderRadius: radii.pill,
    minHeight: 42,
    paddingVertical: 9,
    paddingHorizontal: spacing.lg,
  },
  insideBanner: {
    backgroundColor: colors.surface,
    borderRadius: radii.sm,
    borderWidth: 1.5,
    borderColor: colors.text,
    padding: spacing.lg,
    gap: spacing.sm,
    ...shadows.card,
  },
  insideHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md,
  },
  insideEyebrow: {
    ...typography.caption,
    color: colors.cardinal,
    textTransform: "uppercase",
    letterSpacing: 1.4,
  },
  insideTitle: {
    ...typography.title,
    color: colors.text,
  },
  insideBody: {
    ...typography.body,
    color: colors.textSubtle,
  },
  panel: {
    backgroundColor: colors.surface,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: spacing.md,
  },
  panelTitle: {
    ...typography.heading,
    color: colors.text,
  },
  body: {
    ...typography.body,
    color: colors.textSubtle,
  },
  toggleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  toggleCopy: {
    flex: 1,
    gap: 4,
  },
  toggleHint: {
    ...typography.small,
    color: colors.textMuted,
  },
  statusCard: {
    backgroundColor: colors.surfaceMuted,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  success: {
    ...typography.small,
    color: colors.success,
  },
  error: {
    ...typography.small,
    color: colors.danger,
  },
  section: {
    gap: spacing.md,
  },
  sectionTitle: {
    ...typography.title,
    color: colors.text,
  },
  list: {
    gap: spacing.md,
  },
  hotspotCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  hotspotCardNearby: {
    borderColor: colors.cardinal,
    backgroundColor: colors.cardinalSoft,
  },
  hotspotHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.md,
  },
  hotspotCopy: {
    flex: 1,
  },
  hotspotName: {
    ...typography.heading,
    color: colors.text,
  },
  hotspotMeta: {
    ...typography.small,
    color: colors.textMuted,
  },
  levelPill: {
    borderRadius: radii.pill,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  levelPillText: {
    ...typography.caption,
    color: colors.text,
  },
});
