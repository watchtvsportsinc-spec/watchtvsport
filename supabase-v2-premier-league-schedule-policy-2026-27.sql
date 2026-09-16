-- 2026/27 Premier League scheduling policy as of 2026-09-16.
-- Fixture Release Day supplies provisional/default dates and times for later rounds.
-- WatchTVSport only exposes an exact kickoff after the relevant official scheduling announcement.
-- Matchweeks 1-9 have official revised schedules; MW10 onward remains window-only until verified.

update public.event_editions ee
set schedule_status=case when ee.round_number between 1 and 9 then 'schedule_confirmed' else 'schedule_pending' end,
    updated_at=now()
from public.event_pages ep
join public.competitions c on c.id=ep.competition_id
join public.seasons s on s.competition_id=c.id and s.slug='2026-27'
where ee.event_page_id=ep.id
  and ee.season_id=s.id
  and c.slug='premier-league';
