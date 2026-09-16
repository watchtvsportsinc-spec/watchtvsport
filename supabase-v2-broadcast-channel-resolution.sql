-- WatchTVSport V2 event-level broadcast channel resolution.
--
-- A competition-level full-coverage right proves that an event is available
-- through a rights holder. It does NOT prove the exact simultaneous linear
-- channel/feed (beIN Sports 1/2/3, DAZN 1/2, etc.).
--
-- Rules:
--   * auto_full materialization is rights-holder-only and never assigns a
--     platform/sub-channel;
--   * exact channels require event-level evidence;
--   * an exact confirmed channel suppresses the generic holder-only fallback;
--   * if the exact assignment is withdrawn, the eligible generic fallback can
--     be restored by the rights sync.

alter table public.event_broadcasts
  add column if not exists channel_resolution_status text not null default 'legacy_unknown',
  add column if not exists channel_source_name text,
  add column if not exists channel_source_url text,
  add column if not exists channel_external_id text;

do $$ begin
  if not exists (
    select 1 from pg_constraint
    where conrelid='public.event_broadcasts'::regclass
      and conname='event_broadcasts_channel_resolution_status_check'
  ) then
    alter table public.event_broadcasts
      add constraint event_broadcasts_channel_resolution_status_check
      check (channel_resolution_status in ('legacy_unknown','holder_only','event_confirmed','manual_confirmed'));
  end if;
end $$;

do $$ begin
  if not exists (
    select 1 from pg_constraint
    where conrelid='public.event_broadcasts'::regclass
      and conname='event_broadcasts_holder_only_shape_check'
  ) then
    alter table public.event_broadcasts
      add constraint event_broadcasts_holder_only_shape_check
      check (
        channel_resolution_status <> 'holder_only'
        or (propagation_origin='auto_right' and platform_id is null)
      );
  end if;
end $$;

do $$ begin
  if not exists (
    select 1 from pg_constraint
    where conrelid='public.event_broadcasts'::regclass
      and conname='event_broadcasts_event_channel_evidence_check'
  ) then
    alter table public.event_broadcasts
      add constraint event_broadcasts_event_channel_evidence_check
      check (
        channel_resolution_status <> 'event_confirmed'
        or (
          platform_id is not null
          and nullif(trim(channel_source_name),'') is not null
          and nullif(trim(channel_source_url),'') is not null
        )
      );
  end if;
end $$;

update public.event_broadcasts
set channel_resolution_status='holder_only',
    platform_id=null
where propagation_origin='auto_right';

create index if not exists ix_event_broadcasts_channel_resolution
  on public.event_broadcasts(event_id,territory_id,broadcaster_id,channel_resolution_status,is_published);

create or replace function public.validate_event_channel_assignment_v1()
returns trigger
language plpgsql
security definer
set search_path=public,pg_catalog
as $$
declare
  v_platform_broadcaster uuid;
begin
  if new.channel_resolution_status in ('event_confirmed','manual_confirmed') and new.platform_id is not null then
    select broadcaster_id into v_platform_broadcaster
    from public.platforms
    where id=new.platform_id;

    if v_platform_broadcaster is null then
      raise exception 'Exact channel platform % does not exist', new.platform_id;
    end if;
    if v_platform_broadcaster <> new.broadcaster_id then
      raise exception 'Exact channel platform belongs to a different broadcaster';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_validate_event_channel_assignment_v1 on public.event_broadcasts;
