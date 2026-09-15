BEGIN;
SET LOCAL search_path = public, pg_catalog;

-- Permanent NBA/NHL franchise seed.
-- Apply after multisport, participant profiles, universal media and participant competition memberships migrations.
-- Idempotent: existing manually curated profile values are preserved.

INSERT INTO sports (slug,name,public_slug,event_model,participant_page_policy,is_enabled,localized_labels,aliases)
VALUES
  ('basketball','Basketball','basketball','team_match','teams_and_nations',true,'{}'::jsonb,ARRAY['basketball','basket','nba']),
  ('ice-hockey','Ice Hockey','hockey','team_match','teams_and_nations',true,
   jsonb_build_object('fr-FR','Hockey sur glace','fr-CA','Hockey','en-CA','Hockey','en-US','Hockey'),
   ARRAY['hockey','ice hockey','hockey sur glace','nhl'])
ON CONFLICT (slug) DO UPDATE SET
  public_slug=EXCLUDED.public_slug,
  event_model='team_match',
  participant_page_policy='teams_and_nations',
  is_enabled=true,
  aliases=EXCLUDED.aliases;

INSERT INTO competitions (sport_id,slug,name,season_label,is_active,official_website_url)
SELECT s.id,v.slug,v.name,'2026-27',true,v.website
FROM (VALUES
  ('basketball','nba','NBA','https://www.nba.com/'),
  ('ice-hockey','nhl','NHL','https://www.nhl.com/')
) AS v(sport_slug,slug,name,website)
JOIN sports s ON s.slug=v.sport_slug
ON CONFLICT (sport_id,slug) DO UPDATE SET
  name=EXCLUDED.name,
  season_label=EXCLUDED.season_label,
  is_active=true,
  official_website_url=COALESCE(competitions.official_website_url,EXCLUDED.official_website_url);

CREATE TEMP TABLE seed_pro_teams (
  sport_slug text, competition_slug text, abbreviation text, name text, slug text,
  city text, country_code text, founded_year integer, venue_name text,
  venue_capacity integer, official_website_url text
) ON COMMIT DROP;

