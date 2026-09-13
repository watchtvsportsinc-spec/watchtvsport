BEGIN;
SET LOCAL search_path = public, pg_catalog;
-- Initial migration only; PostgreSQL 15+, existing Supabase roles required.


CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE sports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE competitions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sport_id uuid NOT NULL REFERENCES sports(id) ON DELETE RESTRICT,
  slug text NOT NULL,
  name text NOT NULL,
  season_label text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (sport_id, slug)
);

CREATE TABLE seasons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  competition_id uuid NOT NULL REFERENCES competitions(id) ON DELETE RESTRICT,
  slug text NOT NULL,
  label text NOT NULL,
  start_date date,
  end_date date,
  is_current boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (competition_id, slug)
);

CREATE TABLE territories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  name text NOT NULL,
  parent_territory_id uuid REFERENCES territories(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE participant_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sport_id uuid NOT NULL REFERENCES sports(id) ON DELETE RESTRICT,
  code text NOT NULL,
  name text NOT NULL,
  UNIQUE (sport_id, code)
);

CREATE TABLE participants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sport_id uuid NOT NULL REFERENCES sports(id) ON DELETE RESTRICT,
  category_id uuid REFERENCES participant_categories(id),
  participant_type text NOT NULL CHECK (participant_type IN ('team', 'individual', 'club', 'country')),
  slug text NOT NULL,
  name text NOT NULL,
  short_name text,
  country_code text,
  age_group text,
  sex text CHECK (sex IN ('male', 'female', 'mixed', 'unknown')),
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (sport_id, slug)
);

CREATE TABLE events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sport_id uuid NOT NULL REFERENCES sports(id) ON DELETE RESTRICT,
  competition_id uuid REFERENCES competitions(id) ON DELETE RESTRICT,
  season_id uuid REFERENCES seasons(id) ON DELETE RESTRICT,
  status text NOT NULL CHECK (status IN ('scheduled', 'live', 'finished', 'postponed', 'cancelled', 'reported')),
  slug text NOT NULL,
  phase text,
  group_name text,
  match_number integer,
  event_date timestamptz,
  scheduled_date timestamptz,
  venue_name text,
  venue_city text,
  timezone text,
  home_participant_id uuid REFERENCES participants(id),
  away_participant_id uuid REFERENCES participants(id),
  home_score integer,
  away_score integer,
  score_details jsonb,
  is_published boolean NOT NULL DEFAULT false,
  published_at timestamptz,
  source_name text,
  source_url text,
  last_verified_at timestamptz,
  verification_status text NOT NULL DEFAULT 'unknown' CHECK (verification_status IN ('confirmed', 'expected', 'to_update', 'unknown')),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (sport_id, slug)
);

CREATE TABLE event_external_ids (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  provider text NOT NULL,
  external_id text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (provider, external_id)
);

CREATE TABLE event_urls (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  url_path text NOT NULL UNIQUE,
  kind text NOT NULL CHECK (kind IN ('canonical', 'alias')),
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX ux_event_urls_one_active_canonical
  ON event_urls (event_id)
  WHERE kind = 'canonical' AND is_active = true;

CREATE TABLE broadcasters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  kind text NOT NULL CHECK (kind IN ('linear', 'streaming', 'platform', 'network', 'other')),
  website_url text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE platforms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  broadcaster_id uuid NOT NULL REFERENCES broadcasters(id) ON DELETE RESTRICT,
  slug text NOT NULL,
  name text NOT NULL,
  url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (broadcaster_id, slug)
);

CREATE TABLE languages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  name text NOT NULL
);

