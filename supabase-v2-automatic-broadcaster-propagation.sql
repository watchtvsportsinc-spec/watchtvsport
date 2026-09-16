-- WatchTVSport V2 automatic broadcaster propagation.
-- PREPARED MIGRATION ONLY: do not apply automatically.
--
-- Goal:
-- - allow explicitly approved, confirmed full-coverage rights to materialize
--   event-level broadcast offers automatically;
-- - never fan out partial/unknown rights across an entire competition;
-- - preserve manual overrides;
-- - withdraw auto-generated offers when the right/event no longer qualifies.

alter table public.broadcast_rights
  add column if not exists propagation_mode text not null default 'manual',
  add column if not exists propagation_approved_at timestamptz,
  add column if not exists propagation_approved_by text,
  add column if not exists default_broadcast_type text not null default 'live',
  add column if not exists default_language_codes text[] not null default '{}'::text[],
  add column if not exists default_official_url text,
  add column if not exists default_access_conditions text,
  add column if not exists default_requires_account boolean,
  add column if not exists default_is_free_trial boolean;

do $$ begin
  if not exists (
    select 1 from pg_constraint
    where conrelid='public.broadcast_rights'::regclass
      and conname='broadcast_rights_propagation_mode_check'
  ) then
    alter table public.broadcast_rights
      add constraint broadcast_rights_propagation_mode_check
      check (propagation_mode in ('manual','auto_full','paused','blocked'));
  end if;
end $$;

do $$ begin
  if not exists (
    select 1 from pg_constraint
    where conrelid='public.broadcast_rights'::regclass
      and conname='broadcast_rights_default_broadcast_type_check'
  ) then
    alter table public.broadcast_rights
      add constraint broadcast_rights_default_broadcast_type_check
      check (default_broadcast_type in ('live','delayed','replay','highlights'));
  end if;
end $$;

do $$ begin
  if not exists (
    select 1 from pg_constraint
    where conrelid='public.broadcast_rights'::regclass
      and conname='broadcast_rights_auto_full_requires_approval'
  ) then
    alter table public.broadcast_rights
      add constraint broadcast_rights_auto_full_requires_approval
      check (
        propagation_mode <> 'auto_full'
        or (
          coverage_type = 'full'
          and verification_status = 'confirmed'
          and access_type in ('Free','Paid')
          and nullif(trim(source_name),'') is not null
          and nullif(trim(source_url),'') is not null
          and propagation_approved_at is not null
          and nullif(trim(propagation_approved_by),'') is not null
        )
      );
  end if;
end $$;

alter table public.event_broadcasts
  add column if not exists propagation_origin text not null default 'manual',
  add column if not exists propagation_locked boolean not null default false,
  add column if not exists propagated_at timestamptz;

do $$ begin
  if not exists (
    select 1 from pg_constraint
    where conrelid='public.event_broadcasts'::regclass
      and conname='event_broadcasts_propagation_origin_check'
  ) then
    alter table public.event_broadcasts
      add constraint event_broadcasts_propagation_origin_check
      check (propagation_origin in ('manual','legacy_linked_right','auto_right'));
  end if;
end $$;

-- Existing right-linked rows are preserved as legacy materializations. The new
-- automation does not overwrite them unless they are deliberately converted.
update public.event_broadcasts
set propagation_origin='legacy_linked_right'
where broadcast_right_id is not null
  and propagation_origin='manual';

create index if not exists ix_broadcast_rights_auto_propagation
  on public.broadcast_rights(competition_id,season_id,propagation_mode,verification_status)
  where propagation_mode='auto_full';

create index if not exists ix_event_broadcasts_auto_right
  on public.event_broadcasts(broadcast_right_id,event_id)
  where propagation_origin='auto_right';