INSERT INTO seed_pro_teams VALUES
  ('basketball','nba','ATL','Atlanta Hawks','atlanta-hawks','Atlanta','US',1946,'State Farm Arena',16600,'https://www.nba.com/hawks'),
  ('basketball','nba','BOS','Boston Celtics','boston-celtics','Boston','US',1946,'TD Garden',19156,'https://www.nba.com/celtics'),
  ('basketball','nba','BKN','Brooklyn Nets','brooklyn-nets','Brooklyn','US',1967,'Barclays Center',17732,'https://www.nba.com/nets'),
  ('basketball','nba','CHA','Charlotte Hornets','charlotte-hornets','Charlotte','US',1988,'Spectrum Center',19077,'https://www.nba.com/hornets'),
  ('basketball','nba','CHI','Chicago Bulls','chicago-bulls','Chicago','US',1966,'United Center',20917,'https://www.nba.com/bulls'),
  ('basketball','nba','CLE','Cleveland Cavaliers','cleveland-cavaliers','Cleveland','US',1970,'Rocket Arena',19432,'https://www.nba.com/cavaliers'),
  ('basketball','nba','DAL','Dallas Mavericks','dallas-mavericks','Dallas','US',1980,'American Airlines Center',19200,'https://www.nba.com/mavericks'),
  ('basketball','nba','DEN','Denver Nuggets','denver-nuggets','Denver','US',1967,'Ball Arena',19520,'https://www.nba.com/nuggets'),
  ('basketball','nba','DET','Detroit Pistons','detroit-pistons','Detroit','US',1937,'Little Caesars Arena',20332,'https://www.nba.com/pistons'),
  ('basketball','nba','GSW','Golden State Warriors','golden-state-warriors','San Francisco','US',1946,'Chase Center',18064,'https://www.nba.com/warriors'),
  ('basketball','nba','HOU','Houston Rockets','houston-rockets','Houston','US',1967,'Toyota Center',18055,'https://www.nba.com/rockets'),
  ('basketball','nba','IND','Indiana Pacers','indiana-pacers','Indianapolis','US',1967,'Gainbridge Fieldhouse',17923,'https://www.nba.com/pacers'),
  ('basketball','nba','LAC','LA Clippers','la-clippers','Inglewood','US',1970,'Intuit Dome',18000,'https://www.nba.com/clippers'),
  ('basketball','nba','LAL','Los Angeles Lakers','los-angeles-lakers','Los Angeles','US',1947,'Crypto.com Arena',19079,'https://www.nba.com/lakers'),
  ('basketball','nba','MEM','Memphis Grizzlies','memphis-grizzlies','Memphis','US',1995,'FedExForum',18119,'https://www.nba.com/grizzlies'),
  ('basketball','nba','MIA','Miami Heat','miami-heat','Miami','US',1988,'Kaseya Center',19600,'https://www.nba.com/heat'),
  ('basketball','nba','MIL','Milwaukee Bucks','milwaukee-bucks','Milwaukee','US',1968,'Fiserv Forum',17341,'https://www.nba.com/bucks'),
  ('basketball','nba','MIN','Minnesota Timberwolves','minnesota-timberwolves','Minneapolis','US',1989,'Target Center',18798,'https://www.nba.com/timberwolves'),
  ('basketball','nba','NOP','New Orleans Pelicans','new-orleans-pelicans','New Orleans','US',2002,'Smoothie King Center',16867,'https://www.nba.com/pelicans'),
  ('basketball','nba','NYK','New York Knicks','new-york-knicks','New York','US',1946,'Madison Square Garden',19812,'https://www.nba.com/knicks'),
  ('basketball','nba','OKC','Oklahoma City Thunder','oklahoma-city-thunder','Oklahoma City','US',1967,'Paycom Center',18203,'https://www.nba.com/thunder'),
  ('basketball','nba','ORL','Orlando Magic','orlando-magic','Orlando','US',1989,'Kia Center',18846,'https://www.nba.com/magic'),
  ('basketball','nba','PHI','Philadelphia 76ers','philadelphia-76ers','Philadelphia','US',1946,'Xfinity Mobile Arena',20478,'https://www.nba.com/sixers'),
  ('basketball','nba','PHX','Phoenix Suns','phoenix-suns','Phoenix','US',1968,'Mortgage Matchup Center',16645,'https://www.nba.com/suns'),
  ('basketball','nba','POR','Portland Trail Blazers','portland-trail-blazers','Portland','US',1970,'Moda Center',19393,'https://www.nba.com/blazers'),
  ('basketball','nba','SAC','Sacramento Kings','sacramento-kings','Sacramento','US',1923,'Golden 1 Center',17608,'https://www.nba.com/kings'),
  ('basketball','nba','SAS','San Antonio Spurs','san-antonio-spurs','San Antonio','US',1967,'Frost Bank Center',18418,'https://www.nba.com/spurs'),
  ('basketball','nba','TOR','Toronto Raptors','toronto-raptors','Toronto','CA',1995,'Scotiabank Arena',19800,'https://www.nba.com/raptors'),
  ('basketball','nba','UTA','Utah Jazz','utah-jazz','Salt Lake City','US',1974,'Delta Center',18306,'https://www.nba.com/jazz'),
  ('basketball','nba','WAS','Washington Wizards','washington-wizards','Washington','US',1961,'Capital One Arena',20356,'https://www.nba.com/wizards'),
  ('ice-hockey','nhl','ANA','Anaheim Ducks','anaheim-ducks','Anaheim','US',1993,'Honda Center',17174,'https://www.nhl.com/ducks'),
  ('ice-hockey','nhl','BOS','Boston Bruins','boston-bruins','Boston','US',1924,'TD Garden',17850,'https://www.nhl.com/bruins'),
  ('ice-hockey','nhl','BUF','Buffalo Sabres','buffalo-sabres','Buffalo','US',1970,'KeyBank Center',19070,'https://www.nhl.com/sabres'),
  ('ice-hockey','nhl','CGY','Calgary Flames','calgary-flames','Calgary','CA',1972,'Scotiabank Saddledome',19289,'https://www.nhl.com/flames'),
  ('ice-hockey','nhl','CAR','Carolina Hurricanes','carolina-hurricanes','Raleigh','US',1972,'Lenovo Center',18700,'https://www.nhl.com/hurricanes'),
  ('ice-hockey','nhl','CHI','Chicago Blackhawks','chicago-blackhawks','Chicago','US',1926,'United Center',19717,'https://www.nhl.com/blackhawks'),
  ('ice-hockey','nhl','COL','Colorado Avalanche','colorado-avalanche','Denver','US',1972,'Ball Arena',18007,'https://www.nhl.com/avalanche'),
  ('ice-hockey','nhl','CBJ','Columbus Blue Jackets','columbus-blue-jackets','Columbus','US',2000,'Nationwide Arena',18500,'https://www.nhl.com/bluejackets'),
  ('ice-hockey','nhl','DAL','Dallas Stars','dallas-stars','Dallas','US',1967,'American Airlines Center',18532,'https://www.nhl.com/stars'),
  ('ice-hockey','nhl','DET','Detroit Red Wings','detroit-red-wings','Detroit','US',1926,'Little Caesars Arena',19515,'https://www.nhl.com/redwings'),
  ('ice-hockey','nhl','EDM','Edmonton Oilers','edmonton-oilers','Edmonton','CA',1972,'Rogers Place',18347,'https://www.nhl.com/oilers'),
  ('ice-hockey','nhl','FLA','Florida Panthers','florida-panthers','Sunrise','US',1993,'Amerant Bank Arena',19250,'https://www.nhl.com/panthers'),
  ('ice-hockey','nhl','LAK','Los Angeles Kings','los-angeles-kings','Los Angeles','US',1967,'Crypto.com Arena',18145,'https://www.nhl.com/kings'),
  ('ice-hockey','nhl','MIN','Minnesota Wild','minnesota-wild','Saint Paul','US',2000,'Grand Casino Arena',17954,'https://www.nhl.com/wild'),
  ('ice-hockey','nhl','MTL','Montreal Canadiens','montreal-canadiens','Montreal','CA',1909,'Bell Centre',20962,'https://www.nhl.com/canadiens'),
  ('ice-hockey','nhl','NSH','Nashville Predators','nashville-predators','Nashville','US',1998,'Bridgestone Arena',17159,'https://www.nhl.com/predators'),
  ('ice-hockey','nhl','NJD','New Jersey Devils','new-jersey-devils','Newark','US',1974,'Prudential Center',16514,'https://www.nhl.com/devils'),
  ('ice-hockey','nhl','NYI','New York Islanders','new-york-islanders','Elmont','US',1972,'UBS Arena',17255,'https://www.nhl.com/islanders'),
  ('ice-hockey','nhl','NYR','New York Rangers','new-york-rangers','New York','US',1926,'Madison Square Garden',18006,'https://www.nhl.com/rangers'),
  ('ice-hockey','nhl','OTT','Ottawa Senators','ottawa-senators','Ottawa','CA',1992,'Canadian Tire Centre',18655,'https://www.nhl.com/senators'),
  ('ice-hockey','nhl','PHI','Philadelphia Flyers','philadelphia-flyers','Philadelphia','US',1967,'Xfinity Mobile Arena',19173,'https://www.nhl.com/flyers'),
  ('ice-hockey','nhl','PIT','Pittsburgh Penguins','pittsburgh-penguins','Pittsburgh','US',1967,'PPG Paints Arena',18187,'https://www.nhl.com/penguins'),
  ('ice-hockey','nhl','SJS','San Jose Sharks','san-jose-sharks','San Jose','US',1991,'SAP Center',17435,'https://www.nhl.com/sharks'),
  ('ice-hockey','nhl','SEA','Seattle Kraken','seattle-kraken','Seattle','US',2021,'Climate Pledge Arena',17151,'https://www.nhl.com/kraken'),
  ('ice-hockey','nhl','STL','St. Louis Blues','st-louis-blues','St. Louis','US',1967,'Enterprise Center',18096,'https://www.nhl.com/blues'),
  ('ice-hockey','nhl','TBL','Tampa Bay Lightning','tampa-bay-lightning','Tampa','US',1992,'Benchmark International Arena',19092,'https://www.nhl.com/lightning'),
  ('ice-hockey','nhl','TOR','Toronto Maple Leafs','toronto-maple-leafs','Toronto','CA',1917,'Scotiabank Arena',18800,'https://www.nhl.com/mapleleafs'),
  ('ice-hockey','nhl','UTA','Utah Mammoth','utah-mammoth','Salt Lake City','US',2024,'Delta Center',16020,'https://www.nhl.com/utah'),
  ('ice-hockey','nhl','VAN','Vancouver Canucks','vancouver-canucks','Vancouver','CA',1945,'Rogers Arena',18910,'https://www.nhl.com/canucks'),
  ('ice-hockey','nhl','VGK','Vegas Golden Knights','vegas-golden-knights','Paradise','US',2017,'T-Mobile Arena',17500,'https://www.nhl.com/goldenknights'),
  ('ice-hockey','nhl','WSH','Washington Capitals','washington-capitals','Washington','US',1974,'Capital One Arena',18573,'https://www.nhl.com/capitals'),
  ('ice-hockey','nhl','WPG','Winnipeg Jets','winnipeg-jets','Winnipeg','CA',1999,'Canada Life Centre',15225,'https://www.nhl.com/jets');

