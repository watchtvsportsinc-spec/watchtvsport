BEGIN;
SET LOCAL search_path = public, pg_catalog;

-- Universal participant/team media and permanent profile support.
-- Designed so club/franchise pages remain useful even when no fixture is published yet.

-- Broaden participant types for multi-sport use (NBA/NHL franchises, national teams).
DO $$
DECLARE v_name text;
BEGIN
  SELECT conname INTO v_name
  FROM pg_constraint
  WHERE conrelid = 'public.participants'::regclass
    AND contype = 'c'
    AND pg_get_constraintdef(oid) ILIKE '%participant_type%';
  IF v_name IS NOT NULL THEN
    EXECUTE format('ALTER TABLE public.participants DROP CONSTRAINT %I', v_name);
  END IF;
END $$;

ALTER TABLE participants
  ADD CONSTRAINT participants_participant_type_check
  CHECK (participant_type IN ('team','individual','club','country','franchise','national_team'));

-- Permanent media for sports.
ALTER TABLE sports
  ADD COLUMN IF NOT EXISTS logo_url text,
  ADD COLUMN IF NOT EXISTS icon_url text,
  ADD COLUMN IF NOT EXISTS hero_image_url text;

-- Permanent media and official links for competitions/leagues.
ALTER TABLE competitions
  ADD COLUMN IF NOT EXISTS logo_url text,
  ADD COLUMN IF NOT EXISTS hero_image_url text,
  ADD COLUMN IF NOT EXISTS official_website_url text;

-- Permanent media for event pages (GP, tournament, event series, etc.).
ALTER TABLE event_pages
  ADD COLUMN IF NOT EXISTS logo_url text,
  ADD COLUMN IF NOT EXISTS hero_image_url text;

-- Asset provenance: one reusable model for sport / competition / participant / event-page assets.
CREATE TABLE IF NOT EXISTS entity_media_assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type text NOT NULL CHECK (entity_type IN ('sport','competition','participant','event_page','broadcaster')),
  entity_id uuid NOT NULL,
  asset_kind text NOT NULL CHECK (asset_kind IN ('logo','icon','hero','badge')),
  asset_url text NOT NULL,
  source_name text NOT NULL,
  source_url text NOT NULL,
  license text,
  usage_status text NOT NULL DEFAULT 'review' CHECK (usage_status IN ('approved','review','blocked')),
  last_verified_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (entity_type, entity_id, asset_kind),
  CHECK (btrim(asset_url) <> ''),
  CHECK (btrim(source_name) <> ''),
  CHECK (btrim(source_url) <> '')
);

CREATE INDEX IF NOT EXISTS ix_entity_media_assets_status
  ON entity_media_assets(entity_type, usage_status);

ALTER TABLE entity_media_assets ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS public_select_approved_entity_media_assets ON entity_media_assets;
CREATE POLICY public_select_approved_entity_media_assets ON entity_media_assets
  FOR SELECT TO public USING (usage_status = 'approved');

-- Public universal participant profile lookup. It does not require any event to exist.
CREATE OR REPLACE FUNCTION public.get_public_participant_profile_v3(p_slug text, p_sport_slug text)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path=public
AS $$
  SELECT jsonb_build_object(
    'participantId',p.id,
    'slug',p.slug,
    'name',p.name,
    'shortName',p.short_name,
    'participantType',p.participant_type,
    'sport',coalesce(s.public_slug,s.slug),
    'sportName',s.name,
    'profile',case when pp.participant_id is null then null else jsonb_strip_nulls(jsonb_build_object(
      'city',pp.city,
      'countryCode',coalesce(pp.country_code,p.country_code),
      'foundedYear',pp.founded_year,
      'venueName',pp.venue_name,
      'venueCapacity',pp.venue_capacity,
      'logoUrl',pp.logo_url,
      'heroImageUrl',pp.hero_image_url,
      'officialWebsiteUrl',pp.official_website_url,
      'instagramUrl',pp.instagram_url,
      'xUrl',pp.x_url,
      'facebookUrl',pp.facebook_url,
      'youtubeUrl',pp.youtube_url,
      'tiktokUrl',pp.tiktok_url,
      'summary',pp.summary,
      'profileStatus',pp.profile_status,
      'lastVerifiedAt',pp.last_verified_at
    )) end,
    'sources',coalesce((select jsonb_agg(jsonb_build_object(
      'field',c.field_key,
      'sourceName',c.source_name,
      'sourceUrl',c.source_url,
      'sourceType',c.source_type,
      'verifiedAt',c.verified_at,
      'observedAt',c.observed_at
    ) order by c.field_key)
    from participant_profile_claims c
    where c.participant_id=p.id and c.is_current=true and c.verification_status='confirmed'),'[]'::jsonb)
  )
  FROM participants p
  JOIN sports s ON s.id=p.sport_id
  LEFT JOIN participant_profiles pp
    ON pp.participant_id=p.id AND pp.profile_status IN ('partial','verified')
  WHERE p.slug=p_slug
    AND (s.slug=p_sport_slug OR s.public_slug=p_sport_slug)
    AND p.is_active=true
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.get_public_participant_profile_v3(text,text) TO anon, authenticated;

COMMIT;