create or replace function public.preview_broadcast_right_propagation_v1(p_right_id uuid)
returns jsonb
language sql
stable
set search_path=public,pg_catalog
as $$
  with right_row as (
    select br.*, coalesce(br.default_official_url,pl.url,b.website_url) as resolved_url
    from public.broadcast_rights br
    join public.broadcasters b on b.id=br.broadcaster_id
    left join public.platforms pl on pl.id=br.platform_id
    where br.id=p_right_id
  ), assessment as (
    select r.*,
      (
        r.propagation_mode='auto_full'
        and r.coverage_type='full'
        and r.verification_status='confirmed'
        and r.access_type in ('Free','Paid')
        and r.propagation_approved_at is not null
        and nullif(trim(r.propagation_approved_by),'') is not null
        and nullif(trim(r.source_name),'') is not null
        and nullif(trim(r.source_url),'') is not null
        and r.resolved_url ~ '^https://'
      ) as eligible
    from right_row r
  )
  select case when a.id is null then jsonb_build_object('found',false)
  else jsonb_build_object(
    'found',true,
    'eligible',a.eligible,
    'mode',a.propagation_mode,
    'coverageType',a.coverage_type,
    'verificationStatus',a.verification_status,
    'resolvedOfficialUrl',a.resolved_url,
    'matchingEvents',(
      select count(*)
      from public.events e
      where e.competition_id=a.competition_id
        and (a.season_id is null or e.season_id=a.season_id)
        and e.event_date is not null
        and (a.valid_from is null or e.event_date::date>=a.valid_from)
        and (a.valid_to is null or e.event_date::date<=a.valid_to)
        and e.status<>'cancelled'
        and e.verification_status in ('confirmed','expected')
    ),
    'currentlyPublicEvents',(
      select count(*)
      from public.events e
      where e.competition_id=a.competition_id
        and (a.season_id is null or e.season_id=a.season_id)
        and e.event_date is not null
        and (a.valid_from is null or e.event_date::date>=a.valid_from)
        and (a.valid_to is null or e.event_date::date<=a.valid_to)
        and e.status<>'cancelled'
        and e.is_published=true
        and e.verification_status='confirmed'
    )
  ) end
  from assessment a
  right join (select 1) x on true
  limit 1;
$$;

create or replace function public.sync_broadcast_right_v1(p_right_id uuid)
returns jsonb
language plpgsql
security definer
set search_path=public,pg_catalog
as $$
declare
  r record;
  v_eligible boolean := false;
  v_url text;
  v_touched integer := 0;
  v_withdrawn integer := 0;
