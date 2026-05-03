// Mock data used when Supabase isn't configured. Mirrors the shape of the
// real Supabase tables so the rest of the app can be data-source-agnostic.

import type { Location, Report } from "@/types";

const ISO_NOW = () => new Date().toISOString();

const minutesAgo = (m: number) =>
  new Date(Date.now() - m * 60_000).toISOString();

export const MOCK_LOCATIONS: Location[] = [
  {
    id: "loc-parks",
    slug: "parks-library",
    name: "Parks Library",
    category: "Library",
    description:
      "Central campus library with quiet study floors, group rooms, and 24-hour access during the semester.",
    latitude: 42.0273,
    longitude: -93.6498,
    accessibility_notes:
      "Step-free entry on the south side. Elevators to all floors. Quiet floors on 3rd and 4th levels.",
    booking_url: "https://iastate.libcal.com/spaces?lid=14797",
    libcal_lid: 14797,
    libcal_gid: 0,
    libcal_capacity: 0,
    hotspot_radius_meters: 65,
    created_at: ISO_NOW(),
  },
  {
    id: "loc-sic",
    slug: "student-innovation-center",
    name: "Student Innovation Center",
    category: "Academic",
    description:
      "Modern, light-filled academic and maker space with abundant lounge seating and bookable rooms.",
    latitude: 42.0264,
    longitude: -93.6521,
    accessibility_notes:
      "Step-free entry on east side. Elevators throughout. Wide hallways and quiet nooks on upper floors.",
    booking_url:
      "https://sictr-iastate.libcal.com/spaces?lid=15606",
    libcal_lid: 15606,
    libcal_gid: 38061,
    libcal_capacity: 0,
    hotspot_radius_meters: 55,
    created_at: ISO_NOW(),
  },
  {
    id: "loc-mu",
    slug: "memorial-union",
    name: "Memorial Union",
    category: "Student Union",
    description:
      "Student union with food court, lounges, bowling, and event spaces. Busy mid-day.",
    latitude: 42.0247,
    longitude: -93.645,
    accessibility_notes:
      "Multiple step-free entrances. Elevators to all floors. Quieter lounges on upper levels.",
    hotspot_radius_meters: 80,
    created_at: ISO_NOW(),
  },
  {
    id: "loc-gerdin",
    slug: "gerdin-business-building",
    name: "Gerdin Business Building",
    category: "Academic",
    description:
      "Ivy College of Business building with central atrium and breakout study areas.",
    latitude: 42.0265,
    longitude: -93.6535,
    accessibility_notes: "Step-free entries on north and south sides. Elevators available.",
    hotspot_radius_meters: 50,
    created_at: ISO_NOW(),
  },
  {
    id: "loc-troxel",
    slug: "troxel-hall",
    name: "Troxel Hall",
    category: "Academic",
    description:
      "Lecture-focused academic building. Lobby and adjacent corridors are usually calm between classes.",
    latitude: 42.0249,
    longitude: -93.6493,
    accessibility_notes: "Step-free entry. Elevator access. Lobby seating near windows.",
    hotspot_radius_meters: 45,
    created_at: ISO_NOW(),
  },
  {
    id: "loc-friley",
    slug: "friley-windows",
    name: "Friley Windows Dining Center",
    category: "Dining",
    description: "West-side dining hall in Friley Hall. Loud during meal rushes.",
    latitude: 42.0237,
    longitude: -93.6517,
    accessibility_notes: "Step-free entry. Booth and table seating. Trays accessible at lower height.",
    hotspot_radius_meters: 60,
    created_at: ISO_NOW(),
  },
  {
    id: "loc-stategym",
    slug: "state-gym",
    name: "State Gym",
    category: "Recreation",
    description:
      "Recreation center with cardio, weights, courts, and pool. High noise during peak hours.",
    latitude: 42.026,
    longitude: -93.6541,
    accessibility_notes:
      "Step-free entry. Elevators to upper floors. Adaptive equipment available. Ask at the desk.",
    hotspot_radius_meters: 70,
    created_at: ISO_NOW(),
  },
  {
    id: "loc-design",
    slug: "design-building",
    name: "College of Design",
    category: "Academic",
    description: "Open studio spaces and a cafe. Sound carries between floors.",
    latitude: 42.0294,
    longitude: -93.6555,
    accessibility_notes: "Step-free entry. Elevators throughout. Quieter pockets on upper studio floors.",
    hotspot_radius_meters: 60,
    created_at: ISO_NOW(),
  },
  {
    id: "loc-howe",
    slug: "howe-hall",
    name: "Howe Hall",
    category: "Academic",
    description: "Aerospace engineering building with auditoriums and a calm 2nd-floor lounge.",
    latitude: 42.0299,
    longitude: -93.651,
    accessibility_notes: "Step-free entries. Elevator near central staircase.",
    hotspot_radius_meters: 50,
    created_at: ISO_NOW(),
  },
  {
    id: "loc-curtiss",
    slug: "curtiss-hall",
    name: "Curtiss Hall",
    category: "Academic",
    description: "Historic building anchoring central campus. Lobby is a popular meeting spot.",
    latitude: 42.0265,
    longitude: -93.6481,
    accessibility_notes: "Step-free entry on north side. Elevator available.",
    hotspot_radius_meters: 55,
    created_at: ISO_NOW(),
  },
  {
    id: "loc-lago",
    slug: "lagomarcino-hall",
    name: "Lagomarcino Hall",
    category: "Academic",
    description:
      "Education and psychology building with courtyard and quiet corridor lounges.",
    latitude: 42.0263,
    longitude: -93.647,
    accessibility_notes: "Step-free entry. Elevators throughout. Outdoor courtyard seating.",
    hotspot_radius_meters: 55,
    created_at: ISO_NOW(),
  },
  {
    id: "loc-central",
    slug: "central-campus",
    name: "Central Campus",
    category: "Outdoor",
    description:
      "Open green space at the heart of campus. Calm in the morning, busy mid-day in nice weather.",
    latitude: 42.0265,
    longitude: -93.6485,
    accessibility_notes:
      "Paved paths throughout. Benches at intervals. No covered shelter; weather-dependent.",
    hotspot_radius_meters: 90,
    created_at: ISO_NOW(),
  },
];

