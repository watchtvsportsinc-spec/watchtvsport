BEGIN;
SET LOCAL search_path = public, pg_catalog;

-- UFC is modelled as a fight card with separately addressable broadcast sessions.
ALTER TABLE sports DROP CONSTRAINT sports_event_model_check;
ALTER TABLE sports ADD CONSTRAINT sports_event_model_check CHECK (
  event_model IN ('team_match', 'tournament_match', 'race_session', 'cycling_race', 'fight_card')
);

ALTER TABLE event_pages DROP CONSTRAINT event_pages_entity_kind_check;
ALTER TABLE event_pages ADD CONSTRAINT event_pages_entity_kind_check CHECK (
  entity_kind IN ('fixture', 'race_weekend', 'fight_card', 'tournament', 'race', 'standalone')
);

CREATE OR REPLACE FUNCTION validate_event_against_sport_model()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_catalog
AS $$
DECLARE
  v_event_model text;
BEGIN
  SELECT event_model INTO v_event_model FROM sports WHERE id = NEW.sport_id;

  IF v_event_model IN ('race_session', 'fight_card') THEN
    IF NEW.event_kind <> 'session'
      OR NEW.event_page_id IS NULL
      OR NEW.event_edition_id IS NULL
      OR NEW.session_type IS NULL
      OR btrim(NEW.session_type) = ''
      OR NEW.session_order IS NULL
    THEN
      RAISE EXCEPTION USING ERRCODE = '23514',
        MESSAGE = 'session-based sports require session events attached to a page and edition';
    END IF;

    IF NEW.home_participant_id IS NOT NULL OR NEW.away_participant_id IS NOT NULL THEN
      RAISE EXCEPTION USING ERRCODE = '23514',
        MESSAGE = 'session-based events cannot use home/away participants';
    END IF;
  ELSIF v_event_model = 'team_match' THEN
    IF NEW.event_kind = 'session' THEN
      RAISE EXCEPTION USING ERRCODE = '23514',
        MESSAGE = 'team_match sports cannot use session events';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

INSERT INTO sports (
  slug, name, public_slug, event_model, participant_page_policy,
  is_enabled, localized_labels, aliases
)
VALUES (
  'ufc', 'UFC', 'ufc', 'fight_card', 'none', true,
  jsonb_build_object('fr-FR','UFC','fr-CA','UFC','en-CA','UFC','en-US','UFC','en-GB','UFC'),
  ARRAY['ufc','mma','mixed martial arts','arts martiaux mixtes']
)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  public_slug = EXCLUDED.public_slug,
  event_model = EXCLUDED.event_model,
  participant_page_policy = EXCLUDED.participant_page_policy,
  is_enabled = EXCLUDED.is_enabled,
  localized_labels = EXCLUDED.localized_labels,
  aliases = EXCLUDED.aliases;

INSERT INTO competitions (sport_id, slug, name, season_label, is_active)
SELECT id, 'ufc', 'UFC', '2026', true FROM sports WHERE slug='ufc'
ON CONFLICT (sport_id, slug) DO UPDATE SET name=EXCLUDED.name, season_label=EXCLUDED.season_label, is_active=true;

INSERT INTO seasons (competition_id, slug, label, start_date, end_date, is_current)
SELECT c.id, '2026', '2026', DATE '2026-01-01', DATE '2026-12-31', true
FROM competitions c JOIN sports s ON s.id=c.sport_id
WHERE s.slug='ufc' AND c.slug='ufc'
ON CONFLICT (competition_id, slug) DO UPDATE SET label=EXCLUDED.label, start_date=EXCLUDED.start_date, end_date=EXCLUDED.end_date, is_current=true;

INSERT INTO data_sources (
  slug, name, access_method, homepage_url, reuse_status, commercial_use_allowed,
  terms_summary, terms_reviewed_at, pricing_status, is_enabled,
  automatic_collection_enabled, automatic_publication_enabled
)
VALUES (
  'ufc-official-web', 'UFC official website', 'web_reference', 'https://www.ufc.com/',
  'restricted', false,
  'Official event and watch pages are retained as human-verification references; automated collection is not enabled.',
  now(), 'not_applicable', true, false, false
)
ON CONFLICT (slug) DO UPDATE SET
  name=EXCLUDED.name, homepage_url=EXCLUDED.homepage_url, reuse_status=EXCLUDED.reuse_status,
  commercial_use_allowed=EXCLUDED.commercial_use_allowed, terms_summary=EXCLUDED.terms_summary,
  terms_reviewed_at=EXCLUDED.terms_reviewed_at, is_enabled=true,
  automatic_collection_enabled=false, automatic_publication_enabled=false;

