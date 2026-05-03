// Single read/write surface for the rest of the app. Chooses between
// Supabase and mock data based on whether env vars are configured. The
// rest of the codebase never has to know which one is active.

import { getSupabase, supabaseConfigured } from "@/lib/supabase";
import {
  MOCK_LOCATIONS,
  MOCK_REPORTS,
} from "@/constants/campusLocations";
import type { HourlyTrend, Location, NewReport, Report } from "@/types";
import { LIVE_REPORT_WINDOW_MINUTES } from "@/utils/sensoryScore";

export const dataSourceMode: "supabase" | "mock" = supabaseConfigured
  ? "supabase"
  : "mock";

// In-memory store so submitted reports show up immediately in mock mode.
const mockReports: Report[] = [...MOCK_REPORTS];

const trendCache = new Map<string, { dateKey: string; trends: HourlyTrend[] }>();

function todayCacheKey(): string {
  const now = new Date();
  return [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, "0"),
    String(now.getDate()).padStart(2, "0"),
  ].join("-");
}

export async function listLocations(): Promise<Location[]> {
  const sb = getSupabase();
  if (!sb) return MOCK_LOCATIONS;
  const { data, error } = await sb
    .from("locations")
    .select("*")
    .order("name");
  if (error) {
    console.warn("[dataSource] listLocations failed, falling back to mock:", error.message);
    return MOCK_LOCATIONS;
  }
  return (data ?? []) as Location[];
}

export async function getLocationBySlugOrId(
  slugOrId: string
): Promise<Location | null> {
  const sb = getSupabase();
  if (!sb) {
    return (
      MOCK_LOCATIONS.find((l) => l.slug === slugOrId || l.id === slugOrId) ??
      null
    );
  }
  // Try by slug first (QR codes use slugs), then by id.
  const { data: bySlug } = await sb
    .from("locations")
    .select("*")
    .eq("slug", slugOrId)
    .maybeSingle();
  if (bySlug) return bySlug as Location;
  const { data: byId } = await sb
    .from("locations")
    .select("*")
    .eq("id", slugOrId)
    .maybeSingle();
  return (byId as Location) ?? null;
}

export async function listRecentReports(
  locationId: string,
  withinMinutes = LIVE_REPORT_WINDOW_MINUTES,
  limit = 25
): Promise<Report[]> {
  const sb = getSupabase();
  const cutoff = Date.now() - withinMinutes * 60_000;
  if (!sb) {
    return mockReports
      .filter(
        (r) =>
          r.location_id === locationId &&
          new Date(r.created_at).getTime() >= cutoff
      )
      .sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      )
      .slice(0, limit);
  }
  const isoCutoff = new Date(cutoff).toISOString();
  const { data, error } = await sb
    .from("reports")
    .select("*")
    .eq("location_id", locationId)
    .gte("created_at", isoCutoff)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) {
    console.warn("[dataSource] listRecentReports failed:", error.message);
    return [];
  }
  return (data ?? []) as Report[];
}

export async function listAllRecentReports(
  withinMinutes = LIVE_REPORT_WINDOW_MINUTES
): Promise<Report[]> {
  const sb = getSupabase();
  const cutoff = Date.now() - withinMinutes * 60_000;
  if (!sb) {
    return mockReports
      .filter((r) => new Date(r.created_at).getTime() >= cutoff)
      .sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
  }
  const isoCutoff = new Date(cutoff).toISOString();
  const { data, error } = await sb
    .from("reports")
    .select("*")
    .gte("created_at", isoCutoff)
    .order("created_at", { ascending: false });
  if (error) {
    console.warn("[dataSource] listAllRecentReports failed:", error.message);
    return [];
  }
  return (data ?? []) as Report[];
}