// A handful of recent reports per location to make the demo feel alive.
// Quieter places (library, lago) have low noise/crowd; busy places (MU, gym, dining) skew high.
export const MOCK_REPORTS: Report[] = [
  // Parks Library — currently busy/noisy
  r("loc-parks", 4, 4, 8),
  r("loc-parks", 3, 4, 22),
  r("loc-parks", 4, 5, 35),

  // SIC — currently calm
  r("loc-sic", 2, 2, 6),
  r("loc-sic", 1, 2, 19),
  r("loc-sic", 2, 1, 41),

  // Memorial Union — moderate
  r("loc-mu", 3, 3, 12),
  r("loc-mu", 4, 4, 30),

  // Gerdin
  r("loc-gerdin", 2, 3, 14),
  r("loc-gerdin", 2, 2, 28),

  // Troxel
  r("loc-troxel", 1, 1, 10),

  // Friley dining — very busy
  r("loc-friley", 5, 5, 7),
  r("loc-friley", 4, 5, 25),

  // State Gym — loud
  r("loc-stategym", 5, 4, 9),
  r("loc-stategym", 4, 5, 33),

  // Design — moderate, sound-carrying
  r("loc-design", 3, 3, 16),

  // Howe — calm
  r("loc-howe", 2, 1, 11),

  // Curtiss — moderate
  r("loc-curtiss", 3, 3, 26),

  // Lago — quiet
  r("loc-lago", 1, 2, 13),

  // Central campus — moderate
  r("loc-central", 2, 3, 17),
];

function r(
  location_id: string,
  noise: number,
  crowd: number,
  agoMin: number
): Report {
  return {
    id: `mock-report-${location_id}-${agoMin}`,
    location_id,
    noise_level: noise as Report["noise_level"],
    crowd_level: crowd as Report["crowd_level"],
    anonymous_session_id: null,
    created_at: minutesAgo(agoMin),
  };
}
