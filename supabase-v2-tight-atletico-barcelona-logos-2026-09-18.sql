
BEGIN;
SET LOCAL search_path = public, pg_catalog;

UPDATE public.media_assets
SET storage_url='https://img.uefa.com/imgml/TP/teams/logos/240x240/50124.png',
    source_name='UEFA',
    source_url='https://www.uefa.com/uefachampionsleague/clubs/50124/',
    source_type='governing_body',
    alt_text='Atlético de Madrid club crest',
    license_note='Official UEFA club crest used for editorial identification. Trademark rights remain with the club.',
    verification_status='approved',
    verified_at=now(),
    updated_at=now()
WHERE entity_type='participant'
  AND asset_kind='team_logo'
  AND entity_key='atletico-de-madrid'
  AND is_current=true;

UPDATE public.media_assets
SET storage_url='https://img.uefa.com/imgml/TP/teams/logos/240x240/50080.png',
    source_name='UEFA',
    source_url='https://www.uefa.com/uefachampionsleague/clubs/50080/',
    source_type='governing_body',
    alt_text='FC Barcelona club crest',
    license_note='Official UEFA club crest used for editorial identification. Trademark rights remain with the club.',
    verification_status='approved',
    verified_at=now(),
    updated_at=now()
WHERE entity_type='participant'
  AND asset_kind='team_logo'
  AND entity_key='barcelona'
  AND is_current=true;

UPDATE public.participant_profiles pp
SET logo_url=CASE p.slug
  WHEN 'atletico-de-madrid' THEN 'https://img.uefa.com/imgml/TP/teams/logos/240x240/50124.png'
  WHEN 'barcelona' THEN 'https://img.uefa.com/imgml/TP/teams/logos/240x240/50080.png'
  ELSE pp.logo_url
END,
updated_at=now()
FROM public.participants p
WHERE pp.participant_id=p.id
  AND p.slug IN ('atletico-de-madrid','barcelona');

COMMIT;
