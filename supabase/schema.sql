-- ============================================================
-- CySense — Supabase schema
-- Paste into Supabase SQL editor and run.
-- Designed for crowdsourced, anonymous, privacy-preserving reports.
-- ============================================================

-- Extensions ------------------------------------------------
create extension if not exists "pgcrypto";

-- Tables ----------------------------------------------------

create table if not exists public.locations (
  id            uuid primary key default gen_random_uuid(),
  slug          text not null unique,
  name          text not null,
  category      text not null,                 -- e.g. "Library", "Dining", "Academic"
  description   text,
  latitude      double precision,
  longitude     double precision,
  accessibility_notes text,
  booking_url   text,
  libcal_lid    integer,
  libcal_gid    integer,
  libcal_capacity integer,
  created_at    timestamptz not null default now()
);

alter table public.locations
  add column if not exists booking_url text,
  add column if not exists libcal_lid integer,
  add column if not exists libcal_gid integer,
  add column if not exists libcal_capacity integer;

create table if not exists public.reports (
  id                   uuid primary key default gen_random_uuid(),
  location_id          uuid not null references public.locations(id) on delete cascade,
  noise_level          smallint not null check (noise_level between 1 and 5),
  crowd_level          smallint not null check (crowd_level between 1 and 5),
  anonymous_session_id text,                   -- opaque, client-generated; never tied to identity
  created_at           timestamptz not null default now()
);
create index if not exists reports_location_recent_idx
  on public.reports (location_id, created_at desc);

create table if not exists public.location_hourly_trends (
  id            uuid primary key default gen_random_uuid(),
  location_id   uuid not null references public.locations(id) on delete cascade,
  day_of_week   smallint not null check (day_of_week between 0 and 6), -- 0=Sun
  hour          smallint not null check (hour between 0 and 23),
  avg_noise     numeric(3,2),
  avg_crowd     numeric(3,2),
  avg_seating   numeric(3,2),
  avg_lighting  numeric(3,2),
  sample_count  integer not null default 0,
  unique (location_id, day_of_week, hour)
);

-- Convenience view: most recent 1 hour of reports per location
create or replace view public.location_recent_status as
select
  l.id            as location_id,
  l.slug,
  l.name,
  l.category,
  count(r.id)     as report_count,
  avg(r.noise_level)::numeric(3,2)    as avg_noise,
  avg(r.crowd_level)::numeric(3,2)    as avg_crowd,
  max(r.created_at) as last_reported_at
from public.locations l
left join public.reports r
  on r.location_id = l.id
 and r.created_at >= now() - interval '1 hour'
group by l.id;

-- ============================================================
-- Row Level Security
-- ============================================================
alter table public.locations              enable row level security;
alter table public.reports                enable row level security;
alter table public.location_hourly_trends enable row level security;

-- Public read access (anonymous demo users)
drop policy if exists "locations are readable by anyone" on public.locations;
create policy "locations are readable by anyone"
  on public.locations for select
  using (true);

drop policy if exists "trends are readable by anyone" on public.location_hourly_trends;
create policy "trends are readable by anyone"
  on public.location_hourly_trends for select
  using (true);

drop policy if exists "reports are readable by anyone" on public.reports;
create policy "reports are readable by anyone"
  on public.reports for select
  using (true);

-- Anyone (anon role) can insert a report. We do NOT allow updates/deletes.
drop policy if exists "anyone can submit a report" on public.reports;
create policy "anyone can submit a report"
  on public.reports for insert
  with check (
    noise_level between 1 and 5
    and crowd_level between 1 and 5
  );
