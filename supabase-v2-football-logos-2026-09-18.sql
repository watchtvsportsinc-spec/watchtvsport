BEGIN;
SET LOCAL search_path = public, pg_catalog;

WITH team_seed(entity_key,source_name,source_url,source_type,storage_url,alt_text,license_note) AS (
  VALUES
    ('arsenal','UEFA','https://www.uefa.com/uefachampionsleague/clubs/52280--arsenal/','governing_body','https://img.uefa.com/imgml/TP/teams/logos/240x240/52280.png','Arsenal club crest','Official UEFA club crest used for editorial identification. Trademark rights remain with the club.'),
    ('aek-athens','UEFA','https://www.uefa.com/','governing_body','https://img.uefa.com/imgml/TP/teams/logos/240x240/50129.png','AEK Athens club crest','Official UEFA club crest used for editorial identification. Trademark rights remain with the club.'),
    ('aston-villa','UEFA','https://www.uefa.com/','governing_body','https://img.uefa.com/imgml/TP/teams/logos/240x240/52683.png','Aston Villa club crest','Official UEFA club crest used for editorial identification. Trademark rights remain with the club.'),
    ('bodo-glimt','UEFA','https://www.uefa.com/','governing_body','https://img.uefa.com/imgml/TP/teams/logos/240x240/59333.png','Bodø/Glimt club crest','Official UEFA club crest used for editorial identification. Trademark rights remain with the club.'),
    ('club-brugge','UEFA','https://www.uefa.com/','governing_body','https://img.uefa.com/imgml/TP/teams/logos/240x240/50043.png','Club Brugge club crest','Official UEFA club crest used for editorial identification. Trademark rights remain with the club.')
)
INSERT INTO public.media_assets(
  asset_kind,entity_type,entity_key,source_name,source_url,source_type,storage_url,alt_text,
  license_note,verification_status,verified_at,is_current
)
SELECT 'team_logo','participant',entity_key,source_name,source_url,source_type,storage_url,alt_text,
       license_note,'approved',now(),true
FROM team_seed
ON CONFLICT (asset_kind,entity_type,entity_key) WHERE is_current=true
DO UPDATE SET
  source_name=EXCLUDED.source_name,
  source_url=EXCLUDED.source_url,
  source_type=EXCLUDED.source_type,
  storage_url=EXCLUDED.storage_url,
  alt_text=EXCLUDED.alt_text,
  license_note=EXCLUDED.license_note,
  verification_status='approved',
  verified_at=now(),
  updated_at=now();

UPDATE public.participant_profiles pp
SET logo_url=ma.storage_url,updated_at=now()
FROM public.participants p
JOIN public.media_assets ma
  ON ma.entity_type='participant'
 AND ma.entity_key=p.slug
 AND ma.asset_kind='team_logo'
 AND ma.is_current=true
 AND ma.verification_status='approved'
WHERE pp.participant_id=p.id
  AND p.slug IN ('arsenal','aek-athens','aston-villa','bodo-glimt','club-brugge');

UPDATE public.enrichment_tasks
SET status='verified',verified_at=coalesce(verified_at,now()),updated_at=now()
WHERE entity_type='participant'
  AND entity_key IN ('arsenal','aek-athens','aston-villa','bodo-glimt','club-brugge')
  AND task_kind='team_logo';