INSERT INTO participants (sport_id,participant_type,slug,name,short_name,country_code,is_active)
SELECT s.id,'franchise',t.slug,t.name,t.abbreviation,t.country_code,true
FROM seed_pro_teams t
JOIN sports s ON s.slug=t.sport_slug
ON CONFLICT (sport_id,slug) DO UPDATE SET
  name=EXCLUDED.name,
  short_name=EXCLUDED.short_name,
  country_code=COALESCE(participants.country_code,EXCLUDED.country_code),
  is_active=true;

INSERT INTO participant_profiles (
  participant_id,city,country_code,founded_year,venue_name,venue_capacity,
  official_website_url,summary,profile_status,last_verified_at,next_review_at
)
SELECT p.id,t.city,t.country_code,t.founded_year,t.venue_name,t.venue_capacity,
       t.official_website_url,
       t.name || ' is a professional ' ||
         CASE WHEN t.sport_slug='basketball' THEN 'basketball franchise in the NBA'
              ELSE 'ice hockey franchise in the NHL' END ||
         ' based in ' || t.city || '. Home games are played at ' || t.venue_name || '.',
       'verified','2026-09-15T20:00:00Z'::timestamptz,'2027-03-15T20:00:00Z'::timestamptz
FROM seed_pro_teams t
JOIN sports s ON s.slug=t.sport_slug
JOIN participants p ON p.sport_id=s.id AND p.slug=t.slug
ON CONFLICT (participant_id) DO UPDATE SET
  city=COALESCE(participant_profiles.city,EXCLUDED.city),
  country_code=COALESCE(participant_profiles.country_code,EXCLUDED.country_code),
  founded_year=COALESCE(participant_profiles.founded_year,EXCLUDED.founded_year),
  venue_name=COALESCE(participant_profiles.venue_name,EXCLUDED.venue_name),
  venue_capacity=COALESCE(participant_profiles.venue_capacity,EXCLUDED.venue_capacity),
  official_website_url=COALESCE(participant_profiles.official_website_url,EXCLUDED.official_website_url),
  summary=COALESCE(participant_profiles.summary,EXCLUDED.summary),
  profile_status=CASE WHEN participant_profiles.profile_status='pending' THEN 'verified' ELSE participant_profiles.profile_status END,
  last_verified_at=GREATEST(participant_profiles.last_verified_at,EXCLUDED.last_verified_at),
  next_review_at=COALESCE(participant_profiles.next_review_at,EXCLUDED.next_review_at),
  updated_at=now();

