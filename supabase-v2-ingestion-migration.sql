BEGIN;
SET LOCAL search_path = public, pg_catalog;

-- V2 ingestion control plane.
-- Apply once, after supabase-v2-foundation-migration.sql, on PostgreSQL 15+.
-- External websites are references only until their reuse status is approved.

CREATE TABLE data_sources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  access_method text NOT NULL CHECK (
    access_method IN ('manual', 'file', 'api', 'feed', 'web_reference')
  ),
  homepage_url text NOT NULL,
  terms_url text,
  reuse_status text NOT NULL DEFAULT 'unknown' CHECK (
    reuse_status IN ('approved', 'review_required', 'restricted', 'prohibited', 'unknown')
  ),
  commercial_use_allowed boolean,
  terms_summary text,
  terms_reviewed_at timestamptz,
  pricing_status text NOT NULL DEFAULT 'unknown' CHECK (
    pricing_status IN ('not_applicable', 'unknown', 'free', 'paid', 'mixed')
  ),
  estimated_monthly_cost_minor integer CHECK (
    estimated_monthly_cost_minor IS NULL OR estimated_monthly_cost_minor >= 0
  ),
  currency_code text CHECK (
    currency_code IS NULL OR currency_code ~ '^[A-Z]{3}$'
  ),
  quota_notes text,
  default_interval_minutes integer CHECK (
    default_interval_minutes IS NULL OR default_interval_minutes > 0
  ),
  is_enabled boolean NOT NULL DEFAULT true,
  automatic_collection_enabled boolean NOT NULL DEFAULT false,
  automatic_publication_enabled boolean NOT NULL DEFAULT false,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (
    jsonb_typeof(metadata) = 'object'
  ),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (btrim(slug) <> ''),
  CHECK (btrim(name) <> ''),
  CHECK (homepage_url ~ '^https://'),
  CHECK (terms_url IS NULL OR terms_url ~ '^https://'),
  CHECK (
    estimated_monthly_cost_minor IS NULL OR currency_code IS NOT NULL
  ),
  CHECK (
    automatic_collection_enabled = false
    OR (
      is_enabled = true
      AND reuse_status = 'approved'
      AND commercial_use_allowed = true
      AND terms_reviewed_at IS NOT NULL
      AND access_method IN ('file', 'api', 'feed')
    )
  ),
  CHECK (
    automatic_publication_enabled = false
    OR automatic_collection_enabled = true
  )
);

CREATE TABLE source_scopes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id uuid NOT NULL REFERENCES data_sources(id) ON DELETE CASCADE,
  data_domain text NOT NULL CHECK (
    data_domain IN ('calendar', 'broadcast', 'result')
  ),
  sport_id uuid REFERENCES sports(id) ON DELETE RESTRICT,
  competition_id uuid REFERENCES competitions(id) ON DELETE RESTRICT,
  territory_id uuid REFERENCES territories(id) ON DELETE RESTRICT,
  reference_url text NOT NULL,
  coverage_status text NOT NULL DEFAULT 'unknown' CHECK (
    coverage_status IN ('unknown', 'reference_only', 'partial', 'full', 'unsupported')
  ),
  notes text,
  is_enabled boolean NOT NULL DEFAULT true,
  last_verified_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE NULLS NOT DISTINCT (
    source_id,
    data_domain,
    sport_id,
    competition_id,
    territory_id
  ),
  CHECK (reference_url ~ '^https://'),
  CHECK (competition_id IS NULL OR sport_id IS NOT NULL),
  CHECK (territory_id IS NULL OR data_domain = 'broadcast')
);

