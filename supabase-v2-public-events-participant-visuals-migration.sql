begin;

create or replace function public.get_public_events_v3()
returns jsonb
language sql
stable
set search_path = public, pg_catalog
as $$
  select jsonb_build_object(
    'schemaVersion',1,
    'generatedAt',statement_timestamp(),
    'events',coalesce(jsonb_agg(event_record.payload order by event_record.event_date,event_record.event_id),'[]'::jsonb)
  )
  from (
    select e.id event_id,e.event_date,
      jsonb_strip_nulls(jsonb_build_object(
        'id',e.id::text,
        'slug',e.slug,
        'detailPath',coalesce(event_url.url_path,'/event/'||e.slug),
        'sport',coalesce(s.public_slug,s.slug),
        'competition',c.name,
        'competitionSlug',c.slug,
        'stage',e.phase,
        'group',e.group_name,
        'eventDate',e.event_date,
        'status',case
          when e.status in ('scheduled','live','finished') then e.status
          when e.status in ('postponed','reported') then 'scheduled'
          when e.status='cancelled' then 'finished'
          else 'scheduled' end,
        'participant1',case when hp.id is null then null else jsonb_strip_nulls(jsonb_build_object(
          'id',hp.id::text,
          'name',hp.name,
          'shortName',hp.short_name,
          'type',case hp.participant_type when 'country' then 'national_team' when 'national_team' then 'national_team' when 'individual' then 'player' else 'club' end,
          'visualType',case hp.participant_type when 'country' then 'flag' when 'national_team' then 'flag' when 'individual' then 'player' else 'crest' end,
          'visual',coalesce(hp.country_code,hp.short_name,''),
          'countryCode',hp.country_code,
          'logoUrl',hm.storage_url,
          'visualProfile',case when hpv.participant_id is null then null else jsonb_strip_nulls(jsonb_build_object(
            'renderFamily',hpv.render_family,
            'primaryColor',hpv.primary_color,
            'secondaryColor',hpv.secondary_color,
            'accentColor',hpv.accent_color,
            'patternStyle',hpv.pattern_style,
            'visualStatus',hpv.visual_status,
            'seasonLabel',hpv.season_label,
            'sourceName',hpv.source_name,
            'sourceUrl',hpv.source_url,
            'observedAt',hpv.observed_at
          )) end
        )) end,
        'participant2',case when ap.id is null then null else jsonb_strip_nulls(jsonb_build_object(
          'id',ap.id::text,
          'name',ap.name,
          'shortName',ap.short_name,
          'type',case ap.participant_type when 'country' then 'national_team' when 'national_team' then 'national_team' when 'individual' then 'player' else 'club' end,
          'visualType',case ap.participant_type when 'country' then 'flag' when 'national_team' then 'flag' when 'individual' then 'player' else 'crest' end,
          'visual',coalesce(ap.country_code,ap.short_name,''),
          'countryCode',ap.country_code,
          'logoUrl',am.storage_url,
          'visualProfile',case when apv.participant_id is null then null else jsonb_strip_nulls(jsonb_build_object(
            'renderFamily',apv.render_family,
            'primaryColor',apv.primary_color,
            'secondaryColor',apv.secondary_color,
            'accentColor',apv.accent_color,
            'patternStyle',apv.pattern_style,
            'visualStatus',apv.visual_status,
            'seasonLabel',apv.season_label,
            'sourceName',apv.source_name,
            'sourceUrl',apv.source_url,
            'observedAt',apv.observed_at
          )) end
        )) end,
        'title',case when hp.id is not null and ap.id is not null then hp.name||' vs '||ap.name else initcap(replace(e.slug,'-',' ')) end,
        'venue',coalesce(v.name,e.venue_name),
        'country',v.country_code,
        'broadcasts',coalesce(pb.payload,'[]'::jsonb)
      )) payload
    from public.events e
    join public.sports s on s.id=e.sport_id
    join public.competitions c on c.id=e.competition_id
    left join public.participants hp on hp.id=e.home_participant_id
    left join public.participants ap on ap.id=e.away_participant_id
    left join public.participant_visual_profiles hpv on hpv.participant_id=hp.id
    left join public.participant_visual_profiles apv on apv.participant_id=ap.id
    left join public.venues v on v.id=e.venue_id
    left join lateral (
      select u.url_path from public.event_urls u
      where u.event_id=e.id and u.kind='canonical' and u.is_active=true
      order by u.created_at,u.id limit 1
    ) event_url on true
    left join lateral (
      select ma.storage_url from public.media_assets ma
      where ma.entity_type='participant' and ma.entity_key=hp.slug and ma.asset_kind='team_logo'
        and ma.verification_status='approved' and ma.is_current=true
      order by ma.verified_at desc nulls last limit 1
    ) hm on true
    left join lateral (
      select ma.storage_url from public.media_assets ma
      where ma.entity_type='participant' and ma.entity_key=ap.slug and ma.asset_kind='team_logo'
        and ma.verification_status='approved' and ma.is_current=true
      order by ma.verified_at desc nulls last limit 1
    ) am on true
    left join lateral (
      select jsonb_agg(x.payload order by x.country_name,x.broadcaster) payload
      from (
        select t.name country_name,coalesce(pl.name,b.name) broadcaster,
          jsonb_strip_nulls(jsonb_build_object(
            'countryCode',lower(t.code),'countryName',t.name,'broadcaster',coalesce(pl.name,b.name),
            'access',eb.access_type,'url',coalesce(eb.official_url,pl.url,b.website_url),
            'sourceName',coalesce(eb.source_name,br.source_name),'sourceUrl',coalesce(eb.source_url,br.source_url),
            'lastChecked',eb.last_verified_at,'coverageType',coalesce(br.coverage_type,'unknown'),
            'coverageStatus','confirmed','broadcastType',eb.broadcast_type,'accessConditions',eb.access_conditions,
            'requiresAccount',eb.requires_account,'isFreeTrial',eb.is_free_trial,'notes',eb.notes
          )) payload
        from public.event_broadcasts eb
        join public.territories t on t.id=eb.territory_id
        join public.broadcasters b on b.id=eb.broadcaster_id
        left join public.platforms pl on pl.id=eb.platform_id
        left join public.broadcast_rights br on br.id=eb.broadcast_right_id
        where eb.event_id=e.id and eb.is_published=true and eb.verification_status='confirmed'
          and eb.decision='included' and eb.access_type in ('Free','Paid')
          and coalesce(eb.official_url,pl.url,b.website_url) ~ '^https://'
        limit 300
      ) x
    ) pb on true
    where e.is_published=true and e.verification_status='confirmed' and e.event_date is not null
    order by e.event_date,e.id
    limit 2500
  ) event_record;
$$;

grant execute on function public.get_public_events_v3() to anon, authenticated;

commit;
