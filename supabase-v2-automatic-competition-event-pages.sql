-- WatchTVSport V2 automatic competition/event page discovery.
-- PREPARED MIGRATION ONLY: do not apply automatically.
--
-- Goal:
--   competition/event rows drive public pages and sitemap discovery without
--   requiring a new Next.js route or source-code list for each entity.
--
-- Safety:
--   - only enabled sports and active competitions are exposed;
--   - only published events are exposed;
--   - expected events may be discoverable only when they were explicitly
--     published; unpublished imports never enter the directory;
--   - permanent fixture pages win over edition-specific event slugs when a
--     confirmed published permanent page/edition exists.

create or replace function public.get_public_competition_directory_v1()
returns jsonb
language sql
stable
security definer
set search_path = public, pg_catalog
as $$
  select jsonb_build_object(
    'generatedAt', now(),
    'competitions', coalesce(
      jsonb_agg(
        jsonb_strip_nulls(jsonb_build_object(
          'id', c.id::text,
          'sport', coalesce(s.public_slug, s.slug),
          'slug', c.slug,
          'name', c.name,
          'displayName', c.display_name,
          'seasonLabel', c.season_label,
          'competitionType', c.competition_type,
          'regionLabel', c.region_label,
          'countryCode', c.country_code,
          'metadataStatus', c.metadata_status,
          'participantCount', coalesce(m.participant_count, 0),
          'publishedEventCount', coalesce(ev.published_event_count, 0),
          'lastModified', coalesce(ev.last_event_update, c.created_at)
        ))
        order by coalesce(s.public_slug, s.slug), c.sort_priority desc nulls last, coalesce(c.display_name, c.name), c.slug
      ),
      '[]'::jsonb
    )
  )
  from public.competitions c
  join public.sports s on s.id = c.sport_id
  left join lateral (
    select count(distinct cm.participant_id)::int as participant_count
    from public.competition_memberships cm
    where cm.competition_id = c.id
      and cm.membership_status in ('confirmed', 'active', 'expected')
  ) m on true
  left join lateral (
    select
      count(*) filter (where e.is_published = true)::int as published_event_count,
      max(e.updated_at) filter (where e.is_published = true) as last_event_update
    from public.events e
    where e.competition_id = c.id
  ) ev on true
  where c.is_active = true
    and s.is_enabled = true
    and c.metadata_status in ('reviewed', 'verified');
$$;

revoke all on function public.get_public_competition_directory_v1() from public;
grant execute on function public.get_public_competition_directory_v1() to anon, authenticated;

comment on function public.get_public_competition_directory_v1() is
  'Bounded public competition directory used for automatic permanent competition-page discovery.';

create or replace function public.get_public_event_directory_v1(
  p_offset integer default 0,
  p_limit integer default 500
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, pg_catalog
as $$
declare
  v_offset integer := greatest(0, coalesce(p_offset, 0));
  v_limit integer := greatest(1, least(coalesce(p_limit, 500), 500));
  v_rows jsonb;
  v_has_more boolean := false;
begin
  select coalesce(jsonb_agg(item order by sort_date, sort_id), '[]'::jsonb)
  into v_rows
  from (
    select
      jsonb_strip_nulls(jsonb_build_object(
        'id', e.id::text,
        'slug', case
          when ep.id is not null
            and ep.entity_kind = 'fixture'
            and ep.is_published = true
            and ep.verification_status = 'confirmed'
            and ee.id is not null
            and ee.is_published = true
            and ee.verification_status = 'confirmed'
          then ep.slug
          else e.slug
        end,
        'detailPath', case
          when ep.id is not null
            and ep.entity_kind = 'fixture'
            and ep.is_published = true
            and ep.verification_status = 'confirmed'
            and ee.id is not null
            and ee.is_published = true
            and ee.verification_status = 'confirmed'
          then '/event/' || ep.slug
          else '/event/' || e.slug
        end,
        'sport', coalesce(s.public_slug, s.slug),
        'competitionSlug', c.slug,
        'eventDate', coalesce(e.scheduled_date, e.event_date),
        'status', e.status,
        'verificationStatus', e.verification_status,
        'canonicalKind', case
          when ep.id is not null
            and ep.entity_kind = 'fixture'
            and ep.is_published = true
            and ep.verification_status = 'confirmed'
            and ee.id is not null
            and ee.is_published = true
            and ee.verification_status = 'confirmed'
          then 'permanent-page'
          else 'event'
        end,
        'lastModified', e.updated_at
      )) as item,
      coalesce(e.scheduled_date, e.event_date, e.created_at) as sort_date,
      e.id as sort_id
    from public.events e
    join public.sports s on s.id = e.sport_id
    join public.competitions c on c.id = e.competition_id
    left join public.event_pages ep on ep.id = e.event_page_id
    left join public.event_editions ee on ee.id = e.event_edition_id
    where e.is_published = true
      and e.slug is not null
      and length(trim(e.slug)) > 0
      and e.verification_status in ('confirmed', 'expected')
      and s.is_enabled = true
      and c.is_active = true
    order by coalesce(e.scheduled_date, e.event_date, e.created_at), e.id
    offset v_offset
    limit v_limit + 1
  ) page_rows;

  if jsonb_array_length(v_rows) > v_limit then
    v_has_more := true;
    select coalesce(jsonb_agg(value order by ordinality), '[]'::jsonb)
    into v_rows
    from jsonb_array_elements(v_rows) with ordinality
    where ordinality <= v_limit;
  end if;

  return jsonb_build_object(
    'generatedAt', now(),
    'offset', v_offset,
    'limit', v_limit,
    'hasMore', v_has_more,
    'events', v_rows
  );
end;
$$;

revoke all on function public.get_public_event_directory_v1(integer, integer) from public;
grant execute on function public.get_public_event_directory_v1(integer, integer) to anon, authenticated;

comment on function public.get_public_event_directory_v1(integer, integer) is
  'Paginated lightweight directory of published events. Uses a confirmed permanent fixture page when available, otherwise the persisted event slug.';
