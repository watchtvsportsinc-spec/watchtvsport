BEGIN;
SET LOCAL search_path = public, pg_catalog;

-- Idempotent enrichment for the 30 NBA and 32 NHL teams already present in V2.
CREATE TEMP TABLE seed_pro_teams (
  sport_slug text, competition_slug text, abbreviation text, slug text,
  city text, country_code text, founded_year integer, venue_name text,
  venue_capacity integer, official_website_url text, logo_url text
) ON COMMIT DROP;

INSERT INTO seed_pro_teams VALUES
('basketball','nba','ATL','atlanta-hawks','Atlanta','US',1946,'State Farm Arena',16600,'https://www.nba.com/hawks','https://cdn.nba.com/logos/nba/1610612737/primary/L/logo.svg'),
('basketball','nba','BOS','boston-celtics','Boston','US',1946,'TD Garden',19156,'https://www.nba.com/celtics','https://cdn.nba.com/logos/nba/1610612738/primary/L/logo.svg'),
('basketball','nba','BKN','brooklyn-nets','Brooklyn','US',1967,'Barclays Center',17732,'https://www.nba.com/nets','https://cdn.nba.com/logos/nba/1610612751/primary/L/logo.svg'),
('basketball','nba','CHA','charlotte-hornets','Charlotte','US',1988,'Spectrum Center',19077,'https://www.nba.com/hornets','https://cdn.nba.com/logos/nba/1610612766/primary/L/logo.svg'),
('basketball','nba','CHI','chicago-bulls','Chicago','US',1966,'United Center',20917,'https://www.nba.com/bulls','https://cdn.nba.com/logos/nba/1610612741/primary/L/logo.svg'),
('basketball','nba','CLE','cleveland-cavaliers','Cleveland','US',1970,'Rocket Arena',19432,'https://www.nba.com/cavaliers','https://cdn.nba.com/logos/nba/1610612739/primary/L/logo.svg'),
('basketball','nba','DAL','dallas-mavericks','Dallas','US',1980,'American Airlines Center',19200,'https://www.nba.com/mavericks','https://cdn.nba.com/logos/nba/1610612742/primary/L/logo.svg'),
('basketball','nba','DEN','denver-nuggets','Denver','US',1967,'Ball Arena',19520,'https://www.nba.com/nuggets','https://cdn.nba.com/logos/nba/1610612743/primary/L/logo.svg'),
('basketball','nba','DET','detroit-pistons','Detroit','US',1937,'Little Caesars Arena',20332,'https://www.nba.com/pistons','https://cdn.nba.com/logos/nba/1610612765/primary/L/logo.svg'),
('basketball','nba','GSW','golden-state-warriors','San Francisco','US',1946,'Chase Center',18064,'https://www.nba.com/warriors','https://cdn.nba.com/logos/nba/1610612744/primary/L/logo.svg'),
('basketball','nba','HOU','houston-rockets','Houston','US',1967,'Toyota Center',18055,'https://www.nba.com/rockets','https://cdn.nba.com/logos/nba/1610612745/primary/L/logo.svg'),
('basketball','nba','IND','indiana-pacers','Indianapolis','US',1967,'Gainbridge Fieldhouse',17923,'https://www.nba.com/pacers','https://cdn.nba.com/logos/nba/1610612754/primary/L/logo.svg'),
('basketball','nba','LAC','la-clippers','Inglewood','US',1970,'Intuit Dome',18000,'https://www.nba.com/clippers','https://cdn.nba.com/logos/nba/1610612746/primary/L/logo.svg'),
('basketball','nba','LAL','los-angeles-lakers','Los Angeles','US',1947,'Crypto.com Arena',19079,'https://www.nba.com/lakers','https://cdn.nba.com/logos/nba/1610612747/primary/L/logo.svg'),
('basketball','nba','MEM','memphis-grizzlies','Memphis','US',1995,'FedExForum',18119,'https://www.nba.com/grizzlies','https://cdn.nba.com/logos/nba/1610612763/primary/L/logo.svg'),
('basketball','nba','MIA','miami-heat','Miami','US',1988,'Kaseya Center',19600,'https://www.nba.com/heat','https://cdn.nba.com/logos/nba/1610612748/primary/L/logo.svg'),
('basketball','nba','MIL','milwaukee-bucks','Milwaukee','US',1968,'Fiserv Forum',17341,'https://www.nba.com/bucks','https://cdn.nba.com/logos/nba/1610612749/primary/L/logo.svg'),
('basketball','nba','MIN','minnesota-timberwolves','Minneapolis','US',1989,'Target Center',18798,'https://www.nba.com/timberwolves','https://cdn.nba.com/logos/nba/1610612750/primary/L/logo.svg'),
('basketball','nba','NOP','new-orleans-pelicans','New Orleans','US',2002,'Smoothie King Center',16867,'https://www.nba.com/pelicans','https://cdn.nba.com/logos/nba/1610612740/primary/L/logo.svg'),
('basketball','nba','NYK','new-york-knicks','New York','US',1946,'Madison Square Garden',19812,'https://www.nba.com/knicks','https://cdn.nba.com/logos/nba/1610612752/primary/L/logo.svg'),
('basketball','nba','OKC','oklahoma-city-thunder','Oklahoma City','US',1967,'Paycom Center',18203,'https://www.nba.com/thunder','https://cdn.nba.com/logos/nba/1610612760/primary/L/logo.svg'),
('basketball','nba','ORL','orlando-magic','Orlando','US',1989,'Kia Center',18846,'https://www.nba.com/magic','https://cdn.nba.com/logos/nba/1610612753/primary/L/logo.svg'),
('basketball','nba','PHI','philadelphia-76ers','Philadelphia','US',1946,'Xfinity Mobile Arena',20478,'https://www.nba.com/sixers','https://cdn.nba.com/logos/nba/1610612755/primary/L/logo.svg'),
('basketball','nba','PHX','phoenix-suns','Phoenix','US',1968,'Mortgage Matchup Center',16645,'https://www.nba.com/suns','https://cdn.nba.com/logos/nba/1610612756/primary/L/logo.svg'),
('basketball','nba','POR','portland-trail-blazers','Portland','US',1970,'Moda Center',19393,'https://www.nba.com/blazers','https://cdn.nba.com/logos/nba/1610612757/primary/L/logo.svg'),
('basketball','nba','SAC','sacramento-kings','Sacramento','US',1923,'Golden 1 Center',17608,'https://www.nba.com/kings','https://cdn.nba.com/logos/nba/1610612758/primary/L/logo.svg'),
('basketball','nba','SAS','san-antonio-spurs','San Antonio','US',1967,'Frost Bank Center',18418,'https://www.nba.com/spurs','https://cdn.nba.com/logos/nba/1610612759/primary/L/logo.svg'),
('basketball','nba','TOR','toronto-raptors','Toronto','CA',1995,'Scotiabank Arena',19800,'https://www.nba.com/raptors','https://cdn.nba.com/logos/nba/1610612761/primary/L/logo.svg'),
('basketball','nba','UTA','utah-jazz','Salt Lake City','US',1974,'Delta Center',18306,'https://www.nba.com/jazz','https://cdn.nba.com/logos/nba/1610612762/primary/L/logo.svg'),
('basketball','nba','WAS','washington-wizards','Washington','US',1961,'Capital One Arena',20356,'https://www.nba.com/wizards','https://cdn.nba.com/logos/nba/1610612764/primary/L/logo.svg'),
('hockey','nhl','ANA','anaheim-ducks','Anaheim','US',1993,'Honda Center',17174,'https://www.nhl.com/ducks','https://assets.nhle.com/logos/nhl/svg/ANA_light.svg'),
('hockey','nhl','BOS','boston-bruins','Boston','US',1924,'TD Garden',17850,'https://www.nhl.com/bruins','https://assets.nhle.com/logos/nhl/svg/BOS_light.svg'),
('hockey','nhl','BUF','buffalo-sabres','Buffalo','US',1970,'KeyBank Center',19070,'https://www.nhl.com/sabres','https://assets.nhle.com/logos/nhl/svg/BUF_light.svg'),
('hockey','nhl','CGY','calgary-flames','Calgary','CA',1972,'Scotiabank Saddledome',19289,'https://www.nhl.com/flames','https://assets.nhle.com/logos/nhl/svg/CGY_light.svg'),
('hockey','nhl','CAR','carolina-hurricanes','Raleigh','US',1972,'Lenovo Center',18700,'https://www.nhl.com/hurricanes','https://assets.nhle.com/logos/nhl/svg/CAR_light.svg'),
('hockey','nhl','CHI','chicago-blackhawks','Chicago','US',1926,'United Center',19717,'https://www.nhl.com/blackhawks','https://assets.nhle.com/logos/nhl/svg/CHI_light.svg'),
('hockey','nhl','COL','colorado-avalanche','Denver','US',1972,'Ball Arena',18007,'https://www.nhl.com/avalanche','https://assets.nhle.com/logos/nhl/svg/COL_light.svg'),
('hockey','nhl','CBJ','columbus-blue-jackets','Columbus','US',2000,'Nationwide Arena',18500,'https://www.nhl.com/bluejackets','https://assets.nhle.com/logos/nhl/svg/CBJ_light.svg'),
('hockey','nhl','DAL','dallas-stars','Dallas','US',1967,'American Airlines Center',18532,'https://www.nhl.com/stars','https://assets.nhle.com/logos/nhl/svg/DAL_light.svg'),
('hockey','nhl','DET','detroit-red-wings','Detroit','US',1926,'Little Caesars Arena',19515,'https://www.nhl.com/redwings','https://assets.nhle.com/logos/nhl/svg/DET_light.svg'),
('hockey','nhl','EDM','edmonton-oilers','Edmonton','CA',1972,'Rogers Place',18347,'https://www.nhl.com/oilers','https://assets.nhle.com/logos/nhl/svg/EDM_light.svg'),
('hockey','nhl','FLA','florida-panthers','Sunrise','US',1993,'Amerant Bank Arena',19250,'https://www.nhl.com/panthers','https://assets.nhle.com/logos/nhl/svg/FLA_light.svg'),
('hockey','nhl','LAK','los-angeles-kings','Los Angeles','US',1967,'Crypto.com Arena',18145,'https://www.nhl.com/kings','https://assets.nhle.com/logos/nhl/svg/LAK_light.svg'),
('hockey','nhl','MIN','minnesota-wild','Saint Paul','US',2000,'Grand Casino Arena',17954,'https://www.nhl.com/wild','https://assets.nhle.com/logos/nhl/svg/MIN_light.svg'),
('hockey','nhl','MTL','montreal-canadiens','Montreal','CA',1909,'Bell Centre',20962,'https://www.nhl.com/canadiens','https://assets.nhle.com/logos/nhl/svg/MTL_light.svg'),
('hockey','nhl','NSH','nashville-predators','Nashville','US',1998,'Bridgestone Arena',17159,'https://www.nhl.com/predators','https://assets.nhle.com/logos/nhl/svg/NSH_light.svg'),
('hockey','nhl','NJD','new-jersey-devils','Newark','US',1974,'Prudential Center',16514,'https://www.nhl.com/devils','https://assets.nhle.com/logos/nhl/svg/NJD_light.svg'),
('hockey','nhl','NYI','new-york-islanders','Elmont','US',1972,'UBS Arena',17255,'https://www.nhl.com/islanders','https://assets.nhle.com/logos/nhl/svg/NYI_light.svg'),
('hockey','nhl','NYR','new-york-rangers','New York','US',1926,'Madison Square Garden',18006,'https://www.nhl.com/rangers','https://assets.nhle.com/logos/nhl/svg/NYR_light.svg'),
('hockey','nhl','OTT','ottawa-senators','Ottawa','CA',1992,'Canadian Tire Centre',18655,'https://www.nhl.com/senators','https://assets.nhle.com/logos/nhl/svg/OTT_light.svg'),
('hockey','nhl','PHI','philadelphia-flyers','Philadelphia','US',1967,'Xfinity Mobile Arena',19173,'https://www.nhl.com/flyers','https://assets.nhle.com/logos/nhl/svg/PHI_light.svg'),
('hockey','nhl','PIT','pittsburgh-penguins','Pittsburgh','US',1967,'PPG Paints Arena',18187,'https://www.nhl.com/penguins','https://assets.nhle.com/logos/nhl/svg/PIT_light.svg'),
('hockey','nhl','SJS','san-jose-sharks','San Jose','US',1991,'SAP Center',17435,'https://www.nhl.com/sharks','https://assets.nhle.com/logos/nhl/svg/SJS_light.svg'),
('hockey','nhl','SEA','seattle-kraken','Seattle','US',2021,'Climate Pledge Arena',17151,'https://www.nhl.com/kraken','https://assets.nhle.com/logos/nhl/svg/SEA_light.svg'),
('hockey','nhl','STL','st-louis-blues','St. Louis','US',1967,'Enterprise Center',18096,'https://www.nhl.com/blues','https://assets.nhle.com/logos/nhl/svg/STL_light.svg'),
('hockey','nhl','TBL','tampa-bay-lightning','Tampa','US',1992,'Benchmark International Arena',19092,'https://www.nhl.com/lightning','https://assets.nhle.com/logos/nhl/svg/TBL_light.svg'),
('hockey','nhl','TOR','toronto-maple-leafs','Toronto','CA',1917,'Scotiabank Arena',18800,'https://www.nhl.com/mapleleafs','https://assets.nhle.com/logos/nhl/svg/TOR_light.svg'),
('hockey','nhl','UTA','utah-mammoth','Salt Lake City','US',2024,'Delta Center',16020,'https://www.nhl.com/utah','https://assets.nhle.com/logos/nhl/svg/UTA_light.svg'),
('hockey','nhl','VAN','vancouver-canucks','Vancouver','CA',1945,'Rogers Arena',18910,'https://www.nhl.com/canucks','https://assets.nhle.com/logos/nhl/svg/VAN_light.svg'),
('hockey','nhl','VGK','vegas-golden-knights','Paradise','US',2017,'T-Mobile Arena',17500,'https://www.nhl.com/goldenknights','https://assets.nhle.com/logos/nhl/svg/VGK_light.svg'),
('hockey','nhl','WSH','washington-capitals','Washington','US',1974,'Capital One Arena',18573,'https://www.nhl.com/capitals','https://assets.nhle.com/logos/nhl/svg/WSH_light.svg'),
('hockey','nhl','WPG','winnipeg-jets','Winnipeg','CA',1999,'Canada Life Centre',15225,'https://www.nhl.com/jets','https://assets.nhle.com/logos/nhl/svg/WPG_light.svg');

