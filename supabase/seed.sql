-- ============================================================
-- CySense — Seed data for Iowa State University
-- Run after schema.sql.
-- ============================================================

-- Locations -----------------------------------------------------
insert into public.locations (slug, name, category, description, latitude, longitude, accessibility_notes)
values
  ('parks-library', 'Parks Library', 'Library',
   'Central campus library with quiet study floors, group rooms, and 24-hour access during the semester.',
   42.0273, -93.6498,
   'Step-free entry on the south side. Elevators to all floors. Quiet floors available on 3rd and 4th levels.'),

  ('student-innovation-center', 'Student Innovation Center', 'Academic',
   'Modern, light-filled academic and maker space with abundant lounge seating and bookable rooms.',
   42.0264, -93.6521,
   'Step-free entry on east side. Elevators throughout. Wide hallways and quiet nooks on upper floors.'),

  ('memorial-union', 'Memorial Union', 'Student Union',
   'Student union with food court, lounges, bowling, and event spaces. Busy mid-day.',
   42.0247, -93.6450,
   'Multiple step-free entrances. Elevators to all floors. Quieter lounges on upper levels.'),

  ('gerdin-business-building', 'Gerdin Business Building', 'Academic',
   'Ivy College of Business building with central atrium and breakout study areas.',
   42.0265, -93.6535,
   'Step-free entries on north and south sides. Elevators available.'),

  ('troxel-hall', 'Troxel Hall', 'Academic',
   'Lecture-focused academic building. Lobby and adjacent corridors are usually calm between classes.',
   42.0249, -93.6493,
   'Step-free entry. Elevator access. Lobby seating near windows.'),

  ('friley-windows', 'Friley Windows Dining Center', 'Dining',
   'West-side dining hall in Friley Hall. Loud during meal rushes.',
   42.0237, -93.6517,
   'Step-free entry. Booth and table seating. Trays accessible at lower height.'),

  ('state-gym', 'State Gym', 'Recreation',
   'Recreation center with cardio, weights, courts, and pool. High noise during peak hours.',
   42.0260, -93.6541,
   'Step-free entry. Elevators to upper floors. Adaptive equipment available — ask at the desk.'),

  ('design-building', 'College of Design', 'Academic',
   'Open studio spaces and a cafe. Sound carries between floors.',
   42.0294, -93.6555,
   'Step-free entry. Elevators throughout. Quieter pockets on upper studio floors.'),

  ('howe-hall', 'Howe Hall', 'Academic',
   'Aerospace engineering building with auditoriums and a calm 2nd-floor lounge.',
   42.0299, -93.6510,
   'Step-free entries. Elevator near central staircase.'),

  ('curtiss-hall', 'Curtiss Hall', 'Academic',
   'Historic building anchoring central campus. Lobby is a popular meeting spot.',
   42.0265, -93.6481,
   'Step-free entry on north side. Elevator available.'),

  ('lagomarcino-hall', 'Lagomarcino Hall', 'Academic',
   'Education and psychology building with courtyard and quiet corridor lounges.',
   42.0263, -93.6470,
   'Step-free entry. Elevators throughout. Outdoor courtyard seating.'),

  ('central-campus', 'Central Campus', 'Outdoor',
   'Open green space at the heart of campus. Calm in the morning, busy mid-day in nice weather.',
   42.0265, -93.6485,
   'Paved paths throughout. Benches at intervals. No covered shelter — weather-dependent.')
on conflict (slug) do nothing;

update public.locations
set
  booking_url = 'https://sictr-iastate.libcal.com/spaces?lid=15606',
  libcal_lid = 15606,
  libcal_gid = 38061,
  libcal_capacity = 0
where slug = 'student-innovation-center';