begin
  select br.*, b.website_url as broadcaster_url, pl.url as platform_url
  into r
  from public.broadcast_rights br
  join public.broadcasters b on b.id=br.broadcaster_id
  left join public.platforms pl on pl.id=br.platform_id
  where br.id=p_right_id;

  if not found then
    return jsonb_build_object('found',false,'touched',0,'withdrawn',0);
  end if;

  v_url := coalesce(r.default_official_url,r.platform_url,r.broadcaster_url);
  v_eligible :=
    r.propagation_mode='auto_full'
    and r.coverage_type='full'
    and r.verification_status='confirmed'
    and r.access_type in ('Free','Paid')
    and r.propagation_approved_at is not null
    and nullif(trim(r.propagation_approved_by),'') is not null
    and nullif(trim(r.source_name),'') is not null
    and nullif(trim(r.source_url),'') is not null
    and v_url ~ '^https://';

  if not v_eligible then
    update public.event_broadcasts eb
    set is_published=false,
        published_at=null,
        verification_status='to_update',
        propagated_at=now(),
        updated_at=now()
    where eb.broadcast_right_id=p_right_id
      and eb.propagation_origin='auto_right'
      and eb.propagation_locked=false
      and (eb.is_published=true or eb.verification_status<>'to_update');
    get diagnostics v_withdrawn=row_count;
    return jsonb_build_object('found',true,'eligible',false,'touched',0,'withdrawn',v_withdrawn);
  end if;

  insert into public.event_broadcasts(
    event_id,broadcast_right_id,territory_id,broadcaster_id,platform_id,
    decision,access_type,official_url,language_codes,source_name,source_url,
    last_verified_at,verification_status,is_published,published_at,notes,
    broadcast_type,access_conditions,requires_account,is_free_trial,
    propagation_origin,propagation_locked,propagated_at,updated_at
  )
  select
    e.id,r.id,r.territory_id,r.broadcaster_id,r.platform_id,
    'included',r.access_type,v_url,r.default_language_codes,r.source_name,r.source_url,
    r.last_verified_at,
    case when e.verification_status='confirmed' then 'confirmed' else 'expected' end,
    (e.is_published=true and e.verification_status='confirmed'),
    case when e.is_published=true and e.verification_status='confirmed' then now() else null end,
    'Automatically materialized from an approved full-coverage broadcast right.',
    r.default_broadcast_type,r.default_access_conditions,r.default_requires_account,r.default_is_free_trial,
    'auto_right',false,now(),now()
  from public.events e
  where e.competition_id=r.competition_id
    and (r.season_id is null or e.season_id=r.season_id)
    and e.event_date is not null
    and (r.valid_from is null or e.event_date::date>=r.valid_from)
    and (r.valid_to is null or e.event_date::date<=r.valid_to)
    and e.status<>'cancelled'
    and e.verification_status in ('confirmed','expected')
  on conflict on constraint uq_event_broadcasts_offer do update
  set decision='included',
      access_type=excluded.access_type,
      official_url=excluded.official_url,
      language_codes=excluded.language_codes,
      source_name=excluded.source_name,
      source_url=excluded.source_url,
      last_verified_at=excluded.last_verified_at,
      verification_status=excluded.verification_status,
      is_published=excluded.is_published,
      published_at=case when excluded.is_published then coalesce(public.event_broadcasts.published_at,now()) else null end,
      notes=excluded.notes,
      broadcast_type=excluded.broadcast_type,
      access_conditions=excluded.access_conditions,
      requires_account=excluded.requires_account,
      is_free_trial=excluded.is_free_trial,
      propagated_at=now(),
      updated_at=now()
  where public.event_broadcasts.propagation_origin='auto_right'
    and public.event_broadcasts.propagation_locked=false;
  get diagnostics v_touched=row_count;

  update public.event_broadcasts eb
  set is_published=false,
      published_at=null,
      verification_status='to_update',
      propagated_at=now(),
      updated_at=now()
  where eb.broadcast_right_id=p_right_id
    and eb.propagation_origin='auto_right'
    and eb.propagation_locked=false
    and not exists (
      select 1 from public.events e
      where e.id=eb.event_id
        and e.competition_id=r.competition_id
        and (r.season_id is null or e.season_id=r.season_id)
        and e.event_date is not null
        and (r.valid_from is null or e.event_date::date>=r.valid_from)
        and (r.valid_to is null or e.event_date::date<=r.valid_to)
        and e.status<>'cancelled'
        and e.verification_status in ('confirmed','expected')
    )
    and (eb.is_published=true or eb.verification_status<>'to_update');
  get diagnostics v_withdrawn=row_count;

  return jsonb_build_object('found',true,'eligible',true,'touched',v_touched,'withdrawn',v_withdrawn);
end;
$$;

create or replace function public.set_broadcast_right_propagation_v1(
  p_right_id uuid,
  p_mode text,
  p_actor text
)
returns jsonb
language plpgsql
security definer
set search_path=public,pg_catalog
as $$
begin
  if p_mode not in ('manual','auto_full','paused','blocked') then
    raise exception 'Unsupported propagation mode';
  end if;
  if nullif(trim(p_actor),'') is null then
    raise exception 'Actor is required';
  end if;

  update public.broadcast_rights
  set propagation_mode=p_mode,
      propagation_approved_at=case when p_mode='auto_full' then now() else propagation_approved_at end,
      propagation_approved_by=case when p_mode='auto_full' then trim(p_actor) else propagation_approved_by end,
      updated_at=now()
  where id=p_right_id;

  if not found then
    return jsonb_build_object('found',false);
  end if;

  return public.sync_broadcast_right_v1(p_right_id);
end;
$$;

create or replace function public.sync_event_broadcast_rights_v1(p_event_id uuid)
returns jsonb
language plpgsql
security definer
set search_path=public,pg_catalog
as $$
declare
  e record;
  br record;
  v_rights integer := 0;
