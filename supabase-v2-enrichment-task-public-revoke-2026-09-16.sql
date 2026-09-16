begin;

-- Internal enrichment queue: RLS already returned no rows, but the historic
-- SELECT grant still exposed an unnecessary PostgREST endpoint to public roles.
revoke select on table public.enrichment_tasks from public, anon, authenticated;

commit;
