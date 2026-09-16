begin;

-- Active/high-growth V2 tables only. These indexes support joins, deletes and
-- lookups already used by schedules, permanent pages, providers and team pages.
create index if not exists event_external_ids_event_id_idx
  on public.event_external_ids (event_id);

create index if not exists event_pages_home_participant_id_idx
  on public.event_pages (home_participant_id)
  where home_participant_id is not null;

create index if not exists event_pages_away_participant_id_idx
  on public.event_pages (away_participant_id)
  where away_participant_id is not null;

create index if not exists event_pages_inverse_page_id_idx
  on public.event_pages (inverse_page_id)
  where inverse_page_id is not null;

create index if not exists events_season_id_idx
  on public.events (season_id)
  where season_id is not null;

create index if not exists event_broadcasts_broadcast_right_id_idx
  on public.event_broadcasts (broadcast_right_id)
  where broadcast_right_id is not null;

create index if not exists event_broadcasts_broadcaster_id_idx
  on public.event_broadcasts (broadcaster_id);

create index if not exists event_broadcasts_platform_id_idx
  on public.event_broadcasts (platform_id)
  where platform_id is not null;

create index if not exists competition_memberships_participant_id_idx
  on public.competition_memberships (participant_id);

commit;
