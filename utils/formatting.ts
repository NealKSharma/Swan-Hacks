import type { IconName } from "@/components/Icon";

export function timeAgo(iso: string | null | undefined): string {
  if (!iso) return "No reports yet";
  const then = new Date(iso).getTime();
  const now = Date.now();
  const diffSec = Math.max(0, Math.round((now - then) / 1000));
  if (diffSec < 60) return "just now";
  const min = Math.round(diffSec / 60);
  if (min < 60) return `${min} min ago`;
  const hr = Math.round(min / 60);
  if (hr < 24) return `${hr} hr ago`;
  const d = Math.round(hr / 24);
  return `${d} day${d === 1 ? "" : "s"} ago`;
}

export function formatClockTime(iso: string | null | undefined): string {
  if (!iso) return "-";
  const value = new Date(iso);
  if (Number.isNaN(value.getTime())) return "-";
  return value.toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });
}

export function formatTimeRange(
  startIso: string | null | undefined,
  endIso: string | null | undefined
): string {
  return `${formatClockTime(startIso)} - ${formatClockTime(endIso)}`;
}

export function levelLabel(
  metric: "noise" | "crowd" | "seating" | "lighting",
  value: number | null
): string {
  if (value == null) return "N/A";
  const v = Math.round(value);
  switch (metric) {
    case "noise":
      return ["Silent", "Quiet", "Moderate", "Loud", "Deafening"][v - 1] ?? "";
    case "crowd":
      return ["Empty", "Calm", "Busy", "Crowded", "Overcrowded"][v - 1] ?? "N/A";
    case "seating":
      return ["None", "Few", "Some", "Plenty", "Wide open"][v - 1] ?? "N/A";
    case "lighting":
      return ["Dim", "Soft", "Even", "Bright", "Harsh"][v - 1] ?? "N/A";
  }
}

export function levelValueLabel(
  metric: "noise" | "crowd" | "seating" | "lighting",
  value: number | null
): string {
  if (value == null) return "N/A";
  return `${levelLabel(metric, value)} · ${value.toFixed(1)}/5`;
}

export function metricIconName(
  metric: "noise" | "crowd" | "seating" | "lighting"
): IconName {
  switch (metric) {
    case "noise":
      return "metric-noise";
    case "crowd":
      return "metric-crowd";
    case "seating":
      return "metric-seating";
    case "lighting":
      return "metric-lighting";
  }
}

