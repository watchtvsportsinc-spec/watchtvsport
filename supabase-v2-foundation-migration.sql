BEGIN;
SET LOCAL search_path = public, pg_catalog;

-- V2 foundation migration.
-- Apply once, after supabase-initial-migration.sql, on PostgreSQL 15+.

CREATE TABLE event_pages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sport_id uuid NOT NULL REFERENCES sports(id) ON DELETE RESTRICT,
  competition_id uuid NOT NULL REFERENCES competitions(id) ON DELETE RESTRICT,
  page_type text NOT NULL CHECK (
    page_type IN ('head_to_head', 'multi_session', 'multi_participant', 'standalone')
  ),
  slug text NOT NULL,
  title text NOT NULL,
  home_participant_id uuid REFERENCES participants(id) ON DELETE RESTRICT,
  away_participant_id uuid REFERENCES participants(id) ON DELETE RESTRICT,
  inverse_page_id uuid,
  is_published boolean NOT NULL DEFAULT false,
  published_at timestamptz,
  source_name text,
  source_url text,
  last_verified_at timestamptz,
  verification_status text NOT NULL DEFAULT 'unknown' CHECK (
    verification_status IN ('confirmed', 'expected', 'to_update', 'unknown')
  ),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (competition_id, slug),
  CHECK (btrim(slug) <> ''),
  CHECK (btrim(title) <> ''),
  CHECK (inverse_page_id IS NULL OR inverse_page_id <> id),
  CHECK (
    (
      page_type = 'head_to_head'
      AND home_participant_id IS NOT NULL
      AND away_participant_id IS NOT NULL
      AND home_participant_id <> away_participant_id
    )
    OR (
      page_type <> 'head_to_head'
      AND home_participant_id IS NULL
      AND away_participant_id IS NULL
      AND inverse_page_id IS NULL
    )
  )
);

ALTER TABLE event_pages
  ADD CONSTRAINT fk_event_pages_inverse_page
  FOREIGN KEY (inverse_page_id)
  REFERENCES event_pages(id)
  ON DELETE SET NULL
  DEFERRABLE INITIALLY DEFERRED;

CREATE TABLE event_page_urls (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_page_id uuid NOT NULL REFERENCES event_pages(id) ON DELETE CASCADE,
  url_path text NOT NULL UNIQUE,
  kind text NOT NULL CHECK (kind IN ('canonical', 'alias')),
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (url_path ~ '^/')
);

CREATE UNIQUE INDEX ux_event_page_urls_one_active_canonical
  ON event_page_urls (event_page_id)
  WHERE kind = 'canonical' AND is_active = true;

CREATE TABLE event_editions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_page_id uuid NOT NULL REFERENCES event_pages(id) ON DELETE RESTRICT,
  season_id uuid REFERENCES seasons(id) ON DELETE RESTRICT,
  edition_key text NOT NULL,
  label text NOT NULL,
  start_date date,
  end_date date,
  status text NOT NULL DEFAULT 'scheduled' CHECK (
    status IN ('scheduled', 'live', 'finished', 'postponed', 'cancelled', 'reported')
  ),
  is_published boolean NOT NULL DEFAULT false,
  published_at timestamptz,
  source_name text,
  source_url text,
  last_verified_at timestamptz,
  verification_status text NOT NULL DEFAULT 'unknown' CHECK (
    verification_status IN ('confirmed', 'expected', 'to_update', 'unknown')
  ),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (event_page_id, edition_key),
  CHECK (btrim(edition_key) <> ''),
  CHECK (btrim(label) <> ''),
  CHECK (start_date IS NULL OR end_date IS NULL OR end_date >= start_date)
);

CREATE TABLE event_page_external_ids (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_page_id uuid NOT NULL REFERENCES event_pages(id) ON DELETE CASCADE,
  provider text NOT NULL,
  external_id text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (provider, external_id),
  CHECK (btrim(provider) <> ''),
  CHECK (btrim(external_id) <> '')
);

CREATE TABLE event_edition_external_ids (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_edition_id uuid NOT NULL REFERENCES event_editions(id) ON DELETE CASCADE,
  provider text NOT NULL,
  external_id text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (provider, external_id),
  CHECK (btrim(provider) <> ''),
  CHECK (btrim(external_id) <> '')
);

