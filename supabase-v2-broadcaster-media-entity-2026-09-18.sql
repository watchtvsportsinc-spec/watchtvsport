BEGIN;
SET LOCAL search_path = public, pg_catalog;

ALTER TABLE public.media_assets
  DROP CONSTRAINT IF EXISTS media_assets_entity_type_check;

ALTER TABLE public.media_assets
  ADD CONSTRAINT media_assets_entity_type_check
  CHECK (entity_type = ANY (ARRAY[
    'participant'::text,
    'competition'::text,
    'broadcaster'::text,
    'venue'::text,
    'event'::text,
    'circuit'::text,
    'fighter'::text,
    'sport'::text
  ]));

COMMIT;
