\set ON_ERROR_STOP on
-- Local disposable database only, after all three V2 migrations.
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

SELECT pg_temp.assert_true(
  (
    SELECT count(*) = 4
      AND bool_and(access_method = 'web_reference')
      AND bool_and(reuse_status = 'restricted')
      AND bool_and(automatic_collection_enabled = false)
      AND bool_and(automatic_publication_enabled = false)
    FROM data_sources
    WHERE id::text LIKE '20000000-%'
  ),
  'official websites are registered as disabled reference sources'
);

SELECT pg_temp.assert_true(
  (
    SELECT count(*) = 5
      AND bool_and(coverage_status = 'reference_only')
    FROM source_scopes
    WHERE source_id::text LIKE '20000000-%'
  ),
  'launch reference pages have explicit non-automated scopes'
);

SELECT pg_temp.expect_error(
  $sql$
    UPDATE data_sources
    SET automatic_collection_enabled = true
    WHERE id = '20000000-0000-4000-8000-000000000001'
  $sql$,
  '23514',
  NULL,
  'restricted website cannot enable automatic collection'
);

INSERT INTO data_sources (
  id,
  slug,
  name,
  access_method,
  homepage_url,
  terms_url,
  reuse_status,
  commercial_use_allowed,
  terms_reviewed_at,
  pricing_status
) VALUES
  (
    '30000000-0000-4000-8000-000000000001',
    'v2-test-api-disabled',
    'V2 test API disabled',
    'api',
    'https://data.invalid/',
    'https://data.invalid/terms',
    'approved',
    true,
    '2026-09-14 00:00:00+00',
    'free'
  ),
  (
    '30000000-0000-4000-8000-000000000002',
    'v2-test-api-enabled',
    'V2 test API enabled',
    'api',
    'https://provider.invalid/',
    'https://provider.invalid/terms',
    'approved',
    true,
    '2026-09-14 00:00:00+00',
    'free'
  );

UPDATE data_sources
SET automatic_collection_enabled = true
WHERE id = '30000000-0000-4000-8000-000000000002';

INSERT INTO sports (id, slug, name) VALUES
  ('30000000-0000-4000-8000-000000000010', 'ingestion-football', 'Ingestion football'),
  ('30000000-0000-4000-8000-000000000011', 'ingestion-basketball', 'Ingestion basketball');

INSERT INTO competitions (id, sport_id, slug, name) VALUES (
  '30000000-0000-4000-8000-000000000020',
  '30000000-0000-4000-8000-000000000010',
  'ingestion-competition',
  'Ingestion competition'
);

INSERT INTO territories (id, code, name) VALUES (
  '30000000-0000-4000-8000-000000000021',
  'ingestion-test',
  'Ingestion test territory'
);

INSERT INTO source_scopes (
  source_id,
  data_domain,
  sport_id,
  competition_id,
  reference_url,
  coverage_status
) VALUES (
  '30000000-0000-4000-8000-000000000002',
  'calendar',
  '30000000-0000-4000-8000-000000000010',
  '30000000-0000-4000-8000-000000000020',
  'https://provider.invalid/calendar',
  'partial'
);

SELECT pg_temp.expect_error(
  $sql$
    INSERT INTO source_scopes (
      source_id, data_domain, sport_id, competition_id,
      reference_url, coverage_status
    ) VALUES (
      '30000000-0000-4000-8000-000000000002',
      'calendar',
      '30000000-0000-4000-8000-000000000011',
      '30000000-0000-4000-8000-000000000020',
      'https://provider.invalid/wrong-sport',
      'partial'
    )
  $sql$,
  '23514',
  'source scope competition sport mismatch',
  'source scope rejects competition from another sport'
);

SELECT pg_temp.expect_error(
  $sql$
    INSERT INTO import_runs (
      source_id, idempotency_key, run_mode, initiator_type, initiator_key
    ) VALUES (
      '30000000-0000-4000-8000-000000000001',
      'scheduled-disabled',
      'scheduled',
      'system',
      'test-scheduler'
    )
  $sql$,
  '23514',
  'scheduled import requires an enabled automatic source',
  'scheduled import cannot use a source with automation disabled'
);