INSERT INTO source_scopes (source_id, data_domain, sport_id, competition_id, reference_url, coverage_status, notes)
SELECT ds.id, v.domain, s.id, c.id, v.url, 'reference_only', v.notes
FROM data_sources ds
JOIN sports s ON s.slug='ufc'
JOIN competitions c ON c.sport_id=s.id AND c.slug='ufc'
CROSS JOIN (VALUES
  ('calendar','https://www.ufc.com/events','Official UFC event schedule; manual verification only.'),
  ('broadcast','https://www.ufc.com/watch/schedule','Official UFC watch schedule; event/session-level verification required.')
) AS v(domain,url,notes)
WHERE ds.slug='ufc-official-web'
ON CONFLICT (source_id, data_domain, sport_id, competition_id, territory_id) DO UPDATE SET
  reference_url=EXCLUDED.reference_url, coverage_status=EXCLUDED.coverage_status,
  notes=EXCLUDED.notes, is_enabled=true, last_verified_at=now();

INSERT INTO broadcasters (slug, name, kind, website_url)
VALUES
  ('sportsnet','Sportsnet','network','https://www.sportsnet.ca/'),
  ('tva-sports','TVA Sports','network','https://www.tvasports.ca/'),
  ('ufc-fight-pass','UFC Fight Pass','streaming','https://www.ufc.com/fightpass'),
  ('ufc-ppv','UFC Pay-Per-View','platform','https://www.ufc.com/watch'),
  ('rmc-sport','RMC Sport','network','https://rmcsport.tv/'),
  ('cbs','CBS','network','https://www.cbs.com/'),
  ('paramount-plus','Paramount+','streaming','https://www.paramountplus.com/'),
  ('tnt-sports','TNT Sports','network','https://www.tntsports.co.uk/')
ON CONFLICT (slug) DO UPDATE SET name=EXCLUDED.name, kind=EXCLUDED.kind, website_url=EXCLUDED.website_url;

INSERT INTO platforms (broadcaster_id, slug, name, url)
SELECT id, 'box-office', 'TNT Sports Box Office', 'https://www.tntsports.co.uk/'
FROM broadcasters WHERE slug='tnt-sports'
ON CONFLICT (broadcaster_id, slug) DO UPDATE SET name=EXCLUDED.name, url=EXCLUDED.url;

WITH cards(slug,title,event_date,venue,city,country_code,country_name) AS (
  VALUES
  ('ufc-331-van-vs-pantoja-2','UFC 331: Van vs Pantoja 2',DATE '2026-09-19','Crypto.com Arena','Los Angeles, CA','US','United States'),
  ('ufc-fight-night-rosas-jr-vs-barcelos','UFC Fight Night: Rosas Jr. vs Barcelos',DATE '2026-09-26','Meta APEX','Las Vegas, NV','US','United States'),
  ('ufc-332-silva-vs-wang','UFC 332: Silva vs Wang',DATE '2026-10-03','Delta Center','Salt Lake City, UT','US','United States'),
  ('ufc-fight-night-allen-vs-duncan','UFC Fight Night: Allen vs Duncan',DATE '2026-10-10','Meta APEX','Las Vegas, NV','US','United States'),
  ('ufc-fight-night-buckley-vs-malott','UFC Fight Night: Buckley vs Malott',DATE '2026-10-17','Rogers Place','Edmonton, AB','CA','Canada'),
  ('ufc-333-volkanovski-vs-evloev','UFC 333: Volkanovski vs Evloev',DATE '2026-10-24','Etihad Arena','Abu Dhabi','AE','United Arab Emirates'),
  ('ufc-fight-night-october-31-2026','UFC Fight Night — October 31, 2026',DATE '2026-10-31','Meta APEX','Las Vegas, NV','US','United States')
), ctx AS (
  SELECT s.id sport_id,c.id competition_id,se.id season_id
  FROM sports s JOIN competitions c ON c.sport_id=s.id JOIN seasons se ON se.competition_id=c.id
  WHERE s.slug='ufc' AND c.slug='ufc' AND se.slug='2026'
)
INSERT INTO event_pages (
  sport_id, competition_id, page_type, entity_kind, slug, title,
  is_published, source_name, source_url, last_verified_at, verification_status
)
SELECT ctx.sport_id,ctx.competition_id,'multi_session','fight_card',cards.slug,cards.title,
  false,'UFC official events','https://www.ufc.com/events',now(),'confirmed'
