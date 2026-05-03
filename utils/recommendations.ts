import type { Location, Report, SensorySummary, UserPreferences } from "@/types";
import { summarizeReports } from "@/utils/sensoryScore";

export interface RankedLocation {
  location: Location;
  summary: SensorySummary;
  fit: number; // 0..100, higher = better match for user's preferences
  reasons: string[];
}

export function rankLocations(
  locations: Location[],
  reportsByLocation: Map<string, Report[]>,
  prefs: UserPreferences
): RankedLocation[] {
  return locations
    .map((location) => {
      const summary = summarizeReports(reportsByLocation.get(location.id) ?? []);
      const { fit, reasons } = preferenceFit(summary, prefs);
      const blended = Math.round(summary.score * 0.7 + fit * 0.3);
      return { location, summary, fit: blended, reasons };
    })
    .sort((a, b) => b.fit - a.fit);
}

function preferenceFit(
  summary: SensorySummary,
  prefs: UserPreferences
): { fit: number; reasons: string[] } {
  let score = 70;
  const reasons: string[] = [];

  if (summary.noise != null) {
    if (summary.noise <= prefs.maxNoise) {
      score += 10;
      if (prefs.preferQuiet && summary.noise <= 2) {
        score += 8;
        reasons.push("Currently quiet");
      }
    } else {
      score -= 14;
      reasons.push("Above your noise limit");
    }
  }

  if (summary.crowd != null) {
    if (summary.crowd <= prefs.maxCrowd) {
      score += 8;
      if (summary.crowd <= 2) reasons.push("Light crowd");
    } else {
      score -= 14;
      reasons.push("Above your crowd limit");
    }
  }

  return { fit: Math.max(0, Math.min(100, score)), reasons };
}
