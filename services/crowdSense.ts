import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";
import * as Location from "expo-location";
import * as Notifications from "expo-notifications";
import * as TaskManager from "expo-task-manager";
import { MOCK_LOCATIONS } from "@/constants/campusLocations";
import { getSupabase } from "@/lib/supabase";
import { distanceMeters } from "@/utils/geo";
import type {
  CrowdLevel,
  CrowdLevelLabel,
  Hotspot,
  Location as CySenseLocation,
  NearbyHotspotMatch,
} from "@/types";

const CROWD_SENSE_ENABLED_KEY = "cysense.crowdSense.enabled";
const CROWD_SENSE_DEVICE_ID_KEY = "cysense.crowdSense.anonDeviceId";
// Per-hotspot timestamp of the last notification we fired for that zone.
// Replaces the previous global "notified once forever" flag — the old key
// kicked in after the first detection and silenced every subsequent zone.
const CROWD_SENSE_LAST_NOTIFIED_PREFIX = "cysense.crowdSense.lastNotified.";
// Cooldown window — same hotspot won't re-notify within this many ms.
const CROWD_SENSE_NOTIFY_COOLDOWN_MS = 2 * 60 * 60 * 1000; // 2 hours
const SNAPSHOT_BUCKET_MINUTES = 5;
const CROWD_WINDOW_MINUTES = 15;
const HOTSPOT_CACHE_MS = 60_000;

export const CROWDSENSE_LOCATION_TASK = "CROWDSENSE_LOCATION_TASK";

let hotspotCache: { expiresAt: number; hotspots: Hotspot[] } | null = null;

if (Platform.OS !== "web") {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: false,
      shouldSetBadge: false,
    }),
  });
}

const MOCK_COUNTS: Record<string, number> = {
  "parks-library": 11,
  "student-innovation-center": 4,
  "memorial-union": 13,
  "gerdin-business-building": 5,
  "coover-hall": 3,
  "design-building": 7,
  "troxel-hall": 2,
};

function createAnonymousId(): string {
  return `crowd-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function toHotspot(location: CySenseLocation): Hotspot | null {
  if (
    location.latitude == null ||
    location.longitude == null ||
    location.hotspot_radius_meters == null
  ) {
    return null;
  }

  return {
    id: location.slug,
    name: location.name,
    category: location.category,
    latitude: location.latitude,
    longitude: location.longitude,
    radiusMeters: location.hotspot_radius_meters,
  };
}

export async function listCrowdSenseHotspots(): Promise<Hotspot[]> {
  if (hotspotCache && hotspotCache.expiresAt > Date.now()) {
    return hotspotCache.hotspots;
  }

  const supabase = getSupabase();
  let hotspots: Hotspot[];

  if (!supabase) {
    hotspots = MOCK_LOCATIONS.map(toHotspot).filter(
      (hotspot): hotspot is Hotspot => hotspot != null
    );
  } else {
    const { data, error } = await supabase
      .from("locations")
      .select("slug,name,category,latitude,longitude,hotspot_radius_meters")
      .not("latitude", "is", null)
      .not("longitude", "is", null)
      .not("hotspot_radius_meters", "is", null)
      .order("name");

    if (error) throw new Error(error.message);
    hotspots = ((data ?? []) as CySenseLocation[])
      .map(toHotspot)
      .filter((hotspot): hotspot is Hotspot => hotspot != null);
  }

  hotspotCache = {
    hotspots,
    expiresAt: Date.now() + HOTSPOT_CACHE_MS,
  };

  return hotspots;
}

export async function getAnonymousDeviceId(): Promise<string> {
  const existing = await AsyncStorage.getItem(CROWD_SENSE_DEVICE_ID_KEY);
  if (existing) return existing;
  const created = createAnonymousId();
  await AsyncStorage.setItem(CROWD_SENSE_DEVICE_ID_KEY, created);
  return created;
}

export async function isCrowdSenseEnabled(): Promise<boolean> {
  return (await AsyncStorage.getItem(CROWD_SENSE_ENABLED_KEY)) === "true";
}

async function setCrowdSenseEnabled(enabled: boolean): Promise<void> {
  await AsyncStorage.setItem(CROWD_SENSE_ENABLED_KEY, enabled ? "true" : "false");
}

async function ensureNotificationPermission(): Promise<boolean> {
  if (Platform.OS === "web") return false;

  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("crowdsense", {
      name: "CrowdSense",
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }

  const current = await Notifications.getPermissionsAsync();
  if (current.granted || current.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL) {
    return true;
  }

  const requested = await Notifications.requestPermissionsAsync();
  return (
    requested.granted ||
    requested.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL
  );
}

async function hasNotifiedHotspotRecently(hotspotId: string): Promise<boolean> {
  const raw = await AsyncStorage.getItem(
    CROWD_SENSE_LAST_NOTIFIED_PREFIX + hotspotId
  );
  if (!raw) return false;
  const last = Number(raw);
  if (!Number.isFinite(last)) return false;
  return Date.now() - last < CROWD_SENSE_NOTIFY_COOLDOWN_MS;
}

async function markHotspotNotified(hotspotId: string): Promise<void> {
  await AsyncStorage.setItem(
    CROWD_SENSE_LAST_NOTIFIED_PREFIX + hotspotId,
    String(Date.now())
  );
}

async function notifyHotspotDetected(hotspot: Hotspot): Promise<boolean> {
  if (Platform.OS === "web") return false;
  // Per-hotspot 2-hour cooldown — re-entering a different hotspot can fire,
  // but pacing back and forth at the same one stays quiet.
  if (await hasNotifiedHotspotRecently(hotspot.id)) return false;

  const granted = await ensureNotificationPermission().catch(() => false);
  if (!granted) return false;

  await Notifications.scheduleNotificationAsync({
    content: {
      title: `You're at ${hotspot.name}`,
      body: "Tap to share a quick snapshot for this space.",
      // Deep-link payload — _layout.tsx's notification-tap handler reads
      // this and routes the user straight to the location detail page.
      data: { url: `/location/${hotspot.id}` },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds: 1,
      channelId: Platform.OS === "android" ? "crowdsense" : undefined,
    },
  });

  await markHotspotNotified(hotspot.id);
  return true;
}

