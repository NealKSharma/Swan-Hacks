// CySense theme.
//
// Calm, sensory-friendly base with cardinal red as the primary action color
// and gold as a secondary accent. The palette is intentionally restrained .
// most of the app is white and warm-neutral, with cardinal showing up only on
// CTAs, active states, and key emphasis.

export const colors = {
  // Surfaces
  background: "#FAF7F2",      // warm off-white
  surface: "#FFFFFF",
  surfaceMuted: "#F2EEE7",
  border: "#E8E2D6",

  // Text
  text: "#1A1F2A",
  textSubtle: "#5A6472",
  textMuted: "#8A93A0",

  // Sensory status (paired with icons + labels. never color-only)
  quiet: "#3F8F6E",
  moderate: "#C8A04A",
  busy: "#B86E3C",
  loud: "#9C2A39",

  // ISU accents
  cardinal: "#C8102E",          // primary action
  cardinalDeep: "#A50D26",      // pressed / strong text
  cardinalSoft: "#FBE5E8",      // subtle backgrounds, highlights
  gold: "#F1BE48",              // secondary accent
  goldSoft: "#FBF0D0",          // subtle accent backgrounds

  // Functional aliases. these used to point at a calm blue.
  // Now they map to cardinal so the whole app picks up the new primary.
  accent: "#C8102E",
  accentSoft: "#FBE5E8",
  success: "#3F8F6E",
  warning: "#C8A04A",
  danger: "#9C2A39",

  // Tab bar
  tabActive: "#C8102E",
  tabInactive: "#9CA3AF",
  tabBg: "#FFFFFF",
  tabBorder: "#EFEAE0",
};

export const radii = {
  sm: 8,
  md: 12,
  lg: 18,
  xl: 24,
  pill: 999,
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
};

export const typography = {
  display: { fontSize: 32, fontWeight: "700" as const, letterSpacing: -0.5 },
  title:   { fontSize: 22, fontWeight: "700" as const, letterSpacing: -0.2 },
  heading: { fontSize: 18, fontWeight: "600" as const },
  body:    { fontSize: 16, fontWeight: "400" as const, lineHeight: 22 },
  bodyStrong: { fontSize: 16, fontWeight: "600" as const, lineHeight: 22 },
  small:   { fontSize: 14, fontWeight: "400" as const, lineHeight: 19 },
  caption: { fontSize: 12, fontWeight: "500" as const, letterSpacing: 0.4 },
};

export const shadows = {
  card: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  hero: {
    shadowColor: "#9C2A39",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 18,
    elevation: 6,
  },
  tabBar: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.04,
    shadowRadius: 12,
    elevation: 8,
  },
};