CREATE TABLE import_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id uuid NOT NULL REFERENCES data_sources(id) ON DELETE RESTRICT,
  parent_run_id uuid REFERENCES import_runs(id) ON DELETE RESTRICT,
  idempotency_key text NOT NULL,
  run_mode text NOT NULL DEFAULT 'manual' CHECK (
    run_mode IN ('manual', 'scheduled', 'retry')
  ),
  initiator_type text NOT NULL CHECK (
    initiator_type IN ('human', 'agent', 'system')
  ),
  initiator_key text NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (
    status IN (
      'pending',
      'collecting',
      'collected',
      'validating',
      'ready',
      'applying',
      'applied',
      'unchanged',
      'rejected',
      'failed',
      'cancelled'
    )
  ),
  source_observed_at timestamptz,
  input_hash text CHECK (
    input_hash IS NULL OR input_hash ~ '^[0-9a-f]{64}$'
  ),
  record_count integer CHECK (record_count IS NULL OR record_count >= 0),
  failure_code text,
  failure_message text,
  locked_by text,
  lock_expires_at timestamptz,
  last_heartbeat_at timestamptz,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (
    jsonb_typeof(metadata) = 'object'
  ),
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (source_id, idempotency_key),
  CHECK (btrim(idempotency_key) <> ''),
  CHECK (btrim(initiator_key) <> ''),
  CHECK (
    (run_mode = 'retry' AND parent_run_id IS NOT NULL)
    OR (run_mode <> 'retry' AND parent_run_id IS NULL)
  ),
  CHECK (parent_run_id IS NULL OR parent_run_id <> id),
  CHECK (
    (locked_by IS NULL AND lock_expires_at IS NULL)
    OR (locked_by IS NOT NULL AND btrim(locked_by) <> '' AND lock_expires_at IS NOT NULL)
  )
);

CREATE TABLE import_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  import_run_id uuid NOT NULL REFERENCES import_runs(id) ON DELETE CASCADE,
  item_index integer NOT NULL CHECK (item_index > 0),
  entity_type text NOT NULL CHECK (
    entity_type IN (
      'sport',
      'competition',
      'season',
      'participant',
      'event_page',
      'event_edition',
      'event',
      'broadcaster',
      'platform',
      'broadcast_right',
      'event_broadcast'
    )
  ),
  external_key text NOT NULL,
  evidence_url text NOT NULL,
  source_observed_at timestamptz NOT NULL,
  payload jsonb NOT NULL CHECK (jsonb_typeof(payload) = 'object'),
  payload_hash text NOT NULL CHECK (payload_hash ~ '^[0-9a-f]{64}$'),
  validation_status text NOT NULL DEFAULT 'pending' CHECK (
    validation_status IN ('pending', 'accepted', 'conflict', 'invalid', 'ignored', 'applied')
  ),
  validation_notes text,
  target_table text CHECK (
    target_table IS NULL OR target_table IN (
      'sports',
      'competitions',
      'seasons',
      'participants',
      'event_pages',
      'event_editions',
      'events',
      'broadcasters',
      'platforms',
      'broadcast_rights',
      'event_broadcasts'
    )
  ),
  target_id uuid,
  applied_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (import_run_id, item_index),
  UNIQUE (import_run_id, entity_type, external_key),
  CHECK (btrim(external_key) <> ''),
  CHECK (evidence_url ~ '^https://'),
  CHECK (
    (target_table IS NULL AND target_id IS NULL)
    OR (target_table IS NOT NULL AND target_id IS NOT NULL)
  ),
  CHECK (
    validation_status <> 'applied'
    OR (target_table IS NOT NULL AND target_id IS NOT NULL AND applied_at IS NOT NULL)
  ),
  CHECK (applied_at IS NULL OR validation_status = 'applied')
);

CREATE TABLE source_entity_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id uuid NOT NULL REFERENCES data_sources(id) ON DELETE RESTRICT,
  entity_type text NOT NULL CHECK (
    entity_type IN (
      'sport',
      'competition',
      'season',
      'participant',
      'event_page',
      'event_edition',
      'event',
      'broadcaster',
      'platform',
      'broadcast_right',
      'event_broadcast'
    )
  ),
  external_key text NOT NULL,
  target_table text NOT NULL CHECK (
    target_table IN (
      'sports',
      'competitions',
      'seasons',
      'participants',
      'event_pages',
      'event_editions',
      'events',
      'broadcasters',
      'platforms',
      'broadcast_rights',
      'event_broadcasts'
    )
  ),
  target_id uuid NOT NULL,
  last_payload_hash text NOT NULL CHECK (last_payload_hash ~ '^[0-9a-f]{64}$'),
  first_seen_at timestamptz NOT NULL,
  last_seen_at timestamptz NOT NULL,
  last_verified_at timestamptz,
  is_locked boolean NOT NULL DEFAULT false,
  protected_fields text[] NOT NULL DEFAULT '{}',
  protection_reason text,
  protected_by text,
  protected_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (source_id, entity_type, external_key),
  CHECK (btrim(external_key) <> ''),
  CHECK (last_seen_at >= first_seen_at),
  CHECK (last_verified_at IS NULL OR last_verified_at >= first_seen_at),
  CHECK (array_position(protected_fields, NULL) IS NULL),
  CHECK (
    (is_locked = true OR cardinality(protected_fields) > 0)
    = (
      protection_reason IS NOT NULL
      AND btrim(protection_reason) <> ''
      AND protected_by IS NOT NULL
      AND btrim(protected_by) <> ''
      AND protected_at IS NOT NULL
    )
  )
);