CREATE TABLE broadcast_rights (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  competition_id uuid NOT NULL REFERENCES competitions(id) ON DELETE RESTRICT,
  season_id uuid REFERENCES seasons(id) ON DELETE RESTRICT,
  territory_id uuid NOT NULL REFERENCES territories(id) ON DELETE RESTRICT,
  broadcaster_id uuid NOT NULL REFERENCES broadcasters(id) ON DELETE RESTRICT,
  platform_id uuid REFERENCES platforms(id),
  access_type text CHECK (access_type IN ('Free', 'Paid', 'Unknown')),
  coverage_type text NOT NULL CHECK (coverage_type IN ('full', 'partial', 'unknown')),
  valid_from date,
  valid_to date,
  is_published boolean NOT NULL DEFAULT false,
  published_at timestamptz,
  source_name text,
  source_url text,
  last_verified_at timestamptz,
  verification_status text NOT NULL DEFAULT 'unknown' CHECK (verification_status IN ('confirmed', 'expected', 'to_update', 'unknown')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (valid_from IS NULL OR valid_to IS NULL OR valid_to >= valid_from),
  UNIQUE NULLS NOT DISTINCT (
    competition_id,
    season_id,
    territory_id,
    broadcaster_id,
    platform_id,
    access_type,
    coverage_type,
    valid_from,
    valid_to
  )
);

CREATE TABLE event_broadcasts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  broadcast_right_id uuid REFERENCES broadcast_rights(id) ON DELETE RESTRICT,
  territory_id uuid NOT NULL REFERENCES territories(id) ON DELETE RESTRICT,
  broadcaster_id uuid NOT NULL REFERENCES broadcasters(id) ON DELETE RESTRICT,
  platform_id uuid REFERENCES platforms(id),
  decision text NOT NULL CHECK (decision IN ('included', 'excluded')),
  access_type text CHECK (access_type IN ('Free', 'Paid', 'Unknown')),
  official_url text,
  affiliate_url text,
  language_codes text[] NOT NULL DEFAULT '{}',
  source_name text,
  source_url text,
  last_verified_at timestamptz,
  verification_status text NOT NULL DEFAULT 'unknown' CHECK (verification_status IN ('confirmed', 'expected', 'to_update', 'unknown')),
  is_published boolean NOT NULL DEFAULT false,
  published_at timestamptz,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE NULLS NOT DISTINCT (
    event_id,
    broadcast_right_id,
    territory_id,
    broadcaster_id,
    platform_id
  )
);

CREATE TABLE event_updates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  updated_at timestamptz NOT NULL DEFAULT now(),
  update_type text NOT NULL CHECK (update_type IN ('schedule', 'status', 'score', 'broadcast', 'publication', 'source', 'other')),
  source_name text,
  source_url text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE OR REPLACE FUNCTION validate_event_relationships()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_competition_sport uuid;
  v_season_competition uuid;
  v_season_sport uuid;
  v_home_sport uuid;
  v_away_sport uuid;
BEGIN
  IF NEW.competition_id IS NOT NULL THEN
    SELECT sport_id INTO v_competition_sport
    FROM competitions
    WHERE id = NEW.competition_id;

    IF v_competition_sport IS DISTINCT FROM NEW.sport_id THEN
      RAISE EXCEPTION 'competition sport mismatch for event';
    END IF;
  END IF;

  IF NEW.season_id IS NOT NULL THEN
    IF NEW.competition_id IS NULL THEN
      RAISE EXCEPTION 'event season requires competition_id';
    END IF;

    SELECT competition_id INTO v_season_competition
    FROM seasons
    WHERE id = NEW.season_id;

    IF v_season_competition IS DISTINCT FROM NEW.competition_id THEN
      RAISE EXCEPTION 'season does not belong to event competition';
    END IF;

    SELECT sport_id INTO v_season_sport
    FROM competitions
    WHERE id = v_season_competition;

    IF v_season_sport IS DISTINCT FROM NEW.sport_id THEN
      RAISE EXCEPTION 'season sport mismatch for event';
    END IF;
  END IF;

  IF NEW.home_participant_id IS NOT NULL THEN
    SELECT sport_id INTO v_home_sport
    FROM participants
    WHERE id = NEW.home_participant_id;

    IF v_home_sport IS DISTINCT FROM NEW.sport_id THEN
      RAISE EXCEPTION 'home participant sport mismatch for event';
    END IF;
  END IF;

  IF NEW.away_participant_id IS NOT NULL THEN
    SELECT sport_id INTO v_away_sport
    FROM participants
    WHERE id = NEW.away_participant_id;

    IF v_away_sport IS DISTINCT FROM NEW.sport_id THEN
      RAISE EXCEPTION 'away participant sport mismatch for event';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_validate_event_relationships
