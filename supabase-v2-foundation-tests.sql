\set ON_ERROR_STOP on
-- Local disposable database only, after both foundation migrations.
-- Run as the database owner, able to SET ROLE anon and authenticated.
-- All fixtures and helper functions are rolled back.

BEGIN;
SET LOCAL search_path = public, pg_catalog;

CREATE FUNCTION pg_temp.assert_true(condition boolean, test_name text)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  IF condition IS DISTINCT FROM true THEN
    RAISE EXCEPTION 'FAIL: %', test_name;
  END IF;
  RAISE NOTICE 'PASS: %', test_name;
END;
$$;

CREATE FUNCTION pg_temp.expect_error(
  statement text,
  expected_state text,
  expected_message text,
  test_name text
)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  actual_state text;
  actual_message text;
BEGIN
  BEGIN
    EXECUTE statement;
  EXCEPTION WHEN OTHERS THEN
    GET STACKED DIAGNOSTICS
      actual_state = RETURNED_SQLSTATE,
      actual_message = MESSAGE_TEXT;

    IF actual_state IS DISTINCT FROM expected_state THEN
      RAISE EXCEPTION
        'FAIL: % (expected SQLSTATE %, got %: %)',
        test_name, expected_state, actual_state, actual_message;
    END IF;

    IF expected_message IS NOT NULL
      AND actual_message IS DISTINCT FROM expected_message
    THEN
      RAISE EXCEPTION
        'FAIL: % (expected message %, got %)',
        test_name, expected_message, actual_message;
    END IF;

    RAISE NOTICE 'PASS: %', test_name;
    RETURN;
  END;

  RAISE EXCEPTION 'FAIL: % (operation unexpectedly succeeded)', test_name;
END;
$$;

INSERT INTO sports (id, slug, name) VALUES
  ('10000000-0000-4000-8000-000000000001', 'v2-football', 'V2 football'),
  ('10000000-0000-4000-8000-000000000002', 'v2-motorsport', 'V2 motorsport');

INSERT INTO competitions (id, sport_id, slug, name) VALUES
  (
    '10000000-0000-4000-8000-000000000010',
    '10000000-0000-4000-8000-000000000001',
    'v2-champions-league',
    'V2 Champions League'
  ),
  (
    '10000000-0000-4000-8000-000000000011',
    '10000000-0000-4000-8000-000000000001',
    'v2-other-football',
    'V2 other football'
  ),
  (
    '10000000-0000-4000-8000-000000000012',
    '10000000-0000-4000-8000-000000000002',
    'v2-formula-1',
    'V2 Formula 1'
  );

INSERT INTO seasons (id, competition_id, slug, label) VALUES
  (
    '10000000-0000-4000-8000-000000000020',
    '10000000-0000-4000-8000-000000000010',
    'v2-2026-27',
    '2026/27'
  ),
  (
    '10000000-0000-4000-8000-000000000021',
    '10000000-0000-4000-8000-000000000010',
    'v2-2027-28',
    '2027/28'
  ),
  (
    '10000000-0000-4000-8000-000000000022',
    '10000000-0000-4000-8000-000000000011',
    'v2-other-2026',
    '2026'
  ),
  (
    '10000000-0000-4000-8000-000000000023',
    '10000000-0000-4000-8000-000000000012',
    'v2-f1-2027',
    '2027'
  );

INSERT INTO participants (id, sport_id, participant_type, slug, name) VALUES
  (
    '10000000-0000-4000-8000-000000000030',
    '10000000-0000-4000-8000-000000000001',
    'club',
    'v2-barcelona',
    'FC Barcelona'
  ),
  (
    '10000000-0000-4000-8000-000000000031',
    '10000000-0000-4000-8000-000000000001',
    'club',
    'v2-real-madrid',
    'Real Madrid'
  ),
  (
    '10000000-0000-4000-8000-000000000032',
    '10000000-0000-4000-8000-000000000002',
    'individual',
    'v2-driver-a',
    'Driver A'
  ),
  (
    '10000000-0000-4000-8000-000000000033',
    '10000000-0000-4000-8000-000000000002',
    'individual',
    'v2-driver-b',
    'Driver B'
  );

