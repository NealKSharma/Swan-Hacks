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
    max(s.time_bucket) as last_seen_at
  from public.crowdsense_snapshots s
  where s.time_bucket >= now() - make_interval(mins => greatest(window_minutes, 1))
  group by s.zone_id;
$$;

grant execute on function public.get_current_crowd_levels(integer) to anon, authenticated;