CREATE TABLE participant_aliases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  participant_id uuid NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
  locale text,
  alias text NOT NULL,
  normalized_alias text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE NULLS NOT DISTINCT (participant_id, locale, normalized_alias),
  CHECK (btrim(alias) <> ''),
  CHECK (btrim(normalized_alias) <> '')
);

CREATE TABLE competition_aliases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  competition_id uuid NOT NULL REFERENCES competitions(id) ON DELETE CASCADE,
  locale text,
  alias text NOT NULL,
  normalized_alias text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE NULLS NOT DISTINCT (competition_id, locale, normalized_alias),
  CHECK (btrim(alias) <> ''),
  CHECK (btrim(normalized_alias) <> '')
);

ALTER TABLE events
  ADD COLUMN event_page_id uuid REFERENCES event_pages(id) ON DELETE RESTRICT,
  ADD COLUMN event_edition_id uuid REFERENCES event_editions(id) ON DELETE RESTRICT,
  ADD COLUMN event_kind text NOT NULL DEFAULT 'match' CHECK (
    event_kind IN ('match', 'session', 'standalone')
  ),
  ADD COLUMN session_type text,
  ADD COLUMN session_label text,
  ADD COLUMN sequence_number integer CHECK (sequence_number IS NULL OR sequence_number > 0),
  ADD COLUMN neutral_venue boolean NOT NULL DEFAULT false,
  ADD CONSTRAINT ck_events_v2_shape CHECK (
    (
      event_kind = 'session'
      AND event_page_id IS NOT NULL
      AND event_edition_id IS NOT NULL
      AND session_type IS NOT NULL
      AND btrim(session_type) <> ''
    )
    OR (
      event_kind <> 'session'
      AND event_edition_id IS NULL
      AND session_type IS NULL
      AND session_label IS NULL
      AND sequence_number IS NULL
    )
  );

CREATE TABLE event_participants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  participant_id uuid NOT NULL REFERENCES participants(id) ON DELETE RESTRICT,
  role text NOT NULL DEFAULT 'competitor',
  starting_position integer CHECK (starting_position IS NULL OR starting_position > 0),
  finishing_position integer CHECK (finishing_position IS NULL OR finishing_position > 0),
  result_data jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (event_id, participant_id),
  CHECK (btrim(role) <> '')
);

ALTER TABLE event_broadcasts
  ADD COLUMN broadcast_type text NOT NULL DEFAULT 'live' CHECK (
    broadcast_type IN ('live', 'delayed', 'replay', 'highlights')
  ),
  ADD COLUMN available_from timestamptz,
  ADD COLUMN available_until timestamptz,
  ADD COLUMN access_conditions text,
  ADD COLUMN requires_account boolean NOT NULL DEFAULT false,
  ADD COLUMN is_free_trial boolean NOT NULL DEFAULT false,
  ADD CONSTRAINT ck_event_broadcasts_availability_window CHECK (
    available_from IS NULL
    OR available_until IS NULL
    OR available_until >= available_from
  );

DO $migration$
DECLARE
  v_constraint_name text;
BEGIN
  SELECT c.conname
    INTO v_constraint_name
  FROM pg_constraint c
  WHERE c.conrelid = 'public.event_broadcasts'::regclass
    AND c.contype = 'u'
    AND pg_get_constraintdef(c.oid) =
      'UNIQUE NULLS NOT DISTINCT (event_id, broadcast_right_id, territory_id, broadcaster_id, platform_id)';

  IF v_constraint_name IS NULL THEN
    RAISE EXCEPTION 'expected event_broadcasts uniqueness constraint was not found';
  END IF;

  EXECUTE format(
    'ALTER TABLE public.event_broadcasts DROP CONSTRAINT %I',
    v_constraint_name
  );
END;
$migration$;

ALTER TABLE event_broadcasts
  ADD CONSTRAINT uq_event_broadcasts_offer
  UNIQUE NULLS NOT DISTINCT (
    event_id,
    broadcast_right_id,
    territory_id,
    broadcaster_id,
    platform_id,
    broadcast_type
  );

