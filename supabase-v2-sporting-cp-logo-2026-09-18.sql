BEGIN;
SET LOCAL search_path = public, pg_catalog;

INSERT INTO public.media_assets(
  asset_kind,entity_type,entity_key,source_name,source_url,source_type,storage_url,alt_text,
  license_note,verification_status,verified_at,is_current
)
VALUES(
  'team_logo','participant','sporting-cp','Sporting CP','https://www.sporting.pt/','official',
  'https://www.sporting.pt/sites/all/themes/jump/images/SVG/icon_new_emblema.svg',
  'Sporting CP logo',
  'Official club trademark/logo used for identification; external official club asset and not treated as freely licensed artwork.',
  'approved',now(),true
)
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
SET logo_url='https://www.sporting.pt/sites/all/themes/jump/images/SVG/icon_new_emblema.svg',
    updated_at=now()
FROM public.participants p
WHERE pp.participant_id=p.id
  AND p.slug='sporting-cp';

UPDATE public.enrichment_tasks
SET status='verified',
    verified_at=coalesce(verified_at,now()),
    updated_at=now()
WHERE entity_type='participant'
  AND entity_key='sporting-cp'
  AND task_kind='team_logo';

COMMIT;