BEFORE INSERT OR UPDATE ON events
FOR EACH ROW
EXECUTE FUNCTION validate_event_relationships();

CREATE OR REPLACE FUNCTION validate_broadcast_rights_relationships()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_season_competition uuid;
  v_platform_broadcaster uuid;
BEGIN
  IF NEW.season_id IS NOT NULL THEN
    SELECT competition_id INTO v_season_competition
    FROM seasons
    WHERE id = NEW.season_id;

    IF v_season_competition IS DISTINCT FROM NEW.competition_id THEN
      RAISE EXCEPTION 'season does not belong to broadcast right competition';
    END IF;
  END IF;

  IF NEW.platform_id IS NOT NULL THEN
    SELECT broadcaster_id INTO v_platform_broadcaster
    FROM platforms
    WHERE id = NEW.platform_id;

    IF v_platform_broadcaster IS DISTINCT FROM NEW.broadcaster_id THEN
      RAISE EXCEPTION 'platform does not belong to broadcaster';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_validate_broadcast_rights_relationships
BEFORE INSERT OR UPDATE ON broadcast_rights
FOR EACH ROW
EXECUTE FUNCTION validate_broadcast_rights_relationships();

CREATE OR REPLACE FUNCTION validate_event_broadcast_relationships()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_event record;
  v_right record;
  v_platform_broadcaster uuid;
BEGIN
  SELECT sport_id, competition_id, season_id, is_published
    INTO v_event
    FROM events
    WHERE id = NEW.event_id;

  IF NEW.platform_id IS NOT NULL THEN
    SELECT broadcaster_id INTO v_platform_broadcaster
    FROM platforms
    WHERE id = NEW.platform_id;

    IF v_platform_broadcaster IS DISTINCT FROM NEW.broadcaster_id THEN
      RAISE EXCEPTION 'platform does not belong to broadcaster';
    END IF;
  END IF;

  IF NEW.broadcast_right_id IS NOT NULL THEN
    SELECT * INTO v_right
    FROM broadcast_rights
    WHERE id = NEW.broadcast_right_id;

    IF v_event.competition_id IS DISTINCT FROM v_right.competition_id THEN
      RAISE EXCEPTION 'event broadcast right competition mismatch';
    END IF;

    IF v_right.season_id IS NOT NULL THEN
      IF v_event.season_id IS DISTINCT FROM v_right.season_id THEN
        RAISE EXCEPTION 'event broadcast right season mismatch';
      END IF;
    END IF;

    IF NEW.territory_id IS DISTINCT FROM v_right.territory_id THEN
      RAISE EXCEPTION 'event broadcast territory mismatch for right';
    END IF;

    IF NEW.broadcaster_id IS DISTINCT FROM v_right.broadcaster_id THEN
      RAISE EXCEPTION 'event broadcast broadcaster mismatch for right';
    END IF;

    IF COALESCE(NEW.platform_id::text, '') IS DISTINCT FROM COALESCE(v_right.platform_id::text, '') THEN
      RAISE EXCEPTION 'event broadcast platform mismatch for right';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_validate_event_broadcast_relationships
BEFORE INSERT OR UPDATE ON event_broadcasts
FOR EACH ROW
EXECUTE FUNCTION validate_event_broadcast_relationships();

CREATE OR REPLACE FUNCTION validate_competition_sport_on_parent_update()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM events e
    WHERE e.competition_id = NEW.id
      AND e.sport_id IS DISTINCT FROM NEW.sport_id
  ) THEN
    RAISE EXCEPTION 'cannot change competition sport because events already reference it';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_validate_competition_sport_on_parent_update