CREATE OR REPLACE FUNCTION validate_event_page_relationships()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_catalog
AS $$
DECLARE
  v_competition_sport uuid;
  v_home_sport uuid;
  v_away_sport uuid;
  v_inverse event_pages%ROWTYPE;
BEGIN
  SELECT sport_id INTO v_competition_sport
  FROM competitions
  WHERE id = NEW.competition_id;

  IF v_competition_sport IS DISTINCT FROM NEW.sport_id THEN
    RAISE EXCEPTION USING ERRCODE = '23514',
      MESSAGE = 'event page competition sport mismatch';
  END IF;

  IF NEW.home_participant_id IS NOT NULL THEN
    SELECT sport_id INTO v_home_sport
    FROM participants
    WHERE id = NEW.home_participant_id;

    IF v_home_sport IS DISTINCT FROM NEW.sport_id THEN
      RAISE EXCEPTION USING ERRCODE = '23514',
        MESSAGE = 'event page home participant sport mismatch';
    END IF;
  END IF;

  IF NEW.away_participant_id IS NOT NULL THEN
    SELECT sport_id INTO v_away_sport
    FROM participants
    WHERE id = NEW.away_participant_id;

    IF v_away_sport IS DISTINCT FROM NEW.sport_id THEN
      RAISE EXCEPTION USING ERRCODE = '23514',
        MESSAGE = 'event page away participant sport mismatch';
    END IF;
  END IF;

  IF NEW.inverse_page_id IS NOT NULL THEN
    SELECT * INTO v_inverse
    FROM event_pages
    WHERE id = NEW.inverse_page_id;

    IF NOT FOUND
      OR v_inverse.page_type <> 'head_to_head'
      OR v_inverse.sport_id IS DISTINCT FROM NEW.sport_id
      OR v_inverse.competition_id IS DISTINCT FROM NEW.competition_id
      OR v_inverse.home_participant_id IS DISTINCT FROM NEW.away_participant_id
      OR v_inverse.away_participant_id IS DISTINCT FROM NEW.home_participant_id
    THEN
      RAISE EXCEPTION USING ERRCODE = '23514',
        MESSAGE = 'inverse event page must use the same competition and reversed participants';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_validate_event_page_relationships
BEFORE INSERT OR UPDATE ON event_pages
FOR EACH ROW EXECUTE FUNCTION validate_event_page_relationships();

CREATE OR REPLACE FUNCTION validate_event_edition_relationships()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_catalog
AS $$
DECLARE
  v_page_type text;
  v_page_competition uuid;
  v_season_competition uuid;
BEGIN
  SELECT page_type, competition_id
    INTO v_page_type, v_page_competition
  FROM event_pages
  WHERE id = NEW.event_page_id;

  IF v_page_type IS DISTINCT FROM 'multi_session' THEN
    RAISE EXCEPTION USING ERRCODE = '23514',
      MESSAGE = 'event editions require a multi-session page';
  END IF;

  IF NEW.season_id IS NOT NULL THEN
    SELECT competition_id INTO v_season_competition
    FROM seasons
    WHERE id = NEW.season_id;

    IF v_season_competition IS DISTINCT FROM v_page_competition THEN
      RAISE EXCEPTION USING ERRCODE = '23514',
        MESSAGE = 'event edition season does not belong to page competition';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_validate_event_edition_relationships
BEFORE INSERT OR UPDATE ON event_editions
FOR EACH ROW EXECUTE FUNCTION validate_event_edition_relationships();

CREATE OR REPLACE FUNCTION validate_event_v2_relationships()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_catalog
AS $$
DECLARE
  v_page event_pages%ROWTYPE;
  v_edition event_editions%ROWTYPE;