INSERT INTO participant_aliases (
  id, participant_id, locale, alias, normalized_alias
) VALUES
  (
    '10000000-0000-4000-8000-000000000040',
    '10000000-0000-4000-8000-000000000030',
    'fr',
    'Barça',
    'barca'
  ),
  (
    '10000000-0000-4000-8000-000000000041',
    '10000000-0000-4000-8000-000000000030',
    'en',
    'Barcelona',
    'barcelona'
  );

INSERT INTO competition_aliases (
  id, competition_id, locale, alias, normalized_alias
) VALUES (
  '10000000-0000-4000-8000-000000000042',
  '10000000-0000-4000-8000-000000000010',
  'fr',
  'Ligue des champions',
  'ligue des champions'
);

SELECT pg_temp.expect_error(
  $sql$
    INSERT INTO participant_aliases (
      participant_id, locale, alias, normalized_alias
    ) VALUES (
      '10000000-0000-4000-8000-000000000030',
      'fr',
      'BARCA',
      'barca'
    )
  $sql$,
  '23505',
  NULL,
  'normalized participant aliases are unique per locale'
);

INSERT INTO event_pages (
  id, sport_id, competition_id, page_type, slug, title,
  home_participant_id, away_participant_id, is_published,
  verification_status
) VALUES
  (
    '10000000-0000-4000-8000-000000000050',
    '10000000-0000-4000-8000-000000000001',
    '10000000-0000-4000-8000-000000000010',
    'head_to_head',
    'barcelona-real-madrid',
    'Barcelona – Real Madrid',
    '10000000-0000-4000-8000-000000000030',
    '10000000-0000-4000-8000-000000000031',
    true,
    'confirmed'
  ),
  (
    '10000000-0000-4000-8000-000000000051',
    '10000000-0000-4000-8000-000000000001',
    '10000000-0000-4000-8000-000000000010',
    'head_to_head',
    'real-madrid-barcelona',
    'Real Madrid – Barcelona',
    '10000000-0000-4000-8000-000000000031',
    '10000000-0000-4000-8000-000000000030',
    true,
    'confirmed'
  ),
  (
    '10000000-0000-4000-8000-000000000052',
    '10000000-0000-4000-8000-000000000002',
    '10000000-0000-4000-8000-000000000012',
    'multi_session',
    'canadian-grand-prix',
    'Canadian Grand Prix',
    NULL,
    NULL,
    true,
    'confirmed'
  ),
  (
    '10000000-0000-4000-8000-000000000053',
    '10000000-0000-4000-8000-000000000002',
    '10000000-0000-4000-8000-000000000012',
    'multi_session',
    'private-grand-prix',
    'Private Grand Prix',
    NULL,
    NULL,
    false,
    'expected'
  );

UPDATE event_pages
SET inverse_page_id = '10000000-0000-4000-8000-000000000051'
WHERE id = '10000000-0000-4000-8000-000000000050';

UPDATE event_pages
SET inverse_page_id = '10000000-0000-4000-8000-000000000050'
WHERE id = '10000000-0000-4000-8000-000000000051';

INSERT INTO event_page_urls (event_page_id, url_path, kind) VALUES
  (
    '10000000-0000-4000-8000-000000000050',
    '/football/v2-champions-league/barcelona-real-madrid',
    'canonical'
  ),
  (
    '10000000-0000-4000-8000-000000000052',
    '/motorsport/v2-formula-1/canadian-grand-prix',
    'canonical'
  ),
  (
    '10000000-0000-4000-8000-000000000053',
    '/motorsport/v2-formula-1/private-grand-prix',
    'canonical'
  );

INSERT INTO event_page_external_ids (
  event_page_id, provider, external_id
) VALUES (
  '10000000-0000-4000-8000-000000000052',
  'v2-test-provider',
  'v2-test-grand-prix'
);

