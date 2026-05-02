import type { Location, Report, SensorySummary, UserPreferences } from "@/types";
import { summarizeReports } from "@/utils/sensoryScore";

export interface RankedLocation {
  location: Location;
  summary: SensorySummary;
  fit: number; // 0..100, higher = better match for user's preferences
  reasons: string[];
}

/**
 * Rank locations for recommendation. Combines:
 *  - Sensory comfort score (objective: how calm/usable is this place right now)
 *  - User preference fit (subjective: does it match what they want)
 */
export function rankLocations(
  locations: Location[],
  reportsByLocation: Map<string, Report[]>,
  prefs: UserPreferences
): RankedLocation[] {
  return locations
    .map((location) => {
      const summary = summarizeReports(reportsByLocation.get(location.id) ?? []);
      const { fit, reasons } = preferenceFit(summary, prefs);
      // Final ranking: 70% comfort, 30% personal fit. Comfort always matters,
      // but preferences tilt the order toward what the student wants.
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
      score += 8;
      if (prefs.preferQuiet && summary.noise <= 2) {
        score += 6;
        reasons.push("Currently quiet");
      }
    } else {
      score -= 12;
      reasons.push("Above your noise limit");
    }
  }

  if (summary.crowd != null) {
    if (summary.crowd <= prefs.maxCrowd) {
      score += 6;
      if (summary.crowd <= 2) reasons.push("Light crowd");
    } else {
      score -= 12;
      reasons.push("Above your crowd limit");
    }
  }

  if (prefs.preferSeating && summary.seating != null) {
    if (summary.seating >= 4) {
      score += 6;
      reasons.push("Plenty of seating");
    } else if (summary.seating <= 2) {
      score -= 6;
      reasons.push("Limited seating");
    }
  }

  if (prefs.preferLowLight && summary.lighting != null) {
    if (summary.lighting <= 3) {
      score += 4;
      reasons.push("Softer lighting");
    } else if (summary.lighting >= 5) {
      score -= 4;
      reasons.push("Bright lighting");
    }
  }

  return { fit: Math.max(0, Math.min(100, score)), reasons };
}
