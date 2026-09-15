-- V2 public event reader: preserves strict verified-only media and explicit team participants.
-- Media is never exposed until media_assets.verification_status = 'approved'.

create or replace function public.get_public_events_v2()
returns jsonb
language sql
stable
set search_path to 'public','pg_catalog'
as $function$
  select jsonb_build_object(
    'schemaVersion', 1,
    'generatedAt', statement_timestamp(),
    'events', coalesce(jsonb_agg(event_record.payload order by event_record.event_date,event_record.event_id),'[]'::jsonb)
  )
  from (
    select e.id as event_id,e.event_date,
      jsonb_strip_nulls(jsonb_build_object(
        'id',e.id::text,
        'slug',e.slug,
        'detailPath',case when page_url.url_path is not null then page_url.url_path || case when e.event_kind='session' then '#' || regexp_replace(e.slug,'^' || event_page.slug || '-','') else '' end when event_url.url_path is not null then event_url.url_path else '/event/' || e.slug end,
        'sport',s.slug,'competition',c.name,'competitionSlug',c.slug,'competitionLogoUrl',competition_media.storage_url,
        'stage',e.phase,'group',e.group_name,'eventDate',e.event_date,
        'status',case when e.status in ('scheduled','live','finished') then e.status when e.status in ('postponed','reported') then 'scheduled' when e.status='cancelled' then 'finished' else 'scheduled' end,
        'participant1',case when home_participant.id is null then null else jsonb_strip_nulls(jsonb_build_object(
          'id',home_participant.id::text,'name',home_participant.name,'shortName',home_participant.short_name,
          'type',case home_participant.participant_type when 'country' then 'national_team' when 'individual' then 'player' when 'club' then 'club' when 'team' then 'team' else 'club' end,
          'visualType',case home_participant.participant_type when 'country' then 'flag' when 'individual' then 'player' when 'club' then 'crest' when 'team' then 'crest' else 'generic' end,
          'visual',coalesce(home_participant.country_code,home_participant.short_name,''),'logoUrl',home_media.storage_url)) end,
        'participant2',case when away_participant.id is null then null else jsonb_strip_nulls(jsonb_build_object(
          'id',away_participant.id::text,'name',away_participant.name,'shortName',away_participant.short_name,
          'type',case away_participant.participant_type when 'country' then 'national_team' when 'individual' then 'player' when 'club' then 'club' when 'team' then 'team' else 'club' end,
          'visualType',case away_participant.participant_type when 'country' then 'flag' when 'individual' then 'player' when 'club' then 'crest' when 'team' then 'crest' else 'generic' end,
          'visual',coalesce(away_participant.country_code,away_participant.short_name,''),'logoUrl',away_media.storage_url)) end,
        'title',coalesce(event_page.title,case when home_participant.id is not null and away_participant.id is not null then home_participant.name || ' vs ' || away_participant.name else initcap(replace(e.slug,'-',' ')) end),
        'eventGroupId',case when event_page.entity_kind in ('race_weekend','fight_card') then event_page.id::text else null end,
        'eventGroupName',case when event_page.entity_kind in ('race_weekend','fight_card') then event_page.title else null end,
        'eventGroupSlug',case when event_page.entity_kind in ('race_weekend','fight_card') then event_page.slug else null end,
        'eventEditionKey',event_edition.edition_key,'eventEditionLabel',event_edition.label,'sessionType',e.session_type,
        'sequenceNumber',coalesce(e.session_order,e.sequence_number),'venueId',e.venue_id::text,
        'venue',coalesce(v.name,e.venue_name,event_edition.venue_name),'venueImageUrl',venue_media.storage_url,
        'country',coalesce(v.country_code,event_edition.country_code),'broadcasts',coalesce(public_broadcasts.payload,'[]'::jsonb)
      )) as payload
    from public.events e
    join public.sports s on s.id=e.sport_id
    left join public.competitions c on c.id=e.competition_id
    left join public.participants home_participant on home_participant.id=e.home_participant_id
    left join public.participants away_participant on away_participant.id=e.away_participant_id
    left join public.event_pages event_page on event_page.id=e.event_page_id
    left join public.event_editions event_edition on event_edition.id=e.event_edition_id
    left join public.venues v on v.id=e.venue_id
    left join lateral (select u.url_path from public.event_page_urls u where u.event_page_id=e.event_page_id and u.kind='canonical' and u.is_active=true order by u.created_at,u.id limit 1) page_url on true
    left join lateral (select u.url_path from public.event_urls u where u.event_id=e.id and u.kind='canonical' and u.is_active=true order by u.created_at,u.id limit 1) event_url on true
    left join lateral (select ma.storage_url from public.media_assets ma where ma.entity_type='competition' and ma.entity_key=c.slug and ma.asset_kind in ('competition_logo','league_logo') and ma.verification_status='approved' and ma.is_current=true and ma.storage_url ~ '^https://' order by ma.verified_at desc nulls last,ma.created_at desc limit 1) competition_media on true
    left join lateral (select ma.storage_url from public.media_assets ma where ma.entity_type='participant' and ma.entity_key=home_participant.slug and ma.asset_kind='team_logo' and ma.verification_status='approved' and ma.is_current=true and ma.storage_url ~ '^https://' order by ma.verified_at desc nulls last,ma.created_at desc limit 1) home_media on true
    left join lateral (select ma.storage_url from public.media_assets ma where ma.entity_type='participant' and ma.entity_key=away_participant.slug and ma.asset_kind='team_logo' and ma.verification_status='approved' and ma.is_current=true and ma.storage_url ~ '^https://' order by ma.verified_at desc nulls last,ma.created_at desc limit 1) away_media on true
    left join lateral (select ma.storage_url from public.media_assets ma where ma.entity_type='venue' and ma.entity_key=v.slug and ma.asset_kind='venue_image' and ma.verification_status='approved' and ma.is_current=true and ma.storage_url ~ '^https://' order by ma.verified_at desc nulls last,ma.created_at desc limit 1) venue_media on true
    left join lateral (
      select jsonb_agg(offer.payload order by offer.territory_name,offer.broadcaster_name,offer.broadcast_type,offer.offer_id) as payload
      from (
        select eb.id as offer_id,t.name as territory_name,coalesce(p.name,b.name) as broadcaster_name,eb.broadcast_type,
          jsonb_strip_nulls(jsonb_build_object('countryCode',lower(t.code),'countryName',t.name,'broadcaster',coalesce(p.name,b.name),'access',eb.access_type,'url',coalesce(eb.official_url,p.url,b.website_url),'affiliateUrl',case when eb.affiliate_url ~ '^https://' then eb.affiliate_url else null end,'sourceName',coalesce(eb.source_name,br.source_name),'sourceUrl',case when coalesce(eb.source_url,br.source_url) ~ '^https://' then coalesce(eb.source_url,br.source_url) else null end,'lastChecked',eb.last_verified_at,'commentaryLanguages',eb.language_codes,'coverageType',coalesce(br.coverage_type,'unknown'),'coverageStatus','confirmed','broadcastType',eb.broadcast_type,'accessConditions',eb.access_conditions,'requiresAccount',eb.requires_account,'isFreeTrial',eb.is_free_trial,'notes',eb.notes)) as payload
        from public.event_broadcasts eb
        join public.territories t on t.id=eb.territory_id join public.broadcasters b on b.id=eb.broadcaster_id
        left join public.platforms p on p.id=eb.platform_id left join public.broadcast_rights br on br.id=eb.broadcast_right_id
        where eb.event_id=e.id and eb.is_published=true and eb.verification_status='confirmed' and eb.decision='included' and eb.access_type in ('Free','Paid') and coalesce(eb.official_url,p.url,b.website_url) ~ '^https://'
        order by t.name,coalesce(p.name,b.name),eb.broadcast_type,eb.id limit 301
      ) offer
    ) public_broadcasts on true
    where e.is_published=true and e.verification_status='confirmed' and e.event_date is not null and c.id is not null
    order by e.event_date,e.id limit 2501
  ) event_record;
$function$;
