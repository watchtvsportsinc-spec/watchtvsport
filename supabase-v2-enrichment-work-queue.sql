-- WatchTVSport V2 enrichment work queue.
-- Tracks verified-profile/media work without publishing unverified values.

create table if not exists public.enrichment_tasks (
  id uuid primary key default gen_random_uuid(),
  entity_type text not null check (entity_type in ('participant','competition','venue','event','circuit','fighter')),
  entity_key text not null,
  task_kind text not null check (task_kind in ('profile_identity','official_website','social_links','home_venue','venue_capacity','team_logo','team_hero','competition_logo','venue_image','circuit_layout','fighter_photo','schedule_import','broadcast_verification')),
  status text not null default 'pending' check (status in ('pending','in_progress','blocked','verified','rejected')),
  priority smallint not null default 50 check (priority between 1 and 100),
  source_hint text,
  notes text,
  last_attempted_at timestamptz,
  verified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(entity_type, entity_key, task_kind)
);

create index if not exists enrichment_tasks_status_priority_idx
  on public.enrichment_tasks(status, priority desc, created_at);

alter table public.enrichment_tasks enable row level security;
drop policy if exists public_select_enrichment_tasks on public.enrichment_tasks;
create policy public_select_enrichment_tasks on public.enrichment_tasks for select using (false);

-- Internal operational view: obey caller RLS and never expose it to public clients.
create or replace view public.participant_profile_audit
with (security_invoker = true) as
select
  p.id as participant_id,
  s.slug as sport,
  p.slug,
  p.name,
  pp.profile_status,
  (pp.city is not null)::int + (pp.country_code is not null)::int + (pp.founded_year is not null)::int +
  (pp.venue_name is not null)::int + (pp.venue_capacity is not null)::int + (pp.official_website_url is not null)::int +
  (pp.instagram_url is not null)::int + (pp.x_url is not null)::int + (pp.facebook_url is not null)::int +
  (pp.youtube_url is not null)::int + (pp.tiktok_url is not null)::int as verified_field_count,
  pp.city is null as missing_city,
  pp.country_code is null as missing_country,
  pp.founded_year is null as missing_founded_year,
  pp.venue_name is null as missing_venue,
  pp.venue_capacity is null as missing_venue_capacity,
  pp.official_website_url is null as missing_official_website,
  not (pp.instagram_url is not null or pp.x_url is not null or pp.facebook_url is not null or pp.youtube_url is not null or pp.tiktok_url is not null) as missing_social_links,
  pp.logo_url is null as missing_logo,
  pp.hero_image_url is null as missing_hero,
  pp.last_verified_at,
  pp.next_review_at
from public.participants p
join public.sports s on s.id=p.sport_id
join public.participant_profiles pp on pp.participant_id=p.id
where p.is_active=true;

revoke all on table public.participant_profile_audit from PUBLIC, anon, authenticated;
grant select on table public.participant_profile_audit to service_role;

insert into public.enrichment_tasks(entity_type,entity_key,task_kind,priority,source_hint)
select 'participant', p.slug, 'profile_identity', 80,
  case s.slug
    when 'football' then 'official club or league site'
    when 'basketball' then 'NBA.com/team official site'
    when 'hockey' then 'NHL.com/team official site'
    when 'american-football' then 'NFL.com/team official site'
    else 'official participant site'
  end
from public.participants p
join public.sports s on s.id=p.sport_id
join public.participant_profiles pp on pp.participant_id=p.id
where p.is_active=true and (pp.city is null or pp.country_code is null or pp.founded_year is null)
on conflict(entity_type,entity_key,task_kind) do nothing;

insert into public.enrichment_tasks(entity_type,entity_key,task_kind,priority,source_hint)
select 'participant', p.slug, 'official_website', 75, 'official team/club site'
from public.participants p join public.participant_profiles pp on pp.participant_id=p.id
where p.is_active=true and pp.official_website_url is null
on conflict(entity_type,entity_key,task_kind) do nothing;

insert into public.enrichment_tasks(entity_type,entity_key,task_kind,priority,source_hint)
select 'participant', p.slug, 'social_links', 65, 'official team/club website social directory'
from public.participants p join public.participant_profiles pp on pp.participant_id=p.id
where p.is_active=true and not (pp.instagram_url is not null or pp.x_url is not null or pp.facebook_url is not null or pp.youtube_url is not null or pp.tiktok_url is not null)
on conflict(entity_type,entity_key,task_kind) do nothing;

insert into public.enrichment_tasks(entity_type,entity_key,task_kind,priority,source_hint)
select 'participant', p.slug, 'home_venue', 75, 'official team/league venue profile'
from public.participants p join public.participant_profiles pp on pp.participant_id=p.id
where p.is_active=true and pp.venue_name is null
on conflict(entity_type,entity_key,task_kind) do nothing;

insert into public.enrichment_tasks(entity_type,entity_key,task_kind,priority,source_hint)
select entity_type, entity_key,
  case asset_kind
    when 'team_logo' then 'team_logo'
    when 'competition_logo' then 'competition_logo'
    when 'league_logo' then 'competition_logo'
    when 'venue_image' then 'venue_image'
    when 'team_hero' then 'team_hero'
    when 'circuit_layout' then 'circuit_layout'
    when 'fighter_photo' then 'fighter_photo'
    else 'competition_logo'
  end,
  70,
  source_url
from public.media_assets
where verification_status='pending'
on conflict(entity_type,entity_key,task_kind) do nothing;