CREATE TABLE import_changes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  import_item_id uuid NOT NULL UNIQUE REFERENCES import_items(id) ON DELETE RESTRICT,
  operation text NOT NULL CHECK (operation IN ('create', 'update', 'deactivate')),
  target_table text NOT NULL CHECK (
    target_table IN (
      'sports',
      'competitions',
      'seasons',
      'participants',
      'event_pages',
      'event_editions',
      'events',
      'broadcasters',
      'platforms',
      'broadcast_rights',
      'event_broadcasts'
    )
  ),
  target_id uuid NOT NULL,
  changed_fields text[] NOT NULL,
  before_data jsonb,
  after_data jsonb NOT NULL CHECK (jsonb_typeof(after_data) = 'object'),
  applied_by text NOT NULL,
  applied_at timestamptz NOT NULL DEFAULT now(),
  reverted_by text,
  reverted_at timestamptz,
  revert_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (cardinality(changed_fields) > 0),
  CHECK (array_position(changed_fields, NULL) IS NULL),
  CHECK (before_data IS NULL OR jsonb_typeof(before_data) = 'object'),
  CHECK (
    (operation = 'create' AND before_data IS NULL)
    OR (operation <> 'create' AND before_data IS NOT NULL)
  ),
  CHECK (reverted_at IS NULL OR reverted_at >= applied_at),
  CHECK (btrim(applied_by) <> ''),
  CHECK (
    (reverted_by IS NULL AND reverted_at IS NULL AND revert_reason IS NULL)
    OR (
      reverted_by IS NOT NULL
      AND btrim(reverted_by) <> ''
      AND reverted_at IS NOT NULL
      AND revert_reason IS NOT NULL
      AND btrim(revert_reason) <> ''
    )
  )
);

CREATE OR REPLACE FUNCTION set_v2_ingestion_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_catalog
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION validate_source_scope_relationships()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_catalog
AS $$
DECLARE
  v_competition_sport uuid;
BEGIN
  IF NEW.competition_id IS NOT NULL THEN
    SELECT sport_id INTO v_competition_sport
    FROM competitions
    WHERE id = NEW.competition_id;

    IF v_competition_sport IS DISTINCT FROM NEW.sport_id THEN
      RAISE EXCEPTION USING ERRCODE = '23514',
        MESSAGE = 'source scope competition sport mismatch';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION validate_import_run()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_catalog
AS $$
DECLARE
  v_source data_sources%ROWTYPE;
  v_parent import_runs%ROWTYPE;
  v_total integer;
  v_accepted integer;
  v_applied integer;
  v_conflicts integer;
  v_invalid integer;
  v_pending integer;
  v_ignored integer;
  v_unlinked integer;
  v_changes integer;
  v_transition_allowed boolean := false;
