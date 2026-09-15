BEGIN;
SET LOCAL search_path = public, pg_catalog;

-- Runtime support for permanent club pages and automated NBA/NHL schedule refresh.
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;

CREATE TABLE IF NOT EXISTS public.schedule_sync_auth (
  id boolean PRIMARY KEY DEFAULT true CHECK (id = true),
  secret text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  rotated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.schedule_sync_auth ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.schedule_sync_auth FROM anon, authenticated;
INSERT INTO public.schedule_sync_auth(id,secret)
VALUES (true, encode(gen_random_bytes(32),'hex'))
ON CONFLICT (id) DO NOTHING;

CREATE OR REPLACE FUNCTION public.get_public_participant_events_v1(p_participant_id uuid)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public, pg_catalog
AS $function$
SELECT jsonb_build_object(
  'schemaVersion',1,
  'generatedAt',statement_timestamp(),
  'events',COALESCE(jsonb_agg(x.payload ORDER BY x.event_date,x.event_id),'[]'::jsonb)
)
FROM (
  SELECT e.id event_id,e.event_date,
    jsonb_strip_nulls(jsonb_build_object(
      'id',e.id::text,
      'slug',e.slug,
      'detailPath',COALESCE(eu.url_path,'/event/'||e.slug),
      'sport',COALESCE(s.public_slug,s.slug),
      'competition',c.name,
      'competitionSlug',c.slug,
      'stage',e.phase,
      'group',e.group_name,
      'eventDate',e.event_date,
      'status',CASE WHEN e.status IN ('scheduled','live','finished') THEN e.status WHEN e.status IN ('postponed','reported') THEN 'scheduled' WHEN e.status='cancelled' THEN 'finished' ELSE 'scheduled' END,
      'participant1',CASE WHEN hp.id IS NULL THEN NULL ELSE jsonb_build_object(
        'id',hp.id::text,'name',hp.name,'shortName',hp.short_name,
        'type',CASE WHEN hp.participant_type IN ('country','national_team') THEN 'national_team' WHEN hp.participant_type='individual' THEN 'player' ELSE 'club' END,
        'visualType',CASE WHEN hp.participant_type IN ('country','national_team') THEN 'flag' WHEN hp.participant_type='individual' THEN 'player' ELSE 'crest' END,
        'visual',COALESCE(hp.country_code,hp.short_name,'')
      ) END,
      'participant2',CASE WHEN ap.id IS NULL THEN NULL ELSE jsonb_build_object(
        'id',ap.id::text,'name',ap.name,'shortName',ap.short_name,
        'type',CASE WHEN ap.participant_type IN ('country','national_team') THEN 'national_team' WHEN ap.participant_type='individual' THEN 'player' ELSE 'club' END,
        'visualType',CASE WHEN ap.participant_type IN ('country','national_team') THEN 'flag' WHEN ap.participant_type='individual' THEN 'player' ELSE 'crest' END,
        'visual',COALESCE(ap.country_code,ap.short_name,'')
      ) END,
      'title',CASE WHEN hp.id IS NOT NULL AND ap.id IS NOT NULL THEN hp.name||' vs '||ap.name ELSE initcap(replace(e.slug,'-',' ')) END,
      'venue',COALESCE(v.name,e.venue_name),
      'country',v.country_code,
      'broadcasts','[]'::jsonb
    )) payload
  FROM public.events e
  JOIN public.sports s ON s.id=e.sport_id
  JOIN public.competitions c ON c.id=e.competition_id
  LEFT JOIN public.participants hp ON hp.id=e.home_participant_id
  LEFT JOIN public.participants ap ON ap.id=e.away_participant_id
  LEFT JOIN public.venues v ON v.id=e.venue_id
  LEFT JOIN LATERAL (
    SELECT url_path FROM public.event_urls u
    WHERE u.event_id=e.id AND u.kind='canonical' AND u.is_active=true
    ORDER BY u.created_at,u.id LIMIT 1
  ) eu ON true
  WHERE e.is_published=true
    AND e.verification_status='confirmed'
    AND e.event_date IS NOT NULL
    AND (e.home_participant_id=p_participant_id OR e.away_participant_id=p_participant_id)
  ORDER BY e.event_date,e.id
  LIMIT 250
) x;
$function$;

CREATE OR REPLACE FUNCTION public.get_public_participant_profile_v3(p_slug text,p_sport_slug text)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public, pg_catalog
AS $function$
SELECT jsonb_build_object(
  'participantId',p.id,
  'slug',p.slug,
  'name',p.name,
  'shortName',p.short_name,
  'participantType',p.participant_type,
  'sport',COALESCE(s.public_slug,s.slug),
  'sportName',s.name,
  'profile',CASE WHEN pp.participant_id IS NULL THEN NULL ELSE jsonb_strip_nulls(jsonb_build_object(
    'city',pp.city,'countryCode',COALESCE(pp.country_code,p.country_code),'foundedYear',pp.founded_year,
    'venueName',pp.venue_name,'venueCapacity',pp.venue_capacity,'logoUrl',pp.logo_url,'heroImageUrl',pp.hero_image_url,
    'officialWebsiteUrl',pp.official_website_url,'instagramUrl',pp.instagram_url,'xUrl',pp.x_url,
    'facebookUrl',pp.facebook_url,'youtubeUrl',pp.youtube_url,'tiktokUrl',pp.tiktok_url,'summary',pp.summary,
    'profileStatus',pp.profile_status,'lastVerifiedAt',pp.last_verified_at
  )) END,
  'competitions',COALESCE((
    SELECT jsonb_agg(DISTINCT jsonb_build_object('id',c.id,'slug',c.slug,'name',c.name))
    FROM public.competition_memberships cm
    JOIN public.competitions c ON c.id=cm.competition_id
    WHERE cm.participant_id=p.id AND cm.membership_status IN ('confirmed','active')
  ),'[]'::jsonb),
  'sources',COALESCE((
    SELECT jsonb_agg(jsonb_build_object(
      'field',cl.field_key,'sourceName',cl.source_name,'sourceUrl',cl.source_url,'sourceType',cl.source_type,
      'verifiedAt',cl.verified_at,'observedAt',cl.observed_at
    ) ORDER BY cl.field_key)
    FROM public.participant_profile_claims cl
    WHERE cl.participant_id=p.id AND cl.is_current=true AND cl.verification_status='confirmed'
  ),'[]'::jsonb)
)
FROM public.participants p
JOIN public.sports s ON s.id=p.sport_id
LEFT JOIN public.participant_profiles pp ON pp.participant_id=p.id AND pp.profile_status IN ('partial','verified')
WHERE p.slug=p_slug
  AND (s.slug=p_sport_slug OR s.public_slug=p_sport_slug)
  AND p.is_active=true
LIMIT 1;
$function$;

REVOKE ALL ON FUNCTION public.get_public_participant_events_v1(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_public_participant_profile_v3(text,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_participant_events_v1(uuid) TO anon,authenticated;
GRANT EXECUTE ON FUNCTION public.get_public_participant_profile_v3(text,text) TO anon,authenticated;

DO $schedule$
DECLARE existing_job bigint;
BEGIN
  SELECT jobid INTO existing_job FROM cron.job WHERE jobname='sync-pro-schedules' LIMIT 1;
  IF existing_job IS NOT NULL THEN PERFORM cron.unschedule(existing_job); END IF;
  PERFORM cron.schedule(
    'sync-pro-schedules',
    '17 */6 * * *',
    $cron$
    SELECT net.http_post(
      url := 'https://jywqhiiwsmudthaujhmi.supabase.co/functions/v1/sync-pro-schedules',
      headers := jsonb_build_object(
        'Content-Type','application/json',
        'x-sync-secret',(SELECT secret FROM public.schedule_sync_auth WHERE id=true)
      ),
      body := '{}'::jsonb,
      timeout_milliseconds := 120000
    );
    $cron$
  );
END
$schedule$;

COMMIT;