BEFORE UPDATE OF sport_id ON competitions
FOR EACH ROW
EXECUTE FUNCTION validate_competition_sport_on_parent_update();

CREATE OR REPLACE FUNCTION validate_season_competition_on_parent_update()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM events e
    WHERE e.season_id = NEW.id
      AND e.competition_id IS DISTINCT FROM NEW.competition_id
  ) THEN
    RAISE EXCEPTION 'cannot move season to another competition because events already reference it';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM broadcast_rights br
    WHERE br.season_id = NEW.id
      AND br.competition_id IS DISTINCT FROM NEW.competition_id
  ) THEN
    RAISE EXCEPTION 'cannot move season to another competition because broadcast rights already reference it';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_validate_season_competition_on_parent_update
BEFORE UPDATE OF competition_id ON seasons
FOR EACH ROW
EXECUTE FUNCTION validate_season_competition_on_parent_update();

CREATE OR REPLACE FUNCTION validate_broadcast_right_parent_updates()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM event_broadcasts eb
    JOIN events e ON e.id = eb.event_id
    WHERE eb.broadcast_right_id = NEW.id
      AND (
        e.competition_id IS DISTINCT FROM NEW.competition_id
        OR (NEW.season_id IS NOT NULL AND e.season_id IS DISTINCT FROM NEW.season_id)
        OR eb.territory_id IS DISTINCT FROM NEW.territory_id
        OR eb.broadcaster_id IS DISTINCT FROM NEW.broadcaster_id
        OR COALESCE(eb.platform_id::text, '') IS DISTINCT FROM COALESCE(NEW.platform_id::text, '')
      )
  ) THEN
    RAISE EXCEPTION 'cannot update broadcast right because existing event broadcasts no longer match it';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_validate_broadcast_right_parent_updates
BEFORE UPDATE OF competition_id, season_id, territory_id, broadcaster_id, platform_id, access_type, coverage_type, valid_from, valid_to ON broadcast_rights
FOR EACH ROW
EXECUTE FUNCTION validate_broadcast_right_parent_updates();

CREATE OR REPLACE FUNCTION validate_platform_broadcaster_on_parent_update()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM broadcast_rights br
    WHERE br.platform_id = NEW.id
      AND br.broadcaster_id IS DISTINCT FROM NEW.broadcaster_id
  ) THEN
    RAISE EXCEPTION 'cannot move platform to another broadcaster because broadcast rights already reference it';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM event_broadcasts eb
    WHERE eb.platform_id = NEW.id
      AND eb.broadcaster_id IS DISTINCT FROM NEW.broadcaster_id
  ) THEN
    RAISE EXCEPTION 'cannot move platform to another broadcaster because event broadcasts already reference it';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_validate_platform_broadcaster_on_parent_update
BEFORE UPDATE OF broadcaster_id ON platforms
FOR EACH ROW
EXECUTE FUNCTION validate_platform_broadcaster_on_parent_update();

CREATE INDEX ix_events_calendar
  ON events (competition_id, season_id, event_date, scheduled_date, status);

CREATE INDEX ix_events_home_team
  ON events (home_participant_id);

CREATE INDEX ix_events_away_team
  ON events (away_participant_id);

CREATE INDEX ix_events_date
  ON events (event_date);

CREATE INDEX ix_broadcast_rights_competition
  ON broadcast_rights (competition_id, season_id, territory_id, broadcaster_id, platform_id);

CREATE INDEX ix_event_broadcasts_event
  ON event_broadcasts (event_id, decision);

CREATE INDEX ix_event_broadcasts_publication
  ON event_broadcasts (is_published, verification_status, last_verified_at);

