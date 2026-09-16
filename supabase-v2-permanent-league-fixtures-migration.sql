-- Permanent reusable fixture pages for team-match competitions.
-- Match identity lives in event_pages. Season/matchweek/scheduling data lives in event_editions.
-- Exact kickoff is stored on events only after verification.

alter table public.event_editions
  add column if not exists schedule_status text not null default 'schedule_confirmed';

alter table public.event_editions drop constraint if exists event_editions_schedule_status_check;
alter table public.event_editions add constraint event_editions_schedule_status_check
  check (schedule_status in ('schedule_pending','schedule_confirmed'));

create index if not exists idx_event_editions_season_round on public.event_editions(season_id,round_number);
create index if not exists idx_event_editions_page_season on public.event_editions(event_page_id,season_id);

create or replace function public.validate_event_edition_relationships()
returns trigger language plpgsql set search_path to 'public','pg_catalog' as $function$
declare v_page_type text; v_page_competition uuid; v_season_competition uuid;
begin
  select page_type,competition_id into v_page_type,v_page_competition from public.event_pages where id=new.event_page_id;
  if v_page_type not in ('multi_session','head_to_head') then
    raise exception using errcode='23514',message='event editions require a multi-session or head-to-head page';
  end if;
  if new.season_id is not null then
    select competition_id into v_season_competition from public.seasons where id=new.season_id;
    if v_season_competition is distinct from v_page_competition then
      raise exception using errcode='23514',message='event edition season does not belong to page competition';
    end if;
  end if;
  return new;
end;
$function$;

alter table public.events drop constraint if exists ck_events_v2_shape;
alter table public.events add constraint ck_events_v2_shape check (
  (event_kind='session' and event_page_id is not null and event_edition_id is not null and session_type is not null and btrim(session_type)<>'')
  or (event_kind='match' and session_type is null and session_label is null and sequence_number is null and session_order is null and session_group is null)
  or (event_kind='standalone' and event_edition_id is null and session_type is null and session_label is null and sequence_number is null and session_order is null and session_group is null)
);

-- Build one permanent directional page from each current league event.
insert into public.event_pages(
  sport_id,competition_id,page_type,slug,title,home_participant_id,away_participant_id,
  is_published,published_at,source_name,source_url,last_verified_at,verification_status,entity_kind
)
select e.sport_id,e.competition_id,'head_to_head',hp.slug||'-vs-'||ap.slug,hp.name||' vs '||ap.name,
       e.home_participant_id,e.away_participant_id,true,now(),e.source_name,e.source_url,
       coalesce(e.last_verified_at,now()),'confirmed','fixture'
from public.events e
join public.competitions c on c.id=e.competition_id
join public.participants hp on hp.id=e.home_participant_id
join public.participants ap on ap.id=e.away_participant_id
where c.slug in ('ligue-1','premier-league') and e.season_id is not null
on conflict (competition_id,slug) do update set
 title=excluded.title,home_participant_id=excluded.home_participant_id,away_participant_id=excluded.away_participant_id,
 is_published=true,published_at=coalesce(public.event_pages.published_at,excluded.published_at),
 source_name=coalesce(excluded.source_name,public.event_pages.source_name),source_url=coalesce(excluded.source_url,public.event_pages.source_url),
 last_verified_at=greatest(public.event_pages.last_verified_at,excluded.last_verified_at),verification_status='confirmed',entity_kind='fixture';

insert into public.event_editions(
 event_page_id,season_id,edition_key,label,start_date,end_date,status,is_published,published_at,
 source_name,source_url,last_verified_at,verification_status,round_number,schedule_status
)
select ep.id,e.season_id,s.slug,s.label,null,null,
       case when e.status in ('scheduled','live','finished','postponed','cancelled','reported') then e.status else 'scheduled' end,
       true,now(),e.source_name,e.source_url,coalesce(e.last_verified_at,now()),'confirmed',e.match_number,
       case when coalesce(e.scheduled_date,e.event_date) is not null then 'schedule_confirmed' else 'schedule_pending' end
