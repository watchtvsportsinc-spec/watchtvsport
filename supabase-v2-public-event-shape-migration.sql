BEGIN;
SET LOCAL search_path = public, pg_catalog;

CREATE OR REPLACE FUNCTION public.get_public_events_v2()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public, pg_catalog
AS $function$
  SELECT jsonb_build_object(
    'schemaVersion', 1,
    'generatedAt', statement_timestamp(),
    'events', COALESCE(jsonb_agg(event_record.payload ORDER BY event_record.event_date, event_record.event_id), '[]'::jsonb)
  )
  FROM (
    SELECT
      e.id AS event_id,
      e.event_date,
      jsonb_strip_nulls(jsonb_build_object(
        'id', e.id::text,
        'slug', e.slug,
        'detailPath', CASE
          WHEN page_url.url_path IS NOT NULL THEN
            page_url.url_path || CASE
              WHEN e.event_kind = 'session' AND e.session_type IS NOT NULL
                THEN '#' || replace(e.session_type, '_', '-')
              ELSE '?event=' || e.id::text
            END
          WHEN event_url.url_path IS NOT NULL THEN event_url.url_path
          ELSE '/event/' || e.slug
        END,
        'sport', s.slug,
        'competition', c.name,
        'competitionSlug', c.slug,
        'stage', e.phase,
        'group', e.group_name,
        'eventDate', e.event_date,
        'status', CASE
          WHEN e.status IN ('scheduled', 'live', 'finished') THEN e.status
          WHEN e.status IN ('postponed', 'reported') THEN 'scheduled'
          WHEN e.status = 'cancelled' THEN 'finished'
          ELSE 'scheduled'
        END,
        'participant1', CASE WHEN home_participant.id IS NULL THEN NULL ELSE
          jsonb_strip_nulls(jsonb_build_object(
            'id', home_participant.id::text,
            'name', home_participant.name,
            'shortName', home_participant.short_name,
            'type', CASE home_participant.participant_type
              WHEN 'country' THEN 'national_team'
              WHEN 'individual' THEN 'player'
              WHEN 'club' THEN 'club'
              ELSE 'club'
            END,
            'visualType', CASE home_participant.participant_type
              WHEN 'country' THEN 'flag'
              WHEN 'individual' THEN 'player'
              WHEN 'club' THEN 'crest'
              ELSE 'generic'
            END,
            'visual', COALESCE(home_participant.country_code, home_participant.short_name, '')
          ))
        END,
        'participant2', CASE WHEN away_participant.id IS NULL THEN NULL ELSE
          jsonb_strip_nulls(jsonb_build_object(
            'id', away_participant.id::text,
            'name', away_participant.name,
            'shortName', away_participant.short_name,
            'type', CASE away_participant.participant_type
              WHEN 'country' THEN 'national_team'
              WHEN 'individual' THEN 'player'
              WHEN 'club' THEN 'club'
              ELSE 'club'
            END,
            'visualType', CASE away_participant.participant_type
              WHEN 'country' THEN 'flag'
              WHEN 'individual' THEN 'player'
              WHEN 'club' THEN 'crest'
              ELSE 'generic'
            END,
            'visual', COALESCE(away_participant.country_code, away_participant.short_name, '')
          ))
        END,
        'title', COALESCE(
          event_page.title,
          CASE
            WHEN home_participant.id IS NOT NULL AND away_participant.id IS NOT NULL
              THEN home_participant.name || ' vs ' || away_participant.name
            ELSE initcap(replace(e.slug, '-', ' '))
          END
        ),
        'eventGroupId', CASE WHEN event_page.entity_kind = 'race_weekend' THEN event_page.id::text ELSE NULL END,
        'eventGroupName', CASE WHEN event_page.entity_kind = 'race_weekend' THEN event_page.title ELSE NULL END,
        'eventGroupSlug', CASE WHEN event_page.entity_kind = 'race_weekend' THEN event_page.slug ELSE NULL END,
        'eventEditionKey', event_edition.edition_key,
        'eventEditionLabel', event_edition.label,
        'sessionType', e.session_type,
        'sequenceNumber', COALESCE(e.session_order, e.sequence_number),
        'venue', COALESCE(e.venue_name, event_edition.venue_name),
        'country', event_edition.country_code,
        'broadcasts', COALESCE(public_broadcasts.payload, '[]'::jsonb)
      )) AS payload
    FROM public.events e
    JOIN public.sports s ON s.id = e.sport_id
    LEFT JOIN public.competitions c ON c.id = e.competition_id
    LEFT JOIN public.participants home_participant ON home_participant.id = e.home_participant_id
    LEFT JOIN public.participants away_participant ON away_participant.id = e.away_participant_id
    LEFT JOIN public.event_pages event_page ON event_page.id = e.event_page_id
    LEFT JOIN public.event_editions event_edition ON event_edition.id = e.event_edition_id
    LEFT JOIN LATERAL (
      SELECT u.url_path
      FROM public.event_page_urls u
      WHERE u.event_page_id = e.event_page_id
        AND u.kind = 'canonical'
        AND u.is_active = true
      ORDER BY u.created_at, u.id
      LIMIT 1
    ) page_url ON true
    LEFT JOIN LATERAL (
      SELECT u.url_path
      FROM public.event_urls u
      WHERE u.event_id = e.id
        AND u.kind = 'canonical'
        AND u.is_active = true
      ORDER BY u.created_at, u.id
      LIMIT 1
    ) event_url ON true
    LEFT JOIN LATERAL (
      SELECT jsonb_agg(offer.payload ORDER BY offer.territory_name, offer.broadcaster_name, offer.broadcast_type, offer.offer_id) AS payload
      FROM (
        SELECT
          eb.id AS offer_id,
          t.name AS territory_name,
          COALESCE(p.name, b.name) AS broadcaster_name,
          eb.broadcast_type,
          jsonb_strip_nulls(jsonb_build_object(
            'countryCode', lower(t.code),
            'countryName', t.name,
            'broadcaster', COALESCE(p.name, b.name),
            'access', eb.access_type,
            'url', COALESCE(eb.official_url, p.url, b.website_url),
            'affiliateUrl', CASE WHEN eb.affiliate_url ~ '^https://' THEN eb.affiliate_url ELSE NULL END,
            'sourceName', COALESCE(eb.source_name, br.source_name),
            'sourceUrl', CASE WHEN COALESCE(eb.source_url, br.source_url) ~ '^https://' THEN COALESCE(eb.source_url, br.source_url) ELSE NULL END,
            'lastChecked', eb.last_verified_at,
            'commentaryLanguages', eb.language_codes,
            'coverageType', COALESCE(br.coverage_type, 'unknown'),
            'coverageStatus', 'confirmed',
            'broadcastType', eb.broadcast_type,
            'accessConditions', eb.access_conditions,
            'requiresAccount', eb.requires_account,
            'isFreeTrial', eb.is_free_trial,
            'notes', eb.notes
          )) AS payload
        FROM public.event_broadcasts eb
        JOIN public.territories t ON t.id = eb.territory_id
        JOIN public.broadcasters b ON b.id = eb.broadcaster_id
        LEFT JOIN public.platforms p ON p.id = eb.platform_id
        LEFT JOIN public.broadcast_rights br ON br.id = eb.broadcast_right_id
        WHERE eb.event_id = e.id
          AND eb.is_published = true
          AND eb.verification_status = 'confirmed'
          AND eb.decision = 'included'
          AND eb.access_type IN ('Free', 'Paid')
          AND COALESCE(eb.official_url, p.url, b.website_url) ~ '^https://'
        ORDER BY t.name, COALESCE(p.name, b.name), eb.broadcast_type, eb.id
        LIMIT 301
      ) offer
    ) public_broadcasts ON true
    WHERE e.is_published = true
      AND e.verification_status = 'confirmed'
      AND e.event_date IS NOT NULL
      AND c.id IS NOT NULL
    ORDER BY e.event_date, e.id
    LIMIT 2501
  ) event_record;
$function$;

REVOKE ALL ON FUNCTION public.get_public_events_v2() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_events_v2() TO anon, authenticated;

COMMIT;
