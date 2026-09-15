-- Applied Supabase migration: provider_trust_profiles
-- Private trust storage for broadcaster data providers.
-- No public event_broadcasts writes are performed here.

create table if not exists watchtvsport_review.provider_trust_profiles (
  source_id uuid not null references public.data_sources(id) on delete cascade,
  competition_id uuid not null references public.competitions(id) on delete cascade,
  territory_id uuid not null references public.territories(id) on delete cascade,
  status text not null default 'probation' check (status in ('probation','trusted','elite','watch','suspended')),
  total_audits integer not null default 0 check (total_audits >= 0),
  correct_audits integer not null default 0 check (correct_audits >= 0 and correct_audits <= total_audits),
  critical_errors integer not null default 0 check (critical_errors >= 0),
  recent_window_size integer not null default 50 check (recent_window_size between 10 and 500),
  recent_audits integer not null default 0 check (recent_audits >= 0),
  recent_correct integer not null default 0 check (recent_correct >= 0 and recent_correct <= recent_audits),
  accuracy numeric(7,6) not null default 0 check (accuracy between 0 and 1),
  recent_accuracy numeric(7,6) not null default 0 check (recent_accuracy between 0 and 1),
  audit_rate numeric(5,4) not null default 1 check (audit_rate between 0 and 1),
  commercial_reuse_ok boolean not null default false,
  manual_suspension boolean not null default false,
  last_audited_at timestamptz,
  updated_at timestamptz not null default now(),
  primary key (source_id, competition_id, territory_id)
);

create table if not exists watchtvsport_review.provider_audit_events (
  id uuid primary key default gen_random_uuid(),
  source_id uuid not null references public.data_sources(id) on delete cascade,
  competition_id uuid not null references public.competitions(id) on delete cascade,
  territory_id uuid not null references public.territories(id) on delete cascade,
  event_id uuid references public.events(id) on delete set null,
  provider_record_id text,
  verdict text not null check (verdict in ('correct','incorrect')),
  critical_error boolean not null default false,
  audited_by text not null check (audited_by in ('human','official_source','cross_source','system_test')),
  evidence_url text,
  notes text,
  audited_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb
);

-- Runtime functions applied in Supabase:
-- watchtvsport_review.record_provider_audit(...)
-- watchtvsport_review.recompute_provider_trust(...)
-- Both are service_role-only. anon/authenticated have no EXECUTE grant.
-- Current thresholds:
-- probation: default / 100% audit
-- trusted: >=100 audits, >=98.5% overall, >=30 recent, >=98% recent / 10% audit
-- elite: >=300 audits, >=99.5% overall, >=50 recent, >=99% recent / 2% audit
-- watch: recent accuracy below 95% (after 20 recent audits) or early critical error signal
-- suspended: commercial reuse not approved or manual suspension
