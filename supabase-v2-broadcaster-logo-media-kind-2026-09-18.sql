BEGIN;
SET LOCAL search_path = public, pg_catalog;

ALTER TABLE public.media_assets
  DROP CONSTRAINT IF EXISTS media_assets_asset_kind_check;

ALTER TABLE public.media_assets
  ADD CONSTRAINT media_assets_asset_kind_check
  CHECK (asset_kind = ANY (ARRAY[
    'team_logo'::text,
    'competition_logo'::text,
    'league_logo'::text,
    'broadcaster_logo'::text,
    'venue_image'::text,
    'team_hero'::text,
    'circuit_layout'::text,
    'fighter_photo'::text,
    'event_artwork'::text
  ]));

COMMIT;
