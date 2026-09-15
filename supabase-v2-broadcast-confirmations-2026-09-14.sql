BEGIN;
SET LOCAL search_path = public, pg_catalog;

-- Verified 2026/27 UCL refinements. This migration deliberately does not publish anything.
-- OneSoccer is retained as a competition-level partner only until exact match allocations are evidenced.

-- Canada: DAZN's current Canada product documentation confirms UEFA Champions League
-- within DAZN+, while the direct DAZN service is already modelled as full coverage.
UPDATE broadcast_rights br
SET coverage_type = 'full', access_type = 'Paid', last_verified_at = now(),
    source_name = 'DAZN Canada UEFA Champions League access',
    source_url = 'https://www.dazn.com/en-CA/help/articles/37275032815261-why-is-the-dazn-soccer-plan-no-longer-available',
    verification_status = 'confirmed'
FROM competitions c, sports s, seasons se, territories t, broadcasters b
WHERE br.competition_id = c.id AND c.sport_id = s.id
  AND br.season_id = se.id AND br.territory_id = t.id AND br.broadcaster_id = b.id
  AND s.slug = 'football' AND c.slug = 'champions-league' AND se.slug = '2026-27'
  AND t.code = 'ca' AND b.slug = 'dazn';

-- UK: TNT explicitly listed all six 10 September fixtures as live on TNT Sports + HBO Max.
INSERT INTO platforms (broadcaster_id, slug, name, url)
SELECT b.id, 'hbo-max', 'HBO Max', 'https://www.hbomax.com/'
FROM broadcasters b WHERE b.slug = 'tnt-sports'
ON CONFLICT (broadcaster_id, slug) DO UPDATE SET name = EXCLUDED.name, url = EXCLUDED.url;

WITH right_ctx AS (
  SELECT br.id right_id, br.territory_id, br.broadcaster_id, p.id platform_id
  FROM broadcast_rights br
  JOIN competitions c ON c.id=br.competition_id
  JOIN sports s ON s.id=c.sport_id
  JOIN seasons se ON se.id=br.season_id
  JOIN territories t ON t.id=br.territory_id
  JOIN broadcasters b ON b.id=br.broadcaster_id
  JOIN platforms p ON p.broadcaster_id=b.id AND p.slug='hbo-max'
  WHERE s.slug='football' AND c.slug='champions-league' AND se.slug='2026-27'
    AND t.code='gb' AND b.slug='tnt-sports'
), selected(slug) AS (VALUES
 ('fenerbahce-roma'),('psv-eindhoven-shakhtar-donetsk'),('bayern-munchen-bodo-glimt'),
 ('slavia-praha-lens'),('manchester-united-sabah'),('como-leipzig')
)
INSERT INTO event_broadcasts(event_id,broadcast_right_id,territory_id,broadcaster_id,platform_id,
 decision,access_type,official_url,language_codes,source_name,source_url,last_verified_at,
 verification_status,is_published,notes,broadcast_type,requires_account,is_free_trial)
SELECT e.id,r.right_id,r.territory_id,r.broadcaster_id,r.platform_id,'included','Paid',
 'https://www.hbomax.com/',ARRAY['en']::text[],
 'TNT Sports Champions League live coverage 10 September 2026',
 'https://www.tntsports.co.uk/football/champions-league/2026-2027/live-manchester-united-arsenal-liverpool-bayern-munich-como-league-phase_lci50029541/liveevent.shtml?page=2',
 now(),'confirmed',false,'Explicitly listed live on TNT Sports and HBO Max.','live',true,false
FROM selected x JOIN events e ON e.slug=x.slug CROSS JOIN right_ctx r
ON CONFLICT (event_id,broadcast_right_id,territory_id,broadcaster_id,platform_id,broadcast_type)
DO UPDATE SET verification_status='confirmed', source_name=EXCLUDED.source_name,
 source_url=EXCLUDED.source_url,last_verified_at=EXCLUDED.last_verified_at,
 language_codes=EXCLUDED.language_codes,official_url=EXCLUDED.official_url;

COMMIT;