export async function listTrends(locationId: string): Promise<HourlyTrend[]> {
  const sb = getSupabase();
  if (!sb) {
    return [];
  }

  // Popular-time history is derived from real reports. Postgres now does the
  // (day_of_week, hour) bucketing with exponential age-decay weighting via
  // the location_hourly_aggregates view (see migration 20260502_hourly_aggregates).
  // We cache the derived rows for the current local day so re-opening the same
  // location is free.
  const dateKey = todayCacheKey();
  const cached = trendCache.get(locationId);
  if (cached?.dateKey === dateKey) {
    return cached.trends;
  }

  const { data, error } = await sb
    .from("location_hourly_aggregates")
    .select("location_id, day_of_week, hour, avg_noise, avg_crowd, sample_count")
    .eq("location_id", locationId);

  if (!error && data) {
    const trends = (data as AggregateRow[]).map((row) => ({
      id: `agg-${locationId}-${row.day_of_week}-${row.hour}`,
      location_id: row.location_id,
      day_of_week: row.day_of_week,
      hour: row.hour,
      avg_noise: row.avg_noise == null ? null : roundTrendAverage(Number(row.avg_noise)),
      avg_crowd: row.avg_crowd == null ? null : roundTrendAverage(Number(row.avg_crowd)),
      avg_seating: null,
      avg_lighting: null,
      sample_count: row.sample_count ?? 0,
    }));
    trends.sort((a, b) => a.day_of_week - b.day_of_week || a.hour - b.hour);
    trendCache.set(locationId, { dateKey, trends });
    return trends;
  }

  // View missing or query failed (e.g. migration not yet applied) — fall back
  // to the legacy client-side bucketing so the histogram still renders.
  if (error) {
    console.warn(
      "[dataSource] location_hourly_aggregates unavailable, falling back to client bucketing:",
      error.message
    );
  }
  const { data: rawReports, error: rawErr } = await sb
    .from("reports")
    .select("id, location_id, noise_level, crowd_level, anonymous_session_id, created_at")
    .eq("location_id", locationId)
    .order("created_at", { ascending: false })
    .limit(5000);
  if (rawErr) {
    console.warn("[dataSource] listTrends fallback failed:", rawErr.message);
    return [];
  }
  const trends = buildHourlyTrendsFromReports(locationId, (rawReports ?? []) as Report[]);
  trendCache.set(locationId, { dateKey, trends });
  return trends;
}

interface AggregateRow {
  location_id: string;
  day_of_week: number;
  hour: number;
  avg_noise: number | string | null;
  avg_crowd: number | string | null;
  sample_count: number | null;
}

function buildHourlyTrendsFromReports(
  locationId: string,
  reports: Report[]
): HourlyTrend[] {
  const buckets = new Map<
    string,
    {
      dayOfWeek: number;
      hour: number;
      noiseTotal: number;
      crowdTotal: number;
      sampleCount: number;
    }
  >();

  for (const report of reports) {
    const reportedAt = new Date(report.created_at);
    if (Number.isNaN(reportedAt.getTime())) continue;

    // Group raw reports by weekday + hour. The screen can then run its simple
    // prediction pass over these database-derived averages.
    const dayOfWeek = reportedAt.getDay();
    const hour = reportedAt.getHours();
    const key = `${dayOfWeek}-${hour}`;
    const bucket = buckets.get(key) ?? {
      dayOfWeek,
      hour,
      noiseTotal: 0,
      crowdTotal: 0,
      sampleCount: 0,
    };

    bucket.noiseTotal += report.noise_level;
    bucket.crowdTotal += report.crowd_level;
    bucket.sampleCount += 1;
    buckets.set(key, bucket);
  }

  return Array.from(buckets.values())
    .map((bucket) => ({
      id: `report-trend-${locationId}-${bucket.dayOfWeek}-${bucket.hour}`,
      location_id: locationId,
      day_of_week: bucket.dayOfWeek,
      hour: bucket.hour,
      avg_noise: roundTrendAverage(bucket.noiseTotal / bucket.sampleCount),
      avg_crowd: roundTrendAverage(bucket.crowdTotal / bucket.sampleCount),
      avg_seating: null,
      avg_lighting: null,
      sample_count: bucket.sampleCount,
    }))
    .sort((a, b) => a.day_of_week - b.day_of_week || a.hour - b.hour);
}

function roundTrendAverage(value: number): number {
  return Math.round(value * 100) / 100;
}

export async function submitReport(report: NewReport): Promise<Report> {
  const sb = getSupabase();
  trendCache.delete(report.location_id);
  if (!sb) {
    const created: Report = {
      ...report,
      id: `mock-${Date.now()}`,
      created_at: new Date().toISOString(),
    };
    mockReports.unshift(created);
    return created;
  }
  const { data, error } = await sb
    .from("reports")
    .insert(report)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data as Report;
}