BEGIN
  SELECT * INTO v_source
  FROM data_sources
  WHERE id = NEW.source_id;

  IF TG_OP = 'INSERT' THEN
    IF NEW.status <> 'pending' THEN
      RAISE EXCEPTION USING ERRCODE = '23514',
        MESSAGE = 'new import run must start pending';
    END IF;

    IF NEW.run_mode = 'scheduled' AND (
      v_source.is_enabled = false
      OR v_source.automatic_collection_enabled = false
    ) THEN
      RAISE EXCEPTION USING ERRCODE = '23514',
        MESSAGE = 'scheduled import requires an enabled automatic source';
    END IF;

    IF NEW.parent_run_id IS NOT NULL THEN
      SELECT * INTO v_parent
      FROM import_runs
      WHERE id = NEW.parent_run_id;

      IF v_parent.source_id IS DISTINCT FROM NEW.source_id
        OR v_parent.status NOT IN ('failed', 'cancelled')
      THEN
        RAISE EXCEPTION USING ERRCODE = '23514',
          MESSAGE = 'retry parent must be a failed or cancelled run from the same source';
      END IF;
    END IF;

    RETURN NEW;
  END IF;

  IF NEW.source_id IS DISTINCT FROM OLD.source_id
    OR NEW.parent_run_id IS DISTINCT FROM OLD.parent_run_id
    OR NEW.idempotency_key IS DISTINCT FROM OLD.idempotency_key
    OR NEW.run_mode IS DISTINCT FROM OLD.run_mode
    OR NEW.initiator_type IS DISTINCT FROM OLD.initiator_type
    OR NEW.initiator_key IS DISTINCT FROM OLD.initiator_key
  THEN
    RAISE EXCEPTION USING ERRCODE = '23514',
      MESSAGE = 'import run identity is immutable';
  END IF;

  IF OLD.status IN ('applied', 'unchanged', 'rejected', 'failed', 'cancelled')
    AND NEW.status IS DISTINCT FROM OLD.status
  THEN
    RAISE EXCEPTION USING ERRCODE = '23514',
      MESSAGE = 'terminal import run cannot transition';
  END IF;

  IF NEW.status IS DISTINCT FROM OLD.status THEN
    v_transition_allowed := CASE OLD.status
      WHEN 'pending' THEN NEW.status IN ('collecting', 'failed', 'cancelled')
      WHEN 'collecting' THEN NEW.status IN ('collected', 'failed', 'cancelled')
      WHEN 'collected' THEN NEW.status IN ('validating', 'failed', 'cancelled')
      WHEN 'validating' THEN NEW.status IN ('ready', 'unchanged', 'rejected', 'failed', 'cancelled')
      WHEN 'ready' THEN NEW.status IN ('applying', 'rejected', 'failed', 'cancelled')
      WHEN 'applying' THEN NEW.status IN ('applied', 'failed')
      ELSE false
    END;

    IF v_transition_allowed = false THEN
      RAISE EXCEPTION USING ERRCODE = '23514',
        MESSAGE = 'invalid import run transition';
    END IF;
  END IF;

  IF OLD.status NOT IN ('pending', 'collecting') AND (
    NEW.source_observed_at IS DISTINCT FROM OLD.source_observed_at
    OR NEW.input_hash IS DISTINCT FROM OLD.input_hash
    OR NEW.record_count IS DISTINCT FROM OLD.record_count
  ) THEN
    RAISE EXCEPTION USING ERRCODE = '23514',
      MESSAGE = 'collected import snapshot is immutable';
  END IF;

  IF NEW.status IN ('collecting', 'collected')
    AND NEW.run_mode = 'scheduled'
    AND (
      v_source.is_enabled = false
      OR v_source.automatic_collection_enabled = false
    )
  THEN
    RAISE EXCEPTION USING ERRCODE = '23514',
      MESSAGE = 'scheduled import requires an enabled automatic source';
  END IF;

  IF NEW.status = 'collecting' AND OLD.status <> 'collecting' THEN
    NEW.started_at := COALESCE(NEW.started_at, now());
  END IF;

  IF NEW.status = 'collected' AND OLD.status <> 'collected' THEN
    SELECT count(*) INTO v_total
    FROM import_items
    WHERE import_run_id = NEW.id;

    IF NEW.record_count IS NULL OR NEW.record_count = 0 OR v_total = 0 THEN
      RAISE EXCEPTION USING ERRCODE = '23514',
        MESSAGE = 'collected import must contain at least one record';
    END IF;

    IF NEW.record_count <> v_total THEN
      RAISE EXCEPTION USING ERRCODE = '23514',
        MESSAGE = 'import record count does not match staged items';
    END IF;

    IF NEW.input_hash IS NULL OR NEW.source_observed_at IS NULL THEN
      RAISE EXCEPTION USING ERRCODE = '23514',
        MESSAGE = 'collected import requires a hash and observation time';
    END IF;
  END IF;

  IF NEW.status IN ('ready', 'unchanged', 'rejected', 'applied')
    AND NEW.status IS DISTINCT FROM OLD.status
  THEN
    SELECT
      count(*),
      count(*) FILTER (WHERE validation_status = 'accepted'),
      count(*) FILTER (WHERE validation_status = 'applied'),
      count(*) FILTER (WHERE validation_status = 'conflict'),
      count(*) FILTER (WHERE validation_status = 'invalid'),
      count(*) FILTER (WHERE validation_status = 'pending'),
      count(*) FILTER (WHERE validation_status = 'ignored')
    INTO v_total, v_accepted, v_applied, v_conflicts, v_invalid, v_pending, v_ignored
    FROM import_items
    WHERE import_run_id = NEW.id;
  END IF;

  IF NEW.status = 'unchanged' AND OLD.status <> 'unchanged' THEN
    IF v_total = 0 OR v_ignored <> v_total THEN
      RAISE EXCEPTION USING ERRCODE = '23514',
        MESSAGE = 'unchanged import requires ignored items only';
    END IF;
  END IF;

  IF NEW.status = 'ready' AND OLD.status <> 'ready' THEN
    IF v_accepted = 0 OR v_pending > 0 OR v_conflicts > 0 OR v_invalid > 0 OR v_applied > 0 THEN
      RAISE EXCEPTION USING ERRCODE = '23514',
        MESSAGE = 'ready import requires accepted items and no unresolved items';
    END IF;
  END IF;

  IF NEW.status = 'rejected' AND OLD.status <> 'rejected' THEN
    IF v_pending > 0 OR (v_conflicts = 0 AND v_invalid = 0) THEN
      RAISE EXCEPTION USING ERRCODE = '23514',
        MESSAGE = 'rejected import requires resolved conflicts or invalid items';
    END IF;
  END IF;

  IF NEW.status = 'applying' AND OLD.status <> 'applying' THEN
    IF v_source.is_enabled = false THEN
      RAISE EXCEPTION USING ERRCODE = '23514',
        MESSAGE = 'disabled source cannot apply an import';
    END IF;

    IF NEW.locked_by IS NULL OR NEW.lock_expires_at IS NULL OR NEW.lock_expires_at <= now() THEN
      RAISE EXCEPTION USING ERRCODE = '23514',
        MESSAGE = 'applying import requires an active lock';
    END IF;
  END IF;

  IF NEW.status = 'applied' AND OLD.status <> 'applied' THEN
    SELECT count(*) INTO v_changes
    FROM import_changes c
    JOIN import_items i ON i.id = c.import_item_id
    WHERE i.import_run_id = NEW.id;

    SELECT count(*) INTO v_unlinked
    FROM import_items i
    WHERE i.import_run_id = NEW.id
      AND i.validation_status = 'applied'
      AND NOT EXISTS (
        SELECT 1
        FROM source_entity_links l
        WHERE l.source_id = NEW.source_id
          AND l.entity_type = i.entity_type
          AND l.external_key = i.external_key
          AND l.target_table = i.target_table
          AND l.target_id = i.target_id
      );

    IF v_applied = 0
      OR v_pending > 0
      OR v_accepted > 0
      OR v_conflicts > 0
      OR v_invalid > 0
      OR v_changes <> v_applied
      OR v_unlinked > 0
    THEN
      RAISE EXCEPTION USING ERRCODE = '23514',
        MESSAGE = 'applied import requires logged and linked applied items only';
    END IF;
  END IF;

  IF NEW.status = 'failed' AND OLD.status <> 'failed' THEN
    IF NEW.failure_code IS NULL AND NEW.failure_message IS NULL THEN
      RAISE EXCEPTION USING ERRCODE = '23514',
        MESSAGE = 'failed import requires failure details';
    END IF;
  END IF;

  IF NEW.status IN ('applied', 'unchanged', 'rejected', 'failed', 'cancelled') THEN
    NEW.completed_at := COALESCE(NEW.completed_at, now());
  ELSE
    NEW.completed_at := NULL;
  END IF;

  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION validate_import_item_change()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_catalog
