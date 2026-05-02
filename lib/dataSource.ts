// Single read/write surface for the rest of the app. Chooses between
// Supabase and mock data based on whether env vars are configured. The
// rest of the codebase never has to know which one is active.

import { getSupabase, supabaseConfigured } from "@/lib/supabase";
import {
  MOCK_LOCATIONS,
  MOCK_REPORTS,
  MOCK_TRENDS,
} from "@/constants/campusLocations";
import type { HourlyTrend, Location, NewReport, Report } from "@/types";

export const dataSourceMode: "supabase" | "mock" = supabaseConfigured
  ? "supabase"
  : "mock";

// In-memory store so submitted reports show up immediately in mock mode.
const mockReports: Report[] = [...MOCK_REPORTS];

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
  withinMinutes = 90,
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
  withinMinutes = 90
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
    return MOCK_TRENDS.filter((t) => t.location_id === locationId);
  }
  const { data, error } = await sb
    .from("location_hourly_trends")
    .select("*")
    .eq("location_id", locationId);
  if (error) {
    console.warn("[dataSource] listTrends failed:", error.message);
    return [];
  }
  return (data ?? []) as HourlyTrend[];
}

export async function submitReport(report: NewReport): Promise<Report> {
  const sb = getSupabase();
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
