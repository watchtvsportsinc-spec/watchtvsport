BEGIN;
SET LOCAL search_path = public, pg_catalog;

-- Priority launch territories for WatchTVSport V2.
INSERT INTO territories (code, name)
VALUES
  ('ca', 'Canada'),
  ('fr', 'France'),
  ('gb', 'United Kingdom'),
  ('us', 'United States')
ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name;

INSERT INTO broadcasters (slug, name, kind, website_url)
VALUES
  ('dazn', 'DAZN', 'streaming', 'https://www.dazn.com/'),
  ('onesoccer', 'OneSoccer', 'streaming', 'https://onesoccer.ca/'),
  ('canal-plus', 'CANAL+', 'network', 'https://www.canalplus.com/'),
  ('tnt-sports', 'TNT Sports', 'network', 'https://www.tntsports.co.uk/'),
  ('amazon-prime-video', 'Amazon Prime Video', 'streaming', 'https://www.amazon.co.uk/primevideo'),
  ('bbc', 'BBC', 'network', 'https://www.bbc.co.uk/'),
  ('paramount-plus', 'Paramount+', 'streaming', 'https://www.paramountplus.com/'),
  ('tudn', 'TUDN', 'network', 'https://www.tudn.com/'),
  ('rds', 'RDS', 'network', 'https://www.rds.ca/'),
  ('rds-2', 'RDS 2', 'linear', 'https://www.rds.ca/'),
  ('tsn', 'TSN', 'network', 'https://www.tsn.ca/'),
  ('noovo', 'Noovo', 'network', 'https://www.noovo.ca/'),
  ('sky-sports', 'Sky Sports', 'network', 'https://www.skysports.com/'),
  ('apple-tv', 'Apple TV', 'streaming', 'https://tv.apple.com/')
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  kind = EXCLUDED.kind,
  website_url = EXCLUDED.website_url;

-- UEFA Champions League 2026/27.
-- Coverage stays unknown unless the official source explicitly establishes full coverage.
WITH ctx AS (
  SELECT c.id AS competition_id, se.id AS season_id
  FROM competitions c
  JOIN sports s ON s.id = c.sport_id AND s.slug = 'football'
  JOIN seasons se ON se.competition_id = c.id AND se.slug = '2026-27'
  WHERE c.slug = 'champions-league'
), rights_data(territory_code,broadcaster_slug,access_type,coverage_type,source_name,source_url) AS (
  VALUES
    ('ca','dazn','Paid','unknown','UEFA Champions League official broadcast partners','https://www.uefa.com/uefachampionsleague/news/0253-0d82037aaedd-f371c464f919-1000--where-to-watch-the-draw/'),
    ('ca','onesoccer','Unknown','unknown','UEFA Champions League official broadcast partners','https://www.uefa.com/uefachampionsleague/news/0253-0d82037aaedd-f371c464f919-1000--where-to-watch-the-draw/'),
    ('fr','canal-plus','Paid','full','CANAL+ UEFA Champions League 2026/27 coverage','https://boutique.canalplus.com/offres/champions-league'),
    ('gb','tnt-sports','Unknown','unknown','UEFA Champions League official broadcast partners','https://www.uefa.com/uefachampionsleague/news/0253-0d82037aaedd-f371c464f919-1000--where-to-watch-the-draw/'),
    ('gb','amazon-prime-video','Unknown','unknown','UEFA Champions League official broadcast partners','https://www.uefa.com/uefachampionsleague/news/0253-0d82037aaedd-f371c464f919-1000--where-to-watch-the-draw/'),
    ('gb','bbc','Free','partial','UEFA Champions League official broadcast partners (highlights rights)','https://www.uefa.com/uefachampionsleague/news/0253-0d82037aaedd-f371c464f919-1000--where-to-watch-the-draw/'),
    ('us','paramount-plus','Paid','unknown','UEFA Champions League official broadcast partners','https://www.uefa.com/uefachampionsleague/news/0253-0d82037aaedd-f371c464f919-1000--where-to-watch-the-draw/'),
    ('us','tudn','Unknown','unknown','UEFA Champions League official broadcast partners','https://www.uefa.com/uefachampionsleague/news/0253-0d82037aaedd-f371c464f919-1000--where-to-watch-the-draw/'),
    ('us','dazn','Paid','unknown','UEFA Champions League official broadcast partners','https://www.uefa.com/uefachampionsleague/news/0253-0d82037aaedd-f371c464f919-1000--where-to-watch-the-draw/')
)
INSERT INTO broadcast_rights (
  competition_id, season_id, territory_id, broadcaster_id,
  access_type, coverage_type, valid_from, valid_to,
  is_published, source_name, source_url, last_verified_at, verification_status
)
SELECT
  ctx.competition_id, ctx.season_id, t.id, b.id,
  r.access_type, r.coverage_type, DATE '2026-07-01', DATE '2027-06-30',
  false, r.source_name, r.source_url, now(), 'confirmed'