AS $$
DECLARE
  v_run_status text;
BEGIN
  IF TG_OP = 'DELETE' THEN
    SELECT status INTO v_run_status
    FROM import_runs
    WHERE id = OLD.import_run_id;
  ELSE
    SELECT status INTO v_run_status
    FROM import_runs
    WHERE id = NEW.import_run_id;
  END IF;

  IF TG_OP = 'INSERT' THEN
    IF v_run_status <> 'collecting' OR NEW.validation_status <> 'pending' THEN
      RAISE EXCEPTION USING ERRCODE = '23514',
        MESSAGE = 'items can only be staged as pending while collecting';
    END IF;
    RETURN NEW;
  END IF;

  IF TG_OP = 'DELETE' THEN
    IF v_run_status <> 'collecting' THEN
      RAISE EXCEPTION USING ERRCODE = '23514',
        MESSAGE = 'staged items can only be deleted while collecting';
    END IF;
    RETURN OLD;
  END IF;

  IF NEW.import_run_id IS DISTINCT FROM OLD.import_run_id
    OR NEW.item_index IS DISTINCT FROM OLD.item_index
    OR NEW.entity_type IS DISTINCT FROM OLD.entity_type
    OR NEW.external_key IS DISTINCT FROM OLD.external_key
    OR NEW.evidence_url IS DISTINCT FROM OLD.evidence_url
    OR NEW.source_observed_at IS DISTINCT FROM OLD.source_observed_at
    OR NEW.payload IS DISTINCT FROM OLD.payload
    OR NEW.payload_hash IS DISTINCT FROM OLD.payload_hash
  THEN
    RAISE EXCEPTION USING ERRCODE = '23514',
      MESSAGE = 'staged import item identity and evidence are immutable';
  END IF;

  IF OLD.validation_status = 'pending'
    AND NEW.validation_status IN ('accepted', 'conflict', 'invalid', 'ignored')
    AND v_run_status = 'validating'
  THEN
    NULL;
  ELSIF OLD.validation_status = 'accepted'
    AND NEW.validation_status = 'accepted'
    AND v_run_status = 'applying'
  THEN
    NULL;
  ELSIF OLD.validation_status = 'accepted'
    AND NEW.validation_status = 'applied'
    AND v_run_status = 'applying'
  THEN
    NEW.applied_at := COALESCE(NEW.applied_at, now());
  ELSIF NEW.validation_status IS DISTINCT FROM OLD.validation_status
    OR NEW.target_table IS DISTINCT FROM OLD.target_table
    OR NEW.target_id IS DISTINCT FROM OLD.target_id
  THEN
    RAISE EXCEPTION USING ERRCODE = '23514',
      MESSAGE = 'invalid import item transition';
  END IF;

  IF NEW.validation_status IN ('conflict', 'invalid')
    AND (NEW.validation_notes IS NULL OR btrim(NEW.validation_notes) = '')
  THEN
    RAISE EXCEPTION USING ERRCODE = '23514',
      MESSAGE = 'conflict or invalid item requires validation notes';
  END IF;

  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION validate_source_entity_link_update()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_catalog
AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND (
    NEW.source_id IS DISTINCT FROM OLD.source_id
    OR NEW.entity_type IS DISTINCT FROM OLD.entity_type
    OR NEW.external_key IS DISTINCT FROM OLD.external_key
    OR NEW.target_table IS DISTINCT FROM OLD.target_table
    OR NEW.target_id IS DISTINCT FROM OLD.target_id
  ) THEN
    RAISE EXCEPTION USING ERRCODE = '23514',
      MESSAGE = 'source entity identity is immutable';
  END IF;

  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION validate_import_change_log()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_catalog
AS $$
DECLARE
  v_item import_items%ROWTYPE;
  v_run import_runs%ROWTYPE;
  v_link source_entity_links%ROWTYPE;
BEGIN
  IF TG_OP = 'INSERT' THEN
    SELECT * INTO v_item
    FROM import_items
    WHERE id = NEW.import_item_id;

    SELECT * INTO v_run
    FROM import_runs
    WHERE id = v_item.import_run_id;

    IF v_run.status <> 'applying' OR v_item.validation_status <> 'accepted' THEN
      RAISE EXCEPTION USING ERRCODE = '23514',
        MESSAGE = 'change can only be logged for an accepted item while applying';
    END IF;

    IF v_item.target_table IS DISTINCT FROM NEW.target_table
      OR v_item.target_id IS DISTINCT FROM NEW.target_id
    THEN
      RAISE EXCEPTION USING ERRCODE = '23514',
        MESSAGE = 'change target must match import item target';
    END IF;

    IF EXISTS (
      SELECT 1
      FROM unnest(NEW.changed_fields) AS field_name
      WHERE NOT (NEW.after_data ? field_name)
    ) THEN
      RAISE EXCEPTION USING ERRCODE = '23514',
        MESSAGE = 'changed fields must exist in the after snapshot';
    END IF;

    SELECT * INTO v_link
    FROM source_entity_links
    WHERE target_table = NEW.target_table
      AND target_id = NEW.target_id
      AND (
        is_locked = true
        OR protected_fields && NEW.changed_fields
      )
    ORDER BY is_locked DESC
    LIMIT 1;

    IF FOUND AND v_link.is_locked = true THEN
      RAISE EXCEPTION USING ERRCODE = '23514',
        MESSAGE = 'import target is protected by a manual lock';
    END IF;

    IF FOUND AND v_link.protected_fields && NEW.changed_fields THEN
      RAISE EXCEPTION USING ERRCODE = '23514',
        MESSAGE = 'import change overlaps protected fields';
    END IF;

    RETURN NEW;
  END IF;

  IF NEW.import_item_id IS DISTINCT FROM OLD.import_item_id
    OR NEW.operation IS DISTINCT FROM OLD.operation
    OR NEW.target_table IS DISTINCT FROM OLD.target_table
    OR NEW.target_id IS DISTINCT FROM OLD.target_id
    OR NEW.changed_fields IS DISTINCT FROM OLD.changed_fields
    OR NEW.before_data IS DISTINCT FROM OLD.before_data
    OR NEW.after_data IS DISTINCT FROM OLD.after_data
    OR NEW.applied_by IS DISTINCT FROM OLD.applied_by
    OR NEW.applied_at IS DISTINCT FROM OLD.applied_at
  THEN
    RAISE EXCEPTION USING ERRCODE = '23514',
      MESSAGE = 'applied change history is immutable';
  END IF;

  IF OLD.reverted_at IS NOT NULL AND (
    NEW.reverted_by IS DISTINCT FROM OLD.reverted_by
    OR NEW.reverted_at IS DISTINCT FROM OLD.reverted_at
    OR NEW.revert_reason IS DISTINCT FROM OLD.revert_reason
  ) THEN
    RAISE EXCEPTION USING ERRCODE = '23514',
      MESSAGE = 'reverted change history is immutable';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_data_sources_updated_at