BEGIN
  IF NEW.event_page_id IS NOT NULL THEN
    SELECT * INTO v_page
    FROM event_pages
    WHERE id = NEW.event_page_id;

    IF v_page.sport_id IS DISTINCT FROM NEW.sport_id
      OR v_page.competition_id IS DISTINCT FROM NEW.competition_id
    THEN
      RAISE EXCEPTION USING ERRCODE = '23514',
        MESSAGE = 'event does not belong to its permanent page';
    END IF;

    IF v_page.page_type = 'head_to_head' AND (
      NEW.event_kind <> 'match'
      OR NEW.home_participant_id IS DISTINCT FROM v_page.home_participant_id
      OR NEW.away_participant_id IS DISTINCT FROM v_page.away_participant_id
    ) THEN
      RAISE EXCEPTION USING ERRCODE = '23514',
        MESSAGE = 'head-to-head event participants do not match its permanent page';
    END IF;

    IF NEW.event_kind = 'session' AND v_page.page_type <> 'multi_session' THEN
      RAISE EXCEPTION USING ERRCODE = '23514',
        MESSAGE = 'session event requires a multi-session page';
    END IF;
  END IF;

  IF NEW.event_edition_id IS NOT NULL THEN
    SELECT * INTO v_edition
    FROM event_editions
    WHERE id = NEW.event_edition_id;

    IF v_edition.event_page_id IS DISTINCT FROM NEW.event_page_id THEN
      RAISE EXCEPTION USING ERRCODE = '23514',
        MESSAGE = 'event edition does not belong to event page';
    END IF;

    IF v_edition.season_id IS NOT NULL
      AND v_edition.season_id IS DISTINCT FROM NEW.season_id
    THEN
      RAISE EXCEPTION USING ERRCODE = '23514',
        MESSAGE = 'event season does not match its edition';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_validate_event_v2_relationships
BEFORE INSERT OR UPDATE ON events
FOR EACH ROW EXECUTE FUNCTION validate_event_v2_relationships();

CREATE OR REPLACE FUNCTION validate_event_participant_relationships()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_catalog
AS $$
DECLARE
  v_event_sport uuid;
  v_participant_sport uuid;
BEGIN
  SELECT sport_id INTO v_event_sport
  FROM events
  WHERE id = NEW.event_id;

  SELECT sport_id INTO v_participant_sport
  FROM participants
  WHERE id = NEW.participant_id;

  IF v_event_sport IS DISTINCT FROM v_participant_sport THEN
    RAISE EXCEPTION USING ERRCODE = '23514',
      MESSAGE = 'event participant sport mismatch';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_validate_event_participant_relationships
BEFORE INSERT OR UPDATE ON event_participants
FOR EACH ROW EXECUTE FUNCTION validate_event_participant_relationships();

CREATE OR REPLACE FUNCTION protect_event_page_parent_updates()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_catalog
AS $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM events e
    WHERE e.event_page_id = OLD.id
      AND (
        e.sport_id IS DISTINCT FROM NEW.sport_id
        OR e.competition_id IS DISTINCT FROM NEW.competition_id
        OR (
          NEW.page_type = 'head_to_head'
          AND (
            e.event_kind <> 'match'
            OR e.home_participant_id IS DISTINCT FROM NEW.home_participant_id
            OR e.away_participant_id IS DISTINCT FROM NEW.away_participant_id
          )
        )
        OR (e.event_kind = 'session' AND NEW.page_type <> 'multi_session')
      )
  ) THEN
    RAISE EXCEPTION USING ERRCODE = '23514',
      MESSAGE = 'event page update conflicts with existing events';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM event_pages p
    WHERE p.inverse_page_id = OLD.id
      AND (
        NEW.page_type <> 'head_to_head'
        OR p.sport_id IS DISTINCT FROM NEW.sport_id
        OR p.competition_id IS DISTINCT FROM NEW.competition_id
        OR p.home_participant_id IS DISTINCT FROM NEW.away_participant_id
        OR p.away_participant_id IS DISTINCT FROM NEW.home_participant_id
      )
  ) THEN
    RAISE EXCEPTION USING ERRCODE = '23514',
      MESSAGE = 'event page update conflicts with its inverse page';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_protect_event_page_parent_updates
BEFORE UPDATE OF sport_id, competition_id, page_type, home_participant_id, away_participant_id
ON event_pages
FOR EACH ROW EXECUTE FUNCTION protect_event_page_parent_updates();