FROM cards CROSS JOIN ctx
ON CONFLICT (competition_id,slug) DO UPDATE SET
  page_type=EXCLUDED.page_type,entity_kind=EXCLUDED.entity_kind,title=EXCLUDED.title,
  source_name=EXCLUDED.source_name,source_url=EXCLUDED.source_url,last_verified_at=EXCLUDED.last_verified_at,
  verification_status='confirmed';

INSERT INTO event_page_urls (event_page_id,url_path,kind,is_active)
SELECT ep.id,'/ufc/event/'||ep.slug,'canonical',true
FROM event_pages ep JOIN competitions c ON c.id=ep.competition_id JOIN sports s ON s.id=c.sport_id
WHERE s.slug='ufc' AND c.slug='ufc'
ON CONFLICT (url_path) DO UPDATE SET event_page_id=EXCLUDED.event_page_id,kind='canonical',is_active=true;

WITH cards(slug,title,event_date,venue,city,country_code) AS (
  VALUES
  ('ufc-331-van-vs-pantoja-2','UFC 331: Van vs Pantoja 2',DATE '2026-09-19','Crypto.com Arena','Los Angeles, CA','US'),
  ('ufc-fight-night-rosas-jr-vs-barcelos','UFC Fight Night: Rosas Jr. vs Barcelos',DATE '2026-09-26','Meta APEX','Las Vegas, NV','US'),
  ('ufc-332-silva-vs-wang','UFC 332: Silva vs Wang',DATE '2026-10-03','Delta Center','Salt Lake City, UT','US'),
  ('ufc-fight-night-allen-vs-duncan','UFC Fight Night: Allen vs Duncan',DATE '2026-10-10','Meta APEX','Las Vegas, NV','US'),
  ('ufc-fight-night-buckley-vs-malott','UFC Fight Night: Buckley vs Malott',DATE '2026-10-17','Rogers Place','Edmonton, AB','CA'),
  ('ufc-333-volkanovski-vs-evloev','UFC 333: Volkanovski vs Evloev',DATE '2026-10-24','Etihad Arena','Abu Dhabi','AE'),
  ('ufc-fight-night-october-31-2026','UFC Fight Night — October 31, 2026',DATE '2026-10-31','Meta APEX','Las Vegas, NV','US')
), season_ctx AS (
  SELECT se.id season_id,c.id competition_id
  FROM seasons se JOIN competitions c ON c.id=se.competition_id JOIN sports s ON s.id=c.sport_id
  WHERE s.slug='ufc' AND c.slug='ufc' AND se.slug='2026'
)
INSERT INTO event_editions (
  event_page_id,season_id,edition_key,label,start_date,end_date,status,
  is_published,source_name,source_url,last_verified_at,verification_status,
  venue_name,venue_city,country_code
)
SELECT ep.id,sc.season_id,cards.event_date::text,to_char(cards.event_date,'FMMonth DD, YYYY'),
  cards.event_date,cards.event_date,'scheduled',false,'UFC official events','https://www.ufc.com/events',
  now(),'confirmed',cards.venue,cards.city,cards.country_code
FROM cards
JOIN event_pages ep ON ep.slug=cards.slug
JOIN season_ctx sc ON sc.competition_id=ep.competition_id
ON CONFLICT (event_page_id,edition_key) DO UPDATE SET
  label=EXCLUDED.label,start_date=EXCLUDED.start_date,end_date=EXCLUDED.end_date,status=EXCLUDED.status,
  source_name=EXCLUDED.source_name,source_url=EXCLUDED.source_url,last_verified_at=EXCLUDED.last_verified_at,
  verification_status='confirmed',venue_name=EXCLUDED.venue_name,venue_city=EXCLUDED.venue_city,country_code=EXCLUDED.country_code;

