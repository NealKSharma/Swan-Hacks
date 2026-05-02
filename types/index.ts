export type Level = 1 | 2 | 3 | 4 | 5;

export type LocationCategory =
  | "Library"
  | "Academic"
  | "Student Union"
  | "Dining"
  | "Recreation"
  | "Outdoor";

export interface Location {
  id: string;
  slug: string;
  name: string;
  category: LocationCategory | string;
  description: string | null;
  latitude: number | null;
  longitude: number | null;
  accessibility_notes: string | null;
  created_at: string;
}

export interface Report {
  id: string;
  location_id: string;
  noise_level: Level;
  crowd_level: Level;
  seating_level: Level;
  lighting_level: Level;
  comment: string | null;
  anonymous_session_id: string | null;
  created_at: string;
}

export type NewReport = Omit<Report, "id" | "created_at">;

export interface HourlyTrend {
  id: string;
  location_id: string;
  day_of_week: number; // 0=Sun, 6=Sat
  hour: number; // 0-23
  avg_noise: number | null;
  avg_crowd: number | null;
  avg_seating: number | null;
  avg_lighting: number | null;
  sample_count: number;
}

export type SensoryStatus = "Quiet" | "Moderate" | "Busy" | "Overstimulating";

export interface SensorySummary {
  status: SensoryStatus;
  score: number; // 0..100, higher = calmer / more sensory-friendly
  noise: number | null;
  crowd: number | null;
  seating: number | null;
  lighting: number | null;
  reportCount: number;
  lastReportedAt: string | null;
}

export interface UserPreferences {
  maxNoise: Level;
  maxCrowd: Level;
  preferQuiet: boolean;
  preferSeating: boolean;
  preferLowLight: boolean;
}

export const DEFAULT_PREFERENCES: UserPreferences = {
  maxNoise: 3,
  maxCrowd: 3,
  preferQuiet: true,
  preferSeating: true,
  preferLowLight: false,
};