BEFORE UPDATE ON data_sources
FOR EACH ROW EXECUTE FUNCTION set_v2_ingestion_updated_at();

CREATE TRIGGER trg_validate_source_scope_relationships
BEFORE INSERT OR UPDATE ON source_scopes
FOR EACH ROW EXECUTE FUNCTION validate_source_scope_relationships();

CREATE TRIGGER trg_source_scopes_updated_at
BEFORE UPDATE ON source_scopes
FOR EACH ROW EXECUTE FUNCTION set_v2_ingestion_updated_at();

CREATE TRIGGER trg_validate_import_run
BEFORE INSERT OR UPDATE ON import_runs
FOR EACH ROW EXECUTE FUNCTION validate_import_run();

CREATE TRIGGER trg_validate_import_item_change
BEFORE INSERT OR UPDATE OR DELETE ON import_items
FOR EACH ROW EXECUTE FUNCTION validate_import_item_change();

CREATE TRIGGER trg_validate_source_entity_link_update
BEFORE INSERT OR UPDATE ON source_entity_links
FOR EACH ROW EXECUTE FUNCTION validate_source_entity_link_update();

CREATE TRIGGER trg_validate_import_change_log
BEFORE INSERT OR UPDATE ON import_changes
FOR EACH ROW EXECUTE FUNCTION validate_import_change_log();

CREATE INDEX ix_source_scopes_lookup
  ON source_scopes (data_domain, sport_id, competition_id, territory_id)
  WHERE is_enabled = true;
CREATE INDEX ix_import_runs_queue
  ON import_runs (status, created_at);
CREATE INDEX ix_import_runs_source_history
  ON import_runs (source_id, created_at DESC);
CREATE INDEX ix_import_items_validation
  ON import_items (import_run_id, validation_status, item_index);
CREATE INDEX ix_source_entity_links_target
  ON source_entity_links (target_table, target_id);
CREATE INDEX ix_import_changes_target
  ON import_changes (target_table, target_id, applied_at DESC);