export function crowdLevelForCount(uniqueDevices: number): CrowdLevelLabel {
  if (uniqueDevices <= 1) return "Empty";
  if (uniqueDevices <= 3) return "Calm";
  if (uniqueDevices <= 8) return "Busy";
  if (uniqueDevices <= 15) return "Crowded";
  return "Overcrowded";
}

function toCrowdLevel(
  zoneId: string,
  uniqueDevices: number,
  lastSeenAt: string | null
): CrowdLevel {
  return {
    zone_id: zoneId,
    unique_devices: uniqueDevices,
    level: crowdLevelForCount(uniqueDevices),
    last_seen_at: lastSeenAt,
  };
}

function roundToBucket(date = new Date()): string {
  const bucket = new Date(date);
  const minutes = bucket.getUTCMinutes();
  bucket.setUTCMinutes(minutes - (minutes % SNAPSHOT_BUCKET_MINUTES), 0, 0);
  return bucket.toISOString();
}

export async function findNearbyHotspot(coords: {
  latitude: number;
  longitude: number;
}): Promise<NearbyHotspotMatch | null> {
  const hotspots = await listCrowdSenseHotspots();
  let nearest: NearbyHotspotMatch | null = null;

  for (const hotspot of hotspots) {
    const dist = distanceMeters(
      coords.latitude,
      coords.longitude,
      hotspot.latitude,
      hotspot.longitude
    );
    if (dist > hotspot.radiusMeters) continue;
    if (!nearest || dist < nearest.distanceMeters) {
      nearest = { hotspot, distanceMeters: dist };
    }
  }

  return nearest;
}

export async function findClosestHotspot(coords: {
  latitude: number;
  longitude: number;
}): Promise<NearbyHotspotMatch | null> {
  const hotspots = await listCrowdSenseHotspots();
  let closest: NearbyHotspotMatch | null = null;

  for (const hotspot of hotspots) {
    const dist = distanceMeters(
      coords.latitude,
      coords.longitude,
      hotspot.latitude,
      hotspot.longitude
    );
    if (!closest || dist < closest.distanceMeters) {
      closest = { hotspot, distanceMeters: dist };
    }
  }

  return closest;
}