INSERT INTO import_runs (
  id,
  source_id,
  idempotency_key,
  run_mode,
  initiator_type,
  initiator_key
) VALUES (
  '30000000-0000-4000-8000-000000000030',
  '30000000-0000-4000-8000-000000000002',
  'scheduled-valid',
  'scheduled',
  'system',
  'test-scheduler'
);

SELECT pg_temp.expect_error(
  $sql$
    INSERT INTO import_runs (
      source_id, idempotency_key, run_mode, initiator_type, initiator_key
    ) VALUES (
      '30000000-0000-4000-8000-000000000002',
      'scheduled-valid',
      'scheduled',
      'system',
      'test-scheduler'
    )
  $sql$,
  '23505',
  NULL,
  'source idempotency key prevents duplicate runs'
);

INSERT INTO import_runs (
  id,
  source_id,
  idempotency_key,
  run_mode,
  initiator_type,
  initiator_key
) VALUES (
  '30000000-0000-4000-8000-000000000031',
  '30000000-0000-4000-8000-000000000002',
  'empty-response',
  'manual',
  'human',
  'test-editor'
);

UPDATE import_runs
SET status = 'collecting'
WHERE id = '30000000-0000-4000-8000-000000000031';

SELECT pg_temp.expect_error(
  $sql$
    UPDATE import_runs
    SET
      status = 'collected',
      source_observed_at = '2026-09-14 10:00:00+00',
      input_hash = repeat('a', 64),
      record_count = 0
    WHERE id = '30000000-0000-4000-8000-000000000031'
  $sql$,
  '23514',
  'collected import must contain at least one record',
  'empty response cannot become a collected import'
);

INSERT INTO import_runs (
  id,
  source_id,
  idempotency_key,
  run_mode,
  initiator_type,
  initiator_key
) VALUES (
  '30000000-0000-4000-8000-000000000034',
  '30000000-0000-4000-8000-000000000002',
  'unchanged-response',
  'manual',
  'human',
  'test-editor'
);

UPDATE import_runs
SET status = 'collecting'
WHERE id = '30000000-0000-4000-8000-000000000034';

INSERT INTO import_items (
  id,
  import_run_id,
  item_index,
  entity_type,
  external_key,
  evidence_url,
  source_observed_at,
  payload,
  payload_hash
) VALUES (
  '30000000-0000-4000-8000-000000000043',
  '30000000-0000-4000-8000-000000000034',
  1,
  'event',
  'unchanged-event',
  'https://provider.invalid/events/unchanged',
  '2026-09-14 10:30:00+00',
  '{"status":"scheduled"}'::jsonb,
  repeat('9', 64)
);

UPDATE import_runs
SET
  status = 'collected',
  source_observed_at = '2026-09-14 10:30:00+00',
  input_hash = repeat('8', 64),
  record_count = 1
WHERE id = '30000000-0000-4000-8000-000000000034';

UPDATE import_runs
SET status = 'validating'
WHERE id = '30000000-0000-4000-8000-000000000034';

UPDATE import_items
SET
  validation_status = 'ignored',
  validation_notes = 'Payload hash matches the current record.'
WHERE id = '30000000-0000-4000-8000-000000000043';

UPDATE import_runs
SET status = 'unchanged'
WHERE id = '30000000-0000-4000-8000-000000000034';

SELECT pg_temp.assert_true(
  (
    SELECT status = 'unchanged' AND completed_at IS NOT NULL
    FROM import_runs
    WHERE id = '30000000-0000-4000-8000-000000000034'
  ),
  'idempotent no-op import completes without duplicate writes'
);

INSERT INTO import_runs (
  id,
  source_id,
  idempotency_key,
  run_mode,
  initiator_type,
  initiator_key
) VALUES (
  '30000000-0000-4000-8000-000000000032',
  '30000000-0000-4000-8000-000000000002',
  'conflicting-response',
  'manual',
  'human',
  'test-editor'
);

UPDATE import_runs
SET status = 'collecting'
WHERE id = '30000000-0000-4000-8000-000000000032';

INSERT INTO import_items (
  id,
  import_run_id,
  item_index,
  entity_type,
  external_key,
  evidence_url,
  source_observed_at,
  payload,
  payload_hash
) VALUES
  (
    '30000000-0000-4000-8000-000000000040',
    '30000000-0000-4000-8000-000000000032',
    1,
    'event',
    'test-event-a',
    'https://provider.invalid/events/a',
    '2026-09-14 10:00:00+00',
    '{"status":"scheduled"}'::jsonb,
    repeat('b', 64)
  ),
  (
    '30000000-0000-4000-8000-000000000041',
    '30000000-0000-4000-8000-000000000032',
    2,
    'event',
    'test-event-b',
    'https://provider.invalid/events/b',
    '2026-09-14 10:00:00+00',
    '{"status":"postponed"}'::jsonb,
    repeat('c', 64)
  );

