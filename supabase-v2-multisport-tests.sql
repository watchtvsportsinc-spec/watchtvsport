BEGIN;
SET LOCAL search_path = public, pg_catalog;

-- Targeted assertions for supabase-v2-multisport-migration.sql.
-- Run only on a disposable PostgreSQL 15+ database after all prior V2 migrations.

DO $$
DECLARE
  v_sport_id uuid;
  v_competition_id uuid;
  v_season_id uuid;
  v_page_id uuid;
  v_edition_id uuid;
  v_event_id uuid;
BEGIN
  INSERT INTO sports (
    slug,
    name,
    public_slug,
    event_model,
    participant_page_policy,
    localized_labels,
    aliases
  ) VALUES (
    'test-formula-1',
    'Test Formula 1',
    'test-formula-1',
    'race_session',
    'none',
    '{"fr-CA":"Formule 1 test"}'::jsonb,
    ARRAY['test f1']
  )
  RETURNING id INTO v_sport_id;

  INSERT INTO competitions (sport_id, slug, name, is_active)
  VALUES (v_sport_id, 'test-f1-championship', 'Test F1 Championship', true)
  RETURNING id INTO v_competition_id;

  INSERT INTO seasons (
    competition_id, slug, label, start_date, end_date, is_current
  ) VALUES (
    v_competition_id, '2026', '2026', DATE '2026-01-01', DATE '2026-12-31', true
  )
  RETURNING id INTO v_season_id;

  INSERT INTO event_pages (
    sport_id,
    competition_id,
    page_type,
    entity_kind,
    slug,
    title,
    is_published,
    verification_status
  ) VALUES (
    v_sport_id,
    v_competition_id,
    'multi_session',
    'race_weekend',
    'test-canada',
    'Test Canadian Grand Prix',
    true,
    'confirmed'
  )
  RETURNING id INTO v_page_id;

  INSERT INTO event_editions (
    event_page_id,
    season_id,
    edition_key,
    label,
    start_date,
    end_date,
    round_number,
    venue_name,
    venue_city,
    country_code,
    timezone,
    is_published,
    verification_status
  ) VALUES (
    v_page_id,
    v_season_id,
    '2026',
    'Test Canadian Grand Prix 2026',
    DATE '2026-05-22',
    DATE '2026-05-24',
    7,
    'Test Circuit',
    'Montreal',
    'CA',
    'America/Toronto',
    true,
    'confirmed'
  )
  RETURNING id INTO v_edition_id;

  INSERT INTO events (
    sport_id,
    competition_id,
    season_id,
    status,
    slug,
    event_date,
    event_page_id,
    event_edition_id,
    event_kind,
    session_type,
    session_label,
    sequence_number,
    session_order,
    venue_name,
    venue_city,
    timezone,
    is_published,
    verification_status
  ) VALUES (
    v_sport_id,
    v_competition_id,
    v_season_id,
    'scheduled',
    'test-canada-race',
    TIMESTAMPTZ '2026-05-24 20:00:00+00',
    v_page_id,
    v_edition_id,
    'session',
    'race',
    'Race',
    5,
    5,
    'Test Circuit',
    'Montreal',
    'America/Toronto',
    true,
    'confirmed'
  )
  RETURNING id INTO v_event_id;

  IF NOT EXISTS (
    SELECT 1 FROM events WHERE id = v_event_id AND session_order = 5
  ) THEN
    RAISE EXCEPTION 'valid race session was not inserted';
  END IF;
END;
$$;

DO $$
DECLARE
  v_sport_id uuid;
  v_competition_id uuid;
BEGIN
  SELECT id INTO v_sport_id FROM sports WHERE slug = 'test-formula-1';
  SELECT id INTO v_competition_id FROM competitions WHERE slug = 'test-f1-championship';

  BEGIN
    INSERT INTO event_pages (
      sport_id, competition_id, page_type, entity_kind, slug, title
    ) VALUES (
      v_sport_id, v_competition_id, 'standalone', 'race_weekend',
      'invalid-weekend', 'Invalid weekend'
    );
    RAISE EXCEPTION 'expected invalid race weekend page to fail';
  EXCEPTION
    WHEN check_violation THEN
      IF SQLERRM <> 'race weekend pages must use multi_session page_type' THEN
        RAISE;
      END IF;
  END;
END;
$$;

DO $$
DECLARE
  v_sport_id uuid;
  v_competition_id uuid;
  v_season_id uuid;
BEGIN
  SELECT id INTO v_sport_id FROM sports WHERE slug = 'test-formula-1';
  SELECT id INTO v_competition_id FROM competitions WHERE slug = 'test-f1-championship';
  SELECT id INTO v_season_id FROM seasons WHERE slug = '2026' AND competition_id = v_competition_id;

  BEGIN
    INSERT INTO events (
      sport_id,
      competition_id,
      season_id,
      status,
      slug,
      event_date,
      event_kind,
      is_published,
      verification_status
    ) VALUES (
      v_sport_id,
      v_competition_id,
      v_season_id,
      'scheduled',
      'invalid-race-without-weekend',
      now(),
      'standalone',
      false,
      'unknown'
    );
    RAISE EXCEPTION 'expected race_session sport standalone event to fail';
  EXCEPTION
    WHEN check_violation THEN
      IF SQLERRM <> 'race_session sports require session events attached to a page and edition' THEN
        RAISE;
      END IF;
  END;
END;
$$;

ROLLBACK;
