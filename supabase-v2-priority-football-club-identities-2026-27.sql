-- WatchTVSport V2 priority football club identity seed for 2026/27.
-- This file was intentionally not applied automatically by the application runtime.
-- Premier League source: https://www.premierleague.com/en/news/4675097/all-380-fixtures-for-202627-premier-league-season/
-- Ligue 1 source: https://ligue1.com/fr/articles/l1_article_5293-les-dates-de-reprise-des-clubs-de-l1-2627
-- Note: public.participants has no updated_at column in the current V2 schema.

begin;

with identities(slug,short_name,country_code,aliases) as (values
  ('afc-bournemouth','Bournemouth','GB',array['Bournemouth','AFCB','AFC Bournemouth FC']::text[]),
  ('arsenal','Arsenal','GB',array['Arsenal FC','AFC','Gunners']::text[]),
  ('aston-villa','Aston Villa','GB',array['Villa','AVFC','Aston Villa FC']::text[]),
  ('brentford','Brentford','GB',array['Brentford FC']::text[]),
  ('brighton-hove-albion','Brighton','GB',array['Brighton','Brighton and Hove Albion','BHAFC']::text[]),
  ('chelsea','Chelsea','GB',array['Chelsea FC','CFC']::text[]),
  ('coventry-city','Coventry','GB',array['Coventry','Coventry City FC','CCFC']::text[]),
  ('crystal-palace','Crystal Palace','GB',array['Palace','Crystal Palace FC','CPFC']::text[]),
  ('everton','Everton','GB',array['Everton FC','EFC']::text[]),
  ('fulham','Fulham','GB',array['Fulham FC','FFC']::text[]),
  ('hull-city','Hull City','GB',array['Hull','Hull City AFC','HCAFC']::text[]),
  ('ipswich-town','Ipswich','GB',array['Ipswich','Ipswich Town FC','ITFC']::text[]),
  ('leeds-united','Leeds','GB',array['Leeds','Leeds United FC','LUFC']::text[]),
  ('liverpool','Liverpool','GB',array['Liverpool FC','LFC']::text[]),
  ('manchester-city','Man City','GB',array['Man City','Manchester City FC','MCFC']::text[]),
  ('manchester-united','Man Utd','GB',array['Man United','Man Utd','Manchester Utd','Manchester United FC','MUFC','MUN']::text[]),
  ('newcastle-united','Newcastle','GB',array['Newcastle','Newcastle United FC','NUFC']::text[]),
  ('nottingham-forest','Nottingham Forest','GB',array['Nott''m Forest','Nottm Forest','Nottingham Forest FC','NFFC']::text[]),
  ('sunderland','Sunderland','GB',array['Sunderland AFC','SAFC']::text[]),
  ('tottenham-hotspur','Tottenham','GB',array['Tottenham','Spurs','Tottenham Hotspur FC','THFC']::text[]),
  ('angers-sco','Angers','FR',array['Angers','SCO Angers']::text[]),
  ('aj-auxerre','Auxerre','FR',array['Auxerre','AJA']::text[]),
  ('stade-brestois-29','Brest','FR',array['Brest','Stade Brestois','SB29']::text[]),
  ('havre-ac','Le Havre','FR',array['Le Havre','Le Havre AC','HAC']::text[]),
  ('le-mans-fc','Le Mans','FR',array['Le Mans','LMFC']::text[]),
  ('lens','Lens','FR',array['Lens','Racing Club de Lens','RCL']::text[]),
  ('fc-lorient','Lorient','FR',array['Lorient','FCL']::text[]),
  ('lille','Lille','FR',array['Lille','LOSC Lille','Lille OSC']::text[]),
  ('olympique-lyonnais','Lyon','FR',array['Lyon','OL']::text[]),
  ('olympique-de-marseille','Marseille','FR',array['Marseille','OM']::text[]),
  ('as-monaco','Monaco','MC',array['Monaco','ASM']::text[]),
  ('ogc-nice','Nice','FR',array['Nice','OGCN']::text[]),
  ('paris-fc','Paris FC','FR',array['PFC']::text[]),
  ('paris-saint-germain','PSG','FR',array['PSG','Paris SG','Paris Saint Germain']::text[]),
  ('stade-rennais','Rennes','FR',array['Rennes','Stade Rennais','Stade Rennais FC','SRFC']::text[]),
  ('rc-strasbourg-alsace','Strasbourg','FR',array['Strasbourg','Racing Strasbourg','RCSA']::text[]),
  ('toulouse-fc','Toulouse','FR',array['Toulouse','TFC']::text[]),
  ('estac-troyes','Troyes','FR',array['Troyes','ESTAC']::text[])
), football as (
  select id from public.sports where coalesce(public_slug,slug)='football' limit 1
)
update public.participants p
set short_name=i.short_name,
    country_code=i.country_code
from identities i, football f
where p.sport_id=f.id and p.slug=i.slug;

