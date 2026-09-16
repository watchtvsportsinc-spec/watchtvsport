-- WatchTVSport V2 automatic participant/team page foundation.
-- PREPARED MIGRATION ONLY: do not apply automatically.
--
-- The generic /sports/[sport]/club/[club] route already renders any eligible
-- participant present in Supabase. This migration makes every active club/team
-- discoverable through a bounded public directory and verifies that the
-- profile/visual creation triggers required for future inserts are installed.

begin;
set local search_path = public, pg_catalog;

-- Existing rows: every club-like participant must have the minimum records the
-- generic page needs, even when detailed editorial enrichment is still pending.
insert into public.participant_profiles(participant_id,country_code)
select p.id,p.country_code
from public.participants p
where p.participant_type in ('club','team','franchise','national_team')
on conflict(participant_id) do nothing;

insert into public.participant_visual_profiles(
  participant_id,render_family,primary_color,secondary_color,accent_color,
  pattern_style,visual_status,notes
)
select p.id,
       d.defaults->>'renderFamily',
       d.defaults->>'primaryColor',
       d.defaults->>'secondaryColor',
       d.defaults->>'accentColor',
       d.defaults->>'patternStyle',
       'generated',
       'Automatic WatchTVSport visual fallback. Palette/pattern should be verified against an official current kit or team identity source.'
from public.participants p
join public.sports s on s.id=p.sport_id
cross join lateral (
  select public.participant_visual_defaults(coalesce(s.public_slug,s.slug),p.country_code) as defaults
) d
where p.participant_type in ('club','team','franchise','national_team')
on conflict(participant_id) do nothing;

-- Do not silently apply this migration if the automatic creation layer has been
-- removed from the database. These triggers create/update profile and visual
-- rows whenever a participant is inserted or its relevant identity changes.
do $automation_guard$
begin
  if not exists (
    select 1 from pg_trigger
    where tgrelid='public.participants'::regclass
      and tgname='trg_ensure_participant_profile_row'
      and not tgisinternal
  ) then
    raise exception 'Missing trg_ensure_participant_profile_row automation trigger';
  end if;
  if not exists (
    select 1 from pg_trigger
    where tgrelid='public.participants'::regclass
      and tgname='participant_visual_profile_defaults'
      and not tgisinternal
  ) then
    raise exception 'Missing participant_visual_profile_defaults automation trigger';
  end if;
end;
$automation_guard$;

-- Bounded directory used by the sitemap. The application remains authoritative
-- about which sports allow team/club pages, so adding a future team sport to the
-- sports registry does not require changing this SQL function.
create or replace function public.get_public_participant_directory_v1()
returns jsonb
language sql
stable
security invoker
set search_path=public,pg_catalog
as $function$
  select jsonb_build_object(
    'schemaVersion',1,
    'participants',coalesce(jsonb_agg(jsonb_strip_nulls(jsonb_build_object(
      'id',x.id::text,
      'slug',x.slug,
      'name',x.name,
      'shortName',x.short_name,
      'participantType',x.participant_type,
      'sport',x.sport_slug,
      'countryCode',x.country_code
    )) order by x.sport_slug,x.slug),'[]'::jsonb)
  )
  from (
    select p.id,p.slug,p.name,p.short_name,p.participant_type,p.country_code,
           coalesce(s.public_slug,s.slug) as sport_slug
    from public.participants p
    join public.sports s on s.id=p.sport_id
    where p.is_active=true
      and p.participant_type in ('club','team','franchise','national_team')
      and nullif(btrim(p.slug),'') is not null
    order by coalesce(s.public_slug,s.slug),p.slug
    limit 5000
  ) x;
$function$;

revoke all on function public.get_public_participant_directory_v1() from public;
grant execute on function public.get_public_participant_directory_v1() to anon,authenticated;

-- Public media lookup. RLS on entity_media_assets already limits public reads to
-- approved assets; the function repeats that rule and only returns a usable URL.
-- Stable participant media key: participant:<sport-slug>:<participant-slug>.
create or replace function public.get_public_participant_media_v1(p_entity_id text)
returns jsonb
language sql
stable
security invoker
set search_path=public,pg_catalog
as $function$
  select coalesce((
    select jsonb_strip_nulls(jsonb_build_object(
      'id',m.id::text,
      'entityId',m.entity_id,
      'kind',m.media_kind,
      'src',case
        when m.asset_url is not null then m.asset_url
        when m.storage_path like '/%' then m.storage_path
        else null
      end,
      'alt',m.alt_text,
      'usageStatus',m.usage_status,
      'sourceName',m.source_name,
      'sourceUrl',m.source_page_url,
      'attribution',m.attribution,
      'licenseNote',m.license_note
    ))
    from public.entity_media_assets m
    where m.entity_id=p_entity_id
      and m.usage_status='approved'
      and m.media_kind in ('crest','logo')
      and (m.asset_url is not null or m.storage_path like '/%')
    order by case when m.media_kind='crest' then 0 else 1 end,m.reviewed_at desc nulls last,m.created_at desc
    limit 1
  ),'null'::jsonb);
$function$;

revoke all on function public.get_public_participant_media_v1(text) from public;
grant execute on function public.get_public_participant_media_v1(text) to anon,authenticated;

commit;