DO $$
DECLARE missing_count integer;
BEGIN
  SELECT count(*) INTO missing_count
  FROM seed_pro_teams t
  WHERE NOT EXISTS (
    SELECT 1 FROM public.participants p
    JOIN public.sports s ON s.id=p.sport_id
    WHERE p.slug=t.slug AND (s.slug=t.sport_slug OR s.public_slug=t.sport_slug)
  );
  IF missing_count <> 0 THEN
    RAISE EXCEPTION 'NBA/NHL enrichment requires all 62 participants first; % are missing', missing_count;
  END IF;
END $$;

UPDATE public.participants p
SET short_name=t.abbreviation,
    country_code=COALESCE(p.country_code,t.country_code),
    is_active=true
FROM seed_pro_teams t
JOIN public.sports s ON s.slug=t.sport_slug OR s.public_slug=t.sport_slug
WHERE p.sport_id=s.id AND p.slug=t.slug;

INSERT INTO public.venues(slug,name,city,country_code,venue_type,capacity,source_name,source_url,verification_status,last_verified_at)
SELECT regexp_replace(lower(venue_name),'[^a-z0-9]+','-','g'),venue_name,max(city),max(country_code),'arena',max(venue_capacity),
       'NBA/NHL permanent team profile seed',max(official_website_url),'confirmed','2026-09-15T20:00:00Z'::timestamptz
