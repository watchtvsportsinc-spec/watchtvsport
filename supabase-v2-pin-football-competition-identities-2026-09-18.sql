BEGIN;
SET LOCAL search_path=public,pg_catalog;

UPDATE public.competitions SET display_name='Ligue 1' WHERE slug='ligue-1';

UPDATE public.media_assets
SET storage_url='https://www.footylogos.com/downloads/logo/europa-league-symbol-logo-footylogos.svg',
    source_name='FootyLogos',
    source_url='https://www.footylogos.com/logos/europa-league-symbol',
    source_type='reputable_secondary',
    alt_text='UEFA Europa League standalone symbol',
    verification_status='approved',
    verified_at=now(),
    updated_at=now()
WHERE entity_type='competition' AND asset_kind='competition_logo'
  AND entity_key='competition:851fa58d-5fd9-4319-8d31-c4fbf3e68717' AND is_current=true;

UPDATE public.media_assets
SET storage_url='https://logo.premierleague.com/img/lion-light.svg',
    source_name='Premier League',
    source_url='https://logo.premierleague.com/',
    source_type='league',
    alt_text='Premier League lion symbol',
    verification_status='approved',
    verified_at=now(),
    updated_at=now()
WHERE entity_type='competition' AND asset_kind='competition_logo'
  AND entity_key='competition:30fdad8e-914b-49cf-a7cc-f7d5e807f1aa' AND is_current=true;

UPDATE public.media_assets
SET storage_url='https://assets.footylogos.com/logos/ligue-1-france/ligue-1-france-logo-footylogos.svg',
    source_name='FootyLogos',
    source_url='https://www.footylogos.com/fr/logos/ligue-1-france',
    source_type='reputable_secondary',
    alt_text='Ligue 1 sponsor-free logo',
    verification_status='approved',
    verified_at=now(),
    updated_at=now()
WHERE entity_type='competition' AND asset_kind='competition_logo'
  AND entity_key='competition:054f5090-1a48-4d30-abf8-60cf7f75b575' AND is_current=true;

UPDATE public.media_assets
SET storage_url='https://commons.wikimedia.org/wiki/Special:FilePath/Bundesliga_logo_(2017).svg',
    source_name='Wikimedia Commons',
    source_url='https://en.wikipedia.org/wiki/Bundesliga',
    source_type='reputable_secondary',
    alt_text='Bundesliga player icon',
    verification_status='approved',
    verified_at=now(),
    updated_at=now()
WHERE entity_type='competition' AND asset_kind='competition_logo'
  AND entity_key='competition:14e50bbf-8a14-49d8-89de-160a7aa3ea10' AND is_current=true;

UPDATE public.media_assets
SET storage_url='https://foot-centre.fff.fr/wp-content/uploads/sites/9/2025/08/e200a7041387bf95d7d8cb417cbba561.png',
    source_name='FFF',
    source_url='https://foot-centre.fff.fr/simple/nouveau-logo-pour-la-coupe-de-france-credit-agricole/',
    source_type='governing_body',
    alt_text='Coupe de France Crédit Agricole 2025-26 official identity',
    verification_status='approved',
    verified_at=now(),
    updated_at=now()
WHERE entity_type='competition' AND asset_kind='competition_logo'
  AND entity_key='competition:6907c0c1-66f4-42ba-9054-ea541587a893' AND is_current=true;

COMMIT;