ALTER TABLE sports ENABLE ROW LEVEL SECURITY;
ALTER TABLE competitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE seasons ENABLE ROW LEVEL SECURITY;
ALTER TABLE territories ENABLE ROW LEVEL SECURITY;
ALTER TABLE participant_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_urls ENABLE ROW LEVEL SECURITY;
ALTER TABLE broadcasters ENABLE ROW LEVEL SECURITY;
ALTER TABLE platforms ENABLE ROW LEVEL SECURITY;
ALTER TABLE languages ENABLE ROW LEVEL SECURITY;
ALTER TABLE broadcast_rights ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_broadcasts ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_external_ids ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_updates ENABLE ROW LEVEL SECURITY;

CREATE POLICY public_select_sports ON sports FOR SELECT USING (true);
CREATE POLICY public_select_competitions ON competitions FOR SELECT USING (true);
CREATE POLICY public_select_seasons ON seasons FOR SELECT USING (true);
CREATE POLICY public_select_territories ON territories FOR SELECT USING (true);
CREATE POLICY public_select_participant_categories ON participant_categories FOR SELECT USING (true);
CREATE POLICY public_select_participants ON participants FOR SELECT USING (true);
CREATE POLICY public_select_languages ON languages FOR SELECT USING (true);

CREATE POLICY public_select_events
  ON events FOR SELECT
  USING (is_published = true);

CREATE POLICY public_select_event_urls
  ON event_urls FOR SELECT
  USING (
    is_active = true
    AND EXISTS (
      SELECT 1
      FROM events e
      WHERE e.id = event_urls.event_id
        AND e.is_published = true
    )
  );

CREATE POLICY public_select_broadcasters ON broadcasters FOR SELECT USING (true);
CREATE POLICY public_select_platforms ON platforms FOR SELECT USING (true);

CREATE POLICY public_select_broadcast_rights
  ON broadcast_rights FOR SELECT
  USING (is_published = true);

CREATE POLICY public_select_event_broadcasts
  ON event_broadcasts FOR SELECT
  USING (
    is_published = true
    AND decision = 'included'
    AND EXISTS (
      SELECT 1
      FROM events e
      WHERE e.id = event_broadcasts.event_id
        AND e.is_published = true
    )
  );

CREATE POLICY no_public_write_sports ON sports FOR ALL USING (false) WITH CHECK (false);
CREATE POLICY no_public_write_competitions ON competitions FOR ALL USING (false) WITH CHECK (false);
CREATE POLICY no_public_write_seasons ON seasons FOR ALL USING (false) WITH CHECK (false);
CREATE POLICY no_public_write_territories ON territories FOR ALL USING (false) WITH CHECK (false);
CREATE POLICY no_public_write_participant_categories ON participant_categories FOR ALL USING (false) WITH CHECK (false);
CREATE POLICY no_public_write_participants ON participants FOR ALL USING (false) WITH CHECK (false);
CREATE POLICY no_public_write_events ON events FOR ALL USING (false) WITH CHECK (false);
CREATE POLICY no_public_write_event_urls ON event_urls FOR ALL USING (false) WITH CHECK (false);
CREATE POLICY no_public_write_broadcasters ON broadcasters FOR ALL USING (false) WITH CHECK (false);
CREATE POLICY no_public_write_platforms ON platforms FOR ALL USING (false) WITH CHECK (false);
CREATE POLICY no_public_write_languages ON languages FOR ALL USING (false) WITH CHECK (false);
CREATE POLICY no_public_write_broadcast_rights ON broadcast_rights FOR ALL USING (false) WITH CHECK (false);
CREATE POLICY no_public_write_event_broadcasts ON event_broadcasts FOR ALL USING (false) WITH CHECK (false);


-- Revalidate existing broadcasts when their event changes competition/season.
CREATE FUNCTION validate_event_broadcasts_on_event_update()
RETURNS trigger LANGUAGE plpgsql SET search_path = public, pg_catalog AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.event_broadcasts eb
    JOIN public.broadcast_rights br ON br.id = eb.broadcast_right_id
    WHERE eb.event_id = OLD.id AND (
      NEW.competition_id IS DISTINCT FROM br.competition_id
      OR (br.season_id IS NOT NULL AND NEW.season_id IS DISTINCT FROM br.season_id)
    )
  ) THEN
    RAISE EXCEPTION USING ERRCODE = '23514',
      MESSAGE = 'event update conflicts with existing broadcast rights';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER trg_event_broadcasts_on_event_update