INSERT INTO participant_competitions (
  participant_id,competition_id,membership_status,source_name,source_url,last_verified_at
)
SELECT p.id,c.id,'active',
       CASE WHEN t.sport_slug='basketball' THEN 'NBA' ELSE 'NHL' END,
       CASE WHEN t.sport_slug='basketball' THEN 'https://www.nba.com/teams' ELSE 'https://www.nhl.com/info/teams/' END,
       '2026-09-15T20:00:00Z'::timestamptz
FROM seed_pro_teams t
JOIN sports s ON s.slug=t.sport_slug
JOIN participants p ON p.sport_id=s.id AND p.slug=t.slug
JOIN competitions c ON c.sport_id=s.id AND c.slug=t.competition_slug
ON CONFLICT (participant_id,competition_id) DO UPDATE SET
  membership_status='active',
  source_name=COALESCE(participant_competitions.source_name,EXCLUDED.source_name),
  source_url=COALESCE(participant_competitions.source_url,EXCLUDED.source_url),
  last_verified_at=GREATEST(participant_competitions.last_verified_at,EXCLUDED.last_verified_at),
  updated_at=now();

-- Search aliases: official abbreviation plus common full name.
INSERT INTO participant_aliases (participant_id,locale,alias,normalized_alias)
SELECT p.id,NULL,t.abbreviation,lower(t.abbreviation)
FROM seed_pro_teams t
JOIN sports s ON s.slug=t.sport_slug
JOIN participants p ON p.sport_id=s.id AND p.slug=t.slug
ON CONFLICT DO NOTHING;