WITH sessions(card_slug,session_type,session_label,session_order,event_date) AS (
  VALUES
  ('ufc-331-van-vs-pantoja-2','early_prelims','Early Prelims',1,'2026-09-19 21:00:00+00'::timestamptz),
  ('ufc-331-van-vs-pantoja-2','prelims','Prelims',2,'2026-09-19 23:00:00+00'::timestamptz),
  ('ufc-331-van-vs-pantoja-2','main_card','Main Card',3,'2026-09-20 01:00:00+00'::timestamptz),
  ('ufc-fight-night-rosas-jr-vs-barcelos','prelims','Prelims',1,'2026-09-26 21:00:00+00'::timestamptz),
  ('ufc-fight-night-rosas-jr-vs-barcelos','main_card','Main Card',2,'2026-09-27 00:00:00+00'::timestamptz),
  ('ufc-332-silva-vs-wang','early_prelims','Early Prelims',1,'2026-10-03 20:00:00+00'::timestamptz),
  ('ufc-332-silva-vs-wang','prelims','Prelims',2,'2026-10-03 22:00:00+00'::timestamptz),
  ('ufc-332-silva-vs-wang','main_card','Main Card',3,'2026-10-04 00:00:00+00'::timestamptz),
  ('ufc-fight-night-allen-vs-duncan','prelims','Prelims',1,'2026-10-10 21:00:00+00'::timestamptz),
  ('ufc-fight-night-allen-vs-duncan','main_card','Main Card',2,'2026-10-11 00:00:00+00'::timestamptz),
  ('ufc-fight-night-buckley-vs-malott','prelims','Prelims',1,'2026-10-17 21:00:00+00'::timestamptz),
  ('ufc-fight-night-buckley-vs-malott','main_card','Main Card',2,'2026-10-18 00:00:00+00'::timestamptz),
  ('ufc-333-volkanovski-vs-evloev','early_prelims','Early Prelims',1,'2026-10-24 14:00:00+00'::timestamptz),
  ('ufc-333-volkanovski-vs-evloev','prelims','Prelims',2,'2026-10-24 16:00:00+00'::timestamptz),
  ('ufc-333-volkanovski-vs-evloev','main_card','Main Card',3,'2026-10-24 18:00:00+00'::timestamptz),
  ('ufc-fight-night-october-31-2026','prelims','Prelims',1,'2026-10-31 21:00:00+00'::timestamptz),
  ('ufc-fight-night-october-31-2026','main_card','Main Card',2,'2026-11-01 00:00:00+00'::timestamptz)
), ctx AS (
  SELECT s.id sport_id,c.id competition_id,se.id season_id
  FROM sports s JOIN competitions c ON c.sport_id=s.id JOIN seasons se ON se.competition_id=c.id
  WHERE s.slug='ufc' AND c.slug='ufc' AND se.slug='2026'
)
INSERT INTO events (
  sport_id,competition_id,season_id,status,slug,phase,event_date,scheduled_date,
  venue_name,venue_city,event_page_id,event_edition_id,event_kind,session_type,
  session_label,sequence_number,session_order,session_group,is_published,
  source_name,source_url,last_verified_at,verification_status
)
SELECT ctx.sport_id,ctx.competition_id,ctx.season_id,'scheduled',
  sessions.card_slug||'-'||replace(sessions.session_type,'_','-'),sessions.session_label,
  sessions.event_date,sessions.event_date,ee.venue_name,ee.venue_city,ep.id,ee.id,
  'session',sessions.session_type,sessions.session_label,sessions.session_order,
  sessions.session_order,'card',false,'UFC official watch schedule',
  'https://www.ufc.com/watch/schedule',now(),'confirmed'
FROM sessions CROSS JOIN ctx
JOIN event_pages ep ON ep.competition_id=ctx.competition_id AND ep.slug=sessions.card_slug
JOIN event_editions ee ON ee.event_page_id=ep.id AND ee.season_id=ctx.season_id
ON CONFLICT (sport_id,slug) DO UPDATE SET
  status=EXCLUDED.status,phase=EXCLUDED.phase,event_date=EXCLUDED.event_date,scheduled_date=EXCLUDED.scheduled_date,
  venue_name=EXCLUDED.venue_name,venue_city=EXCLUDED.venue_city,event_page_id=EXCLUDED.event_page_id,
  event_edition_id=EXCLUDED.event_edition_id,event_kind=EXCLUDED.event_kind,session_type=EXCLUDED.session_type,
  session_label=EXCLUDED.session_label,sequence_number=EXCLUDED.sequence_number,session_order=EXCLUDED.session_order,
  session_group=EXCLUDED.session_group,source_name=EXCLUDED.source_name,source_url=EXCLUDED.source_url,
  last_verified_at=EXCLUDED.last_verified_at,verification_status='confirmed';

