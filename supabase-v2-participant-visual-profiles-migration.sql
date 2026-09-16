begin;

create table if not exists public.participant_visual_profiles (
  participant_id uuid primary key references public.participants(id) on delete cascade,
  render_family text not null check (render_family in (
    'football_shirt','basketball_jersey','hockey_sweater','gridiron_jersey',
    'racing_helmet','mma_gloves','tennis_kit','rugby_shirt','baseball_jersey','generic_kit'
  )),
  primary_color text not null default '#123A63' check (primary_color ~ '^#[0-9A-Fa-f]{6}$'),
  secondary_color text not null default '#F8FAFC' check (secondary_color ~ '^#[0-9A-Fa-f]{6}$'),
  accent_color text not null default '#2F9CFF' check (accent_color ~ '^#[0-9A-Fa-f]{6}$'),
  pattern_style text not null default 'solid' check (pattern_style in (
    'solid','center_stripe','vertical_stripes','horizontal_hoops','half_and_half',
    'sash','sleeves_contrast','side_panels','pinstripes','checker','gradient','flag_split'
  )),
  visual_status text not null default 'generated' check (visual_status in ('generated','reviewed','verified','needs_review')),
  season_label text,
  source_name text,
  source_url text check (source_url is null or source_url ~ '^https://'),
  observed_at timestamptz,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.participant_visual_profiles enable row level security;
drop policy if exists participant_visual_profiles_public_read on public.participant_visual_profiles;
create policy participant_visual_profiles_public_read
  on public.participant_visual_profiles for select to anon, authenticated using (true);
grant select on public.participant_visual_profiles to anon, authenticated;
revoke insert, update, delete on public.participant_visual_profiles from anon, authenticated;

create or replace function public.participant_visual_defaults(p_sport_slug text, p_country_code text)
returns jsonb
language sql
immutable
set search_path = public, pg_catalog
as $$
  select jsonb_build_object(
    'renderFamily', case p_sport_slug
      when 'football' then 'football_shirt'
      when 'basketball' then 'basketball_jersey'
      when 'hockey' then 'hockey_sweater'
      when 'american-football' then 'gridiron_jersey'
      when 'formula-1' then 'racing_helmet'
      when 'motogp' then 'racing_helmet'
      when 'ufc' then 'mma_gloves'
      when 'tennis' then 'tennis_kit'
      when 'rugby' then 'rugby_shirt'
      when 'baseball' then 'baseball_jersey'
      else 'generic_kit' end,
    'primaryColor', case when p_sport_slug='ufc' then case upper(coalesce(p_country_code,''))
      when 'AU' then '#012169' when 'BR' then '#009C3B' when 'US' then '#3C3B6E'
      when 'GB' then '#012169' when 'MM' then '#FECB00' when 'CA' then '#D80621'
      when 'RU' then '#FFFFFF' when 'MX' then '#006847' when 'CN' then '#DE2910'
      else '#111827' end else '#123A63' end,
    'secondaryColor', case when p_sport_slug='ufc' then case upper(coalesce(p_country_code,''))
      when 'AU' then '#E4002B' when 'BR' then '#FFDF00' when 'US' then '#B22234'
      when 'GB' then '#C8102E' when 'MM' then '#34B233' when 'CA' then '#FFFFFF'
      when 'RU' then '#0039A6' when 'MX' then '#FFFFFF' when 'CN' then '#FFDE00'
      else '#F8FAFC' end else '#F8FAFC' end,
    'accentColor', case when p_sport_slug='ufc' then case upper(coalesce(p_country_code,''))
      when 'AU' then '#FFFFFF' when 'BR' then '#002776' when 'US' then '#FFFFFF'
      when 'GB' then '#FFFFFF' when 'MM' then '#EA2839' when 'CA' then '#D80621'
      when 'RU' then '#D52B1E' when 'MX' then '#CE1126' when 'CN' then '#FFDE00'
      else '#2F9CFF' end else '#2F9CFF' end,
    'patternStyle', case when p_sport_slug='ufc' then 'flag_split' else 'solid' end
  );
$$;

create or replace function public.ensure_participant_visual_profile()
returns trigger
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  v_sport text;
  v_defaults jsonb;
begin
  select coalesce(s.public_slug,s.slug) into v_sport from public.sports s where s.id=new.sport_id;
  v_defaults := public.participant_visual_defaults(v_sport,new.country_code);

  insert into public.participant_visual_profiles(
    participant_id,render_family,primary_color,secondary_color,accent_color,pattern_style,visual_status,notes
  ) values (
    new.id,
    v_defaults->>'renderFamily',v_defaults->>'primaryColor',v_defaults->>'secondaryColor',
    v_defaults->>'accentColor',v_defaults->>'patternStyle','generated',
    'Automatic WatchTVSport visual fallback. Palette/pattern should be verified against an official current kit or team identity source.'
  )
  on conflict(participant_id) do update set
    render_family=case when participant_visual_profiles.visual_status='generated' then excluded.render_family else participant_visual_profiles.render_family end,
    primary_color=case when participant_visual_profiles.visual_status='generated' then excluded.primary_color else participant_visual_profiles.primary_color end,
    secondary_color=case when participant_visual_profiles.visual_status='generated' then excluded.secondary_color else participant_visual_profiles.secondary_color end,
    accent_color=case when participant_visual_profiles.visual_status='generated' then excluded.accent_color else participant_visual_profiles.accent_color end,
    pattern_style=case when participant_visual_profiles.visual_status='generated' then excluded.pattern_style else participant_visual_profiles.pattern_style end,
    updated_at=now();

  if not exists (
    select 1 from public.enrichment_tasks t
    where t.entity_type='participant' and t.entity_key=new.slug and t.task_kind='participant_visual_identity'
  ) then
    insert into public.enrichment_tasks(entity_type,entity_key,task_kind,status,priority,source_hint,notes)
    values('participant',new.slug,'participant_visual_identity','pending',70,
      'Official team/club/league store or official participant source',
      'Verify current primary colours and broad kit pattern. Never copy logos, sponsors or a full replica design.');
  end if;
  return new;
end;
$$;

alter table public.enrichment_tasks drop constraint if exists enrichment_tasks_task_kind_check;
alter table public.enrichment_tasks add constraint enrichment_tasks_task_kind_check check (task_kind in (
  'profile_identity','official_website','social_links','home_venue','venue_capacity','team_logo','team_hero',
  'competition_logo','venue_image','circuit_layout','fighter_photo','schedule_import','broadcast_verification',
  'participant_visual_identity'
));

drop trigger if exists participant_visual_profile_defaults on public.participants;
create trigger participant_visual_profile_defaults
after insert or update of sport_id,country_code on public.participants
for each row execute function public.ensure_participant_visual_profile();

insert into public.participant_visual_profiles(
  participant_id,render_family,primary_color,secondary_color,accent_color,pattern_style,visual_status,notes
)
select p.id,d->>'renderFamily',d->>'primaryColor',d->>'secondaryColor',d->>'accentColor',d->>'patternStyle','generated',
  'Automatic WatchTVSport visual fallback. Palette/pattern should be verified against an official current kit or team identity source.'
from public.participants p
join public.sports s on s.id=p.sport_id
cross join lateral public.participant_visual_defaults(coalesce(s.public_slug,s.slug),p.country_code) d
on conflict(participant_id) do nothing;

insert into public.enrichment_tasks(entity_type,entity_key,task_kind,status,priority,source_hint,notes)
select 'participant',p.slug,'participant_visual_identity','pending',70,
  'Official team/club/league store or official participant source',
  'Verify current primary colours and broad kit pattern. Never copy logos, sponsors or a full replica design.'
from public.participants p
where p.is_active=true
and not exists (
  select 1 from public.enrichment_tasks t
  where t.entity_type='participant' and t.entity_key=p.slug and t.task_kind='participant_visual_identity'
);

create or replace function public.get_public_participant_profile_v4(p_slug text, p_sport_slug text)
returns jsonb
language sql
stable
set search_path = public, pg_catalog
as $$
select jsonb_build_object(
  'participantId',p.id,'slug',p.slug,'name',p.name,'shortName',p.short_name,'participantType',p.participant_type,
  'sport',coalesce(s.public_slug,s.slug),'sportName',s.name,
  'profile',case when pp.participant_id is null then null else jsonb_strip_nulls(jsonb_build_object(
    'city',pp.city,'countryCode',coalesce(pp.country_code,p.country_code),'foundedYear',pp.founded_year,
    'venueName',pp.venue_name,'venueCapacity',pp.venue_capacity,'logoUrl',pp.logo_url,'heroImageUrl',pp.hero_image_url,
    'officialWebsiteUrl',pp.official_website_url,'instagramUrl',pp.instagram_url,'xUrl',pp.x_url,'facebookUrl',pp.facebook_url,
    'youtubeUrl',pp.youtube_url,'tiktokUrl',pp.tiktok_url,'summary',pp.summary,'profileStatus',pp.profile_status,'lastVerifiedAt',pp.last_verified_at
  )) end,
  'visual',case when pv.participant_id is null then null else jsonb_strip_nulls(jsonb_build_object(
    'renderFamily',pv.render_family,'primaryColor',pv.primary_color,'secondaryColor',pv.secondary_color,
    'accentColor',pv.accent_color,'patternStyle',pv.pattern_style,'visualStatus',pv.visual_status,
    'seasonLabel',pv.season_label,'sourceName',pv.source_name,'sourceUrl',pv.source_url,'observedAt',pv.observed_at
  )) end,
  'competitions',coalesce((select jsonb_agg(distinct jsonb_build_object('id',c.id,'slug',c.slug,'name',c.name))
    from public.competition_memberships cm join public.competitions c on c.id=cm.competition_id
    where cm.participant_id=p.id and cm.membership_status in ('confirmed','expected')),'[]'::jsonb),
  'sources',coalesce((select jsonb_agg(jsonb_build_object('field',cl.field_key,'sourceName',cl.source_name,'sourceUrl',cl.source_url,
    'sourceType',cl.source_type,'verifiedAt',cl.verified_at,'observedAt',cl.observed_at) order by cl.field_key)
    from public.participant_profile_claims cl where cl.participant_id=p.id and cl.is_current=true and cl.verification_status='confirmed'),'[]'::jsonb)
)
from public.participants p
join public.sports s on s.id=p.sport_id
left join public.participant_profiles pp on pp.participant_id=p.id and pp.profile_status in ('partial','verified')
left join public.participant_visual_profiles pv on pv.participant_id=p.id
where p.slug=p_slug and (s.slug=p_sport_slug or s.public_slug=p_sport_slug) and p.is_active=true
limit 1;
$$;

grant execute on function public.get_public_participant_profile_v4(text,text) to anon, authenticated;

commit;
