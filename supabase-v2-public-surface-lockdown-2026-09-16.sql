begin;

-- Public catalogue tables are intentionally readable through RLS, but historic
-- grants from early V2 migrations must not imply write capabilities. RLS already
-- denied these writes; revoking the grants makes least privilege explicit.
revoke insert, update, delete on table
  public.competition_memberships,
  public.enrichment_tasks,
  public.media_assets,
  public.participant_profile_claims,
  public.participant_profiles,
  public.ufc_fight_bouts,
  public.venues
from public, anon, authenticated;

-- Internal audit data is not part of the website's public contract.
revoke all privileges on table public.participant_profile_audit
from public, anon, authenticated;

-- Trigger helpers are internal implementation details, never public RPCs.
revoke execute on function public.apply_confirmed_participant_profile_claim() from public, anon, authenticated;
revoke execute on function public.enqueue_competition_metadata_task() from public, anon, authenticated;
revoke execute on function public.ensure_participant_profile_row() from public, anon, authenticated;
revoke execute on function public.ensure_participant_visual_profile() from public, anon, authenticated;
revoke execute on function public.set_v2_ingestion_updated_at() from public, anon, authenticated;
revoke execute on function public.validate_broadcast_rights_relationships() from public, anon, authenticated;
revoke execute on function public.validate_event_against_sport_model() from public, anon, authenticated;
revoke execute on function public.validate_event_broadcast_relationships() from public, anon, authenticated;
revoke execute on function public.validate_event_edition_relationships() from public, anon, authenticated;
revoke execute on function public.validate_event_page_relationships() from public, anon, authenticated;
revoke execute on function public.validate_event_participant_relationships() from public, anon, authenticated;
revoke execute on function public.validate_event_relationships() from public, anon, authenticated;
revoke execute on function public.validate_event_v2_relationships() from public, anon, authenticated;
revoke execute on function public.validate_multisport_event_page_shape() from public, anon, authenticated;
revoke execute on function public.validate_source_scope_relationships() from public, anon, authenticated;

commit;