-- Rights catalogue for the launch territories.
WITH ctx AS (
  SELECT c.id competition_id,se.id season_id FROM competitions c
  JOIN sports s ON s.id=c.sport_id JOIN seasons se ON se.competition_id=c.id
  WHERE s.slug='ufc' AND c.slug='ufc' AND se.slug='2026'
), rights(territory_code,broadcaster_slug,platform_slug,access_type,coverage_type,source_name,source_url) AS (
  VALUES
  ('us','paramount-plus',NULL,'Paid','full','UFC and Paramount U.S. media rights agreement','https://www.ufc.com/news/paramount-and-tko-announce-historic-ufc-media-rights-agreement'),
  ('us','cbs',NULL,'Free','partial','UFC 332 official announcement','https://www.ufc.com/news/womens-flyweight-championship-leads-showcase-rising-stars-ufc-return-salt-lake-city'),
  ('ca','sportsnet',NULL,'Paid','partial','UFC 331 official regional watch guide','https://www.ufc.com/news/how-watch-and-stream-ufc'),
  ('ca','tva-sports',NULL,'Paid','partial','UFC 331 official regional watch guide','https://www.ufc.com/news/how-watch-and-stream-ufc'),
  ('ca','ufc-fight-pass',NULL,'Paid','partial','UFC 331 official regional watch guide','https://www.ufc.com/news/how-watch-and-stream-ufc'),
  ('ca','ufc-ppv',NULL,'Paid','partial','UFC 331 official regional watch guide','https://www.ufc.com/news/how-watch-and-stream-ufc'),
  ('fr','rmc-sport',NULL,'Paid','partial','UFC 331 official regional watch guide','https://www.ufc.com/news/how-watch-and-stream-ufc'),
  ('fr','ufc-fight-pass',NULL,'Paid','partial','UFC 331 official regional watch guide','https://www.ufc.com/news/how-watch-and-stream-ufc'),
  ('gb','tnt-sports',NULL,'Paid','partial','UFC 331 official regional watch guide','https://www.ufc.com/news/how-watch-and-stream-ufc'),
  ('gb','tnt-sports','box-office','Paid','partial','UFC 331 official regional watch guide','https://www.ufc.com/news/how-watch-and-stream-ufc'),
  ('gb','ufc-fight-pass',NULL,'Paid','partial','UFC 331 official regional watch guide','https://www.ufc.com/news/how-watch-and-stream-ufc')
)
INSERT INTO broadcast_rights (
  competition_id,season_id,territory_id,broadcaster_id,platform_id,access_type,coverage_type,
  valid_from,valid_to,is_published,source_name,source_url,last_verified_at,verification_status
)
SELECT ctx.competition_id,ctx.season_id,t.id,b.id,p.id,r.access_type,r.coverage_type,
  DATE '2026-01-01',DATE '2026-12-31',false,r.source_name,r.source_url,now(),'confirmed'
FROM rights r CROSS JOIN ctx
JOIN territories t ON t.code=r.territory_code
JOIN broadcasters b ON b.slug=r.broadcaster_slug
LEFT JOIN platforms p ON p.broadcaster_id=b.id AND p.slug=r.platform_slug
ON CONFLICT DO NOTHING;

-- All U.S. UFC cards are on Paramount+ in 2026.
WITH br AS (
  SELECT br.* FROM broadcast_rights br
  JOIN competitions c ON c.id=br.competition_id JOIN sports s ON s.id=c.sport_id
  JOIN territories t ON t.id=br.territory_id JOIN broadcasters b ON b.id=br.broadcaster_id
  WHERE s.slug='ufc' AND c.slug='ufc' AND t.code='us' AND b.slug='paramount-plus'
)
INSERT INTO event_broadcasts (
  event_id,broadcast_right_id,territory_id,broadcaster_id,platform_id,decision,access_type,
  official_url,language_codes,source_name,source_url,last_verified_at,verification_status,
  is_published,notes,broadcast_type,requires_account,is_free_trial
)
SELECT e.id,br.id,br.territory_id,br.broadcaster_id,br.platform_id,'included','Paid',
  'https://www.paramountplus.com/',ARRAY['en']::text[],br.source_name,br.source_url,now(),'confirmed',
  false,'Confirmed from the 2026 U.S. UFC rights agreement.','live',true,false
FROM br JOIN events e ON e.competition_id=br.competition_id AND e.season_id=br.season_id
ON CONFLICT DO NOTHING;

