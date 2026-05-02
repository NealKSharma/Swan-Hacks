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

-- Hourly trends --------------------------------------------------
-- Seeds a typical weekday curve. Demonstrates the "popular times" UI.
-- We insert for day_of_week = 1..5 (Mon-Fri) only; weekends left empty for the MVP.
do $$
declare
  loc record;
  d   smallint;
  h   smallint;
  base_crowd numeric;
  base_noise numeric;
  base_seat  numeric;
  base_light numeric;
begin
  for loc in select id, category from public.locations loop
    for d in 1..5 loop
      for h in 8..21 loop
        -- Build a smooth daytime curve peaking around lunch and late afternoon.
        base_crowd := 1 + 4 * exp(-((h-13)::numeric ^ 2) / 18);
        base_noise := 1 + 3.5 * exp(-((h-13)::numeric ^ 2) / 22);
        base_seat  := greatest(1, 5 - 0.6 * base_crowd);
        base_light := case when h between 10 and 16 then 4 else 3 end;

        -- Category nudges
        if loc.category = 'Library' then
          base_noise := base_noise * 0.55;
          base_crowd := base_crowd * 0.85;
        elsif loc.category = 'Dining' then
          base_crowd := least(5, base_crowd + (case when h in (12,18) then 1.2 else 0 end));
          base_noise := least(5, base_noise + (case when h in (12,18) then 1.0 else 0 end));
          base_seat  := greatest(1, base_seat - (case when h in (12,18) then 1.5 else 0 end));
        elsif loc.category = 'Recreation' then
          base_crowd := least(5, base_crowd + (case when h in (17,18,19) then 1.2 else 0 end));
          base_noise := least(5, base_noise + 0.5);
        elsif loc.category = 'Outdoor' then
          base_light := case when h between 11 and 15 then 5 else base_light end;
        end if;

        insert into public.location_hourly_trends
          (location_id, day_of_week, hour, avg_noise, avg_crowd, avg_seating, avg_lighting, sample_count)
        values
          (loc.id, d, h,
           round(least(5, greatest(1, base_noise))::numeric, 2),
           round(least(5, greatest(1, base_crowd))::numeric, 2),
           round(least(5, greatest(1, base_seat))::numeric, 2),
           round(least(5, greatest(1, base_light))::numeric, 2),
           20)
        on conflict (location_id, day_of_week, hour) do nothing;
      end loop;
    end loop;
  end loop;
end $$;