export interface NearbyStudySpotResult {
  nearby: NearbyHotspotMatch | null;
  closest: NearbyHotspotMatch | null;
  currentLocation: {
    latitude: number;
    longitude: number;
    accuracy: number | null;
  };
}

export async function getCurrentCrowdSenseLocation(): Promise<{
  latitude: number;
  longitude: number;
  accuracy: number | null;
}> {
  const permission = await Location.requestForegroundPermissionsAsync();
  if (permission.status !== "granted") {
    throw new Error("Location permission is needed to show nearby study hotspots.");
  }

  const position = await Location.getCurrentPositionAsync({
    accuracy: Location.Accuracy.High,
  });

  return {
    latitude: position.coords.latitude,
    longitude: position.coords.longitude,
    accuracy:
      typeof position.coords.accuracy === "number"
        ? position.coords.accuracy
        : null,
  };
}

export async function sendPresenceSnapshot(
  hotspotId: string,
  date = new Date()
): Promise<boolean> {
  const supabase = getSupabase();
  if (!supabase) return false;

  const anonDeviceId = await getAnonymousDeviceId();
  const payload = {
    zone_id: hotspotId,
    time_bucket: roundToBucket(date),
    anon_device_id: anonDeviceId,
    source: "crowdsense_snapshot",
  };

  const { error } = await supabase.from("crowdsense_snapshots").upsert(payload, {
    onConflict: "zone_id,time_bucket,anon_device_id",
    ignoreDuplicates: true,
  });

  if (error) throw new Error(error.message);
  return true;
}

async function handleHotspotDetection(
  hotspot: Hotspot,
  date = new Date()
): Promise<{ snapshotSent: boolean; notificationSent: boolean }> {
  const snapshotSent = await sendPresenceSnapshot(hotspot.id, date);
  const notificationSent = await notifyHotspotDetected(hotspot);
  return { snapshotSent, notificationSent };
}

export async function getCrowdLevels(): Promise<CrowdLevel[]> {
  const supabase = getSupabase();
  const hotspots = await listCrowdSenseHotspots();

  if (!supabase) {
    return hotspots.map((hotspot) =>
      toCrowdLevel(hotspot.id, MOCK_COUNTS[hotspot.id] ?? 0, new Date().toISOString())
    );
  }

  const { data, error } = await supabase.rpc("get_current_crowd_levels", {
    window_minutes: CROWD_WINDOW_MINUTES,
  });

  if (error) throw new Error(error.message);

  const levelsByZone = new Map<string, CrowdLevel>();
  for (const row of (data ?? []) as Array<Record<string, unknown>>) {
    const zoneId = String(row.zone_id ?? "");
    if (!zoneId) continue;
    const uniqueDevices = Number(row.unique_devices ?? 0);
    const label = crowdLevelForCount(uniqueDevices);
    const lastSeenAt =
      typeof row.last_seen_at === "string" ? row.last_seen_at : null;
    levelsByZone.set(zoneId, {
      zone_id: zoneId,
      unique_devices: uniqueDevices,
      level: label,
      last_seen_at: lastSeenAt,
    });
  }

  return hotspots.map(
    (hotspot) => levelsByZone.get(hotspot.id) ?? toCrowdLevel(hotspot.id, 0, null)
  );
}

export async function checkNearbyStudySpotNow(): Promise<NearbyStudySpotResult> {
  const permission = await Location.requestForegroundPermissionsAsync();
  if (permission.status !== "granted") {
    throw new Error(
      Platform.OS === "web"
        ? "Location permission is needed to check nearby study spots."
        : "Foreground location permission is needed to check nearby study spots."
    );
  }

  const position = await Location.getCurrentPositionAsync({
    accuracy: Location.Accuracy.High,
  });

  const nearby = await findNearbyHotspot(position.coords);
  const closest = await findClosestHotspot(position.coords);
  if (nearby) {
    await handleHotspotDetection(nearby.hotspot).catch((error) => {
      console.warn("[crowdSense] snapshot failed during manual check:", error);
    });
  }
  return {
    nearby,
    closest,
    currentLocation: {
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
      accuracy:
        typeof position.coords.accuracy === "number"
          ? position.coords.accuracy
          : null,
    },
  };
}