BEFORE UPDATE OF competition_id, season_id ON public.events
FOR EACH ROW EXECUTE FUNCTION validate_event_broadcasts_on_event_update();

CREATE FUNCTION validate_participant_sport_on_parent_update()
RETURNS trigger LANGUAGE plpgsql SET search_path = public, pg_catalog AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.events e
    WHERE (e.home_participant_id = OLD.id OR e.away_participant_id = OLD.id)
      AND e.sport_id IS DISTINCT FROM NEW.sport_id
  ) THEN
    RAISE EXCEPTION USING ERRCODE = '23514',
      MESSAGE = 'participant sport update conflicts with existing events';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER trg_participant_sport_on_parent_update
BEFORE UPDATE OF sport_id ON public.participants
FOR EACH ROW EXECUTE FUNCTION validate_participant_sport_on_parent_update();

-- Explicit privileges on this migration's tables only.
REVOKE ALL PRIVILEGES ON TABLE public.sports FROM PUBLIC, anon, authenticated;
REVOKE ALL PRIVILEGES ON TABLE public.competitions FROM PUBLIC, anon, authenticated;
REVOKE ALL PRIVILEGES ON TABLE public.seasons FROM PUBLIC, anon, authenticated;
REVOKE ALL PRIVILEGES ON TABLE public.territories FROM PUBLIC, anon, authenticated;
REVOKE ALL PRIVILEGES ON TABLE public.participant_categories FROM PUBLIC, anon, authenticated;
REVOKE ALL PRIVILEGES ON TABLE public.participants FROM PUBLIC, anon, authenticated;
REVOKE ALL PRIVILEGES ON TABLE public.events FROM PUBLIC, anon, authenticated;
REVOKE ALL PRIVILEGES ON TABLE public.event_urls FROM PUBLIC, anon, authenticated;
REVOKE ALL PRIVILEGES ON TABLE public.broadcasters FROM PUBLIC, anon, authenticated;
REVOKE ALL PRIVILEGES ON TABLE public.platforms FROM PUBLIC, anon, authenticated;
REVOKE ALL PRIVILEGES ON TABLE public.languages FROM PUBLIC, anon, authenticated;
REVOKE ALL PRIVILEGES ON TABLE public.broadcast_rights FROM PUBLIC, anon, authenticated;
REVOKE ALL PRIVILEGES ON TABLE public.event_broadcasts FROM PUBLIC, anon, authenticated;
REVOKE ALL PRIVILEGES ON TABLE public.event_external_ids FROM PUBLIC, anon, authenticated;
REVOKE ALL PRIVILEGES ON TABLE public.event_updates FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.sports TO anon, authenticated;
GRANT SELECT ON TABLE public.competitions TO anon, authenticated;
GRANT SELECT ON TABLE public.seasons TO anon, authenticated;
GRANT SELECT ON TABLE public.territories TO anon, authenticated;
GRANT SELECT ON TABLE public.participant_categories TO anon, authenticated;
GRANT SELECT ON TABLE public.participants TO anon, authenticated;
GRANT SELECT ON TABLE public.events TO anon, authenticated;
GRANT SELECT ON TABLE public.event_urls TO anon, authenticated;
GRANT SELECT ON TABLE public.broadcasters TO anon, authenticated;
GRANT SELECT ON TABLE public.platforms TO anon, authenticated;
GRANT SELECT ON TABLE public.languages TO anon, authenticated;
GRANT SELECT ON TABLE public.broadcast_rights TO anon, authenticated;
GRANT SELECT ON TABLE public.event_broadcasts TO anon, authenticated;

COMMIT;
