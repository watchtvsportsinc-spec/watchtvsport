BEGIN;
SET LOCAL search_path = public, pg_catalog;

WITH uefa_logo_seed(entity_key,club_name,uefa_id) AS (
  VALUES
    ('aek-athens','AEK Athens','50129'),
    ('arsenal','Arsenal','52280'),
    ('aston-villa','Aston Villa','52683'),
    ('atletico-de-madrid','Atlético de Madrid','50124'),
    ('bayern-munchen','Bayern München','50037'),
    ('bodo-glimt','Bodø/Glimt','59333'),
    ('borussia-dortmund','Borussia Dortmund','52758'),
    ('club-brugge','Club Brugge','50043'),
    ('como','Como 1907','79946'),
    ('barcelona','FC Barcelona','50080')
)
UPDATE public.media_assets ma
SET
  storage_url='https://img.uefa.com/imgml/TP/teams/logos/240x240/'||s.uefa_id||'.png',
  source_name='UEFA',
  source_url='https://www.uefa.com/uefachampionsleague/clubs/'||s.uefa_id||'/',
  source_type='governing_body',
  alt_text=s.club_name||' club crest',
  license_note='Official UEFA 240x240 club crest used for editorial identification. Trademark rights remain with the club.',
  verification_status='approved',
  verified_at=now(),
  updated_at=now()
FROM uefa_logo_seed s
WHERE ma.entity_type='participant'
  AND ma.asset_kind='team_logo'
  AND ma.entity_key=s.entity_key
  AND ma.is_current=true;

WITH uefa_logo_seed(entity_key,uefa_id) AS (
  VALUES
    ('aek-athens','50129'),
    ('arsenal','52280'),
    ('aston-villa','52683'),
    ('atletico-de-madrid','50124'),
    ('bayern-munchen','50037'),
    ('bodo-glimt','59333'),
    ('borussia-dortmund','52758'),
    ('club-brugge','50043'),
    ('como','79946'),
    ('barcelona','50080')
)
UPDATE public.participant_profiles pp
SET logo_url='https://img.uefa.com/imgml/TP/teams/logos/240x240/'||s.uefa_id||'.png',
    updated_at=now()
FROM public.participants p
JOIN uefa_logo_seed s ON s.entity_key=p.slug
WHERE pp.participant_id=p.id;

UPDATE public.enrichment_tasks
SET status='verified',
    verified_at=coalesce(verified_at,now()),
    updated_at=now()
WHERE entity_type='participant'
  AND task_kind='team_logo'
  AND entity_key IN (
    'aek-athens','arsenal','aston-villa','atletico-de-madrid','bayern-munchen',
    'bodo-glimt','borussia-dortmund','club-brugge','como','barcelona'
  );

COMMIT;
