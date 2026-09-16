begin;

create or replace function public.get_public_ufc_card_v3(p_event_slug text)
returns jsonb
language sql
stable
set search_path = public, pg_catalog
as $$
with target as (
  select ep.id page_id,ee.id edition_id,ee.venue_id
  from public.event_pages ep
  join public.event_editions ee on ee.event_page_id=ep.id
  join public.sports s on s.id=ep.sport_id
  where s.slug='ufc' and ep.slug=p_event_slug
  order by ee.start_date desc nulls last limit 1
), bout_data as (
  select jsonb_agg(jsonb_strip_nulls(jsonb_build_object(
    'id',b.id,
    'segment',b.card_segment,
    'order',b.bout_order,
    'weightClass',b.weight_class,
    'titleBout',b.title_bout,
    'fighter1',jsonb_build_object(
      'slug',p1.slug,
      'name',p1.name,
      'countryCode',coalesce(b.fighter1_country_code,p1.country_code),
      'photo',public.get_primary_media_asset_v2('fighter',p1.slug,'fighter_photo'),
      'visualProfile',case when v1.participant_id is null then null else jsonb_strip_nulls(jsonb_build_object(
        'renderFamily',v1.render_family,'primaryColor',v1.primary_color,'secondaryColor',v1.secondary_color,
        'accentColor',v1.accent_color,'patternStyle',v1.pattern_style,'visualStatus',v1.visual_status,
        'seasonLabel',v1.season_label,'sourceName',v1.source_name,'sourceUrl',v1.source_url,'observedAt',v1.observed_at
      )) end
    ),
    'fighter2',jsonb_build_object(
      'slug',p2.slug,
      'name',p2.name,
      'countryCode',coalesce(b.fighter2_country_code,p2.country_code),
      'photo',public.get_primary_media_asset_v2('fighter',p2.slug,'fighter_photo'),
      'visualProfile',case when v2.participant_id is null then null else jsonb_strip_nulls(jsonb_build_object(
        'renderFamily',v2.render_family,'primaryColor',v2.primary_color,'secondaryColor',v2.secondary_color,
        'accentColor',v2.accent_color,'patternStyle',v2.pattern_style,'visualStatus',v2.visual_status,
        'seasonLabel',v2.season_label,'sourceName',v2.source_name,'sourceUrl',v2.source_url,'observedAt',v2.observed_at
      )) end
    ),
    'sourceName',b.source_name,
    'sourceUrl',b.source_url,
    'verifiedAt',b.verified_at
  )) order by case b.card_segment when 'main_card' then 1 when 'prelims' then 2 else 3 end,b.bout_order) as bouts
  from target t
  join public.ufc_fight_bouts b on b.event_edition_id=t.edition_id and b.verification_status='confirmed'
  join public.participants p1 on p1.id=b.fighter1_id
  join public.participants p2 on p2.id=b.fighter2_id
  left join public.participant_visual_profiles v1 on v1.participant_id=p1.id
  left join public.participant_visual_profiles v2 on v2.participant_id=p2.id
), venue_data as (
 select jsonb_strip_nulls(jsonb_build_object(
   'id',v.id,'slug',v.slug,'name',v.name,'city',v.city,'countryCode',v.country_code,'capacity',v.capacity,
   'image',public.get_primary_media_asset_v2('venue',v.slug,'venue_image'),'sourceName',v.source_name,'sourceUrl',v.source_url,'verifiedAt',v.last_verified_at
 )) as venue
 from target t
 left join public.venues v on v.id=t.venue_id and v.verification_status='confirmed'
)
select jsonb_build_object('bouts',coalesce((select bouts from bout_data),'[]'::jsonb),'venue',(select venue from venue_data));
$$;

grant execute on function public.get_public_ufc_card_v3(text) to anon, authenticated;

commit;