SELECT pg_temp.expect_error(
  $sql$
    INSERT INTO import_items (
      import_run_id, item_index, entity_type, external_key,
      evidence_url, source_observed_at, payload, payload_hash
    ) VALUES (
      '30000000-0000-4000-8000-000000000032',
      3,
      'event',
      'test-event-a',
      'https://provider.invalid/events/a-duplicate',
      '2026-09-14 10:00:00+00',
      '{"status":"scheduled"}'::jsonb,
      repeat('d', 64)
    )
  $sql$,
  '23505',
  NULL,
  'same external entity cannot appear twice in one run'
);

UPDATE import_runs
SET
  status = 'collected',
  source_observed_at = '2026-09-14 10:00:00+00',
  input_hash = repeat('e', 64),
  record_count = 2
WHERE id = '30000000-0000-4000-8000-000000000032';

UPDATE import_runs
SET status = 'validating'
WHERE id = '30000000-0000-4000-8000-000000000032';

UPDATE import_items
SET validation_status = 'accepted'
WHERE id = '30000000-0000-4000-8000-000000000040';

UPDATE import_items
SET
  validation_status = 'conflict',
  validation_notes = 'Two sources report different start times.'
WHERE id = '30000000-0000-4000-8000-000000000041';

SELECT pg_temp.expect_error(
  $sql$
    UPDATE import_runs
    SET status = 'ready'
    WHERE id = '30000000-0000-4000-8000-000000000032'
  $sql$,
  '23514',
  'ready import requires accepted items and no unresolved items',
  'contradictory import cannot become ready'
);

UPDATE import_runs
SET status = 'rejected'
WHERE id = '30000000-0000-4000-8000-000000000032';

SELECT pg_temp.expect_error(
  $sql$
    UPDATE import_runs
    SET status = 'pending'
    WHERE id = '30000000-0000-4000-8000-000000000032'
  $sql$,
  '23514',
  'terminal import run cannot transition',
  'rejected import is terminal'
);

INSERT INTO import_runs (
  id,
  source_id,
  idempotency_key,
  run_mode,
  initiator_type,
  initiator_key
) VALUES (
  '30000000-0000-4000-8000-000000000033',
  '30000000-0000-4000-8000-000000000002',
  'applied-response',
  'manual',
  'human',
  'test-editor'
);

UPDATE import_runs
SET status = 'collecting'
WHERE id = '30000000-0000-4000-8000-000000000033';

INSERT INTO import_items (
  id,
  import_run_id,
  item_index,
  entity_type,
  external_key,
  evidence_url,
  source_observed_at,
  payload,
  payload_hash
) VALUES (
  '30000000-0000-4000-8000-000000000042',
  '30000000-0000-4000-8000-000000000033',
  1,
  'competition',
  'test-competition-external',
  'https://provider.invalid/competitions/test',
  '2026-09-14 11:00:00+00',
  '{"name":"Updated competition"}'::jsonb,
  repeat('f', 64)
);

UPDATE import_runs
SET
  status = 'collected',
  source_observed_at = '2026-09-14 11:00:00+00',
  input_hash = repeat('1', 64),
  record_count = 1
WHERE id = '30000000-0000-4000-8000-000000000033';

UPDATE import_runs
SET status = 'validating'
WHERE id = '30000000-0000-4000-8000-000000000033';

UPDATE import_items
SET
  validation_status = 'accepted',
  target_table = 'competitions',
  target_id = '30000000-0000-4000-8000-000000000020'
WHERE id = '30000000-0000-4000-8000-000000000042';

UPDATE import_runs
SET status = 'ready'
WHERE id = '30000000-0000-4000-8000-000000000033';

SELECT pg_temp.expect_error(
  $sql$
    UPDATE import_runs
    SET status = 'applying'
    WHERE id = '30000000-0000-4000-8000-000000000033'
  $sql$,
  '23514',
  'applying import requires an active lock',
  'import cannot apply without a concurrency lock'
);