FROM seed_pro_teams GROUP BY venue_name
ON CONFLICT(slug) DO UPDATE SET
  name=EXCLUDED.name,
  city=COALESCE(public.venues.city,EXCLUDED.city),
  country_code=COALESCE(public.venues.country_code,EXCLUDED.country_code),
  capacity=COALESCE(public.venues.capacity,EXCLUDED.capacity),
  verification_status='confirmed',
  last_verified_at=GREATEST(public.venues.last_verified_at,EXCLUDED.last_verified_at),
  updated_at=now();

UPDATE public.participant_profiles pp
SET city=COALESCE(pp.city,t.city),
    country_code=COALESCE(pp.country_code,t.country_code),
    founded_year=COALESCE(pp.founded_year,t.founded_year),
    venue_name=COALESCE(pp.venue_name,t.venue_name),
    venue_capacity=COALESCE(pp.venue_capacity,t.venue_capacity),
    official_website_url=COALESCE(pp.official_website_url,t.official_website_url),
    logo_url=t.logo_url,
    summary=COALESCE(pp.summary,p.name||' is a professional '||CASE WHEN t.sport_slug='basketball' THEN 'basketball team in the NBA' ELSE 'ice hockey team in the NHL' END||' based in '||t.city||'. Home games are played at '||t.venue_name||'.'),
    profile_status='verified',
    last_verified_at='2026-09-15T20:00:00Z'::timestamptz,
    next_review_at=COALESCE(pp.next_review_at,'2027-03-15T20:00:00Z'::timestamptz),
    home_venue_id=COALESCE(pp.home_venue_id,v.id),
    updated_at=now()
