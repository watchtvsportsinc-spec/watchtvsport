BEGIN;

SET LOCAL search_path = public, pg_catalog;

CREATE TABLE verification_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  started_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  status text NOT NULL DEFAULT 'running'
    CHECK (status IN ('running','completed','partial','failed')),
  source_scope jsonb NOT NULL DEFAULT '{}'::jsonb,
  events_checked integer NOT NULL DEFAULT 0,
  proposals_created integer NOT NULL DEFAULT 0,
  automatic_actions integer NOT NULL DEFAULT 0,
  conflicts_detected integer NOT NULL DEFAULT 0,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE verification_proposals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id uuid REFERENCES verification_runs(id) ON DELETE SET NULL,
  proposal_type text NOT NULL
    CHECK (proposal_type IN (
      'new_event',
      'event_update',
      'new_broadcast',
      'broadcast_update',
      'broadcast_remove',
      'new_competition',
      'conflict',
      'other'
    )),
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','accepted','rejected','skipped','auto_applied','superseded')),
  priority integer NOT NULL DEFAULT 100,
  sport_slug text,
  competition_slug text,
  event_id uuid REFERENCES events(id) ON DELETE SET NULL,
  territory_code text,
  broadcaster_slug text,
  title text NOT NULL,
  summary text NOT NULL,
  current_data jsonb,
  proposed_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  source_name text NOT NULL,
  source_url text,
  source_kind text,
  source_reliability text
    CHECK (source_reliability IS NULL OR source_reliability IN ('official','trusted','secondary','unknown')),
  detected_at timestamptz NOT NULL DEFAULT now(),
  reviewed_at timestamptz,
  reviewed_by text,
  review_note text,
  undo_of_proposal_id uuid REFERENCES verification_proposals(id) ON DELETE SET NULL,
  fingerprint text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (fingerprint, status)
);

CREATE TABLE verification_decisions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  proposal_id uuid NOT NULL REFERENCES verification_proposals(id) ON DELETE CASCADE,
  decision text NOT NULL CHECK (decision IN ('accepted','rejected','undone')),
  decided_at timestamptz NOT NULL DEFAULT now(),
  decided_by text,
  note text,
  previous_status text,
  resulting_status text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX ix_verification_proposals_queue
  ON verification_proposals (status, priority, detected_at);

CREATE INDEX ix_verification_proposals_event
  ON verification_proposals (event_id, detected_at DESC);

CREATE INDEX ix_verification_proposals_run
  ON verification_proposals (run_id, detected_at DESC);

CREATE INDEX ix_verification_decisions_proposal
  ON verification_decisions (proposal_id, decided_at DESC);

ALTER TABLE verification_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE verification_proposals ENABLE ROW LEVEL SECURITY;
ALTER TABLE verification_decisions ENABLE ROW LEVEL SECURITY;

CREATE POLICY no_public_read_verification_runs
  ON verification_runs FOR SELECT
  USING (false);

CREATE POLICY no_public_write_verification_runs
  ON verification_runs FOR ALL
  USING (false)
  WITH CHECK (false);

CREATE POLICY no_public_read_verification_proposals
  ON verification_proposals FOR SELECT
  USING (false);

CREATE POLICY no_public_write_verification_proposals
  ON verification_proposals FOR ALL
  USING (false)
  WITH CHECK (false);

CREATE POLICY no_public_read_verification_decisions
  ON verification_decisions FOR SELECT
  USING (false);

CREATE POLICY no_public_write_verification_decisions
  ON verification_decisions FOR ALL
  USING (false)
  WITH CHECK (false);

COMMIT;
