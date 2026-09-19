BEGIN;
SET LOCAL search_path = public, pg_catalog;

UPDATE public.media_assets
SET storage_url='https://www.footylogos.com/downloads/logo/europa-league-symbol-logo-footylogos.svg',
    source_name='FootyLogos',
    source_url='https://www.footylogos.com/logos/europa-league-symbol',
    source_type='reputable_secondary',
    alt_text='UEFA Europa League symbol',
    license_note='Transparent standalone Europa League symbol without the competition wordmark; trademark rights remain with UEFA.',
    verification_status='approved',
    verified_at=now(),
    updated_at=now()
WHERE entity_type='competition'
  AND asset_kind='competition_logo'
  AND entity_key='competition:851fa58d-5fd9-4319-8d31-c4fbf3e68717'
  AND is_current=true;

UPDATE public.media_assets
SET storage_url='https://www.footylogos.com/downloads/logo/ligue-1-france-logo-square-footylogos.svg',
    source_name='FootyLogos',
    source_url='https://www.footylogos.com/fr/logos/ligue-1-france',
    source_type='reputable_secondary',
    alt_text='Ligue 1 compact square mark',
    license_note='Transparent compact Ligue 1 identity selected for small dark UI cards; trademark rights remain with the competition.',
    verification_status='approved',
    verified_at=now(),
    updated_at=now()
WHERE entity_type='competition'
  AND asset_kind='competition_logo'
  AND entity_key='competition:054f5090-1a48-4d30-abf8-60cf7f75b575'
  AND is_current=true;

UPDATE public.media_assets
SET storage_url='https://assets.laliga.com/assets/logos/LL_RGB_v_monocromatic_negativo/LL_RGB_v_monocromatic_negativo.png',
    source_name='LALIGA',
    source_url='https://www.laliga.com/en-BR/pressroom/logos-and-corporate-dossier/logos',
    source_type='league',
    alt_text='LALIGA white standalone symbol',
    license_note='Official LALIGA standalone negative symbol for dark backgrounds; transparent PNG. Trademark rights remain with LALIGA.',
    verification_status='approved',
    verified_at=now(),
    updated_at=now()
WHERE entity_type='competition'
  AND asset_kind='competition_logo'
  AND entity_key='competition:d187ed93-1eb3-4536-9508-b5e6401557b8'
  AND is_current=true;

UPDATE public.media_assets
SET storage_url='https://commons.wikimedia.org/wiki/Special:FilePath/The_Football_Association_Cup_trophy.svg',
    source_name='Wikimedia Commons',
    source_url='https://commons.wikimedia.org/wiki/File:The_Football_Association_Cup_trophy.svg',
    source_type='reputable_secondary',
    alt_text='FA Cup trophy symbol',
    license_note='Transparent standalone FA Cup trophy illustration; Commons file is CC0. Competition/trophy trademark considerations remain separate.',
    verification_status='approved',
    verified_at=now(),
    updated_at=now()
WHERE entity_type='competition'
  AND asset_kind='competition_logo'
  AND entity_key='competition:745c8523-36ba-407d-8d50-c81b0bab1f9a'
  AND is_current=true;

COMMIT;