INSERT INTO event_editions (
  id, event_page_id, season_id, edition_key, label,
  start_date, end_date, is_published, verification_status
) VALUES
  (
    '10000000-0000-4000-8000-000000000060',
    '10000000-0000-4000-8000-000000000052',
    '10000000-0000-4000-8000-000000000023',
    '2027',
    '2027 Canadian Grand Prix',
    '2027-06-11',
    '2027-06-13',
    true,
    'confirmed'
  ),
  (
    '10000000-0000-4000-8000-000000000061',
    '10000000-0000-4000-8000-000000000053',
    '10000000-0000-4000-8000-000000000023',
    '2027',
    'Private 2027 edition',
    '2027-07-01',
    '2027-07-03',
    true,
    'confirmed'
  );

INSERT INTO event_edition_external_ids (
  event_edition_id, provider, external_id
) VALUES (
  '10000000-0000-4000-8000-000000000060',
  'v2-test-provider',
  'v2-test-grand-prix-2027'
);

INSERT INTO events (
  id, sport_id, competition_id, season_id, status, slug,
  event_date, home_participant_id, away_participant_id,
  event_page_id, event_kind, is_published, verification_status
) VALUES
  (
    '10000000-0000-4000-8000-000000000070',
    '10000000-0000-4000-8000-000000000001',
    '10000000-0000-4000-8000-000000000010',
    '10000000-0000-4000-8000-000000000020',
    'finished',
    'v2-barcelona-real-madrid-2026',
    '2026-11-04 20:00:00+00',
    '10000000-0000-4000-8000-000000000030',
    '10000000-0000-4000-8000-000000000031',
    '10000000-0000-4000-8000-000000000050',
    'match',
    true,
    'confirmed'
  ),
  (
    '10000000-0000-4000-8000-000000000071',
    '10000000-0000-4000-8000-000000000001',
    '10000000-0000-4000-8000-000000000010',
    '10000000-0000-4000-8000-000000000021',
    'scheduled',
    'v2-barcelona-real-madrid-2027',
    '2027-11-03 20:00:00+00',
    '10000000-0000-4000-8000-000000000030',
    '10000000-0000-4000-8000-000000000031',
    '10000000-0000-4000-8000-000000000050',
    'match',
    true,
    'confirmed'
  );

INSERT INTO events (
  id, sport_id, competition_id, season_id, status, slug,
  event_date, event_page_id, event_edition_id, event_kind,
  session_type, session_label, sequence_number,
  is_published, verification_status
) VALUES
  (
    '10000000-0000-4000-8000-000000000072',
    '10000000-0000-4000-8000-000000000002',
    '10000000-0000-4000-8000-000000000012',
    '10000000-0000-4000-8000-000000000023',
    'scheduled',
    'v2-canadian-gp-2027-qualifying',
    '2027-06-12 20:00:00+00',
    '10000000-0000-4000-8000-000000000052',
    '10000000-0000-4000-8000-000000000060',
    'session',
    'qualifying',
    'Qualifying',
    1,
    true,
    'confirmed'
  ),
  (
    '10000000-0000-4000-8000-000000000073',
    '10000000-0000-4000-8000-000000000002',
    '10000000-0000-4000-8000-000000000012',
    '10000000-0000-4000-8000-000000000023',
    'scheduled',
    'v2-canadian-gp-2027-race',
    '2027-06-13 18:00:00+00',
    '10000000-0000-4000-8000-000000000052',
    '10000000-0000-4000-8000-000000000060',
    'session',
    'race',
    'Race',
    2,
    true,
    'confirmed'
  );

INSERT INTO event_participants (
  event_id, participant_id, role, starting_position
) VALUES
  (
    '10000000-0000-4000-8000-000000000073',
    '10000000-0000-4000-8000-000000000032',
    'driver',
    1
  ),
  (
    '10000000-0000-4000-8000-000000000073',
    '10000000-0000-4000-8000-000000000033',
    'driver',
    2
  );

SELECT pg_temp.assert_true(
  (
    SELECT count(*) = 2
    FROM events
    WHERE event_page_id = '10000000-0000-4000-8000-000000000050'
  ),
  'one permanent matchup page keeps multiple dated events'
);