WITH competition_seed(entity_key,source_name,source_url,source_type,storage_url,alt_text,license_note) AS (
  VALUES
    ('competition:079aa3c7-ff17-4639-ba47-03f8ce804a37','UEFA','https://www.uefa.com/uefachampionsleague/','governing_body','https://commons.wikimedia.org/wiki/Special:FilePath/UEFA_Champions_League_logo_no_text.svg','UEFA Champions League logo','Competition trademark used for editorial identification; source artwork credited to UEFA.'),
    ('competition:851fa58d-5fd9-4319-8d31-c4fbf3e68717','UEFA','https://www.uefa.com/uefaeuropaleague/','governing_body','https://commons.wikimedia.org/wiki/Special:FilePath/UEFA_Europa_League_logo_(2024_version).svg','UEFA Europa League logo','Competition trademark used for editorial identification; source artwork credited to UEFA.'),
    ('competition:4bf6f382-00c9-43e6-aadf-6abffa53c373','UEFA','https://www.uefa.com/uefaconferenceleague/','governing_body','https://commons.wikimedia.org/wiki/Special:FilePath/UEFA_Conference_League_full_logo_(2024_version).svg','UEFA Conference League logo','Competition trademark used for editorial identification; source artwork credited to UEFA.'),
    ('competition:30fdad8e-914b-49cf-a7cc-f7d5e807f1aa','Premier League','https://www.premierleague.com/','league','https://commons.wikimedia.org/wiki/Special:FilePath/Premier_League.svg','Premier League logo','Competition trademark used for editorial identification.'),
    ('competition:054f5090-1a48-4d30-abf8-60cf7f75b575','LFP','https://ligue1.com/','league','https://commons.wikimedia.org/wiki/Special:FilePath/Logo_Ligue_1_McDonald%27s_2024.svg','Ligue 1 McDonald''s logo','Competition trademark used for editorial identification.'),
    ('competition:d187ed93-1eb3-4536-9508-b5e6401557b8','LALIGA','https://www.laliga.com/','league','https://commons.wikimedia.org/wiki/Special:FilePath/LaLiga_EA_Sports_2023_Vertical_Logo.svg','LALIGA EA SPORTS logo','Competition trademark used for editorial identification.'),
    ('competition:14e50bbf-8a14-49d8-89de-160a7aa3ea10','DFL','https://www.bundesliga.com/','league','https://commons.wikimedia.org/wiki/Special:FilePath/Bundesliga_logo.svg','Bundesliga logo','Competition trademark used for editorial identification.'),
    ('competition:a1bbf272-d4df-4b03-8b4b-01551769d33e','Lega Serie A','https://www.legaseriea.it/','league','https://commons.wikimedia.org/wiki/Special:FilePath/Serie_A.svg','Serie A logo','Competition trademark used for editorial identification.'),
    ('competition:cc536e76-d9c6-414b-80f4-b444b6975353','Major League Soccer','https://www.mlssoccer.com/','league','https://commons.wikimedia.org/wiki/Special:FilePath/MLS_crest_logo_RGB_gradient.svg','Major League Soccer logo','Competition trademark used for editorial identification.'),
    ('competition:745c8523-36ba-407d-8d50-c81b0bab1f9a','The FA','https://www.thefa.com/TheEmiratesFACup','governing_body','https://commons.wikimedia.org/wiki/Special:FilePath/Emirates_FA_Cup_Logo_2020.jpg','Emirates FA Cup logo','Competition trademark used for editorial identification.'),
    ('competition:6907c0c1-66f4-42ba-9054-ea541587a893','FFF','https://www.fff.fr/','governing_body','https://foot-centre.fff.fr/wp-content/uploads/sites/9/2025/08/e200a7041387bf95d7d8cb417cbba561.png','Coupe de France Crédit Agricole logo','Official FFF competition identity used for editorial identification.'),
    ('competition:a2e3ce66-44c0-4063-aa27-09f927dfc427','RFEF','https://rfef.es/','governing_body','https://commons.wikimedia.org/wiki/Special:FilePath/Copa_del_Rey_logo_(2021).svg','Copa del Rey logo','Competition trademark used for editorial identification.'),
    ('competition:ad6f7f66-cfed-4a5b-afdc-7f6a6301190b','FIFA','https://www.fifa.com/','governing_body','https://commons.wikimedia.org/wiki/Special:FilePath/2026_FIFA_World_Cup_emblem_(with_wordmark).svg','FIFA World Cup 2026 logo','Competition trademark used for editorial identification.'),
    ('competition:440ea3e4-83dd-4f47-8a1e-667cbde04b87','UEFA','https://www.uefa.com/euro2028/','governing_body','https://commons.wikimedia.org/wiki/Special:FilePath/UEFA_Euro_2028_logo.svg','UEFA Euro logo','Competition trademark used for editorial identification.'),
    ('competition:938324df-e9a6-4145-a44f-fb1df6a00c58','CONMEBOL','https://www.conmebol.com/copa-america/','governing_body','https://commons.wikimedia.org/wiki/Special:FilePath/Copa_America_wordmark.svg','Copa América logo','Competition trademark used for editorial identification.')
)
INSERT INTO public.media_assets(
  asset_kind,entity_type,entity_key,source_name,source_url,source_type,storage_url,alt_text,
  license_note,verification_status,verified_at,is_current
)
SELECT 'competition_logo','competition',entity_key,source_name,source_url,source_type,storage_url,alt_text,
       license_note,'approved',now(),true
FROM competition_seed
ON CONFLICT (asset_kind,entity_type,entity_key) WHERE is_current=true
DO UPDATE SET
  source_name=EXCLUDED.source_name,
  source_url=EXCLUDED.source_url,
  source_type=EXCLUDED.source_type,
  storage_url=EXCLUDED.storage_url,
  alt_text=EXCLUDED.alt_text,
  license_note=EXCLUDED.license_note,
  verification_status='approved',
  verified_at=now(),
  updated_at=now();

UPDATE public.enrichment_tasks
SET status='verified',verified_at=coalesce(verified_at,now()),updated_at=now()
WHERE entity_type='competition'
  AND task_kind='competition_logo'
  AND entity_key IN (
    'competition:079aa3c7-ff17-4639-ba47-03f8ce804a37',
    'competition:851fa58d-5fd9-4319-8d31-c4fbf3e68717',
    'competition:4bf6f382-00c9-43e6-aadf-6abffa53c373',
    'competition:30fdad8e-914b-49cf-a7cc-f7d5e807f1aa',
    'competition:054f5090-1a48-4d30-abf8-60cf7f75b575',
    'competition:d187ed93-1eb3-4536-9508-b5e6401557b8',
    'competition:14e50bbf-8a14-49d8-89de-160a7aa3ea10',
    'competition:a1bbf272-d4df-4b03-8b4b-01551769d33e',
    'competition:cc536e76-d9c6-414b-80f4-b444b6975353',
    'competition:745c8523-36ba-407d-8d50-c81b0bab1f9a',
    'competition:6907c0c1-66f4-42ba-9054-ea541587a893',
    'competition:a2e3ce66-44c0-4063-aa27-09f927dfc427',
    'competition:ad6f7f66-cfed-4a5b-afdc-7f6a6301190b',
    'competition:440ea3e4-83dd-4f47-8a1e-667cbde04b87',
    'competition:938324df-e9a6-4145-a44f-fb1df6a00c58'
  );

COMMIT;