export async function enableCrowdSense(): Promise<{
  backgroundActive: boolean;
  message?: string;
}> {
  // Step 1 is the only step that's allowed to throw. If the user denies
  // foreground permission we can't proceed at all.
  const foreground = await Location.requestForegroundPermissionsAsync();
  if (foreground.status !== "granted") {
    throw new Error("Foreground location permission is required to enable CrowdSense.");
  }

  // From here on, the user has granted foreground location — that's enough
  // to claim "enabled" from the app's perspective (the map view's nearby
  // checks only need foreground). Flip the storage flag IMMEDIATELY so
  // any later phone-only hiccup (Android background permission throwing,
  // task-already-running races on iOS, etc.) can't leave the flag false.
  // Every step below is best-effort, all errors swallowed.
  await setCrowdSenseEnabled(true);
  await ensureNotificationPermission().catch(() => false);

  if (Platform.OS === "web") {
    return {
      backgroundActive: false,
      message: "Background crowd sensing is mobile-only. Use Check nearby study spot now on web.",
    };
  }

  let backgroundActive = false;
  try {
    const background = await Location.requestBackgroundPermissionsAsync();
    if (background.status === "granted") {
      const alreadyStarted = await Location.hasStartedLocationUpdatesAsync(
        CROWDSENSE_LOCATION_TASK
      ).catch(() => false);

      if (alreadyStarted) {
        backgroundActive = true;
      } else {
        try {
          await Location.startLocationUpdatesAsync(CROWDSENSE_LOCATION_TASK, {
            accuracy: Location.Accuracy.Balanced,
            timeInterval: 5 * 60 * 1000,
            distanceInterval: 75,
            pausesUpdatesAutomatically: false,
            showsBackgroundLocationIndicator: true,
            foregroundService: {
              notificationTitle: "CySense CrowdSense",
              notificationBody:
                "CySense is using anonymous location snapshots for crowd estimates.",
            },
          });
          backgroundActive = true;
        } catch (e) {
          console.warn("[crowdSense] startLocationUpdatesAsync warning:", e);
        }
      }
    }
  } catch (e) {
    // requestBackgroundPermissionsAsync can throw outright on some phones
    // (Android in particular). Foreground is already granted and storage
    // flag is already set, so we degrade gracefully.
    console.warn("[crowdSense] requestBackgroundPermissionsAsync warning:", e);
  }

  return {
    backgroundActive,
    message: backgroundActive
      ? undefined
      : "Background permission was not granted. Manual nearby checks still work.",
  };
}

export async function disableCrowdSense(): Promise<void> {
  await setCrowdSenseEnabled(false);
  if (Platform.OS !== "web") {
    const started = await Location.hasStartedLocationUpdatesAsync(
      CROWDSENSE_LOCATION_TASK
    ).catch(() => false);
    if (started) {
      await Location.stopLocationUpdatesAsync(CROWDSENSE_LOCATION_TASK);
    }
  }
}

function defineCrowdSenseTask() {
  if (Platform.OS === "web") return;
  if (TaskManager.isTaskDefined(CROWDSENSE_LOCATION_TASK)) return;

  TaskManager.defineTask(CROWDSENSE_LOCATION_TASK, async ({ data, error }) => {
    if (error) {
      console.warn("[crowdSense] background task error:", error.message);
      return;
    }

    const enabled = await isCrowdSenseEnabled().catch(() => false);
    if (!enabled) return;

    const locations = (data as { locations?: Location.LocationObject[] } | null)?.locations ?? [];
    for (const location of locations) {
      const nearby = await findNearbyHotspot(location.coords);
      if (!nearby) continue;
      await handleHotspotDetection(
        nearby.hotspot,
        new Date(location.timestamp)
      ).catch((taskError) => {
        console.warn("[crowdSense] snapshot failed in background task:", taskError);
      });
    }
  });
}

defineCrowdSenseTask();

export async function getHotspotById(zoneId: string): Promise<Hotspot | null> {
  const hotspots = await listCrowdSenseHotspots();
  return hotspots.find((hotspot) => hotspot.id === zoneId) ?? null;
}