begin
  select id,competition_id,season_id,event_date,status,verification_status,is_published
  into e from public.events where id=p_event_id;
  if not found then return jsonb_build_object('found',false,'rights',0); end if;

  -- Withdraw only rows created by the new automation when an event stops matching.
  update public.event_broadcasts eb
  set is_published=false,published_at=null,verification_status='to_update',propagated_at=now(),updated_at=now()
  from public.broadcast_rights r
  where eb.event_id=p_event_id
    and eb.broadcast_right_id=r.id
    and eb.propagation_origin='auto_right'
    and eb.propagation_locked=false
    and (
      r.propagation_mode<>'auto_full'
      or r.coverage_type<>'full'
      or r.verification_status<>'confirmed'
      or e.competition_id<>r.competition_id
      or (r.season_id is not null and e.season_id is distinct from r.season_id)
      or e.event_date is null
      or (r.valid_from is not null and e.event_date::date<r.valid_from)
      or (r.valid_to is not null and e.event_date::date>r.valid_to)
      or e.status='cancelled'
      or e.verification_status not in ('confirmed','expected')
    );

  for br in
    select id
    from public.broadcast_rights r
    where r.propagation_mode='auto_full'
      and r.coverage_type='full'
      and r.verification_status='confirmed'
      and r.competition_id=e.competition_id
      and (r.season_id is null or r.season_id=e.season_id)
      and e.event_date is not null
      and (r.valid_from is null or e.event_date::date>=r.valid_from)
      and (r.valid_to is null or e.event_date::date<=r.valid_to)
      and e.status<>'cancelled'
      and e.verification_status in ('confirmed','expected')
  loop
    perform public.sync_broadcast_right_v1(br.id);
    v_rights := v_rights+1;
  end loop;

  return jsonb_build_object('found',true,'rights',v_rights);
end;
$$;

create or replace function public.trg_sync_broadcast_right_v1()
returns trigger
language plpgsql
security definer
set search_path=public,pg_catalog
as $$
begin
  perform public.sync_broadcast_right_v1(new.id);
  return new;
end;
$$;

create or replace function public.trg_sync_event_broadcast_rights_v1()
returns trigger
language plpgsql
security definer
set search_path=public,pg_catalog
as $$
begin
  perform public.sync_event_broadcast_rights_v1(new.id);
  return new;
end;
$$;

drop trigger if exists trg_broadcast_right_auto_propagation_v1 on public.broadcast_rights;
create trigger trg_broadcast_right_auto_propagation_v1
after insert or update of propagation_mode,coverage_type,verification_status,access_type,valid_from,valid_to,season_id,competition_id,territory_id,broadcaster_id,platform_id,source_name,source_url,last_verified_at,default_broadcast_type,default_language_codes,default_official_url,default_access_conditions,default_requires_account,default_is_free_trial
on public.broadcast_rights
for each row execute function public.trg_sync_broadcast_right_v1();

drop trigger if exists trg_event_auto_broadcast_rights_v1 on public.events;
create trigger trg_event_auto_broadcast_rights_v1
after insert or update of competition_id,season_id,event_date,scheduled_date,status,verification_status,is_published
on public.events
for each row execute function public.trg_sync_event_broadcast_rights_v1();

revoke all on function public.preview_broadcast_right_propagation_v1(uuid) from public,anon,authenticated;
revoke all on function public.sync_broadcast_right_v1(uuid) from public,anon,authenticated;
revoke all on function public.set_broadcast_right_propagation_v1(uuid,text,text) from public,anon,authenticated;
revoke all on function public.sync_event_broadcast_rights_v1(uuid) from public,anon,authenticated;

grant execute on function public.preview_broadcast_right_propagation_v1(uuid) to service_role;
grant execute on function public.sync_broadcast_right_v1(uuid) to service_role;
grant execute on function public.set_broadcast_right_propagation_v1(uuid,text,text) to service_role;
grant execute on function public.sync_event_broadcast_rights_v1(uuid) to service_role;

comment on column public.broadcast_rights.propagation_mode is
  'manual by default. auto_full is allowed only for explicitly approved confirmed full-coverage rights.';
comment on column public.event_broadcasts.propagation_locked is
  'When true, automatic right propagation must not overwrite or withdraw this event-level correction.';
comment on function public.set_broadcast_right_propagation_v1(uuid,text,text) is
  'Service-role control gate for enabling, pausing, blocking or returning a broadcast right to manual propagation.';