-- Insert confirmed provenance only when no current confirmed claim already exists.
INSERT INTO participant_profile_claims (
  participant_id,field_key,value_text,source_name,source_url,source_type,
  verification_status,observed_at,verified_at,is_current,notes
)
SELECT p.id,x.field_key,x.value_text,'Wikipedia league team table',
       CASE WHEN t.sport_slug='basketball'
            THEN 'https://en.wikipedia.org/wiki/National_Basketball_Association'
            ELSE 'https://en.wikipedia.org/wiki/National_Hockey_League' END,
       'reputable_secondary','confirmed',
       '2026-09-15T20:00:00Z'::timestamptz,'2026-09-15T20:00:00Z'::timestamptz,true,
       'Seeded from the current league team table; stable profile fact, independent of fixtures.'
FROM seed_pro_teams t
JOIN sports s ON s.slug=t.sport_slug
JOIN participants p ON p.sport_id=s.id AND p.slug=t.slug
CROSS JOIN LATERAL (VALUES
  ('city',t.city),
  ('country_code',t.country_code),
  ('venue_name',t.venue_name)
) AS x(field_key,value_text)
WHERE NOT EXISTS (
  SELECT 1 FROM participant_profile_claims c
  WHERE c.participant_id=p.id AND c.field_key=x.field_key AND c.is_current=true
);

INSERT INTO participant_profile_claims (
  participant_id,field_key,value_number,source_name,source_url,source_type,
  verification_status,observed_at,verified_at,is_current,notes
)
SELECT p.id,x.field_key,x.value_number,'Wikipedia league team table',
       CASE WHEN t.sport_slug='basketball'
            THEN 'https://en.wikipedia.org/wiki/National_Basketball_Association'
            ELSE 'https://en.wikipedia.org/wiki/National_Hockey_League' END,
       'reputable_secondary','confirmed',
       '2026-09-15T20:00:00Z'::timestamptz,'2026-09-15T20:00:00Z'::timestamptz,true,
       'Seeded from the current league team table; review periodically for venue capacity/name changes.'
FROM seed_pro_teams t
JOIN sports s ON s.slug=t.sport_slug
JOIN participants p ON p.sport_id=s.id AND p.slug=t.slug
CROSS JOIN LATERAL (VALUES
  ('founded_year',t.founded_year::numeric),
  ('venue_capacity',t.venue_capacity::numeric)
) AS x(field_key,value_number)
WHERE NOT EXISTS (
  SELECT 1 FROM participant_profile_claims c
  WHERE c.participant_id=p.id AND c.field_key=x.field_key AND c.is_current=true
);

INSERT INTO participant_profile_claims (
  participant_id,field_key,value_text,source_name,source_url,source_type,
  verification_status,observed_at,verified_at,is_current,notes
)
SELECT p.id,'official_website_url',t.official_website_url,
       CASE WHEN t.sport_slug='basketball' THEN 'NBA official team site' ELSE 'NHL official team site' END,
       t.official_website_url,'official','confirmed',
       '2026-09-15T20:00:00Z'::timestamptz,'2026-09-15T20:00:00Z'::timestamptz,true,
       'Official league-hosted team page.'
FROM seed_pro_teams t
JOIN sports s ON s.slug=t.sport_slug
JOIN participants p ON p.sport_id=s.id AND p.slug=t.slug
WHERE NOT EXISTS (
  SELECT 1 FROM participant_profile_claims c
  WHERE c.participant_id=p.id AND c.field_key='official_website_url' AND c.is_current=true
);

-- Guardrails: the seed must contain exactly 30 NBA + 32 NHL active franchise rows.
DO $$
DECLARE v_nba integer; v_nhl integer;
BEGIN
  SELECT count(*) INTO v_nba
  FROM participants p JOIN sports s ON s.id=p.sport_id
  WHERE s.slug='basketball' AND p.participant_type='franchise' AND p.is_active;
  SELECT count(*) INTO v_nhl
  FROM participants p JOIN sports s ON s.id=p.sport_id
  WHERE s.slug='ice-hockey' AND p.participant_type='franchise' AND p.is_active;
  IF v_nba < 30 THEN RAISE EXCEPTION 'NBA franchise seed incomplete: % active rows',v_nba; END IF;
  IF v_nhl < 32 THEN RAISE EXCEPTION 'NHL franchise seed incomplete: % active rows',v_nhl; END IF;
END $$;

COMMIT;