from public.events e
join public.competitions c on c.id=e.competition_id
join public.seasons s on s.id=e.season_id
join public.participants hp on hp.id=e.home_participant_id
join public.participants ap on ap.id=e.away_participant_id
join public.event_pages ep on ep.competition_id=e.competition_id and ep.slug=hp.slug||'-vs-'||ap.slug
where c.slug in ('ligue-1','premier-league')
on conflict (event_page_id,edition_key) do update set
 season_id=excluded.season_id,label=excluded.label,status=excluded.status,is_published=true,
 published_at=coalesce(public.event_editions.published_at,excluded.published_at),
 source_name=coalesce(excluded.source_name,public.event_editions.source_name),source_url=coalesce(excluded.source_url,public.event_editions.source_url),
 last_verified_at=greatest(public.event_editions.last_verified_at,excluded.last_verified_at),verification_status='confirmed',
 round_number=coalesce(public.event_editions.round_number,excluded.round_number),
 schedule_status=case when excluded.schedule_status='schedule_confirmed' then 'schedule_confirmed' else public.event_editions.schedule_status end;

update public.events e set event_page_id=ep.id,event_edition_id=ee.id,updated_at=now()
from public.competitions c,public.participants hp,public.participants ap,public.event_pages ep,public.event_editions ee
where c.id=e.competition_id and c.slug in ('ligue-1','premier-league')
 and hp.id=e.home_participant_id and ap.id=e.away_participant_id
 and ep.competition_id=e.competition_id and ep.slug=hp.slug||'-vs-'||ap.slug
 and ee.event_page_id=ep.id and ee.season_id=e.season_id;

create or replace function public.get_public_fixture_page_v1(p_slug text)
returns jsonb language sql stable set search_path=public,pg_catalog as $function$
 select jsonb_strip_nulls(jsonb_build_object(
  'pageId',ep.id::text,'pageSlug',ep.slug,'detailPath','/event/'||ep.slug,'title',ep.title,
  'sport',coalesce(sp.public_slug,sp.slug),'competition',coalesce(c.display_name,c.name),'competitionSlug',c.slug,
  'seasonLabel',s.label,'matchweek',ee.round_number,'windowStart',ee.start_date,'windowEnd',ee.end_date,
  'scheduleStatus',ee.schedule_status,'status',ee.status,'eventId',e.id::text,'eventSlug',e.slug,
  'exactDate',case when ee.schedule_status='schedule_confirmed' then coalesce(e.scheduled_date,e.event_date) else null end,
  'venue',coalesce(v.name,e.venue_name),
  'participant1',jsonb_strip_nulls(jsonb_build_object('id',hp.id::text,'slug',hp.slug,'name',hp.name,'shortName',hp.short_name,'type','club','countryCode',hp.country_code)),
  'participant2',jsonb_strip_nulls(jsonb_build_object('id',ap.id::text,'slug',ap.slug,'name',ap.name,'shortName',ap.short_name,'type','club','countryCode',ap.country_code))
 ))
 from public.event_pages ep
 join public.sports sp on sp.id=ep.sport_id join public.competitions c on c.id=ep.competition_id
 join public.participants hp on hp.id=ep.home_participant_id join public.participants ap on ap.id=ep.away_participant_id
 join public.event_editions ee on ee.event_page_id=ep.id and ee.is_published=true and ee.verification_status='confirmed'
 left join public.seasons s on s.id=ee.season_id left join public.events e on e.event_edition_id=ee.id left join public.venues v on v.id=e.venue_id
 where ep.slug=p_slug and ep.is_published=true and ep.verification_status='confirmed'
 order by coalesce(s.is_current,false) desc,coalesce(s.start_date,ee.start_date) desc nulls last,ee.created_at desc limit 1;
$function$;

