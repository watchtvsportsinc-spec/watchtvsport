begin;

-- Expose only the narrow, reviewed competition-rights projection required by
-- match pages. Raw broadcast_rights stays protected by RLS and has no public
-- SELECT policy.
create or replace function public.get_public_competition_broadcast_rights_v1(
  p_sport_slug text,
  p_competition_slug text,
  p_event_date timestamptz default null
)
returns table (
  country_code text,
  country_name text,
  broadcaster text,
  rights_holder text,
  access_type text,
  coverage_type text,
  official_url text,
  source_name text,
  source_url text,
  last_verified_at timestamptz
)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select
    lower(t.code) as country_code,
    t.name as country_name,
    coalesce(p.name, b.name) as broadcaster,
    b.name as rights_holder,
    coalesce(br.access_type, 'Unknown') as access_type,
    br.coverage_type,
    coalesce(br.default_official_url, p.url, b.website_url) as official_url,
    br.source_name,
    br.source_url,
    br.last_verified_at
  from public.broadcast_rights br
  join public.competitions c on c.id = br.competition_id
  join public.sports s on s.id = c.sport_id
  join public.territories t on t.id = br.territory_id
  join public.broadcasters b on b.id = br.broadcaster_id
  left join public.platforms p on p.id = br.platform_id
  where s.slug = lower(trim(p_sport_slug))
    and c.slug = lower(trim(p_competition_slug))
    and br.verification_status = 'confirmed'
    and br.is_published = true
    and br.source_url is not null
    and (p_event_date is null or br.valid_from is null or br.valid_from <= p_event_date::date)
    and (p_event_date is null or br.valid_to is null or br.valid_to >= p_event_date::date)
  order by t.name, coalesce(p.name, b.name), br.id
  limit 100;
$$;

revoke all on function public.get_public_competition_broadcast_rights_v1(text, text, timestamptz) from public;
grant execute on function public.get_public_competition_broadcast_rights_v1(text, text, timestamptz) to anon, authenticated;

comment on function public.get_public_competition_broadcast_rights_v1(text, text, timestamptz)
is 'Returns a narrow public view of published verified competition-level broadcast rights. These rows do not assert that a specific event is confirmed on the listed service.';

-- Publish the already-reviewed priority rights that power the first version of
-- the competition-level fallback panel.
update public.broadcast_rights br
set is_published = true,
    published_at = coalesce(br.published_at, now()),
    updated_at = now()
from public.competitions c
join public.sports s on s.id = c.sport_id
where br.competition_id = c.id
  and br.verification_status = 'confirmed'
  and br.source_url is not null
  and (
    (s.slug = 'football' and c.slug = 'champions-league')
    or (s.slug = 'formula-1' and c.slug = 'formula-1')
    or (s.slug = 'ufc' and c.slug = 'ufc')
  );

commit;
