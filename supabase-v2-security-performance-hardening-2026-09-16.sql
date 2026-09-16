begin;

-- Internal trigger functions are not public RPCs. Keep SECURITY DEFINER for
-- trigger execution, but remove direct execution from exposed API roles.
revoke execute on function public.apply_confirmed_participant_profile_claim() from public, anon, authenticated;
revoke execute on function public.ensure_participant_profile_row() from public, anon, authenticated;

-- The audit view should use the caller's permissions/RLS instead of the view
-- owner's privileges.
alter view public.participant_profile_audit set (security_invoker = true);

-- Lock relationship-validation trigger helpers to a deterministic search_path.
alter function public.validate_event_relationships() set search_path = public, pg_catalog;
alter function public.validate_broadcast_rights_relationships() set search_path = public, pg_catalog;
alter function public.validate_event_broadcast_relationships() set search_path = public, pg_catalog;

-- Avoid re-evaluating auth.uid() for every row in the review member policy.
drop policy if exists review_member_self on watchtvsport_review.members;
create policy review_member_self
on watchtvsport_review.members
for select
to authenticated
using (user_id = (select auth.uid()));

-- Country pages filter confirmed public listings by territory. Existing indexes
-- are event-first; this territory-first partial index avoids scanning all public
-- broadcasts as the dataset grows.
create index if not exists ix_event_broadcasts_country_public
on public.event_broadcasts (territory_id, event_id)
where is_published = true
  and verification_status = 'confirmed'
  and decision = 'included'
  and access_type in ('Free', 'Paid');

commit;