create or replace function public.get_public_competition_fixtures_v1(p_sport_slug text,p_competition_slug text)
returns jsonb language sql stable set search_path=public,pg_catalog as $function$
 select jsonb_build_object('schemaVersion',1,'generatedAt',statement_timestamp(),'fixtures',coalesce(jsonb_agg(x.payload order by x.round_number nulls last,x.sort_date nulls last,x.title),'[]'::jsonb)) from (
  select ee.round_number,coalesce(e.scheduled_date,e.event_date,ee.start_date::timestamptz) sort_date,ep.title,
   jsonb_strip_nulls(jsonb_build_object('pageId',ep.id::text,'pageSlug',ep.slug,'detailPath','/event/'||ep.slug,'title',ep.title,
   'sport',coalesce(sp.public_slug,sp.slug),'competition',coalesce(c.display_name,c.name),'competitionSlug',c.slug,'seasonLabel',s.label,
   'matchweek',ee.round_number,'windowStart',ee.start_date,'windowEnd',ee.end_date,'scheduleStatus',ee.schedule_status,'status',ee.status,
   'eventId',e.id::text,'eventSlug',e.slug,'exactDate',case when ee.schedule_status='schedule_confirmed' then coalesce(e.scheduled_date,e.event_date) else null end,
   'participant1',jsonb_strip_nulls(jsonb_build_object('id',hp.id::text,'slug',hp.slug,'name',hp.name,'shortName',hp.short_name,'type','club','countryCode',hp.country_code)),
   'participant2',jsonb_strip_nulls(jsonb_build_object('id',ap.id::text,'slug',ap.slug,'name',ap.name,'shortName',ap.short_name,'type','club','countryCode',ap.country_code)))) payload
  from public.event_pages ep join public.sports sp on sp.id=ep.sport_id join public.competitions c on c.id=ep.competition_id
  join public.participants hp on hp.id=ep.home_participant_id join public.participants ap on ap.id=ep.away_participant_id
  join public.event_editions ee on ee.event_page_id=ep.id and ee.is_published=true and ee.verification_status='confirmed'
  left join public.seasons s on s.id=ee.season_id left join public.events e on e.event_edition_id=ee.id
  where ep.is_published=true and ep.verification_status='confirmed' and coalesce(sp.public_slug,sp.slug)=p_sport_slug and c.slug=p_competition_slug and coalesce(s.is_current,false)=true
 ) x;
$function$;

create or replace function public.get_public_participant_fixtures_v1(p_participant_id uuid)
returns jsonb language sql stable set search_path=public,pg_catalog as $function$
 select jsonb_build_object('schemaVersion',1,'generatedAt',statement_timestamp(),'fixtures',coalesce(jsonb_agg(x.payload order by x.sort_date nulls last,x.round_number nulls last,x.title),'[]'::jsonb)) from (
  select ee.round_number,coalesce(e.scheduled_date,e.event_date,ee.start_date::timestamptz) sort_date,ep.title,
   jsonb_strip_nulls(jsonb_build_object('pageId',ep.id::text,'pageSlug',ep.slug,'detailPath','/event/'||ep.slug,'title',ep.title,
   'sport',coalesce(sp.public_slug,sp.slug),'competition',coalesce(c.display_name,c.name),'competitionSlug',c.slug,'seasonLabel',s.label,
   'matchweek',ee.round_number,'windowStart',ee.start_date,'windowEnd',ee.end_date,'scheduleStatus',ee.schedule_status,'status',ee.status,
   'eventId',e.id::text,'eventSlug',e.slug,'exactDate',case when ee.schedule_status='schedule_confirmed' then coalesce(e.scheduled_date,e.event_date) else null end,
   'participant1',jsonb_strip_nulls(jsonb_build_object('id',hp.id::text,'slug',hp.slug,'name',hp.name,'shortName',hp.short_name,'type','club','countryCode',hp.country_code)),
   'participant2',jsonb_strip_nulls(jsonb_build_object('id',ap.id::text,'slug',ap.slug,'name',ap.name,'shortName',ap.short_name,'type','club','countryCode',ap.country_code)))) payload
  from public.event_pages ep join public.sports sp on sp.id=ep.sport_id join public.competitions c on c.id=ep.competition_id
  join public.participants hp on hp.id=ep.home_participant_id join public.participants ap on ap.id=ep.away_participant_id
  join public.event_editions ee on ee.event_page_id=ep.id and ee.is_published=true and ee.verification_status='confirmed'
  left join public.seasons s on s.id=ee.season_id left join public.events e on e.event_edition_id=ee.id
  where ep.is_published=true and ep.verification_status='confirmed' and (ep.home_participant_id=p_participant_id or ep.away_participant_id=p_participant_id) and coalesce(s.is_current,false)=true
 ) x;
$function$;

revoke all on function public.get_public_fixture_page_v1(text) from public;
revoke all on function public.get_public_competition_fixtures_v1(text,text) from public;
revoke all on function public.get_public_participant_fixtures_v1(uuid) from public;
grant execute on function public.get_public_fixture_page_v1(text) to anon,authenticated;
grant execute on function public.get_public_competition_fixtures_v1(text,text) to anon,authenticated;
grant execute on function public.get_public_participant_fixtures_v1(uuid) to anon,authenticated;
