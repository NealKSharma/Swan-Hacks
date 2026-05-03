import type {
  CrowdLevel,
  CrowdLevelLabel,
  HourlyTrend,
  Report,
  SensorySummary,
  SensoryStatus,
} from "@/types";

export const LIVE_REPORT_WINDOW_MINUTES = 120;
export const REPORT_DECAY_HALF_LIFE_MINUTES = 45;
export const CROWDSENSE_CROWD_WEIGHT = 0.8;
export const MANUAL_CROWD_WEIGHT = 0.2;

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

export function summarizeReports(
  reports: Report[],
  now: Date = new Date(),
  crowdSenseLevel: CrowdLevel | null = null
): SensorySummary {
  const liveReports = reports.filter((report) => isLiveReport(report, now));
  const count = liveReports.length;
  if (count === 0) {
    const crowd = crowdSenseCrowdValue(crowdSenseLevel);
    const score = scoreFromAverages({ noise: null, crowd });
    return {
      status: statusFromScore(score),
      score,
      noise: null,
      crowd,
      reportCount: 0,
      lastReportedAt: null,
    };
  }

  const noise = timeWeightedAverage(liveReports, "noise_level", now);
  const manualCrowd = timeWeightedAverage(liveReports, "crowd_level", now);
  const crowd = blendedCrowdValue(manualCrowd, crowdSenseLevel);
  const score = scoreFromAverages({ noise, crowd });

  const lastReportedAt = liveReports
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

function blendedCrowdValue(
  manualCrowd: number | null,
  crowdSenseLevel: CrowdLevel | null
): number | null {
  const crowdSenseCrowd = crowdSenseCrowdValue(crowdSenseLevel);
  if (crowdSenseCrowd == null) return manualCrowd;
  if (manualCrowd == null) return crowdSenseCrowd;

  return (
    crowdSenseCrowd * CROWDSENSE_CROWD_WEIGHT +
    manualCrowd * MANUAL_CROWD_WEIGHT
  );
}

function crowdSenseCrowdValue(crowdSenseLevel: CrowdLevel | null): number | null {
  if (!crowdSenseLevel || crowdSenseLevel.last_seen_at == null) return null;
  return crowdLevelLabelValue(crowdSenseLevel.level);
}

function crowdLevelLabelValue(level: CrowdLevelLabel): number {
  switch (level) {
    case "Quiet":
      return 1;
    case "Calm":
      return 2;
    case "Busy":
      return 3;
    case "Crowded":
      return 4;
    case "Overcrowded":
      return 5;
  }
}

function isLiveReport(report: Report, now: Date): boolean {
  const reportedAtMs = new Date(report.created_at).getTime();
  if (Number.isNaN(reportedAtMs)) return false;

  const ageMinutes = Math.max(0, (now.getTime() - reportedAtMs) / 60_000);
  return ageMinutes <= LIVE_REPORT_WINDOW_MINUTES;
}

function timeWeightedAverage(
  reports: Report[],
  key: "noise_level" | "crowd_level",
  now: Date
): number | null {
  const nowMs = now.getTime();
  let weightedTotal = 0;
  let totalWeight = 0;

  for (const report of reports) {
    const reportedAtMs = new Date(report.created_at).getTime();
    if (Number.isNaN(reportedAtMs)) continue;

    const ageMinutes = Math.max(0, (nowMs - reportedAtMs) / 60_000);
    const weight = 0.5 ** (ageMinutes / REPORT_DECAY_HALF_LIFE_MINUTES);
    weightedTotal += report[key] * weight;
    totalWeight += weight;
  }

  if (totalWeight === 0) return null;
  return weightedTotal / totalWeight;
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