SELECT pg_temp.assert_true(
  (
    SELECT count(*) = 2
    FROM events
    WHERE event_edition_id = '10000000-0000-4000-8000-000000000060'
      AND event_kind = 'session'
  ),
  'one Grand Prix edition keeps multiple sessions'
);

SELECT pg_temp.assert_true(
  (
    SELECT inverse_page_id = '10000000-0000-4000-8000-000000000051'
    FROM event_pages
    WHERE id = '10000000-0000-4000-8000-000000000050'
  ),
  'inverse matchup page is linked explicitly'
);

SELECT pg_temp.expect_error(
  $sql$
    INSERT INTO event_pages (
      sport_id, competition_id, page_type, slug, title
    ) VALUES (
      '10000000-0000-4000-8000-000000000001',
      '10000000-0000-4000-8000-000000000010',
      'head_to_head',
      'v2-invalid-empty-matchup',
      'Invalid matchup'
    )
  $sql$,
  '23514',
  NULL,
  'head-to-head page requires two different participants'
);

SELECT pg_temp.expect_error(
  $sql$
    INSERT INTO event_editions (
      event_page_id, season_id, edition_key, label
    ) VALUES (
      '10000000-0000-4000-8000-000000000050',
      '10000000-0000-4000-8000-000000000020',
      'invalid',
      'Invalid edition'
    )
  $sql$,
  '23514',
  'event editions require a multi-session page',
  'edition cannot be attached to a matchup page'
);

SELECT pg_temp.expect_error(
  $sql$
    INSERT INTO events (
      sport_id, competition_id, season_id, status, slug,
      event_page_id, event_kind, session_type
    ) VALUES (
      '10000000-0000-4000-8000-000000000002',
      '10000000-0000-4000-8000-000000000012',
      '10000000-0000-4000-8000-000000000023',
      'scheduled',
      'v2-invalid-session-without-edition',
      '10000000-0000-4000-8000-000000000052',
      'session',
      'practice'
    )
  $sql$,
  '23514',
  NULL,
  'session requires an edition'
);

SELECT pg_temp.expect_error(
  $sql$
    INSERT INTO events (
      sport_id, competition_id, season_id, status, slug,
      home_participant_id, away_participant_id,
      event_page_id, event_kind
    ) VALUES (
      '10000000-0000-4000-8000-000000000001',
      '10000000-0000-4000-8000-000000000010',
      '10000000-0000-4000-8000-000000000020',
      'scheduled',
      'v2-invalid-reversed-event',
      '10000000-0000-4000-8000-000000000031',
      '10000000-0000-4000-8000-000000000030',
      '10000000-0000-4000-8000-000000000050',
      'match'
    )
  $sql$,
  '23514',
  'head-to-head event participants do not match its permanent page',
  'match participants follow the permanent page order'
);

SELECT pg_temp.expect_error(
  $sql$
    INSERT INTO event_participants (event_id, participant_id)
    VALUES (
      '10000000-0000-4000-8000-000000000073',
      '10000000-0000-4000-8000-000000000030'
    )
  $sql$,
  '23514',
  'event participant sport mismatch',
  'multi-participant event rejects a participant from another sport'
);

SELECT pg_temp.expect_error(
  $sql$
    UPDATE event_editions
    SET event_page_id = '10000000-0000-4000-8000-000000000053'
    WHERE id = '10000000-0000-4000-8000-000000000060'
  $sql$,
  '23514',
  'event edition update conflicts with existing sessions',
  'edition page cannot be changed inconsistently after sessions exist'
);

INSERT INTO territories (id, code, name) VALUES (
  '10000000-0000-4000-8000-000000000080',
  'v2-test',
  'V2 test territory'
);

INSERT INTO broadcasters (id, slug, name, kind) VALUES
  (
    '10000000-0000-4000-8000-000000000081',
    'v2-test-broadcaster',
    'V2 test broadcaster',
    'network'
  ),
  (
    '10000000-0000-4000-8000-000000000082',
    'v2-unconfirmed-broadcaster',
    'V2 unconfirmed broadcaster',
    'network'
  );

