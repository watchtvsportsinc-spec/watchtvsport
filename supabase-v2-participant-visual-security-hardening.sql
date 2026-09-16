begin;

-- This function is invoked only by the participants table trigger. It must not
-- be directly callable through PostgREST by anonymous or signed-in users.
revoke execute on function public.ensure_participant_visual_profile() from public, anon, authenticated;

commit;
