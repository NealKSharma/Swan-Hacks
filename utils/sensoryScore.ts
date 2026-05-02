import type { HourlyTrend, Report, SensorySummary, SensoryStatus } from "@/types";

/**
 * Compute a 0..100 "sensory comfort" score from averaged metrics.
 * Higher = calmer / more sensory-friendly.
 *
 * Weights chosen so that noise and crowd dominate (sensory dealbreakers),
 * seating contributes meaningfully (rest is essential), and lighting nudges.
 */
export function scoreFromAverages(input: {
  noise: number | null;
  crowd: number | null;
  seating: number | null;
  lighting: number | null;
}): number {
  const { noise, crowd, seating, lighting } = input;

  // If we have no data at all, return a neutral 60 (Moderate-leaning Quiet).
  if (
    noise == null &&
    crowd == null &&
    seating == null &&
    lighting == null
  ) {
    return 60;
  }

  // Each component contributes a 0..1 "comfort" signal where 1 is best.
  // High noise/crowd hurt; low seating hurts; very high lighting is mildly worse.
  const c = {
    noise:    noise == null    ? 0.6 : 1 - clamp01((noise - 1) / 4),
    crowd:    crowd == null    ? 0.6 : 1 - clamp01((crowd - 1) / 4),
    seating:  seating == null  ? 0.6 : clamp01((seating - 1) / 4),
    lighting: lighting == null ? 0.7 : 1 - 0.5 * Math.max(0, (lighting - 3) / 2),
  };

  // Weights sum to 1.
  const weighted =
    c.noise * 0.40 +
    c.crowd * 0.30 +
    c.seating * 0.20 +
    c.lighting * 0.10;

  return Math.round(weighted * 100);
}

export function statusFromScore(score: number): SensoryStatus {
  if (score >= 75) return "Quiet";
  if (score >= 55) return "Moderate";
  if (score >= 35) return "Busy";
  return "Overstimulating";
}

export function summarizeReports(reports: Report[]): SensorySummary {
  const count = reports.length;
  if (count === 0) {
    const score = scoreFromAverages({
      noise: null,
      crowd: null,
      seating: null,
      lighting: null,
    });
    return {
      status: statusFromScore(score),
      score,
      noise: null,
      crowd: null,
      seating: null,
      lighting: null,
      reportCount: 0,
      lastReportedAt: null,
    };
  }

  const avg = (key: keyof Report) =>
    reports.reduce((sum, r) => sum + (r[key] as number), 0) / count;

  const noise = avg("noise_level");
  const crowd = avg("crowd_level");
  const seating = avg("seating_level");
  const lighting = avg("lighting_level");
  const score = scoreFromAverages({ noise, crowd, seating, lighting });

  const lastReportedAt = reports
    .map((r) => r.created_at)
    .sort()
    .at(-1)!;

  return {
    status: statusFromScore(score),
    score,
    noise,
    crowd,
    seating,
    lighting,
    reportCount: count,
    lastReportedAt,
  };
}

export function summarizeTrendForHour(
  trends: HourlyTrend[],
  dayOfWeek: number,
  hour: number
): SensorySummary | null {
  const t = trends.find(
    (x) => x.day_of_week === dayOfWeek && x.hour === hour
  );
  if (!t) return null;
  const score = scoreFromAverages({
    noise: t.avg_noise,
    crowd: t.avg_crowd,
    seating: t.avg_seating,
    lighting: t.avg_lighting,
  });
  return {
    status: statusFromScore(score),
    score,
    noise: t.avg_noise,
    crowd: t.avg_crowd,
    seating: t.avg_seating,
    lighting: t.avg_lighting,
    reportCount: t.sample_count,
    lastReportedAt: null,
  };
}

function clamp01(n: number): number {
  return Math.max(0, Math.min(1, n));
}