UPDATE import_runs
SET
  status = 'applying',
  locked_by = 'test-worker',
  lock_expires_at = now() + interval '5 minutes',
  last_heartbeat_at = now()
WHERE id = '30000000-0000-4000-8000-000000000033';

INSERT INTO source_entity_links (
  id,
  source_id,
  entity_type,
  external_key,
  target_table,
  target_id,
  last_payload_hash,
  first_seen_at,
  last_seen_at,
  last_verified_at,
  protected_fields,
  protection_reason,
  protected_by,
  protected_at
) VALUES (
  '30000000-0000-4000-8000-000000000050',
  '30000000-0000-4000-8000-000000000002',
  'competition',
  'test-competition-external',
  'competitions',
  '30000000-0000-4000-8000-000000000020',
  repeat('f', 64),
  '2026-09-14 11:00:00+00',
  '2026-09-14 11:00:00+00',
  '2026-09-14 11:00:00+00',
  ARRAY['name'],
  'Editorial name correction',
  'test-editor',
  '2026-09-14 11:05:00+00'
);

SELECT pg_temp.expect_error(
  $sql$
    INSERT INTO import_changes (
      import_item_id, operation, target_table, target_id,
      changed_fields, before_data, after_data, applied_by
    ) VALUES (
      '30000000-0000-4000-8000-000000000042',
      'update',
      'competitions',
      '30000000-0000-4000-8000-000000000020',
      ARRAY['name'],
      '{"name":"Ingestion competition"}'::jsonb,
      '{"name":"Updated competition"}'::jsonb,
      'test-worker'
    )
  $sql$,
  '23514',
  'import change overlaps protected fields',
  'manual field protection blocks an automated overwrite'
);

UPDATE source_entity_links
SET
  protected_fields = '{}',
  protection_reason = NULL,
  protected_by = NULL,
  protected_at = NULL
WHERE id = '30000000-0000-4000-8000-000000000050';

INSERT INTO import_changes (
  id,
  import_item_id,
  operation,
  target_table,
  target_id,
  changed_fields,
  before_data,
  after_data,
  applied_by
) VALUES (
  '30000000-0000-4000-8000-000000000051',
  '30000000-0000-4000-8000-000000000042',
  'update',
  'competitions',
  '30000000-0000-4000-8000-000000000020',
  ARRAY['name'],
  '{"name":"Ingestion competition"}'::jsonb,
  '{"name":"Updated competition"}'::jsonb,
  'test-worker'
);

UPDATE import_items
SET validation_status = 'applied'
WHERE id = '30000000-0000-4000-8000-000000000042';

UPDATE import_runs
SET status = 'applied'
WHERE id = '30000000-0000-4000-8000-000000000033';

SELECT pg_temp.assert_true(
  (
    SELECT status = 'applied'
      AND completed_at IS NOT NULL
    FROM import_runs
    WHERE id = '30000000-0000-4000-8000-000000000033'
  ),
  'validated linked import completes with an audit snapshot'
);

SELECT pg_temp.assert_true(
  (
    SELECT count(*) = 1
    FROM import_changes
    WHERE import_item_id = '30000000-0000-4000-8000-000000000042'
      AND before_data ->> 'name' = 'Ingestion competition'
      AND after_data ->> 'name' = 'Updated competition'
  ),
  'change history keeps before and after values for restoration'
);

SET LOCAL ROLE anon;

SELECT pg_temp.expect_error(
  'SELECT 1 FROM public.data_sources LIMIT 1',
  '42501',
  NULL,
  'anon cannot read source licensing records'
);

SELECT pg_temp.expect_error(
  'SELECT 1 FROM public.import_runs LIMIT 1',
  '42501',
  NULL,
  'anon cannot read import operations'
);

RESET ROLE;
SET LOCAL ROLE authenticated;

SELECT pg_temp.expect_error(
  $sql$
    INSERT INTO public.import_runs (
      source_id, idempotency_key, run_mode, initiator_type, initiator_key
    ) VALUES (
      '30000000-0000-4000-8000-000000000002',
      'public-write',
      'manual',
      'human',
      'visitor'
    )
  $sql$,
  '42501',
  NULL,
  'authenticated visitor cannot create an import'
);

RESET ROLE;
ROLLBACK;
\echo 'PASS: all V2 ingestion assertions completed; test data rolled back'
