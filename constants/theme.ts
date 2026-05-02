// Calm, sensory-friendly palette with restrained ISU cardinal accents.
// Avoids saturated reds/yellows in large surfaces; uses cardinal only on
// CTAs/highlights. Backgrounds are warm off-whites with cool greys for text.

export const colors = {
  // Surfaces
  background: "#F6F4EE",      // warm off-white (parchment)
  surface: "#FFFFFF",
  surfaceMuted: "#EDEAE2",
  border: "#DEDAD0",

  // Text
  text: "#1F2530",            // near-black, slightly cool
  textSubtle: "#5A6472",
  textMuted: "#8A93A0",

  // Sensory status (paired with icons + labels — never color-only)
  quiet: "#3F8F6E",           // sage green
  moderate: "#C8A04A",        // muted amber/gold
  busy: "#B86E3C",            // burnt orange
  overstimulating: "#9C2A39", // deep cardinal-leaning red

  // ISU accents (used sparingly)
  cardinal: "#C8102E",
  cardinalSoft: "#F2DCE0",
  gold: "#F1BE48",

  // Functional
  accent: "#3E6B89",          // calm blue used for primary actions
  accentSoft: "#DDE7EE",
  success: "#3F8F6E",
  warning: "#C8A04A",
  danger: "#9C2A39",
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
  display: { fontSize: 28, fontWeight: "700" as const, letterSpacing: -0.4 },
  title:   { fontSize: 22, fontWeight: "700" as const, letterSpacing: -0.2 },
  heading: { fontSize: 18, fontWeight: "600" as const },
  body:    { fontSize: 16, fontWeight: "400" as const, lineHeight: 22 },
  bodyStrong: { fontSize: 16, fontWeight: "600" as const, lineHeight: 22 },
  small:   { fontSize: 14, fontWeight: "400" as const, lineHeight: 19 },
  caption: { fontSize: 12, fontWeight: "500" as const, letterSpacing: 0.2 },
};

export const shadows = {
  card: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
};