FROM seed_pro_teams t
JOIN public.sports s ON s.slug=t.sport_slug OR s.public_slug=t.sport_slug
JOIN public.participants p ON p.sport_id=s.id AND p.slug=t.slug
JOIN public.venues v ON v.slug=regexp_replace(lower(t.venue_name),'[^a-z0-9]+','-','g')
WHERE pp.participant_id=p.id;

INSERT INTO public.participant_aliases(participant_id,locale,alias,normalized_alias)
SELECT p.id,NULL,t.abbreviation,lower(t.abbreviation)
FROM seed_pro_teams t
JOIN public.sports s ON s.slug=t.sport_slug OR s.public_slug=t.sport_slug
JOIN public.participants p ON p.sport_id=s.id AND p.slug=t.slug
ON CONFLICT DO NOTHING;

INSERT INTO public.competition_memberships(competition_id,season_id,participant_id,membership_status,source_name,source_url,verified_at)
SELECT c.id,se.id,p.id,'confirmed',CASE WHEN t.sport_slug='basketball' THEN 'NBA' ELSE 'NHL' END,
       CASE WHEN t.sport_slug='basketball' THEN 'https://www.nba.com/teams' ELSE 'https://www.nhl.com/info/teams/' END,
       '2026-09-15T20:00:00Z'::timestamptz
