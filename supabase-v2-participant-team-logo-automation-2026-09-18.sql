BEGIN;
SET LOCAL search_path = public, pg_catalog;

-- Ensure every active team-like participant enters the logo enrichment workflow.
-- This does not auto-approve a logo: media_assets remains the provenance/approval gate.
CREATE OR REPLACE FUNCTION public.ensure_participant_team_logo_task()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $function$
DECLARE
  v_verified_at timestamptz;
  v_has_approved_logo boolean;
BEGIN
  IF NEW.participant_type NOT IN ('club','team','franchise','national_team') OR NEW.is_active IS NOT TRUE THEN
    RETURN NEW;
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM public.media_assets ma
    WHERE ma.entity_type='participant'
      AND ma.entity_key=NEW.slug
      AND ma.asset_kind='team_logo'
      AND ma.verification_status='approved'
      AND ma.is_current=true
      AND ma.storage_url IS NOT NULL
  ) INTO v_has_approved_logo;

  IF v_has_approved_logo THEN
    SELECT max(coalesce(ma.verified_at,ma.updated_at,ma.created_at))
      INTO v_verified_at
    FROM public.media_assets ma
    WHERE ma.entity_type='participant'
      AND ma.entity_key=NEW.slug
      AND ma.asset_kind='team_logo'
      AND ma.verification_status='approved'
      AND ma.is_current=true
      AND ma.storage_url IS NOT NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.enrichment_tasks t
    WHERE t.entity_type='participant'
      AND t.entity_key=NEW.slug
      AND t.task_kind='team_logo'
  ) THEN
    INSERT INTO public.enrichment_tasks(
      entity_type,entity_key,task_kind,status,priority,source_hint,notes,verified_at
    )
    VALUES(
      'participant',
      NEW.slug,
      'team_logo',
      CASE WHEN v_has_approved_logo THEN 'verified' ELSE 'pending' END,
      80,
      'Official participant, league, governing-body or licensed provider source',
      'Collect a current team logo with provenance. Keep it non-public until the media asset is approved for use.',
      CASE WHEN v_has_approved_logo THEN v_verified_at ELSE NULL END
    );
  ELSIF v_has_approved_logo THEN
    UPDATE public.enrichment_tasks
       SET status='verified',
           verified_at=coalesce(verified_at,v_verified_at,now()),
           updated_at=now()
     WHERE entity_type='participant'
       AND entity_key=NEW.slug
       AND task_kind='team_logo'
       AND status <> 'verified';
  END IF;

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_ensure_participant_team_logo_task ON public.participants;
CREATE TRIGGER trg_ensure_participant_team_logo_task
AFTER INSERT OR UPDATE OF participant_type,is_active,slug ON public.participants
FOR EACH ROW
EXECUTE FUNCTION public.ensure_participant_team_logo_task();

-- Backfill any active team-like participant that pre-dates the trigger.
INSERT INTO public.enrichment_tasks(
  entity_type,entity_key,task_kind,status,priority,source_hint,notes,verified_at
)
SELECT
  'participant',
  p.slug,
  'team_logo',
  CASE WHEN approved.verified_at IS NOT NULL THEN 'verified' ELSE 'pending' END,
  80,
  'Official participant, league, governing-body or licensed provider source',
  'Collect a current team logo with provenance. Keep it non-public until the media asset is approved for use.',
  approved.verified_at
FROM public.participants p
LEFT JOIN LATERAL (
  SELECT max(coalesce(ma.verified_at,ma.updated_at,ma.created_at)) AS verified_at
  FROM public.media_assets ma
  WHERE ma.entity_type='participant'
    AND ma.entity_key=p.slug
    AND ma.asset_kind='team_logo'
    AND ma.verification_status='approved'
    AND ma.is_current=true
    AND ma.storage_url IS NOT NULL
) approved ON true
WHERE p.participant_type IN ('club','team','franchise','national_team')
  AND p.is_active=true
  AND NOT EXISTS (
    SELECT 1
    FROM public.enrichment_tasks t
    WHERE t.entity_type='participant'
      AND t.entity_key=p.slug
      AND t.task_kind='team_logo'
  );

-- Reconcile old pending tasks when an approved current logo already exists.
UPDATE public.enrichment_tasks t
SET status='verified',
    verified_at=coalesce(
      t.verified_at,
      (
        SELECT max(coalesce(ma.verified_at,ma.updated_at,ma.created_at))
        FROM public.media_assets ma
        WHERE ma.entity_type='participant'
          AND ma.entity_key=t.entity_key
          AND ma.asset_kind='team_logo'
          AND ma.verification_status='approved'
          AND ma.is_current=true
          AND ma.storage_url IS NOT NULL
      ),
      now()
    ),
    updated_at=now()
WHERE t.entity_type='participant'
  AND t.task_kind='team_logo'
  AND EXISTS (
    SELECT 1
    FROM public.media_assets ma
    WHERE ma.entity_type='participant'
      AND ma.entity_key=t.entity_key
      AND ma.asset_kind='team_logo'
      AND ma.verification_status='approved'
      AND ma.is_current=true
      AND ma.storage_url IS NOT NULL
  )
  AND t.status <> 'verified';

COMMIT;