-- UFC 331 regional session allocations from UFC's event-specific watch guide.
WITH offers(session_type,territory_code,broadcaster_slug,platform_slug,access_type,official_url,languages,conditions) AS (
  VALUES
  ('early_prelims','ca','ufc-fight-pass',NULL,'Paid','https://www.ufc.com/fightpass',ARRAY['en']::text[],NULL),
  ('early_prelims','fr','ufc-fight-pass',NULL,'Paid','https://www.ufc.com/fightpass',ARRAY[]::text[],NULL),
  ('early_prelims','gb','ufc-fight-pass',NULL,'Paid','https://www.ufc.com/fightpass',ARRAY['en']::text[],NULL),
  ('prelims','ca','sportsnet',NULL,'Paid','https://www.sportsnet.ca/',ARRAY['en']::text[],NULL),
  ('prelims','ca','tva-sports',NULL,'Paid','https://www.tvasports.ca/',ARRAY['fr']::text[],NULL),
  ('prelims','fr','rmc-sport',NULL,'Paid','https://rmcsport.tv/',ARRAY['fr']::text[],NULL),
  ('prelims','fr','ufc-fight-pass',NULL,'Paid','https://www.ufc.com/fightpass',ARRAY[]::text[],NULL),
  ('prelims','gb','tnt-sports',NULL,'Paid','https://www.tntsports.co.uk/',ARRAY['en']::text[],NULL),
  ('prelims','gb','ufc-fight-pass',NULL,'Paid','https://www.ufc.com/fightpass',ARRAY['en']::text[],NULL),
  ('main_card','ca','ufc-ppv',NULL,'Paid','https://www.ufc.com/watch',ARRAY[]::text[],'Pay-per-view purchase required'),
  ('main_card','fr','rmc-sport',NULL,'Paid','https://rmcsport.tv/',ARRAY['fr']::text[],NULL),
  ('main_card','gb','tnt-sports','box-office','Paid','https://www.tntsports.co.uk/',ARRAY['en']::text[],'Box Office purchase required')
), card AS (
  SELECT e.* FROM events e JOIN sports s ON s.id=e.sport_id
  WHERE s.slug='ufc' AND e.slug LIKE 'ufc-331-van-vs-pantoja-2-%'
)
INSERT INTO event_broadcasts (
  event_id,broadcast_right_id,territory_id,broadcaster_id,platform_id,decision,access_type,
  official_url,language_codes,source_name,source_url,last_verified_at,verification_status,
  is_published,notes,broadcast_type,access_conditions,requires_account,is_free_trial
)
SELECT e.id,br.id,t.id,b.id,p.id,'included',o.access_type,o.official_url,o.languages,
  'UFC 331 official regional watch guide','https://www.ufc.com/news/how-watch-and-stream-ufc',now(),'confirmed',
  false,'Event-specific allocation from UFC.', 'live',o.conditions,true,false
FROM offers o
JOIN card e ON e.session_type=o.session_type
JOIN territories t ON t.code=o.territory_code
JOIN broadcasters b ON b.slug=o.broadcaster_slug
LEFT JOIN platforms p ON p.broadcaster_id=b.id AND p.slug=o.platform_slug
JOIN broadcast_rights br ON br.competition_id=e.competition_id AND br.season_id=e.season_id
  AND br.territory_id=t.id AND br.broadcaster_id=b.id AND br.platform_id IS NOT DISTINCT FROM p.id
ON CONFLICT DO NOTHING;

-- UFC 332 main card has an additional free CBS simulcast in the U.S.
WITH event_row AS (
  SELECT e.* FROM events e JOIN sports s ON s.id=e.sport_id
  WHERE s.slug='ufc' AND e.slug='ufc-332-silva-vs-wang-main-card'
), right_row AS (
  SELECT br.* FROM broadcast_rights br
  JOIN territories t ON t.id=br.territory_id JOIN broadcasters b ON b.id=br.broadcaster_id
  JOIN competitions c ON c.id=br.competition_id JOIN sports s ON s.id=c.sport_id
  WHERE s.slug='ufc' AND t.code='us' AND b.slug='cbs'
)
INSERT INTO event_broadcasts (
  event_id,broadcast_right_id,territory_id,broadcaster_id,decision,access_type,official_url,
  language_codes,source_name,source_url,last_verified_at,verification_status,is_published,
  notes,broadcast_type,requires_account,is_free_trial
)
SELECT e.id,br.id,br.territory_id,br.broadcaster_id,'included','Free','https://www.cbs.com/',
  ARRAY['en']::text[],'UFC 332 official announcement',
  'https://www.ufc.com/news/womens-flyweight-championship-leads-showcase-rising-stars-ufc-return-salt-lake-city',
  now(),'confirmed',false,'Main card simulcast confirmed by UFC.','live',false,false
FROM event_row e CROSS JOIN right_row br
ON CONFLICT DO NOTHING;

COMMIT;
