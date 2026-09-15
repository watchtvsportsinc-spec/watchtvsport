-- WatchTVSport V2 participant/team profile model.
-- Facts displayed on club/team pages must be backed by current confirmed claims.

create table if not exists public.participant_profiles (
  participant_id uuid primary key references public.participants(id) on delete cascade,
  city text,
  country_code text,
  founded_year integer check (founded_year is null or (founded_year between 1800 and extract(year from now())::int)),
  venue_name text,
  venue_capacity integer check (venue_capacity is null or venue_capacity > 0),
  logo_url text,
  hero_image_url text,
  official_website_url text,
  instagram_url text,
  x_url text,
  facebook_url text,
  youtube_url text,
  tiktok_url text,
  summary text,
  profile_status text not null default 'pending' check (profile_status in ('pending','partial','verified','needs_review')),
  last_verified_at timestamptz,
  next_review_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.participant_profile_claims (
  id uuid primary key default gen_random_uuid(),
  participant_id uuid not null references public.participants(id) on delete cascade,
  field_key text not null check (field_key in ('city','country_code','founded_year','venue_name','venue_capacity','logo_url','hero_image_url','official_website_url','instagram_url','x_url','facebook_url','youtube_url','tiktok_url','summary')),
  value_text text,
  value_number numeric,
  value_json jsonb,
  source_name text not null,
  source_url text not null,
  source_type text not null default 'official' check (source_type in ('official','league','governing_body','venue','reputable_secondary')),
  verification_status text not null default 'pending' check (verification_status in ('pending','confirmed','rejected','stale','conflict')),
  observed_at timestamptz not null default now(),
  verified_at timestamptz,
  is_current boolean not null default false,
  notes text,
  created_at timestamptz not null default now(),
  constraint participant_profile_claim_has_value check (num_nonnulls(value_text,value_number,value_json)=1)
);

create unique index if not exists participant_profile_claims_one_current_per_field
  on public.participant_profile_claims(participant_id,field_key)
  where is_current = true;
create index if not exists participant_profile_claims_lookup
  on public.participant_profile_claims(participant_id,field_key,verification_status);
create index if not exists participant_profiles_review_due
  on public.participant_profiles(next_review_at)
  where profile_status in ('partial','verified','needs_review');

alter table public.participant_profiles enable row level security;
alter table public.participant_profile_claims enable row level security;

drop policy if exists public_select_participant_profiles on public.participant_profiles;
create policy public_select_participant_profiles on public.participant_profiles
  for select to public using (profile_status in ('partial','verified'));

drop policy if exists public_select_confirmed_profile_claims on public.participant_profile_claims;
create policy public_select_confirmed_profile_claims on public.participant_profile_claims
  for select to public using (verification_status='confirmed' and is_current=true);

insert into public.participant_profiles(participant_id,country_code)
select p.id,p.country_code
from public.participants p
where p.participant_type in ('club','team','franchise','national_team')
on conflict (participant_id) do nothing;

create or replace function public.get_public_participant_profile_v2(p_slug text, p_sport_slug text default 'football')
returns jsonb language sql stable security invoker set search_path=public as $$
  select jsonb_build_object(
    'participantId',p.id,'slug',p.slug,'name',p.name,'shortName',p.short_name,
    'participantType',p.participant_type,'sport',s.slug,
    'profile',case when pp.participant_id is null then null else jsonb_strip_nulls(jsonb_build_object(
      'city',pp.city,'countryCode',coalesce(pp.country_code,p.country_code),'foundedYear',pp.founded_year,
      'venueName',pp.venue_name,'venueCapacity',pp.venue_capacity,'logoUrl',pp.logo_url,
      'heroImageUrl',pp.hero_image_url,'officialWebsiteUrl',pp.official_website_url,
      'instagramUrl',pp.instagram_url,'xUrl',pp.x_url,'facebookUrl',pp.facebook_url,
      'youtubeUrl',pp.youtube_url,'tiktokUrl',pp.tiktok_url,'summary',pp.summary,
      'profileStatus',pp.profile_status,'lastVerifiedAt',pp.last_verified_at
    )) end,
    'sources',coalesce((select jsonb_agg(jsonb_build_object(
      'field',c.field_key,'sourceName',c.source_name,'sourceUrl',c.source_url,
      'sourceType',c.source_type,'verifiedAt',c.verified_at,'observedAt',c.observed_at
    ) order by c.field_key) from public.participant_profile_claims c
      where c.participant_id=p.id and c.is_current=true and c.verification_status='confirmed'),'[]'::jsonb)
  )
  from public.participants p join public.sports s on s.id=p.sport_id
  left join public.participant_profiles pp on pp.participant_id=p.id and pp.profile_status in ('partial','verified')
  where p.slug=p_slug and s.slug=p_sport_slug and p.is_active=true limit 1;
$$;

grant execute on function public.get_public_participant_profile_v2(text,text) to anon, authenticated;
