BEGIN;
SET LOCAL search_path = public, pg_catalog;

-- Dark-surface variants: every stored asset below has a transparent outer background.
UPDATE public.media_assets
SET storage_url='https://assets.footylogos.com/logos/uefa-champions-league-symbol-white/uefa-champions-league-symbol-white-logo-footylogos.svg',
    source_name='FootyLogos',
    source_url='https://www.footylogos.com/logos/uefa-champions-league-symbol-white',
    source_type='reputable_secondary',
    alt_text='UEFA Champions League white starball logo',
    license_note='Transparent white competition mark selected for dark UI. UEFA trademark; FootyLogos is the asset reference source.',
    verification_status='approved',
    verified_at=now(),
    updated_at=now()
WHERE entity_type='competition' AND asset_kind='competition_logo'
  AND entity_key='competition:079aa3c7-ff17-4639-ba47-03f8ce804a37' AND is_current=true;

UPDATE public.media_assets
SET storage_url='https://logo.premierleague.com/img/lion-light.svg',
    source_name='Premier League',
    source_url='https://logo.premierleague.com/',
    source_type='league',
    alt_text='Premier League white lion logo',
    license_note='Official Premier League negative/light mark for dark backgrounds; transparent SVG. Premier League trademark.',
    verification_status='approved',
    verified_at=now(),
    updated_at=now()
WHERE entity_type='competition' AND asset_kind='competition_logo'
  AND entity_key='competition:30fdad8e-914b-49cf-a7cc-f7d5e807f1aa' AND is_current=true;

UPDATE public.media_assets
SET storage_url='https://assets.footylogos.com/logos/serie-a-italy/serie-a-italy-logo-footylogos.svg',
    source_name='FootyLogos',
    source_url='https://www.footylogos.com/logos/serie-a-italy',
    source_type='reputable_secondary',
    alt_text='Serie A logo',
    license_note='Transparent SVG selected to avoid the white image canvas in the previous asset. Competition trademark.',
    verification_status='approved',
    verified_at=now(),
    updated_at=now()
WHERE entity_type='competition' AND asset_kind='competition_logo'
  AND entity_key='competition:a1bbf272-d4df-4b03-8b4b-01551769d33e' AND is_current=true;

UPDATE public.media_assets
SET storage_url='https://images.seeklogo.com/logo-png/47/1/emirates-fa-cup-logo-png_seeklogo-478798.png',
    source_name='SeekLogo',
    source_url='https://seeklogo.com/vector-logo/478798/emirates-fa-cup',
    source_type='reputable_secondary',
    alt_text='Emirates FA Cup logo',
    license_note='Transparent PNG selected instead of the previous JPEG with a baked background. The FA / Emirates trademarks.',
    verification_status='approved',
    verified_at=now(),
    updated_at=now()
WHERE entity_type='competition' AND asset_kind='competition_logo'
  AND entity_key='competition:745c8523-36ba-407d-8d50-c81b0bab1f9a' AND is_current=true;

UPDATE public.media_assets
SET storage_url='https://assets.footylogos.com/logos/coupe-de-france-logo-footylogos.svg',
    source_name='FootyLogos',
    source_url='https://www.footylogos.com/logos/coupe-de-france-logo-footylogos',
    source_type='reputable_secondary',
    alt_text='Coupe de France logo',
    license_note='Transparent SVG selected instead of the previous rectangular image asset. FFF competition trademark.',
    verification_status='approved',
    verified_at=now(),
    updated_at=now()
WHERE entity_type='competition' AND asset_kind='competition_logo'
  AND entity_key='competition:6907c0c1-66f4-42ba-9054-ea541587a893' AND is_current=true;

UPDATE public.media_assets
SET storage_url='https://commons.wikimedia.org/wiki/Special:FilePath/2026_FIFA_World_Cup_emblem_(dark_mode).svg',
    source_name='Wikimedia Commons',
    source_url='https://commons.wikimedia.org/wiki/File:2026_FIFA_World_Cup_emblem_(dark_mode).svg',
    source_type='reputable_secondary',
    alt_text='FIFA World Cup 2026 dark-mode emblem',
    license_note='Transparent SVG dark-surface variant; Commons file is CC BY-SA 4.0. FIFA/World Cup trademark considerations remain separate.',
    verification_status='approved',
    verified_at=now(),
    updated_at=now()
WHERE entity_type='competition' AND asset_kind='competition_logo'
  AND entity_key='competition:ad6f7f66-cfed-4a5b-afdc-7f6a6301190b' AND is_current=true;

COMMIT;
