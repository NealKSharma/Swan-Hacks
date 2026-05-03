-- ============================================================
-- CySense — Hourly aggregate view for popular-times trends
-- Apply in Supabase SQL editor.
--
-- Replaces the client-side approach of pulling up to 5,000 raw
-- reports per location and bucketing in JavaScript. Postgres now
-- groups by (location_id, day_of_week, hour) and applies an
-- exponential age-decay weight so a noisy week from last semester
-- does not dominate the current week's signal.
--
-- Time constant: τ = 14 days (half-weight at ~10 days, ~5% weight
-- at ~6 weeks). Tune the divisor below if you want a different feel.
-- ============================================================

drop view if exists public.location_hourly_aggregates cascade;

create view public.location_hourly_aggregates as
select
  r.location_id,
  extract(dow  from r.created_at)::smallint as day_of_week,  -- 0=Sun..6=Sat
  extract(hour from r.created_at)::smallint as hour,         -- 0..23
  -- Exponential recency decay: weight = exp(-age_days / 14)
  sum(r.noise_level::numeric * exp(-extract(epoch from (now() - r.created_at)) / (14.0 * 86400)))
    / nullif(
        sum(exp(-extract(epoch from (now() - r.created_at)) / (14.0 * 86400))),
        0
      ) as avg_noise,
  sum(r.crowd_level::numeric * exp(-extract(epoch from (now() - r.created_at)) / (14.0 * 86400)))
    / nullif(
        sum(exp(-extract(epoch from (now() - r.created_at)) / (14.0 * 86400))),
        0
      ) as avg_crowd,
  -- Effective sample count after decay — surfaces "this hour is well-attested"
  -- vs "this hour has one stale report" so the client can decide how much to
  -- trust the cell.
  sum(exp(-extract(epoch from (now() - r.created_at)) / (14.0 * 86400)))::numeric
    as effective_samples,
  count(*)::integer as sample_count
from public.reports r
group by r.location_id, day_of_week, hour;

comment on view public.location_hourly_aggregates is
  'Per-location, per-(weekday, hour) noise/crowd averages with exp(-age/14d) decay. '
  'Reads cleanly from the anon role thanks to the underlying reports SELECT policy.';
