-- WatchTVSport V2 confirmed participant membership by competition/season.
-- Team lists are seeded separately from authoritative league sources so permanent participant identity is not tied to fixtures.

create table if not exists public.competition_memberships (
  id uuid primary key default gen_random_uuid(),
  competition_id uuid not null references public.competitions(id) on delete cascade,
  season_id uuid references public.seasons(id) on delete cascade,
  participant_id uuid not null references public.participants(id) on delete cascade,
  membership_status text not null default 'confirmed' check (membership_status in ('expected','confirmed','withdrawn')),
  source_name text not null,
  source_url text not null,
  verified_at timestamptz,
  created_at timestamptz not null default now(),
  unique(competition_id,season_id,participant_id)
);

create index if not exists competition_memberships_lookup
  on public.competition_memberships(competition_id,season_id,membership_status);

alter table public.competition_memberships enable row level security;
drop policy if exists public_select_competition_memberships on public.competition_memberships;
create policy public_select_competition_memberships on public.competition_memberships
  for select to public using (membership_status='confirmed');

-- Current source families used by the 2026/27 seed:
-- Premier League: https://www.premierleague.com/en/news/4675097/all-380-fixtures-for-202627-premier-league-season/
-- Ligue 1: https://ligue1.com/fr/articles/l1_article_5293-les-dates-de-reprise-des-clubs-de-l1-2627
-- LaLiga: https://www.laliga.com/laliga-easports/clubes
-- Bundesliga: https://www.bundesliga.com/en/bundesliga/clubs
-- NBA: https://www.nba.com/news/about
-- NHL: https://www.nhl.com/info/nhl-affiliates-member-clubs
-- NFL: https://www.nfl.com/teams/
