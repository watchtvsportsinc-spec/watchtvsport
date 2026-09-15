BEGIN;
SET LOCAL search_path = public, pg_catalog;

-- Permanent participant-to-competition membership.
-- Team pages must know their league even when no fixture exists yet.
CREATE TABLE IF NOT EXISTS participant_competitions (
  participant_id uuid NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
  competition_id uuid NOT NULL REFERENCES competitions(id) ON DELETE CASCADE,
  membership_status text NOT NULL DEFAULT 'active' CHECK (membership_status IN ('active','inactive','historical')),
  valid_from date,
  valid_until date,
  source_name text,
  source_url text,
  last_verified_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (participant_id, competition_id),
  CHECK (valid_from IS NULL OR valid_until IS NULL OR valid_until >= valid_from)
);

CREATE INDEX IF NOT EXISTS ix_participant_competitions_competition
  ON participant_competitions(competition_id, membership_status);

ALTER TABLE participant_competitions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS public_select_active_participant_competitions ON participant_competitions;
CREATE POLICY public_select_active_participant_competitions ON participant_competitions
  FOR SELECT TO public USING (membership_status = 'active');

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
    'competitions',coalesce((
      select jsonb_agg(jsonb_build_object(
        'id',c.id,
        'slug',c.slug,
        'name',c.name,
        'logoUrl',c.logo_url,
        'officialWebsiteUrl',c.official_website_url
      ) order by c.name)
      from participant_competitions pc
      join competitions c on c.id=pc.competition_id
      where pc.participant_id=p.id
        and pc.membership_status='active'
        and c.is_active=true
    ),'[]'::jsonb),
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
