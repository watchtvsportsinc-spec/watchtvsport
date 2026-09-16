-- WatchTVSport V2 entity media policy.
-- PREPARED MIGRATION ONLY: do not apply automatically.
--
-- A stored URL is only a candidate/reference. Public rendering requires an
-- explicit approved status plus a documented review trail.

create table if not exists public.entity_media_assets (
  id uuid primary key default gen_random_uuid(),
  entity_id text not null check (length(trim(entity_id)) > 0),
  media_kind text not null check (media_kind in ('logo','crest','icon','photo','illustration')),
  asset_url text,
  storage_path text,
  alt_text text not null default '',
  usage_status text not null default 'candidate'
    check (usage_status in ('candidate','review','approved','rejected','blocked')),
  source_name text,
  source_page_url text,
  attribution text,
  license_note text,
  reviewed_at timestamptz,
  reviewed_by text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint entity_media_asset_has_single_location
    check (num_nonnulls(asset_url, storage_path) = 1),
  constraint entity_media_approved_requires_review
    check (
      usage_status <> 'approved'
      or (
        reviewed_at is not null
        and nullif(trim(reviewed_by), '') is not null
        and nullif(trim(source_name), '') is not null
        and (
          source_name = 'WatchTVSport'
          or (
            nullif(trim(source_page_url), '') is not null
            and nullif(trim(license_note), '') is not null
          )
        )
      )
    )
);

create index if not exists entity_media_assets_entity_lookup
  on public.entity_media_assets(entity_id, media_kind, usage_status);

create unique index if not exists entity_media_assets_unique_external_candidate
  on public.entity_media_assets(entity_id, media_kind, asset_url)
  where asset_url is not null;

create unique index if not exists entity_media_assets_unique_storage_candidate
  on public.entity_media_assets(entity_id, media_kind, storage_path)
  where storage_path is not null;

alter table public.entity_media_assets enable row level security;

drop policy if exists public_select_approved_entity_media on public.entity_media_assets;
create policy public_select_approved_entity_media on public.entity_media_assets
  for select to anon, authenticated
  using (usage_status = 'approved');

comment on table public.entity_media_assets is
  'Rights-aware media registry. Presence of a URL or storage path never implies display approval.';
comment on column public.entity_media_assets.usage_status is
  'Only approved rows may be exposed publicly. candidate/review/rejected/blocked remain non-renderable.';
comment on column public.entity_media_assets.source_page_url is
  'Reference page used during the rights/provenance review; not an authorization by itself.';
