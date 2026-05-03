create extension if not exists "pgcrypto";

alter table public.locations
  add column if not exists hotspot_radius_meters integer;

create table if not exists public.crowdsense_snapshots (
  id uuid primary key default gen_random_uuid(),
  zone_id text not null,
  time_bucket timestamptz not null,
  anon_device_id text not null,
  source text not null default 'crowdsense_snapshot',
  created_at timestamptz not null default now(),
  unique (zone_id, time_bucket, anon_device_id)
);

create index if not exists crowdsense_snapshots_zone_time_idx
  on public.crowdsense_snapshots (zone_id, time_bucket desc);

alter table public.crowdsense_snapshots enable row level security;

drop policy if exists "crowdsense snapshots are readable by anyone" on public.crowdsense_snapshots;
create policy "crowdsense snapshots are readable by anyone"
  on public.crowdsense_snapshots for select
  using (true);

drop policy if exists "anyone can submit crowd snapshots" on public.crowdsense_snapshots;
create policy "anyone can submit crowd snapshots"
  on public.crowdsense_snapshots for insert
  with check (source = 'crowdsense_snapshot');

create or replace function public.get_current_crowd_levels(window_minutes integer default 15)
returns table (
  zone_id text,
  unique_devices bigint,
  level text,
  last_seen_at timestamptz
)
language sql
stable
as $$
  select
    s.zone_id,
    count(distinct s.anon_device_id) as unique_devices,
    case
      when count(distinct s.anon_device_id) <= 1 then 'Quiet'
      when count(distinct s.anon_device_id) <= 3 then 'Calm'
      when count(distinct s.anon_device_id) <= 8 then 'Busy'
      when count(distinct s.anon_device_id) <= 15 then 'Crowded'
      else 'Overcrowded'
    end as level,
    max(s.created_at) as last_seen_at
  from public.crowdsense_snapshots s
  where s.created_at >= now() - make_interval(mins => greatest(window_minutes, 1))
  group by s.zone_id;
$$;

grant execute on function public.get_current_crowd_levels(integer) to anon, authenticated;