create trigger trg_validate_event_channel_assignment_v1
before insert or update of broadcaster_id,platform_id,channel_resolution_status
on public.event_broadcasts
for each row execute function public.validate_event_channel_assignment_v1();

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
    propagation_origin,propagation_locked,propagated_at,updated_at,
    channel_resolution_status,channel_source_name,channel_source_url,channel_external_id
  )
  select
    e.id,r.id,r.territory_id,r.broadcaster_id,null,
    'included',r.access_type,v_url,r.default_language_codes,r.source_name,r.source_url,
    r.last_verified_at,
    case when e.verification_status='confirmed' then 'confirmed' else 'expected' end,
    (
      e.is_published=true
      and e.verification_status='confirmed'
      and not exists (
        select 1
        from public.event_broadcasts exact
        where exact.event_id=e.id
          and exact.territory_id=r.territory_id
          and exact.broadcaster_id=r.broadcaster_id
          and exact.decision='included'
          and exact.is_published=true
          and exact.verification_status='confirmed'
          and exact.channel_resolution_status in ('event_confirmed','manual_confirmed')
      )
    ),
    case when e.is_published=true and e.verification_status='confirmed'
      and not exists (
        select 1
        from public.event_broadcasts exact
        where exact.event_id=e.id
          and exact.territory_id=r.territory_id
          and exact.broadcaster_id=r.broadcaster_id
          and exact.decision='included'
          and exact.is_published=true
          and exact.verification_status='confirmed'
          and exact.channel_resolution_status in ('event_confirmed','manual_confirmed')
      )
      then now() else null end,
    'Full-coverage right confirmed at rights-holder level. Exact event channel/feed not yet resolved.',
    r.default_broadcast_type,r.default_access_conditions,r.default_requires_account,r.default_is_free_trial,
    'auto_right',false,now(),now(),
    'holder_only',null,null,null
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
      channel_resolution_status='holder_only',
      platform_id=null,
      channel_source_name=null,
      channel_source_url=null,
      channel_external_id=null,
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

create or replace function public.reconcile_event_channel_resolution_v1(
  p_event_id uuid,
  p_broadcaster_id uuid,
  p_territory_id uuid
)
returns void
language plpgsql
security definer
set search_path=public,pg_catalog
as $$
declare
  v_has_exact boolean;
begin
  select exists (
    select 1
    from public.event_broadcasts eb
    where eb.event_id=p_event_id
      and eb.broadcaster_id=p_broadcaster_id
      and eb.territory_id=p_territory_id
      and eb.decision='included'
      and eb.is_published=true
      and eb.verification_status='confirmed'
      and eb.channel_resolution_status in ('event_confirmed','manual_confirmed')
  ) into v_has_exact;

  if v_has_exact then
    update public.event_broadcasts eb
    set is_published=false,
        published_at=null,
        propagated_at=now(),
        updated_at=now()
    where eb.event_id=p_event_id
      and eb.broadcaster_id=p_broadcaster_id
      and eb.territory_id=p_territory_id
      and eb.propagation_origin='auto_right'
      and eb.channel_resolution_status='holder_only'
      and eb.propagation_locked=false
      and eb.is_published=true;
  else
    perform public.sync_event_broadcast_rights_v1(p_event_id);
  end if;
end;
$$;

create or replace function public.trg_reconcile_event_channel_resolution_v1()
returns trigger
language plpgsql
security definer
set search_path=public,pg_catalog
as $$
begin
  if tg_op='DELETE' then
    if old.channel_resolution_status in ('event_confirmed','manual_confirmed') then
      perform public.reconcile_event_channel_resolution_v1(old.event_id,old.broadcaster_id,old.territory_id);
    end if;
    return old;
  end if;

  if new.channel_resolution_status in ('event_confirmed','manual_confirmed')
     or (tg_op='UPDATE' and old.channel_resolution_status in ('event_confirmed','manual_confirmed')) then
    perform public.reconcile_event_channel_resolution_v1(new.event_id,new.broadcaster_id,new.territory_id);
  end if;
  return new;
end;
$$;

drop trigger if exists trg_reconcile_event_channel_resolution_v1 on public.event_broadcasts;
create trigger trg_reconcile_event_channel_resolution_v1
after insert or delete or update of is_published,verification_status,decision,channel_resolution_status,platform_id,broadcaster_id,territory_id
on public.event_broadcasts
for each row execute function public.trg_reconcile_event_channel_resolution_v1();

revoke all on function public.validate_event_channel_assignment_v1() from public,anon,authenticated;
revoke all on function public.reconcile_event_channel_resolution_v1(uuid,uuid,uuid) from public,anon,authenticated;
revoke all on function public.trg_reconcile_event_channel_resolution_v1() from public,anon,authenticated;

grant execute on function public.reconcile_event_channel_resolution_v1(uuid,uuid,uuid) to service_role;

comment on column public.event_broadcasts.channel_resolution_status is
  'holder_only means a competition-level full-coverage right confirms the rights holder but NOT the exact event channel/feed. event_confirmed requires event-level evidence.';
comment on column public.event_broadcasts.channel_external_id is
  'Provider station/channel identifier for the event-level assignment (for example a Sportmonks TV station id).';
