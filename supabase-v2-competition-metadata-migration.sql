-- WatchTVSport V2 competition metadata and automation.
-- Production migrations: competition_metadata_and_automation + seed_motogp_permanent_competition.

alter table public.competitions
  add column if not exists display_name text,
  add column if not exists competition_type text,
  add column if not exists region_label text,
  add column if not exists country_code text,
  add column if not exists sort_priority smallint,
  add column if not exists metadata_status text not null default 'pending';

alter table public.competitions drop constraint if exists competitions_competition_type_check;
alter table public.competitions add constraint competitions_competition_type_check check (
  competition_type is null or competition_type = any(array['continental','domestic-league','domestic-cup','international','grand-slam','tour','league','championship','organization','other'])
);
alter table public.competitions drop constraint if exists competitions_country_code_check;
alter table public.competitions add constraint competitions_country_code_check check (country_code is null or country_code ~ '^[A-Z]{2}$');
alter table public.competitions drop constraint if exists competitions_sort_priority_check;
alter table public.competitions add constraint competitions_sort_priority_check check (sort_priority is null or sort_priority between 1 and 999);
alter table public.competitions drop constraint if exists competitions_metadata_status_check;
alter table public.competitions add constraint competitions_metadata_status_check check (metadata_status = any(array['pending','generated','reviewed','verified','needs_review']));

alter table public.enrichment_tasks drop constraint if exists enrichment_tasks_task_kind_check;
alter table public.enrichment_tasks add constraint enrichment_tasks_task_kind_check check (task_kind = any(array['profile_identity','official_website','social_links','home_venue','venue_capacity','team_logo','team_hero','competition_logo','venue_image','circuit_layout','fighter_photo','schedule_import','broadcast_verification','participant_visual_identity','competition_metadata']));

update public.competitions set display_name=name where display_name is null;

create or replace function public.enqueue_competition_metadata_task()
returns trigger language plpgsql security definer set search_path=public as $$
begin
  insert into public.enrichment_tasks(entity_type,entity_key,task_kind,status,priority,source_hint,notes)
  values('competition','competition:'||new.id::text,'competition_metadata','pending',70,null,'Verify official display name, competition type, region/country and presentation metadata.')
  on conflict (entity_type,entity_key,task_kind) do update set
    status=case when public.enrichment_tasks.status='verified' then public.enrichment_tasks.status else 'pending' end,
    updated_at=now();
  return new;
end;$$;
revoke all on function public.enqueue_competition_metadata_task() from public,anon,authenticated;

drop trigger if exists competitions_enqueue_metadata on public.competitions;
create trigger competitions_enqueue_metadata after insert or update of name,slug,sport_id on public.competitions
for each row execute function public.enqueue_competition_metadata_task();

insert into public.enrichment_tasks(entity_type,entity_key,task_kind,status,priority,notes)
select 'competition','competition:'||c.id::text,'competition_metadata',case when c.metadata_status in ('reviewed','verified') then 'verified' else 'pending' end,70,'Verify official display name, category and geography.'
from public.competitions c
on conflict (entity_type,entity_key,task_kind) do nothing;

insert into public.competitions(sport_id,slug,name,display_name,competition_type,region_label,sort_priority,metadata_status,is_active)
select s.id,'motogp','MotoGP','MotoGP','championship','Global',1,'reviewed',true
from public.sports s where s.slug='motogp'
on conflict (sport_id,slug) do update set
 display_name='MotoGP',competition_type='championship',region_label='Global',sort_priority=1,
 metadata_status=case when public.competitions.metadata_status='verified' then 'verified' else 'reviewed' end,is_active=true;
