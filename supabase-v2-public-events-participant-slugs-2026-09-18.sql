-- Expose canonical participant slugs in the public event payload so approved media assets can be resolved reliably.
CREATE OR REPLACE FUNCTION public.get_public_events_filtered_v1(p_sport_slug text DEFAULT NULL::text, p_competition_slug text DEFAULT NULL::text, p_event_slug text DEFAULT NULL::text, p_country_code text DEFAULT NULL::text, p_from timestamp with time zone DEFAULT NULL::timestamp with time zone, p_to timestamp with time zone DEFAULT NULL::timestamp with time zone, p_limit integer DEFAULT 250)
 RETURNS jsonb
 LANGUAGE sql
 STABLE
 SET search_path TO 'public', 'pg_catalog'
AS $function$
  select jsonb_build_object(
    'schemaVersion', 1,
    'generatedAt', statement_timestamp(),
    'events', coalesce(
      jsonb_agg(event_record.payload order by event_record.event_date, event_record.event_id),
      '[]'::jsonb
    )
  )
  from (
    select
      e.id event_id,
      e.event_date,
      jsonb_strip_nulls(jsonb_build_object(
        'id', e.id::text,
        'slug', e.slug,
        'detailPath', coalesce(event_url.url_path, '/event/' || e.slug),
        'sport', coalesce(s.public_slug, s.slug),
        'competition', c.name,
        'competitionSlug', c.slug,
        'stage', e.phase,
        'group', e.group_name,
        'eventDate', e.event_date,
        'status', case
          when e.status in ('scheduled','live','finished') then e.status
          when e.status in ('postponed','reported') then 'scheduled'
          when e.status = 'cancelled' then 'finished'
          else 'scheduled'
        end,
        'participant1', case when hp.id is null then null else jsonb_strip_nulls(jsonb_build_object(
          'id', hp.id::text,
          'slug', hp.slug,
          'name', hp.name,
          'shortName', hp.short_name,
          'type', case hp.participant_type when 'country' then 'national_team' when 'national_team' then 'national_team' when 'individual' then 'player' else 'club' end,
          'visualType', case hp.participant_type when 'country' then 'flag' when 'national_team' then 'flag' when 'individual' then 'player' else 'generic' end,
          'visual', coalesce(hp.country_code, hp.short_name, ''),
          'countryCode', hp.country_code,
          'visualProfile', case when hpv.participant_id is null then null else jsonb_strip_nulls(jsonb_build_object(
            'renderFamily', hpv.render_family,
            'primaryColor', hpv.primary_color,
            'secondaryColor', hpv.secondary_color,
            'accentColor', hpv.accent_color,
            'patternStyle', hpv.pattern_style,
            'visualStatus', hpv.visual_status,
            'seasonLabel', hpv.season_label,
            'sourceName', hpv.source_name,
            'sourceUrl', hpv.source_url,
            'observedAt', hpv.observed_at
          )) end
        )) end,
        'participant2', case when ap.id is null then null else jsonb_strip_nulls(jsonb_build_object(
          'id', ap.id::text,
          'slug', ap.slug,
          'name', ap.name,
          'shortName', ap.short_name,
          'type', case ap.participant_type when 'country' then 'national_team' when 'national_team' then 'national_team' when 'individual' then 'player' else 'club' end,
          'visualType', case ap.participant_type when 'country' then 'flag' when 'national_team' then 'flag' when 'individual' then 'player' else 'generic' end,
          'visual', coalesce(ap.country_code, ap.short_name, ''),
          'countryCode', ap.country_code,
          'visualProfile', case when apv.participant_id is null then null else jsonb_strip_nulls(jsonb_build_object(
            'renderFamily', apv.render_family,
            'primaryColor', apv.primary_color,
            'secondaryColor', apv.secondary_color,
            'accentColor', apv.accent_color,
            'patternStyle', apv.pattern_style,
            'visualStatus', apv.visual_status,
            'seasonLabel', apv.season_label,
            'sourceName', apv.source_name,
            'sourceUrl', apv.source_url,
            'observedAt', apv.observed_at
          )) end
        )) end,
        'title', case
          when hp.id is not null and ap.id is not null then hp.name || ' vs ' || ap.name
          else initcap(replace(e.slug, '-', ' '))
        end,
        'venue', coalesce(v.name, e.venue_name),
        'country', v.country_code,
        'broadcasts', coalesce(pb.payload, '[]'::jsonb)
      )) payload
    from public.events e
    join public.sports s on s.id = e.sport_id
    join public.competitions c on c.id = e.competition_id
    left join public.participants hp on hp.id = e.home_participant_id
    left join public.participants ap on ap.id = e.away_participant_id
    left join public.participant_visual_profiles hpv on hpv.participant_id = hp.id
    left join public.participant_visual_profiles apv on apv.participant_id = ap.id
    left join public.venues v on v.id = e.venue_id
    left join lateral (
      select u.url_path
      from public.event_urls u
      where u.event_id = e.id and u.kind = 'canonical' and u.is_active = true
      order by u.created_at, u.id
      limit 1
    ) event_url on true
    left join lateral (
      select jsonb_agg(x.payload order by x.country_name, x.broadcaster) payload
      from (
        select
          t.name country_name,
          coalesce(pl.name, b.name) broadcaster,
          jsonb_strip_nulls(jsonb_build_object(
            'countryCode', lower(t.code),
            'countryName', t.name,
            'broadcaster', coalesce(pl.name, b.name),
            'access', eb.access_type,
            'url', coalesce(eb.official_url, pl.url, b.website_url),
            'sourceName', coalesce(eb.source_name, br.source_name),
            'sourceUrl', coalesce(eb.source_url, br.source_url),
            'lastChecked', eb.last_verified_at,
            'coverageType', coalesce(br.coverage_type, 'unknown'),
            'coverageStatus', 'confirmed',
            'broadcastType', eb.broadcast_type,
            'commentaryLanguages', eb.language_codes,
            'accessConditions', eb.access_conditions,
            'requiresAccount', eb.requires_account,
            'isFreeTrial', eb.is_free_trial,
            'notes', eb.notes
          )) payload
        from public.event_broadcasts eb
        join public.territories t on t.id = eb.territory_id
        join public.broadcasters b on b.id = eb.broadcaster_id
        left join public.platforms pl on pl.id = eb.platform_id
        left join public.broadcast_rights br on br.id = eb.broadcast_right_id
        where eb.event_id = e.id
          and eb.is_published = true
          and eb.verification_status = 'confirmed'
          and eb.decision = 'included'
          and eb.access_type in ('Free', 'Paid')
          and coalesce(eb.official_url, pl.url, b.website_url) ~ '^https://'
          and (p_country_code is null or lower(t.code) = lower(p_country_code))
        limit 300
      ) x
    ) pb on true
    where e.is_published = true
      and e.verification_status = 'confirmed'
      and e.event_date is not null
      and (p_sport_slug is null or coalesce(s.public_slug, s.slug) = p_sport_slug)
      and (p_competition_slug is null or c.slug = p_competition_slug)
      and (p_event_slug is null or e.slug = p_event_slug)
      and (p_country_code is null or exists (
        select 1
        from public.event_broadcasts eb_country
        join public.territories t_country on t_country.id = eb_country.territory_id
        where eb_country.event_id = e.id
          and eb_country.is_published = true
          and eb_country.verification_status = 'confirmed'
          and eb_country.decision = 'included'
          and eb_country.access_type in ('Free', 'Paid')
          and lower(t_country.code) = lower(p_country_code)
      ))
      and (p_from is null or e.event_date >= p_from)
      and (p_to is null or e.event_date < p_to)
    order by e.event_date, e.id
    limit greatest(1, least(coalesce(p_limit, 250), 500))
  ) event_record;
$function$

