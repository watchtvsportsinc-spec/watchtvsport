-- Automatically enrol team participants and promote confirmed sourced facts into public profiles.

create or replace function public.ensure_participant_profile_row()
returns trigger language plpgsql security definer set search_path=public as $$
begin
  if new.participant_type in ('club','team','franchise','national_team') then
    insert into public.participant_profiles(participant_id,country_code)
    values(new.id,new.country_code)
    on conflict(participant_id) do update
      set country_code=coalesce(participant_profiles.country_code,excluded.country_code), updated_at=now();
  end if;
  return new;
end;
$$;

drop trigger if exists trg_ensure_participant_profile_row on public.participants;
create trigger trg_ensure_participant_profile_row
after insert or update of participant_type,country_code on public.participants
for each row execute function public.ensure_participant_profile_row();

create or replace function public.apply_confirmed_participant_profile_claim()
returns trigger language plpgsql security definer set search_path=public as $$
declare confirmed_count int;
begin
  if new.verification_status <> 'confirmed' or new.is_current <> true then return new; end if;

  update public.participant_profile_claims set is_current=false
   where participant_id=new.participant_id and field_key=new.field_key and id<>new.id and is_current=true;

  insert into public.participant_profiles(participant_id) values(new.participant_id)
  on conflict(participant_id) do nothing;

  update public.participant_profiles set
    city=case when new.field_key='city' then new.value_text else city end,
    country_code=case when new.field_key='country_code' then new.value_text else country_code end,
    founded_year=case when new.field_key='founded_year' then new.value_number::int else founded_year end,
    venue_name=case when new.field_key='venue_name' then new.value_text else venue_name end,
    venue_capacity=case when new.field_key='venue_capacity' then new.value_number::int else venue_capacity end,
    logo_url=case when new.field_key='logo_url' then new.value_text else logo_url end,
    hero_image_url=case when new.field_key='hero_image_url' then new.value_text else hero_image_url end,
    official_website_url=case when new.field_key='official_website_url' then new.value_text else official_website_url end,
    instagram_url=case when new.field_key='instagram_url' then new.value_text else instagram_url end,
    x_url=case when new.field_key='x_url' then new.value_text else x_url end,
    facebook_url=case when new.field_key='facebook_url' then new.value_text else facebook_url end,
    youtube_url=case when new.field_key='youtube_url' then new.value_text else youtube_url end,
    tiktok_url=case when new.field_key='tiktok_url' then new.value_text else tiktok_url end,
    summary=case when new.field_key='summary' then new.value_text else summary end,
    last_verified_at=greatest(coalesce(last_verified_at,'epoch'::timestamptz),coalesce(new.verified_at,new.observed_at)),
    next_review_at=now()+interval '90 days', updated_at=now()
  where participant_id=new.participant_id;

  select count(*) into confirmed_count from public.participant_profile_claims
   where participant_id=new.participant_id and verification_status='confirmed' and is_current=true;
  update public.participant_profiles set profile_status=case when confirmed_count>=6 then 'verified' else 'partial' end
   where participant_id=new.participant_id;
  return new;
end;
$$;

drop trigger if exists trg_apply_confirmed_participant_profile_claim on public.participant_profile_claims;
create trigger trg_apply_confirmed_participant_profile_claim
after insert or update of verification_status,is_current,value_text,value_number,value_json on public.participant_profile_claims
for each row execute function public.apply_confirmed_participant_profile_claim();