CREATE OR REPLACE FUNCTION protect_event_edition_parent_updates()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_catalog
AS $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM events e
    WHERE e.event_edition_id = OLD.id
      AND (
        e.event_page_id IS DISTINCT FROM NEW.event_page_id
        OR (
          NEW.season_id IS NOT NULL
          AND e.season_id IS DISTINCT FROM NEW.season_id
        )
      )
  ) THEN
    RAISE EXCEPTION USING ERRCODE = '23514',
      MESSAGE = 'event edition update conflicts with existing sessions';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_protect_event_edition_parent_updates
BEFORE UPDATE OF event_page_id, season_id ON event_editions
FOR EACH ROW EXECUTE FUNCTION protect_event_edition_parent_updates();

CREATE OR REPLACE FUNCTION protect_v2_competition_sport_update()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_catalog
AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM event_pages p
    WHERE p.competition_id = OLD.id
      AND p.sport_id IS DISTINCT FROM NEW.sport_id
  ) THEN
    RAISE EXCEPTION USING ERRCODE = '23514',
      MESSAGE = 'competition sport update conflicts with permanent event pages';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_protect_v2_competition_sport_update
BEFORE UPDATE OF sport_id ON competitions
FOR EACH ROW EXECUTE FUNCTION protect_v2_competition_sport_update();

CREATE OR REPLACE FUNCTION protect_v2_season_competition_update()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_catalog
AS $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM event_editions ee
    JOIN event_pages ep ON ep.id = ee.event_page_id
    WHERE ee.season_id = OLD.id
      AND ep.competition_id IS DISTINCT FROM NEW.competition_id
  ) THEN
    RAISE EXCEPTION USING ERRCODE = '23514',
      MESSAGE = 'season competition update conflicts with event editions';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_protect_v2_season_competition_update
BEFORE UPDATE OF competition_id ON seasons
FOR EACH ROW EXECUTE FUNCTION protect_v2_season_competition_update();

CREATE OR REPLACE FUNCTION protect_v2_participant_sport_update()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_catalog
AS $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM event_pages p
    WHERE (p.home_participant_id = OLD.id OR p.away_participant_id = OLD.id)
      AND p.sport_id IS DISTINCT FROM NEW.sport_id
  ) OR EXISTS (
    SELECT 1
    FROM event_participants ep
    JOIN events e ON e.id = ep.event_id
    WHERE ep.participant_id = OLD.id
      AND e.sport_id IS DISTINCT FROM NEW.sport_id
  ) THEN
    RAISE EXCEPTION USING ERRCODE = '23514',
      MESSAGE = 'participant sport update conflicts with V2 event relationships';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_protect_v2_participant_sport_update
BEFORE UPDATE OF sport_id ON participants
FOR EACH ROW EXECUTE FUNCTION protect_v2_participant_sport_update();

CREATE INDEX ix_event_pages_navigation
  ON event_pages (sport_id, competition_id, is_published, slug);
CREATE INDEX ix_event_editions_page_dates
  ON event_editions (event_page_id, start_date DESC, end_date DESC);
CREATE INDEX ix_events_page_date
  ON events (event_page_id, event_date DESC)
  WHERE event_page_id IS NOT NULL;
CREATE INDEX ix_events_edition_date
  ON events (event_edition_id, event_date, sequence_number)
  WHERE event_edition_id IS NOT NULL;
CREATE INDEX ix_event_participants_participant_event
  ON event_participants (participant_id, event_id);
CREATE INDEX ix_participant_aliases_search
  ON participant_aliases (normalized_alias);
CREATE INDEX ix_competition_aliases_search
  ON competition_aliases (normalized_alias);
CREATE INDEX ix_event_broadcasts_public_lookup
  ON event_broadcasts (
    event_id,
    is_published,
    verification_status,
    decision,
    broadcast_type,
    territory_id
  );

ALTER TABLE event_pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_page_urls ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_editions ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_page_external_ids ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_edition_external_ids ENABLE ROW LEVEL SECURITY;
ALTER TABLE participant_aliases ENABLE ROW LEVEL SECURITY;
ALTER TABLE competition_aliases ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_participants ENABLE ROW LEVEL SECURITY;

CREATE POLICY public_select_event_pages
  ON event_pages FOR SELECT
  USING (is_published = true);