INSERT INTO platforms (id, broadcaster_id, slug, name) VALUES (
  '10000000-0000-4000-8000-000000000083',
  '10000000-0000-4000-8000-000000000081',
  'v2-test-platform',
  'V2 test platform'
);

INSERT INTO broadcast_rights (
  id, competition_id, season_id, territory_id,
  broadcaster_id, platform_id, coverage_type,
  is_published, verification_status
) VALUES
  (
    '10000000-0000-4000-8000-000000000090',
    '10000000-0000-4000-8000-000000000012',
    '10000000-0000-4000-8000-000000000023',
    '10000000-0000-4000-8000-000000000080',
    '10000000-0000-4000-8000-000000000081',
    '10000000-0000-4000-8000-000000000083',
    'full',
    true,
    'confirmed'
  ),
  (
    '10000000-0000-4000-8000-000000000091',
    '10000000-0000-4000-8000-000000000012',
    '10000000-0000-4000-8000-000000000023',
    '10000000-0000-4000-8000-000000000080',
    '10000000-0000-4000-8000-000000000082',
    NULL,
    'partial',
    true,
    'expected'
  );

INSERT INTO event_broadcasts (
  id, event_id, broadcast_right_id, territory_id,
  broadcaster_id, platform_id, decision, broadcast_type,
  is_published, verification_status
) VALUES
  (
    '10000000-0000-4000-8000-000000000100',
    '10000000-0000-4000-8000-000000000072',
    '10000000-0000-4000-8000-000000000090',
    '10000000-0000-4000-8000-000000000080',
    '10000000-0000-4000-8000-000000000081',
    '10000000-0000-4000-8000-000000000083',
    'included',
    'live',
    true,
    'confirmed'
  ),
  (
    '10000000-0000-4000-8000-000000000101',
    '10000000-0000-4000-8000-000000000073',
    '10000000-0000-4000-8000-000000000090',
    '10000000-0000-4000-8000-000000000080',
    '10000000-0000-4000-8000-000000000081',
    '10000000-0000-4000-8000-000000000083',
    'included',
    'live',
    true,
    'confirmed'
  ),
  (
    '10000000-0000-4000-8000-000000000102',
    '10000000-0000-4000-8000-000000000073',
    '10000000-0000-4000-8000-000000000090',
    '10000000-0000-4000-8000-000000000080',
    '10000000-0000-4000-8000-000000000081',
    '10000000-0000-4000-8000-000000000083',
    'included',
    'replay',
    true,
    'confirmed'
  ),
  (
    '10000000-0000-4000-8000-000000000103',
    '10000000-0000-4000-8000-000000000073',
    '10000000-0000-4000-8000-000000000091',
    '10000000-0000-4000-8000-000000000080',
    '10000000-0000-4000-8000-000000000082',
    NULL,
    'included',
    'delayed',
    true,
    'expected'
  ),
  (
    '10000000-0000-4000-8000-000000000104',
    '10000000-0000-4000-8000-000000000073',
    '10000000-0000-4000-8000-000000000090',
    '10000000-0000-4000-8000-000000000080',
    '10000000-0000-4000-8000-000000000081',
    '10000000-0000-4000-8000-000000000083',
    'excluded',
    'highlights',
    true,
    'confirmed'
  );

SELECT pg_temp.assert_true(
  (
    SELECT count(*) = 2
    FROM event_broadcasts
    WHERE event_id = '10000000-0000-4000-8000-000000000073'
      AND broadcast_right_id = '10000000-0000-4000-8000-000000000090'
      AND decision = 'included'
  ),
  'one event can have live and replay offers from the same platform'
);

SELECT pg_temp.assert_true(
  (
    SELECT count(DISTINCT event_id) = 2
    FROM event_broadcasts
    WHERE broadcast_right_id = '10000000-0000-4000-8000-000000000090'
      AND broadcast_type = 'live'
  ),
  'qualifying and race keep independent broadcast confirmations'
);

