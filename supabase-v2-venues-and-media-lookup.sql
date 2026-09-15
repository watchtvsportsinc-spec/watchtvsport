-- WatchTVSport V2 verified venues and media lookup.
-- Applied to the V2 Supabase environment on 2026-09-15.

create table if not exists public.venues (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  city text,
  country_code text,
  venue_type text not null default 'stadium' check (venue_type in ('stadium','arena','circuit','course','other')),
  capacity integer check (capacity is null or capacity > 0),
  official_website_url text,
  latitude numeric,
  longitude numeric,
  source_name text,
  source_url text,
  verification_status text not null default 'pending' check (verification_status in ('pending','confirmed','stale','conflict','rejected')),
  last_verified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.events add column if not exists venue_id uuid references public.venues(id) on delete set null;
alter table public.event_editions add column if not exists venue_id uuid references public.venues(id) on delete set null;
alter table public.participant_profiles add column if not exists home_venue_id uuid references public.venues(id) on delete set null;

create index if not exists venues_country_city_idx on public.venues(country_code, city);
create index if not exists events_venue_id_idx on public.events(venue_id) where venue_id is not null;

alter table public.venues enable row level security;
drop policy if exists public_select_confirmed_venues on public.venues;
create policy public_select_confirmed_venues on public.venues
  for select to public using (verification_status = 'confirmed');

create or replace function public.get_primary_media_asset_v2(
  p_entity_type text,
  p_entity_key text,
  p_asset_kind text
)
returns jsonb
language sql
stable
security invoker
set search_path = public
as $$
  select jsonb_strip_nulls(jsonb_build_object(
    'id', m.id,
    'assetKind', m.asset_kind,
    'entityType', m.entity_type,
    'entityKey', m.entity_key,
    'url', m.storage_url,
    'alt', m.alt_text,
    'credit', m.credit_text,
    'license', m.license_note,
    'mimeType', m.mime_type,
    'width', m.width,
    'height', m.height,
    'sourceName', m.source_name,
    'sourceUrl', m.source_url,
    'verifiedAt', m.verified_at
  ))
  from public.media_assets m
  where m.entity_type = p_entity_type
    and m.entity_key = p_entity_key
    and m.asset_kind = p_asset_kind
    and m.verification_status = 'approved'
    and m.is_current = true
    and m.storage_url is not null
  order by m.verified_at desc nulls last
  limit 1;
$$;

grant execute on function public.get_primary_media_asset_v2(text, text, text) to anon, authenticated;

create or replace function public.get_event_venue_media_v2(p_event_id uuid)
returns jsonb
language sql
stable
security invoker
set search_path = public
as $$
  select jsonb_build_object(
    'venue', jsonb_strip_nulls(jsonb_build_object(
      'id', v.id,
      'slug', v.slug,
      'name', v.name,
      'city', v.city,
      'countryCode', v.country_code,
      'type', v.venue_type,
      'capacity', v.capacity
    )),
    'image', public.get_primary_media_asset_v2('venue', v.slug, 'venue_image')
  )
  from public.events e
  join public.venues v on v.id = e.venue_id
  where e.id = p_event_id
    and v.verification_status = 'confirmed';
$$;

grant execute on function public.get_event_venue_media_v2(uuid) to anon, authenticated;
