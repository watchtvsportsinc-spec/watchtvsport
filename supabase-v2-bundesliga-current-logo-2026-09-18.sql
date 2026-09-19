
BEGIN;
SET LOCAL search_path=public,pg_catalog;

UPDATE public.media_assets
SET storage_url='https://assets.footylogos.com/logos/bundesliga-germany/bundesliga-germany-logo-footylogos.svg',
    source_name='FootyLogos',
    source_url='https://www.footylogos.com/logos/bundesliga-germany',
    source_type='reputable_secondary',
    alt_text='Bundesliga current logo',
    license_note='Current Bundesliga identity with transparent background. The card UI crops to the player symbol; trademark rights remain with Bundesliga.',
    verification_status='approved',
    verified_at=now(),
    updated_at=now()
WHERE entity_type='competition'
  AND asset_kind='competition_logo'
  AND entity_key='competition:14e50bbf-8a14-49d8-89de-160a7aa3ea10'
  AND is_current=true;

COMMIT;