CREATE POLICY public_select_event_page_urls
  ON event_page_urls FOR SELECT
  USING (
    is_active = true
    AND EXISTS (
      SELECT 1
      FROM event_pages ep
      WHERE ep.id = event_page_urls.event_page_id
        AND ep.is_published = true
    )
  );

CREATE POLICY public_select_event_editions
  ON event_editions FOR SELECT
  USING (
    is_published = true
    AND EXISTS (
      SELECT 1
      FROM event_pages ep
      WHERE ep.id = event_editions.event_page_id
        AND ep.is_published = true
    )
  );

CREATE POLICY public_select_participant_aliases
  ON participant_aliases FOR SELECT USING (true);
CREATE POLICY public_select_competition_aliases
  ON competition_aliases FOR SELECT USING (true);

CREATE POLICY public_select_event_participants
  ON event_participants FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM events e
      WHERE e.id = event_participants.event_id
        AND e.is_published = true
    )
  );

CREATE POLICY no_public_write_event_pages
  ON event_pages FOR ALL USING (false) WITH CHECK (false);
CREATE POLICY no_public_write_event_page_urls
  ON event_page_urls FOR ALL USING (false) WITH CHECK (false);
CREATE POLICY no_public_write_event_editions
  ON event_editions FOR ALL USING (false) WITH CHECK (false);
CREATE POLICY no_public_write_event_page_external_ids
  ON event_page_external_ids FOR ALL USING (false) WITH CHECK (false);
CREATE POLICY no_public_write_event_edition_external_ids
  ON event_edition_external_ids FOR ALL USING (false) WITH CHECK (false);
CREATE POLICY no_public_write_participant_aliases
  ON participant_aliases FOR ALL USING (false) WITH CHECK (false);
CREATE POLICY no_public_write_competition_aliases
  ON competition_aliases FOR ALL USING (false) WITH CHECK (false);
CREATE POLICY no_public_write_event_participants
  ON event_participants FOR ALL USING (false) WITH CHECK (false);

DROP POLICY public_select_broadcast_rights ON broadcast_rights;
CREATE POLICY public_select_broadcast_rights
  ON broadcast_rights FOR SELECT
  USING (
    is_published = true
    AND verification_status = 'confirmed'
  );

DROP POLICY public_select_event_broadcasts ON event_broadcasts;
CREATE POLICY public_select_event_broadcasts
  ON event_broadcasts FOR SELECT
  USING (
    is_published = true
    AND verification_status = 'confirmed'
    AND decision = 'included'
    AND EXISTS (
      SELECT 1
      FROM events e
      WHERE e.id = event_broadcasts.event_id
        AND e.is_published = true
    )
  );

REVOKE ALL PRIVILEGES ON TABLE public.event_pages FROM PUBLIC, anon, authenticated;
REVOKE ALL PRIVILEGES ON TABLE public.event_page_urls FROM PUBLIC, anon, authenticated;
REVOKE ALL PRIVILEGES ON TABLE public.event_editions FROM PUBLIC, anon, authenticated;
REVOKE ALL PRIVILEGES ON TABLE public.event_page_external_ids FROM PUBLIC, anon, authenticated;
REVOKE ALL PRIVILEGES ON TABLE public.event_edition_external_ids FROM PUBLIC, anon, authenticated;
REVOKE ALL PRIVILEGES ON TABLE public.participant_aliases FROM PUBLIC, anon, authenticated;
REVOKE ALL PRIVILEGES ON TABLE public.competition_aliases FROM PUBLIC, anon, authenticated;
REVOKE ALL PRIVILEGES ON TABLE public.event_participants FROM PUBLIC, anon, authenticated;

GRANT SELECT ON TABLE public.event_pages TO anon, authenticated;
GRANT SELECT ON TABLE public.event_page_urls TO anon, authenticated;
GRANT SELECT ON TABLE public.event_editions TO anon, authenticated;
GRANT SELECT ON TABLE public.participant_aliases TO anon, authenticated;
GRANT SELECT ON TABLE public.competition_aliases TO anon, authenticated;
GRANT SELECT ON TABLE public.event_participants TO anon, authenticated;

COMMIT;
