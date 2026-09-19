BEGIN;
SET LOCAL search_path = public, pg_catalog;

CREATE OR REPLACE FUNCTION public.ensure_competition_logo_task()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $function$
DECLARE
  v_entity_key text := 'competition:' || NEW.id::text;
  v_verified_at timestamptz;
  v_has_approved_logo boolean;
BEGIN
  IF NEW.is_active IS NOT TRUE THEN
    RETURN NEW;
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM public.media_assets ma
    WHERE ma.entity_type='competition'
      AND ma.entity_key IN (v_entity_key, NEW.slug)
      AND ma.asset_kind='competition_logo'
      AND ma.verification_status='approved'
      AND ma.is_current=true
      AND ma.storage_url IS NOT NULL
  ) INTO v_has_approved_logo;

  IF v_has_approved_logo THEN
    SELECT max(coalesce(ma.verified_at,ma.updated_at,ma.created_at))
      INTO v_verified_at
    FROM public.media_assets ma
    WHERE ma.entity_type='competition'
      AND ma.entity_key IN (v_entity_key, NEW.slug)
      AND ma.asset_kind='competition_logo'
      AND ma.verification_status='approved'
      AND ma.is_current=true
      AND ma.storage_url IS NOT NULL;
  END IF;

  INSERT INTO public.enrichment_tasks(
    entity_type,entity_key,task_kind,status,priority,source_hint,notes,verified_at
  )
  VALUES(
    'competition',
    v_entity_key,
    'competition_logo',
    CASE WHEN v_has_approved_logo THEN 'verified' ELSE 'pending' END,
    78,
    'Official competition, governing-body, league or licensed media source',
    'Collect a current competition logo with provenance. Keep it non-public until the media asset is approved for use.',
    CASE WHEN v_has_approved_logo THEN v_verified_at ELSE NULL END
  )
  ON CONFLICT (entity_type,entity_key,task_kind) DO UPDATE SET
    status=CASE
      WHEN EXCLUDED.status='verified' THEN 'verified'
      WHEN public.enrichment_tasks.status='verified' THEN 'verified'
      ELSE public.enrichment_tasks.status
    END,
    verified_at=coalesce(public.enrichment_tasks.verified_at,EXCLUDED.verified_at),
    updated_at=now();

  RETURN NEW;
END;
$function$;

REVOKE ALL ON FUNCTION public.ensure_competition_logo_task() FROM public,anon,authenticated;

DROP TRIGGER IF EXISTS trg_ensure_competition_logo_task ON public.competitions;
CREATE TRIGGER trg_ensure_competition_logo_task
AFTER INSERT OR UPDATE OF slug,is_active ON public.competitions
FOR EACH ROW
EXECUTE FUNCTION public.ensure_competition_logo_task();

INSERT INTO public.enrichment_tasks(
  entity_type,entity_key,task_kind,status,priority,source_hint,notes,verified_at
)
SELECT
  'competition',
  'competition:'||c.id::text,
  'competition_logo',
  CASE WHEN approved.verified_at IS NOT NULL THEN 'verified' ELSE 'pending' END,
  78,
  'Official competition, governing-body, league or licensed media source',
  'Collect a current competition logo with provenance. Keep it non-public until the media asset is approved for use.',
  approved.verified_at
FROM public.competitions c
LEFT JOIN LATERAL (
  SELECT max(coalesce(ma.verified_at,ma.updated_at,ma.created_at)) AS verified_at
  FROM public.media_assets ma
  WHERE ma.entity_type='competition'
    AND ma.entity_key IN ('competition:'||c.id::text,c.slug)
    AND ma.asset_kind='competition_logo'
    AND ma.verification_status='approved'
    AND ma.is_current=true
    AND ma.storage_url IS NOT NULL
) approved ON true
WHERE c.is_active=true
ON CONFLICT (entity_type,entity_key,task_kind) DO UPDATE SET
  status=CASE
    WHEN EXCLUDED.status='verified' THEN 'verified'
    WHEN public.enrichment_tasks.status='verified' THEN 'verified'
    ELSE public.enrichment_tasks.status
  END,
  verified_at=coalesce(public.enrichment_tasks.verified_at,EXCLUDED.verified_at),
  updated_at=now();

COMMIT;