FROM ctx
CROSS JOIN rights_data r
JOIN territories t ON t.code = r.territory_code
JOIN broadcasters b ON b.slug = r.broadcaster_slug
ON CONFLICT DO NOTHING;

-- Formula 1 2026.
-- Canada remains coverage=unknown because the official F1 list names broadcasters
-- but does not specify the exact split. Full coverage is only asserted where the
-- official source explicitly confirms all sessions/races.
WITH ctx AS (
  SELECT c.id AS competition_id, se.id AS season_id
  FROM competitions c
  JOIN sports s ON s.id = c.sport_id AND s.slug = 'formula-1'
  JOIN seasons se ON se.competition_id = c.id AND se.slug = '2026'
  WHERE c.slug = 'formula-1'
), rights_data(territory_code,broadcaster_slug,access_type,coverage_type,source_name,source_url) AS (
  VALUES
    ('ca','rds','Unknown','unknown','Formula 1 official broadcast information','https://www.formula1.com/en/information/f1-broadcast-information.45y3LNsT1D6VoK0ZmX8ciJ'),
    ('ca','rds-2','Unknown','unknown','Formula 1 official broadcast information','https://www.formula1.com/en/information/f1-broadcast-information.45y3LNsT1D6VoK0ZmX8ciJ'),
    ('ca','tsn','Unknown','unknown','Formula 1 official broadcast information','https://www.formula1.com/en/information/f1-broadcast-information.45y3LNsT1D6VoK0ZmX8ciJ'),
    ('ca','noovo','Unknown','unknown','Formula 1 official broadcast information','https://www.formula1.com/en/information/f1-broadcast-information.45y3LNsT1D6VoK0ZmX8ciJ'),
    ('fr','canal-plus','Paid','full','CANAL+ Formula 1 2026 coverage','https://boutique.canalplus.com/sport/f1'),
    ('gb','sky-sports','Paid','full','Formula 1 and Sky long-term UK rights','https://www.formula1.com/en/latest/article/f1-and-sky-agree-new-long-term-partnership-across-uk-ireland-and-italy.Yd2VK2z6QxZkrR6zH2ssr'),
    ('us','apple-tv','Paid','full','Apple exclusive U.S. Formula 1 partner','https://www.apple.com/newsroom/2026/03/formula-1-begins-this-weekend-exclusively-on-apple-tv-in-the-us/')
)
INSERT INTO broadcast_rights (
  competition_id, season_id, territory_id, broadcaster_id,
  access_type, coverage_type, valid_from, valid_to,
  is_published, source_name, source_url, last_verified_at, verification_status
)
SELECT
  ctx.competition_id, ctx.season_id, t.id, b.id,
  r.access_type, r.coverage_type, DATE '2026-01-01', DATE '2026-12-31',
  false, r.source_name, r.source_url, now(), 'confirmed'
FROM ctx
CROSS JOIN rights_data r
JOIN territories t ON t.code = r.territory_code
JOIN broadcasters b ON b.slug = r.broadcaster_slug
ON CONFLICT DO NOTHING;

-- Exact per-event offers are generated only from explicitly confirmed full-season rights.
-- They remain unpublished until the V2 publication gate is intentionally opened.
WITH full_rights AS (
  SELECT br.*
  FROM broadcast_rights br
  JOIN competitions c ON c.id = br.competition_id
  JOIN sports s ON s.id = c.sport_id
  WHERE br.verification_status = 'confirmed'
    AND br.coverage_type = 'full'
    AND br.season_id IS NOT NULL
    AND (
      (s.slug = 'football' AND c.slug = 'champions-league')
      OR (s.slug = 'formula-1' AND c.slug = 'formula-1')
    )
)
INSERT INTO event_broadcasts (
  event_id, broadcast_right_id, territory_id, broadcaster_id, platform_id,
  decision, access_type, official_url, language_codes,
  source_name, source_url, last_verified_at, verification_status,
  is_published, notes, broadcast_type, requires_account, is_free_trial
)
SELECT
  e.id,
  br.id,
  br.territory_id,
  br.broadcaster_id,
  br.platform_id,
  'included',
  br.access_type,
  b.website_url,
  '{}'::text[],
  br.source_name,
  br.source_url,
  br.last_verified_at,
  'confirmed',
  false,
  'Generated from a confirmed full-season broadcast right; publication remains gated.',
  'live',
  CASE WHEN br.access_type = 'Paid' THEN true ELSE false END,
  false
FROM full_rights br
JOIN broadcasters b ON b.id = br.broadcaster_id
JOIN events e
  ON e.competition_id = br.competition_id
 AND e.season_id = br.season_id
WHERE e.verification_status = 'confirmed'
ON CONFLICT DO NOTHING;

COMMIT;
