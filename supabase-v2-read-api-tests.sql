BEGIN;
SET LOCAL search_path = public, pg_catalog;

CREATE OR REPLACE FUNCTION pg_temp.assert_true(condition boolean, message text)
RETURNS void
LANGUAGE plpgsql
AS $function$
BEGIN
  IF condition IS DISTINCT FROM true THEN
    RAISE EXCEPTION 'FAIL: %', message;
  END IF;
  RAISE NOTICE 'PASS: %', message;
END;
$function$;

INSERT INTO sports (id, slug, name)
VALUES ('61000000-0000-4000-8000-000000000001', 'read-test-football', 'Read Test Football');

INSERT INTO competitions (id, sport_id, slug, name)
VALUES (
  '61000000-0000-4000-8000-000000000002',
  '61000000-0000-4000-8000-000000000001',
  'read-test-cup',
  'Read Test Cup'
);

INSERT INTO seasons (id, competition_id, slug, label)
VALUES (
  '61000000-0000-4000-8000-000000000003',
  '61000000-0000-4000-8000-000000000002',
  '2026',
  '2026'
);

INSERT INTO participants (
  id, sport_id, participant_type, slug, name, short_name, country_code
) VALUES
  (
    '61000000-0000-4000-8000-000000000004',
    '61000000-0000-4000-8000-000000000001',
    'country',
    'read-home',
    'Read Home',
    'RHM',
    'rh'
  ),
  (
    '61000000-0000-4000-8000-000000000005',
    '61000000-0000-4000-8000-000000000001',
    'country',
    'read-away',
    'Read Away',
    'RAW',
    'ra'
  );

INSERT INTO events (
  id,
  sport_id,
  competition_id,
  season_id,
  status,
  slug,
  event_date,
  scheduled_date,
  home_participant_id,
  away_participant_id,
  is_published,
  published_at,
  verification_status,
  last_verified_at
) VALUES
  (
    '61000000-0000-4000-8000-000000000006',
    '61000000-0000-4000-8000-000000000001',
    '61000000-0000-4000-8000-000000000002',
    '61000000-0000-4000-8000-000000000003',
    'scheduled',
    'read-home-vs-read-away',
    '2026-10-01 18:00:00+00',
    '2026-10-01 18:00:00+00',
    '61000000-0000-4000-8000-000000000004',
    '61000000-0000-4000-8000-000000000005',
    true,
    now(),
    'confirmed',
    now()
  ),
  (
    '61000000-0000-4000-8000-000000000007',
    '61000000-0000-4000-8000-000000000001',
    '61000000-0000-4000-8000-000000000002',
    '61000000-0000-4000-8000-000000000003',
    'scheduled',
    'unpublished-read-event',
    '2026-10-02 18:00:00+00',
    '2026-10-02 18:00:00+00',
    '61000000-0000-4000-8000-000000000004',
    '61000000-0000-4000-8000-000000000005',
    false,
    NULL,
    'confirmed',
    now()
  ),
  (
    '61000000-0000-4000-8000-000000000008',
    '61000000-0000-4000-8000-000000000001',
    '61000000-0000-4000-8000-000000000002',
    '61000000-0000-4000-8000-000000000003',
    'scheduled',
    'unconfirmed-read-event',
    '2026-10-03 18:00:00+00',
    '2026-10-03 18:00:00+00',
    '61000000-0000-4000-8000-000000000004',
    '61000000-0000-4000-8000-000000000005',
    true,
    now(),
    'expected',
    now()
  );

INSERT INTO event_urls (event_id, url_path, kind)
VALUES (
  '61000000-0000-4000-8000-000000000006',
  '/match/read-home-vs-read-away',
  'canonical'
);

INSERT INTO territories (id, code, name)
VALUES ('61000000-0000-4000-8000-000000000009', 'rt', 'Read Territory');

INSERT INTO broadcasters (id, slug, name, kind, website_url)
VALUES
  (
    '61000000-0000-4000-8000-000000000010',
    'read-tv',
    'Read TV',
    'linear',
    'https://example.test/read-tv'
  ),
  (
    '61000000-0000-4000-8000-000000000011',
    'hidden-tv',
    'Hidden TV',
    'linear',
    'https://example.test/hidden-tv'
  );

INSERT INTO event_broadcasts (
  id,
  event_id,
  territory_id,
  broadcaster_id,
  decision,
  access_type,
  official_url,
  language_codes,
  source_name,
  source_url,
  last_verified_at,
  verification_status,
  is_published,
  published_at,
  broadcast_type,
  access_conditions,
  requires_account,
  is_free_trial
) VALUES
  (
    '61000000-0000-4000-8000-000000000012',
    '61000000-0000-4000-8000-000000000006',
    '61000000-0000-4000-8000-000000000009',
    '61000000-0000-4000-8000-000000000010',
    'included',
    'Free',
    'https://example.test/watch',
    ARRAY['en'],
    'Read Test Source',
    'https://example.test/evidence',
    now(),
    'confirmed',
    true,
    now(),
    'live',
    'Free account required',
    true,
    false
  ),
  (
    '61000000-0000-4000-8000-000000000013',
    '61000000-0000-4000-8000-000000000006',
    '61000000-0000-4000-8000-000000000009',
    '61000000-0000-4000-8000-000000000011',
    'included',
    'Paid',
    'https://example.test/unconfirmed',
    ARRAY['en'],
    'Hidden Source',
    'https://example.test/hidden-evidence',
    now(),
    'expected',
    true,
    now(),
    'replay',
    NULL,
    false,
    false
  ),
  (
    '61000000-0000-4000-8000-000000000014',
    '61000000-0000-4000-8000-000000000006',
    '61000000-0000-4000-8000-000000000009',
    '61000000-0000-4000-8000-000000000011',
    'excluded',
    'Paid',
    'https://example.test/excluded',
    ARRAY['en'],
    'Hidden Source',
    'https://example.test/hidden-evidence',
    now(),
    'confirmed',
    true,
    now(),
    'highlights',
    NULL,
    false,
    false
  );

SET LOCAL ROLE anon;

SELECT pg_temp.assert_true(
  jsonb_array_length(public.get_public_events_v2()->'events') = 1,
  'anonymous readers receive only published and confirmed events'
);

SELECT pg_temp.assert_true(
  public.get_public_events_v2()#>>'{events,0,detailPath}' = '/match/read-home-vs-read-away',
  'the canonical historical event path is preserved'
);

SELECT pg_temp.assert_true(
  jsonb_array_length(public.get_public_events_v2()#>'{events,0,broadcasts}') = 1,
  'unconfirmed and excluded broadcasts stay private'
);

SELECT pg_temp.assert_true(
  public.get_public_events_v2()#>>'{events,0,broadcasts,0,broadcastType}' = 'live'
  AND public.get_public_events_v2()#>>'{events,0,broadcasts,0,access}' = 'Free',
  'the public contract distinguishes broadcast type and access'
);

SELECT pg_temp.assert_true(
  public.get_public_events_v2()::text NOT LIKE '%broadcastRightId%'
  AND public.get_public_events_v2()::text NOT LIKE '%provider%'
  AND public.get_public_events_v2()::text NOT LIKE '%externalId%',
  'the public payload excludes internal provider identifiers'
);

RESET ROLE;
SET LOCAL ROLE authenticated;

SELECT pg_temp.assert_true(
  jsonb_array_length(public.get_public_events_v2()->'events') = 1,
  'authenticated readers receive the same verified public event set'
);

RESET ROLE;
ROLLBACK;

\echo 'PASS: all V2 public read API assertions completed; test data rolled back'
