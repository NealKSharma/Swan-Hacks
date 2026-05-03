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
const CROWD_SENSE_NOTIFIED_ONCE_KEY = "cysense.crowdSense.notifiedOnce";
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

async function hasSentCrowdSenseNotification(): Promise<boolean> {
  return (await AsyncStorage.getItem(CROWD_SENSE_NOTIFIED_ONCE_KEY)) === "true";
}

async function markCrowdSenseNotificationSent(): Promise<void> {
  await AsyncStorage.setItem(CROWD_SENSE_NOTIFIED_ONCE_KEY, "true");
}

async function notifyHotspotDetectedOnce(hotspot: Hotspot): Promise<boolean> {
  if (Platform.OS === "web") return false;
  if (await hasSentCrowdSenseNotification()) return false;

  const granted = await ensureNotificationPermission().catch(() => false);
  if (!granted) return false;

  await Notifications.scheduleNotificationAsync({
    content: {
      title: "CySense CrowdSense",
      body: `You are in ${hotspot.name}. Anonymous hotspot snapshot sent.`,
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds: 1,
      channelId: Platform.OS === "android" ? "crowdsense" : undefined,
    },
  });

  await markCrowdSenseNotificationSent();
  return true;
}

export function crowdLevelForCount(uniqueDevices: number): CrowdLevelLabel {
  if (uniqueDevices <= 1) return "Quiet";
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
  const notificationSent = await notifyHotspotDetectedOnce(hotspot);
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
  // This runs every time the user toggles CrowdSense on. The OS may only
  // show the permission dialog once, but we still verify consent each time.
  const foreground = await Location.requestForegroundPermissionsAsync();
  if (foreground.status !== "granted") {
    throw new Error("Foreground location permission is required to enable CrowdSense.");
  }

  await setCrowdSenseEnabled(true);
  await ensureNotificationPermission().catch(() => false);

  if (Platform.OS === "web") {
    return {
      backgroundActive: false,
      message: "Background crowd sensing is mobile-only. Use Check nearby study spot now on web.",
    };
  }

  const background = await Location.requestBackgroundPermissionsAsync();
  if (background.status !== "granted") {
    return {
      backgroundActive: false,
      message: "Background permission was not granted. Manual nearby checks still work.",
    };
  }

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

  return { backgroundActive: true };
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