INSERT INTO data_sources (
  id,
  slug,
  name,
  access_method,
  homepage_url,
  terms_url,
  reuse_status,
  commercial_use_allowed,
  terms_summary,
  terms_reviewed_at,
  pricing_status
) VALUES
  (
    '20000000-0000-4000-8000-000000000001',
    'uefa-official-web',
    'UEFA official website',
    'web_reference',
    'https://www.uefa.com/',
    'https://www.uefa.com/termsconditions/',
    'restricted',
    false,
    'Official pages may be used for human verification, but systematic collection is not approved.',
    '2026-09-14 00:00:00+00',
    'not_applicable'
  ),
  (
    '20000000-0000-4000-8000-000000000002',
    'nba-official-web',
    'NBA official website',
    'web_reference',
    'https://www.nba.com/',
    'https://www.nba.com/termsofuse',
    'restricted',
    false,
    'Official pages may be used for human verification; public or commercial reuse requires separate permission.',
    '2026-09-14 00:00:00+00',
    'not_applicable'
  ),
  (
    '20000000-0000-4000-8000-000000000003',
    'formula1-official-web',
    'Formula 1 official website',
    'web_reference',
    'https://www.formula1.com/',
    'https://www.formula1.com/en/information/legal-notices.7egvZU48hzrypubGBNcQKt',
    'restricted',
    false,
    'Official pages may be used for human verification; commercial extraction is not approved.',
    '2026-09-14 00:00:00+00',
    'not_applicable'
  ),
  (
    '20000000-0000-4000-8000-000000000004',
    'motogp-official-web',
    'MotoGP official website',
    'web_reference',
    'https://www.motogp.com/',
    'https://www.motogp.com/en/legal-notice',
    'restricted',
    false,
    'Official calendar and broadcaster pages may be used for human verification, not automated reuse.',
    '2026-09-14 00:00:00+00',
    'not_applicable'
  );

INSERT INTO source_scopes (
  source_id,
  data_domain,
  reference_url,
  coverage_status,
  notes
) VALUES
  (
    '20000000-0000-4000-8000-000000000001',
    'calendar',
    'https://www.uefa.com/uefachampionsleague/fixtures-results/',
    'reference_only',
    'Champions League fixtures reference; no automated collection permission.'
  ),
  (
    '20000000-0000-4000-8000-000000000002',
    'calendar',
    'https://www.nba.com/schedule',
    'reference_only',
    'NBA schedule reference; a licensed provider is still required for automation.'
  ),
  (
    '20000000-0000-4000-8000-000000000003',
    'calendar',
    'https://www.formula1.com/en/racing/2026',
    'reference_only',
    'Formula 1 calendar reference; no automated collection permission.'
  ),
  (
    '20000000-0000-4000-8000-000000000004',
    'calendar',
    'https://www.motogp.com/en/calendar/2026',
    'reference_only',
    'MotoGP calendar reference; no automated collection permission.'
  ),
  (
    '20000000-0000-4000-8000-000000000004',
    'broadcast',
    'https://www.motogp.com/en/broadcasters',
    'reference_only',
    'Territory rights reference; every event and transmission type still requires verification.'
  );

ALTER TABLE data_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE source_scopes ENABLE ROW LEVEL SECURITY;
ALTER TABLE import_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE import_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE source_entity_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE import_changes ENABLE ROW LEVEL SECURITY;

CREATE POLICY no_public_access_data_sources
  ON data_sources FOR ALL USING (false) WITH CHECK (false);
CREATE POLICY no_public_access_source_scopes
  ON source_scopes FOR ALL USING (false) WITH CHECK (false);
CREATE POLICY no_public_access_import_runs
  ON import_runs FOR ALL USING (false) WITH CHECK (false);
CREATE POLICY no_public_access_import_items
  ON import_items FOR ALL USING (false) WITH CHECK (false);
CREATE POLICY no_public_access_source_entity_links
  ON source_entity_links FOR ALL USING (false) WITH CHECK (false);
CREATE POLICY no_public_access_import_changes
  ON import_changes FOR ALL USING (false) WITH CHECK (false);

REVOKE ALL PRIVILEGES ON TABLE public.data_sources FROM PUBLIC, anon, authenticated;
REVOKE ALL PRIVILEGES ON TABLE public.source_scopes FROM PUBLIC, anon, authenticated;
REVOKE ALL PRIVILEGES ON TABLE public.import_runs FROM PUBLIC, anon, authenticated;
REVOKE ALL PRIVILEGES ON TABLE public.import_items FROM PUBLIC, anon, authenticated;
REVOKE ALL PRIVILEGES ON TABLE public.source_entity_links FROM PUBLIC, anon, authenticated;
REVOKE ALL PRIVILEGES ON TABLE public.import_changes FROM PUBLIC, anon, authenticated;

COMMIT;
