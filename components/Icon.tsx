// Centralized icon system. Every icon is sourced from a file in assets/icons/
// (rendered via react-native-svg-transformer, configured in metro.config.js).
// Each SVG uses fill="currentColor" so the `color` prop tints the outer Svg
// and inner paths follow.

import { ComponentType } from "react";
import { SvgProps } from "react-native-svg";

import MetricNoise from "@/assets/icons/metric-noise.svg";
import MetricCrowd from "@/assets/icons/metric-crowd.svg";
import MetricSeating from "@/assets/icons/metric-seating.svg";
import MetricLighting from "@/assets/icons/metric-lighting.svg";
import ChevronRight from "@/assets/icons/chevron-right.svg";
import NavHome from "@/assets/icons/nav-home.svg";
import NavCompass from "@/assets/icons/nav-compass.svg";
import NavFilter from "@/assets/icons/nav-filter.svg";
import NavInfo from "@/assets/icons/nav-info.svg";

export type IconName =
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

const ICONS: Record<IconName, ComponentType<SvgProps>> = {
  "metric-noise": MetricNoise,
  "metric-crowd": MetricCrowd,
  "metric-seating": MetricSeating,
  "metric-lighting": MetricLighting,
  "chevron-right": ChevronRight,
  "tab-home": NavHome,
  "tab-spaces": NavCompass,
  "tab-preferences": NavFilter,
  "tab-about": NavInfo,
};

export function Icon({ name, size = 20, color = "#1A1F2A" }: IconProps) {
  const Component = ICONS[name];
  return <Component width={size} height={size} color={color} />;
}
