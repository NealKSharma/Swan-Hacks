// Centralized icon system.
//
// CONTENT ICONS (status-*, metric-*, chevron-right) are sourced from SVG files
// in assets/icons/ — drop a same-named SVG in that folder to swap any of them.
//
// TAB ICONS (tab-*) are currently inline Lucide-style stroke paths so the
// bottom bar looks finished without extra files. To swap to your own SVGs:
//   1. Drop home.svg / spaces.svg / preferences.svg / about.svg in
//      assets/icons/
//   2. Reply "tabs done" and I'll switch to file imports here.

import { ComponentType } from "react";
import Svg, { Path, SvgProps } from "react-native-svg";

import StatusQuiet from "@/assets/icons/status-quiet.svg";
import StatusModerate from "@/assets/icons/status-moderate.svg";
import StatusBusy from "@/assets/icons/status-busy.svg";
import StatusLoud from "@/assets/icons/status-loud.svg";
import MetricNoise from "@/assets/icons/metric-noise.svg";
import MetricCrowd from "@/assets/icons/metric-crowd.svg";
import MetricSeating from "@/assets/icons/metric-seating.svg";
import MetricLighting from "@/assets/icons/metric-lighting.svg";
import ChevronRight from "@/assets/icons/chevron-right.svg";

export type IconName =
  | "status-quiet"
  | "status-moderate"
  | "status-busy"
  | "status-loud"
  | "metric-noise"
  | "metric-crowd"
  | "metric-seating"
  | "metric-lighting"
  | "chevron-right"
  | "tab-home"
  | "tab-spaces"
  | "tab-preferences"
  | "tab-about";

interface IconProps {
  name: IconName;
  size?: number;
  color?: string;
}

export function Icon({ name, size = 20, color = "#1A1F2A" }: IconProps) {
  if (name in FILE_ICONS) {
    const Component = FILE_ICONS[name as keyof typeof FILE_ICONS];
    return <Component width={size} height={size} color={color} />;
  }
  const Inline = INLINE_ICONS[name as keyof typeof INLINE_ICONS];
  return <Inline size={size} color={color} />;
}

const FILE_ICONS = {
  "status-quiet": StatusQuiet,
  "status-moderate": StatusModerate,
  "status-busy": StatusBusy,
  "status-loud": StatusLoud,
  "metric-noise": MetricNoise,
  "metric-crowd": MetricCrowd,
  "metric-seating": MetricSeating,
  "metric-lighting": MetricLighting,
  "chevron-right": ChevronRight,
} as const;

interface InlineProps {
  size: number;
  color: string;
}

function svgBase(p: InlineProps) {
  return {
    width: p.size,
    height: p.size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: p.color,
    strokeWidth: 2 as const,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };
}

// Lucide: home
const TabHome: ComponentType<InlineProps> = (p) => (
  <Svg {...svgBase(p)}>
    <Path d="M3 9.5 12 3l9 6.5V20a1 1 0 0 1-1 1h-5v-7h-6v7H4a1 1 0 0 1-1-1Z" />
  </Svg>
);

// Lucide: compass-style "spaces" / explore
const TabSpaces: ComponentType<InlineProps> = (p) => (
  <Svg {...svgBase(p)}>
    <Path d="M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z" />
    <Path d="m16.24 7.76-2.12 6.36-6.36 2.12 2.12-6.36 6.36-2.12Z" />
  </Svg>
);

// Lucide: sliders-horizontal
const TabPreferences: ComponentType<InlineProps> = (p) => (
  <Svg {...svgBase(p)}>
    <Path d="M21 4H14" />
    <Path d="M10 4H3" />
    <Path d="M21 12h-9" />
    <Path d="M8 12H3" />
    <Path d="M21 20h-7" />
    <Path d="M10 20H3" />
    <Path d="M14 2v4" />
    <Path d="M8 10v4" />
    <Path d="M14 18v4" />
  </Svg>
);

// Lucide: info
const TabAbout: ComponentType<InlineProps> = (p) => (
  <Svg {...svgBase(p)}>
    <Path d="M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z" />
    <Path d="M12 16v-4" />
    <Path d="M12 8h.01" />
  </Svg>
);

const INLINE_ICONS = {
  "tab-home": TabHome,
  "tab-spaces": TabSpaces,
  "tab-preferences": TabPreferences,
  "tab-about": TabAbout,
} as const;