with identities(slug,aliases) as (values
  ('afc-bournemouth',array['Bournemouth','AFCB','AFC Bournemouth FC']::text[]),
  ('arsenal',array['Arsenal FC','AFC','Gunners']::text[]),
  ('aston-villa',array['Villa','AVFC','Aston Villa FC']::text[]),
  ('brentford',array['Brentford FC']::text[]),
  ('brighton-hove-albion',array['Brighton','Brighton and Hove Albion','BHAFC']::text[]),
  ('chelsea',array['Chelsea FC','CFC']::text[]),
  ('coventry-city',array['Coventry','Coventry City FC','CCFC']::text[]),
  ('crystal-palace',array['Palace','Crystal Palace FC','CPFC']::text[]),
  ('everton',array['Everton FC','EFC']::text[]),
  ('fulham',array['Fulham FC','FFC']::text[]),
  ('hull-city',array['Hull','Hull City AFC','HCAFC']::text[]),
  ('ipswich-town',array['Ipswich','Ipswich Town FC','ITFC']::text[]),
  ('leeds-united',array['Leeds','Leeds United FC','LUFC']::text[]),
  ('liverpool',array['Liverpool FC','LFC']::text[]),
  ('manchester-city',array['Man City','Manchester City FC','MCFC']::text[]),
  ('manchester-united',array['Man United','Man Utd','Manchester Utd','Manchester United FC','MUFC','MUN']::text[]),
  ('newcastle-united',array['Newcastle','Newcastle United FC','NUFC']::text[]),
  ('nottingham-forest',array['Nott''m Forest','Nottm Forest','Nottingham Forest FC','NFFC']::text[]),
  ('sunderland',array['Sunderland AFC','SAFC']::text[]),
  ('tottenham-hotspur',array['Tottenham','Spurs','Tottenham Hotspur FC','THFC']::text[]),
  ('angers-sco',array['Angers','SCO Angers']::text[]),
  ('aj-auxerre',array['Auxerre','AJA']::text[]),
  ('stade-brestois-29',array['Brest','Stade Brestois','SB29']::text[]),
  ('havre-ac',array['Le Havre','Le Havre AC','HAC']::text[]),
  ('le-mans-fc',array['Le Mans','LMFC']::text[]),
  ('lens',array['Lens','Racing Club de Lens','RCL']::text[]),
  ('fc-lorient',array['Lorient','FCL']::text[]),
  ('lille',array['Lille','LOSC Lille','Lille OSC']::text[]),
  ('olympique-lyonnais',array['Lyon','OL']::text[]),
  ('olympique-de-marseille',array['Marseille','OM']::text[]),
  ('as-monaco',array['Monaco','ASM']::text[]),
  ('ogc-nice',array['Nice','OGCN']::text[]),
  ('paris-fc',array['PFC']::text[]),
  ('paris-saint-germain',array['PSG','Paris SG','Paris Saint Germain']::text[]),
  ('stade-rennais',array['Rennes','Stade Rennais','Stade Rennais FC','SRFC']::text[]),
  ('rc-strasbourg-alsace',array['Strasbourg','Racing Strasbourg','RCSA']::text[]),
  ('toulouse-fc',array['Toulouse','TFC']::text[]),
  ('estac-troyes',array['Troyes','ESTAC']::text[])
), football as (
  select id from public.sports where coalesce(public_slug,slug)='football' limit 1
), expanded as (
  select i.slug,a.alias,
         trim(both '-' from regexp_replace(lower(a.alias),'[^a-z0-9]+','-','g')) as normalized_alias
  from identities i
  cross join lateral unnest(i.aliases) as a(alias)
)
insert into public.participant_aliases(participant_id,locale,alias,normalized_alias)
select p.id,null,e.alias,e.normalized_alias
from expanded e
join public.participants p on p.slug=e.slug
join football f on f.id=p.sport_id
where e.normalized_alias<>''
on conflict (participant_id,locale,normalized_alias)
do update set alias=excluded.alias;

do $$
declare matched integer;
begin
  select count(*) into matched
  from public.participants p
  join public.sports s on s.id=p.sport_id
  where coalesce(s.public_slug,s.slug)='football'
    and p.slug in (
      'afc-bournemouth','arsenal','aston-villa','brentford','brighton-hove-albion','chelsea','coventry-city','crystal-palace','everton','fulham',
      'hull-city','ipswich-town','leeds-united','liverpool','manchester-city','manchester-united','newcastle-united','nottingham-forest','sunderland','tottenham-hotspur',
      'angers-sco','aj-auxerre','stade-brestois-29','havre-ac','le-mans-fc','lens','fc-lorient','lille','olympique-lyonnais','olympique-de-marseille',
      'as-monaco','ogc-nice','paris-fc','paris-saint-germain','stade-rennais','rc-strasbourg-alsace','toulouse-fc','estac-troyes'
    );
  if matched <> 38 then
    raise exception 'priority football identity seed expected 38 clubs, found %', matched;
  end if;
end $$;

commit;