SELECT pg_temp.expect_error(
  $sql$
    INSERT INTO event_broadcasts (
      event_id, broadcast_right_id, territory_id, broadcaster_id,
      platform_id, decision, broadcast_type
    ) VALUES (
      '10000000-0000-4000-8000-000000000073',
      '10000000-0000-4000-8000-000000000090',
      '10000000-0000-4000-8000-000000000080',
      '10000000-0000-4000-8000-000000000081',
      '10000000-0000-4000-8000-000000000083',
      'excluded',
      'live'
    )
  $sql$,
  '23505',
  NULL,
  'same broadcast type cannot have contradictory duplicate decisions'
);

SET LOCAL ROLE anon;

SELECT pg_temp.assert_true(
  (
    SELECT count(*) = 3
    FROM event_pages
    WHERE id IN (
      '10000000-0000-4000-8000-000000000050',
      '10000000-0000-4000-8000-000000000051',
      '10000000-0000-4000-8000-000000000052',
      '10000000-0000-4000-8000-000000000053'
    )
  ),
  'anon sees published permanent pages only'
);

SELECT pg_temp.assert_true(
  (
    SELECT count(*) = 2
    FROM event_page_urls
    WHERE event_page_id IN (
      '10000000-0000-4000-8000-000000000050',
      '10000000-0000-4000-8000-000000000052',
      '10000000-0000-4000-8000-000000000053'
    )
  ),
  'anon sees URLs of published permanent pages only'
);

SELECT pg_temp.assert_true(
  (
    SELECT count(*) = 1
    FROM event_editions
    WHERE id IN (
      '10000000-0000-4000-8000-000000000060',
      '10000000-0000-4000-8000-000000000061'
    )
  ),
  'anon cannot see an edition whose permanent page is private'
);

SELECT pg_temp.assert_true(
  (
    SELECT count(*) = 2
    FROM event_participants
    WHERE event_id = '10000000-0000-4000-8000-000000000073'
  ),
  'anon sees participants for a published event'
);

SELECT pg_temp.assert_true(
  (
    SELECT array_agg(broadcast_type ORDER BY broadcast_type)
      = ARRAY['live', 'replay']::text[]
    FROM event_broadcasts
    WHERE event_id = '10000000-0000-4000-8000-000000000073'
  ),
  'anon sees confirmed included offers and their transmission type only'
);

SELECT pg_temp.assert_true(
  (
    SELECT count(*) = 1
    FROM broadcast_rights
    WHERE id IN (
      '10000000-0000-4000-8000-000000000090',
      '10000000-0000-4000-8000-000000000091'
    )
  ),
  'anon sees confirmed broadcast rights only'
);

SELECT pg_temp.expect_error(
  'SELECT 1 FROM public.event_page_external_ids LIMIT 1',
  '42501',
  NULL,
  'anon cannot read permanent-page provider IDs'
);

SELECT pg_temp.expect_error(
  'SELECT 1 FROM public.event_edition_external_ids LIMIT 1',
  '42501',
  NULL,
  'anon cannot read edition provider IDs'
);

SELECT pg_temp.expect_error(
  $sql$
    INSERT INTO public.event_pages (
      sport_id, competition_id, page_type, slug, title
    ) VALUES (
      '10000000-0000-4000-8000-000000000002',
      '10000000-0000-4000-8000-000000000012',
      'standalone',
      'anon-write',
      'Anon write'
    )
  $sql$,
  '42501',
  NULL,
  'anon cannot create a permanent page'
);

RESET ROLE;
SET LOCAL ROLE authenticated;

SELECT pg_temp.assert_true(
  (
    SELECT count(*) = 3
    FROM event_pages
    WHERE id IN (
      '10000000-0000-4000-8000-000000000050',
      '10000000-0000-4000-8000-000000000051',
      '10000000-0000-4000-8000-000000000052',
      '10000000-0000-4000-8000-000000000053'
    )
  ),
  'authenticated users have the same published-page visibility'
);

SELECT pg_temp.expect_error(
  'DELETE FROM public.event_editions',
  '42501',
  NULL,
  'authenticated users cannot delete editions'
);

RESET ROLE;
ROLLBACK;
\echo 'PASS: all V2 foundation assertions completed; test data rolled back'