FROM seed_pro_teams t
JOIN public.sports s ON s.slug=t.sport_slug OR s.public_slug=t.sport_slug
JOIN public.competitions c ON c.sport_id=s.id AND c.slug=t.competition_slug
JOIN public.seasons se ON se.competition_id=c.id AND se.slug='2026-27'
JOIN public.participants p ON p.sport_id=s.id AND p.slug=t.slug
ON CONFLICT(competition_id,season_id,participant_id) DO UPDATE SET
  membership_status='confirmed',source_name=EXCLUDED.source_name,source_url=EXCLUDED.source_url,verified_at=EXCLUDED.verified_at;

INSERT INTO public.media_assets(asset_kind,entity_type,entity_key,source_name,source_url,source_type,storage_url,alt_text,license_note,verification_status,verified_at,is_current)
SELECT 'team_logo','participant',p.slug,
       CASE WHEN t.sport_slug='basketball' THEN 'NBA official CDN' ELSE 'NHL official assets' END,
       CASE WHEN t.sport_slug='basketball' THEN 'https://www.nba.com/teams' ELSE 'https://www.nhl.com/info/teams/' END,
       'official',t.logo_url,p.name||' logo',
       'Official team trademark/logo; external league asset used for identification and not treated as freely licensed artwork.',
       'approved','2026-09-15T20:00:00Z'::timestamptz,true
FROM seed_pro_teams t
JOIN public.sports s ON s.slug=t.sport_slug OR s.public_slug=t.sport_slug
JOIN public.participants p ON p.sport_id=s.id AND p.slug=t.slug
ON CONFLICT (asset_kind,entity_type,entity_key) WHERE is_current=true DO UPDATE SET
  source_name=EXCLUDED.source_name,source_url=EXCLUDED.source_url,source_type=EXCLUDED.source_type,
  storage_url=EXCLUDED.storage_url,alt_text=EXCLUDED.alt_text,license_note=EXCLUDED.license_note,
  verification_status='approved',verified_at=EXCLUDED.verified_at,updated_at=now();

DO $$
DECLARE nba_count integer; nhl_count integer; missing_core integer;
BEGIN
  SELECT count(*) INTO nba_count FROM seed_pro_teams WHERE sport_slug='basketball';
  SELECT count(*) INTO nhl_count FROM seed_pro_teams WHERE sport_slug='hockey';
  IF nba_count<>30 OR nhl_count<>32 THEN RAISE EXCEPTION 'Seed cardinality invalid: NBA %, NHL %',nba_count,nhl_count; END IF;
  SELECT count(*) INTO missing_core
  FROM seed_pro_teams t
  JOIN public.sports s ON s.slug=t.sport_slug OR s.public_slug=t.sport_slug
  JOIN public.participants p ON p.sport_id=s.id AND p.slug=t.slug
  JOIN public.participant_profiles pp ON pp.participant_id=p.id
  WHERE pp.city IS NULL OR pp.founded_year IS NULL OR pp.venue_name IS NULL OR pp.venue_capacity IS NULL OR pp.official_website_url IS NULL OR pp.logo_url IS NULL;
  IF missing_core<>0 THEN RAISE EXCEPTION '% enriched profiles still miss core facts',missing_core; END IF;
END $$;

COMMIT;
