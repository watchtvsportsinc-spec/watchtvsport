-- Permanent sport/competition directory used by sport hubs even before schedules are imported.
-- Mirrors production migration seed_permanent_sport_competition_directory_v2 plus MotoGP permanent competition metadata.

insert into public.sports(slug,name,public_slug,event_model,participant_page_policy,is_enabled)
values
 ('tennis','Tennis','tennis','tournament_match','none',true),
 ('rugby','Rugby','rugby','team_match','teams_and_nations',true),
 ('baseball','Baseball','baseball','team_match','teams_and_nations',true),
 ('motogp','MotoGP','motogp','race_session','none',true),
 ('cycling','Cycling','cycling','cycling_race','none',true)
on conflict (slug) do nothing;

with rows(sport_slug,slug,name,display_name,season_label,competition_type,region_label,country_code,sort_priority) as (values
 ('football','europa-league','UEFA Europa League','UEFA Europa League','2026/27','continental','Europe',null,2),
 ('football','conference-league','UEFA Conference League','UEFA Conference League','2026/27','continental','Europe',null,3),
 ('football','premier-league','Premier League','Premier League','2026/27','domestic-league','Europe','GB',10),
 ('football','ligue-1','Ligue 1 McDonald''s','Ligue 1 McDonald''s','2026/27','domestic-league','Europe','FR',11),
 ('football','serie-a','Serie A','Serie A','2026/27','domestic-league','Europe','IT',14),
 ('football','mls','Major League Soccer','Major League Soccer','2026','domestic-league','North America',null,15),
 ('football','fa-cup','FA Cup','FA Cup','2026/27','domestic-cup','Europe','GB',30),
 ('football','coupe-de-france','Coupe de France','Coupe de France','2026/27','domestic-cup','Europe','FR',31),
 ('football','copa-del-rey','Copa del Rey','Copa del Rey','2026/27','domestic-cup','Europe','ES',32),
 ('football','world-cup','FIFA World Cup','FIFA World Cup',null,'international','Global',null,40),
 ('football','euro','UEFA European Championship','UEFA European Championship',null,'international','Europe',null,41),
 ('football','copa-america','Copa América','Copa América',null,'international','South America',null,42),
 ('basketball','euroleague','EuroLeague','EuroLeague','2026/27','league','Europe',null,2),
 ('basketball','wnba','WNBA','WNBA','2026','league','North America','US',3),
 ('basketball','ncaa','NCAA Basketball','NCAA Basketball','2026/27','league','North America','US',4),
 ('hockey','iihf-world-championship','IIHF World Championship','IIHF World Championship',null,'international','Global',null,2),
 ('tennis','australian-open','Australian Open','Australian Open',null,'grand-slam','Global','AU',1),
 ('tennis','roland-garros','Roland-Garros','Roland-Garros',null,'grand-slam','Global','FR',2),
 ('tennis','wimbledon','Wimbledon','Wimbledon',null,'grand-slam','Global','GB',3),
 ('tennis','us-open','US Open','US Open',null,'grand-slam','Global','US',4),
 ('rugby','six-nations','Six Nations','Six Nations',null,'international','Europe',null,1),
 ('rugby','top-14','Top 14','Top 14','2026/27','domestic-league','Europe','FR',2),
 ('rugby','champions-cup','Champions Cup','Champions Cup','2026/27','continental','Europe',null,3),
 ('rugby','rugby-world-cup','Rugby World Cup','Rugby World Cup',null,'international','Global',null,4),
 ('baseball','mlb','MLB','MLB','2026','league','North America','US',1),
 ('baseball','world-baseball-classic','World Baseball Classic','World Baseball Classic',null,'international','Global',null,2),
 ('baseball','npb','NPB','NPB',null,'league','Asia','JP',3),
 ('baseball','kbo','KBO League','KBO League',null,'league','Asia','KR',4),
 ('american-football','ncaa-football','NCAA Football','NCAA Football','2026','league','North America','US',2),
 ('motogp','motogp','MotoGP','MotoGP',null,'championship','Global',null,1),
 ('cycling','tour-de-france','Tour de France','Tour de France',null,'tour','Europe','FR',1),
 ('cycling','giro-ditalia','Giro d''Italia','Giro d''Italia',null,'tour','Europe','IT',2),
 ('cycling','vuelta-a-espana','Vuelta a España','Vuelta a España',null,'tour','Europe','ES',3)
)
insert into public.competitions(sport_id,slug,name,display_name,season_label,competition_type,region_label,country_code,sort_priority,metadata_status,is_active)
select s.id,r.slug,r.name,r.display_name,r.season_label,r.competition_type,r.region_label,r.country_code,r.sort_priority,'reviewed',true
from rows r join public.sports s on s.slug=r.sport_slug
on conflict (sport_id,slug) do update set
 display_name=excluded.display_name,competition_type=excluded.competition_type,region_label=excluded.region_label,
 country_code=excluded.country_code,sort_priority=excluded.sort_priority,
 metadata_status=case when public.competitions.metadata_status='verified' then 'verified' else 'reviewed' end,
 season_label=coalesce(public.competitions.season_label,excluded.season_label);

update public.competitions c set season_label='2026/27'
from public.sports s where c.sport_id=s.id and s.slug='football' and c.slug='champions-league' and c.season_label is null;
