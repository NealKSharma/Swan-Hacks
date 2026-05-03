import type { HourlyTrend, Report, SensorySummary, SensoryStatus } from "@/types";

/**
 * Compute a 0..100 "sensory comfort" score from averaged metrics.
 * Higher = calmer / more sensory-friendly.
 *
 * Reports now only carry noise + crowd. We weight noise heavier since it's
 * the more direct sensory factor for the audience the app is for.
 */
export function scoreFromAverages(input: {
  noise: number | null;
  crowd: number | null;
}): number {
  const { noise, crowd } = input;

  if (noise == null && crowd == null) {
    // No data at all. Return a neutral 60 so the location still ranks above
    // Busy/Loud locations.
    return 60;
  }

  // Each component is a 0..1 "comfort" signal. 1 = best (quiet, empty).
  const cNoise = noise == null ? 0.6 : 1 - clamp01((noise - 1) / 4);
  const cCrowd = crowd == null ? 0.6 : 1 - clamp01((crowd - 1) / 4);

  // Noise 60%, crowd 40%.
  const weighted = cNoise * 0.6 + cCrowd * 0.4;

  return Math.round(weighted * 100);
}

export function statusFromScore(score: number): SensoryStatus {
  if (score >= 75) return "Quiet";
  if (score >= 55) return "Moderate";
  if (score >= 35) return "Busy";
  return "Loud";
}

export function summarizeReports(reports: Report[]): SensorySummary {
  const count = reports.length;
  if (count === 0) {
    const score = scoreFromAverages({ noise: null, crowd: null });
    return {
      status: statusFromScore(score),
      score,
      noise: null,
      crowd: null,
      reportCount: 0,
      lastReportedAt: null,
    };
  }

  const avg = (key: "noise_level" | "crowd_level") =>
    reports.reduce((sum, r) => sum + r[key], 0) / count;

  const noise = avg("noise_level");
  const crowd = avg("crowd_level");
  const score = scoreFromAverages({ noise, crowd });

  const lastReportedAt = reports
    .map((r) => r.created_at)
    .sort()
    .at(-1)!;

  return {
    status: statusFromScore(score),
    score,
    noise,
    crowd,
    reportCount: count,
    lastReportedAt,
  };
}

export function summarizeTrendForHour(
  trends: HourlyTrend[],
  dayOfWeek: number,
  hour: number
): SensorySummary | null {
  const t = trends.find((x) => x.day_of_week === dayOfWeek && x.hour === hour);
  if (!t) return null;
  const score = scoreFromAverages({
    noise: t.avg_noise,
    crowd: t.avg_crowd,
  });
  return {
    status: statusFromScore(score),
    score,
    noise: t.avg_noise,
    crowd: t.avg_crowd,
    reportCount: t.sample_count,
    lastReportedAt: null,
  };
}

function clamp01(n: number): number {
  return Math.max(0, Math.min(1, n));
}
