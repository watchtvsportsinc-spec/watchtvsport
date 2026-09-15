BEGIN;
SET LOCAL search_path = public, pg_catalog;

-- V2 multi-sport evolution.
-- Apply after:
--   1. supabase-initial-migration.sql
--   2. supabase-v2-foundation-migration.sql
--   3. supabase-v2-ingestion-migration.sql
--   4. supabase-v2-read-api-migration.sql
--
-- This migration does not connect the application to Supabase and does not import data.
-- It generalizes the schema proven by the Formula 1 pilot while keeping football intact.

ALTER TABLE sports
  ADD COLUMN public_slug text,
  ADD COLUMN event_model text NOT NULL DEFAULT 'team_match' CHECK (
    event_model IN ('team_match', 'tournament_match', 'race_session', 'cycling_race')
  ),
  ADD COLUMN participant_page_policy text NOT NULL DEFAULT 'teams_and_nations' CHECK (
    participant_page_policy IN ('teams_and_nations', 'none')
  ),
  ADD COLUMN is_enabled boolean NOT NULL DEFAULT true,
  ADD COLUMN localized_labels jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (
    jsonb_typeof(localized_labels) = 'object'
  ),
  ADD COLUMN aliases text[] NOT NULL DEFAULT '{}',
  ADD CONSTRAINT ck_sports_public_slug CHECK (
    public_slug IS NULL OR public_slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'
  ),
  ADD CONSTRAINT ck_sports_aliases_no_nulls CHECK (
    array_position(aliases, NULL) IS NULL
  );

UPDATE sports
SET public_slug = slug
WHERE public_slug IS NULL;

ALTER TABLE sports
  ALTER COLUMN public_slug SET NOT NULL;

CREATE UNIQUE INDEX ux_sports_public_slug ON sports(public_slug);

-- Existing rows are football-centric. Keep them unchanged by default, then allow
-- explicit per-sport configuration. The application registry remains the source
-- for the intended values until the real seed/import step is executed.

ALTER TABLE event_pages
  ADD COLUMN entity_kind text NOT NULL DEFAULT 'fixture' CHECK (
    entity_kind IN ('fixture', 'race_weekend', 'tournament', 'race', 'standalone')
  );

ALTER TABLE event_editions
  ADD COLUMN round_number integer CHECK (round_number IS NULL OR round_number > 0),
  ADD COLUMN venue_name text,
  ADD COLUMN venue_city text,
  ADD COLUMN country_code text CHECK (
    country_code IS NULL OR country_code ~ '^[A-Z]{2}$'
  ),
  ADD COLUMN timezone text;

ALTER TABLE events
  ADD COLUMN session_order integer CHECK (session_order IS NULL OR session_order > 0),
  ADD COLUMN session_group text,
  ADD CONSTRAINT ck_events_session_metadata CHECK (
    (
      event_kind = 'session'
      AND session_order IS NOT NULL
    )
    OR (
      event_kind <> 'session'
      AND session_order IS NULL
      AND session_group IS NULL
    )
  );

-- A permanent race-weekend page must use the existing multi-session mechanics.
-- An edition is the specific season occurrence (for example Canada 2026), while
-- the events below it are FP1 / Sprint Qualifying / Sprint / Qualifying / Race.
CREATE OR REPLACE FUNCTION validate_multisport_event_page_shape()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_catalog
AS $$
BEGIN
  IF NEW.entity_kind = 'race_weekend' AND NEW.page_type <> 'multi_session' THEN
    RAISE EXCEPTION USING ERRCODE = '23514',
      MESSAGE = 'race weekend pages must use multi_session page_type';
  END IF;

  IF NEW.entity_kind = 'fixture' AND NEW.page_type NOT IN ('head_to_head', 'standalone') THEN
    RAISE EXCEPTION USING ERRCODE = '23514',
      MESSAGE = 'fixture pages must use head_to_head or standalone page_type';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_validate_multisport_event_page_shape
BEFORE INSERT OR UPDATE ON event_pages
FOR EACH ROW EXECUTE FUNCTION validate_multisport_event_page_shape();

-- Validate the event shape against the sport model. This deliberately validates
-- structure only; it does not infer broadcast coverage or create participants.
CREATE OR REPLACE FUNCTION validate_event_against_sport_model()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_catalog
AS $$
DECLARE
  v_event_model text;
BEGIN
  SELECT event_model INTO v_event_model
  FROM sports
  WHERE id = NEW.sport_id;

  IF v_event_model = 'race_session' THEN
    IF NEW.event_kind <> 'session'
      OR NEW.event_page_id IS NULL
      OR NEW.event_edition_id IS NULL
      OR NEW.session_type IS NULL
      OR btrim(NEW.session_type) = ''
      OR NEW.session_order IS NULL
    THEN
      RAISE EXCEPTION USING ERRCODE = '23514',
        MESSAGE = 'race_session sports require session events attached to a page and edition';
    END IF;

    IF NEW.home_participant_id IS NOT NULL OR NEW.away_participant_id IS NOT NULL THEN
      RAISE EXCEPTION USING ERRCODE = '23514',
        MESSAGE = 'race_session events cannot use home/away participants';
    END IF;
  ELSIF v_event_model = 'team_match' THEN
    IF NEW.event_kind = 'session' THEN
      RAISE EXCEPTION USING ERRCODE = '23514',
        MESSAGE = 'team_match sports cannot use session events';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_validate_event_against_sport_model
BEFORE INSERT OR UPDATE ON events
FOR EACH ROW EXECUTE FUNCTION validate_event_against_sport_model();

CREATE INDEX ix_event_editions_season_round
  ON event_editions(season_id, round_number)
  WHERE round_number IS NOT NULL;

CREATE INDEX ix_events_session_schedule
  ON events(event_edition_id, session_order, event_date)
  WHERE event_kind = 'session';

-- Seed only configuration for sports that already exist. No sport rows are created
-- here because unknown/missing data must not be invented by a migration.
UPDATE sports
SET
  event_model = 'team_match',
  participant_page_policy = 'teams_and_nations',
  localized_labels = jsonb_build_object(
    'fr-FR', 'Football',
    'fr-CA', 'Soccer',
    'en-CA', 'Soccer',
    'en-US', 'Soccer',
    'en-GB', 'Football'
  ),
  aliases = ARRAY['football', 'foot', 'soccer', 'association football']
WHERE slug = 'football' OR slug = 'association-football';

UPDATE sports
SET
  public_slug = 'formula-1',
  event_model = 'race_session',
  participant_page_policy = 'none',
  localized_labels = jsonb_build_object('fr-FR', 'Formule 1', 'fr-CA', 'Formule 1'),
  aliases = ARRAY['formula 1', 'formule 1', 'f1']
WHERE slug IN ('formula-1', 'formula1', 'f1');

COMMIT;
