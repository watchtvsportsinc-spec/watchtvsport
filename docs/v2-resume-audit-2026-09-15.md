# V2 resumption audit - 2026-09-15

## Scope and safety boundary

Work only on `work/v2-expansion-assets-leagues`. Do not merge to `main`, promote a deployment, change production settings, or execute database writes.

Starting branch commit: `3ee1b20f185ef5cd75584fe46bb062439a99d706`.
Observed `main` commit: `f9bdd2eaa6b0203941b3b94ab770061eb84ae967`.
No other branch is modified by this change.

The Vercel connection returned no teams and could not list the team referenced by the GitHub status. Production project/environment wiring is therefore **not verified**. Supabase remains read-only. `vercel.json` disables automatic Git deployments for this exact work branch only; other branches retain their existing default behavior. No manual deployment is requested. Remove that entry only after identifying and explicitly choosing an isolated preview target.

## Observed GitHub state

The starting commit already contains verified media in the public-event contract and Grand Prix circuit asset lookup. Its `Validate V2 build` workflow succeeded (run `34978998186`, 2026-09-15). Its separate Vercel status reports a deployment rate limit, not a Next.js compile failure.

## Observed Supabase state

Project `jywqhiiwsmudthaujhmi` returned `ACTIVE_HEALTHY`. The inventory lists 36 public tables, all with RLS enabled, and 28 recorded migrations, ending with `v2_public_events_verified_media`.

Selected row counts reported by `list_tables` (inventory estimates, not independently verified exact counts):

| Entity | Reported rows |
| --- | ---: |
| Sports | 6 |
| Competitions | 10 |
| Participants | 201 |
| Events | 277 |
| Media assets | 220 |
| Venues | 28 |
| Competition memberships | 170 |
| Enrichment tasks | 886 |

An enrichment task or media record is not proof of completed verification or an active automated worker. No approved-asset count was established. A supplementary aggregate audit query was blocked by the tool safety layer and was not retried or bypassed.

The read-only function inspection confirms `get_primary_media_asset_v2` selects only approved, current media with a storage URL. The application previously checked only whether identity/URL strings existed, not whether the identity matched the requested asset or whether provenance was complete.

Security Advisor findings:

- `participant_profile_audit` is a security-definer view.
- Two privileged trigger helpers retain client-role execution grants: `ensure_participant_profile_row` and `apply_confirmed_participant_profile_claim`. These are trigger-returning functions; the advisor warning alone does not demonstrate a successfully callable/exploitable public RPC.
- Three relationship-validation functions have a mutable search path. This remains a separate follow-up.
- Four internal tables have RLS but no policies. Do not add permissive policies merely to clear informational notices.

## Changes prepared on the work branch

1. Add a pure primary-media validator and use it in the existing server loader. It requires matching entity type/key/asset kind, a source name, HTTPS source URL and a valid verification timestamp. It rejects unsafe URLs, impossible dates, invalid image dimensions/content types and explicitly unapproved/obsolete media. Safe same-origin optimized assets remain supported. Unknown properties are not forwarded.
2. Preserve the server-only loader, public API credentials, request timeout, cache behavior and null fallback. No source collection, image approval, publication or event/broadcaster data is added. Existing embedded-event media and other loaders are not claimed to be covered by this primary-media validator.
3. Harden the existing SQL **source definitions**: make the operational audit view security-invoker and service-role-only; revoke client execution of the two trigger-only helpers. **These changes have NOT been applied to Supabase and do not retroactively modify already-recorded migrations.**
4. Add 42 regression tests to `npm test` through `npm run test:media` and prevent automatic Vercel deployment of this work branch.

A valid payload is not proof of licensing, ownership or an approved reuse policy. Those decisions remain in the verification pipeline; the validator does not fetch a source or image URL. No new sports/entity enum limits future expansion.

## Verification at preparation time

The modified source files were inspected at the starting GitHub commit. A complete local checkout was unavailable: the GitHub clone failed DNS resolution. Full application validation must therefore run through the existing GitHub Actions workflow.

The 36 new primary-media tests passed locally with Node 22's type stripping used in place of Jiti only for loading the pure TypeScript module. The committed tests retain the project's existing Jiti approach. The pure validator also passed a standalone strict TypeScript check. The six additional SQL/configuration/loader assertions await the complete CI run at this checkpoint. Those assertions are source-level regression tests, not PostgreSQL migration/integration tests.

The existing GitHub Actions workflow runs `npm ci`, the full `npm test` suite and `npm run build` for this branch. Check the new commit's workflow result; a successful result on the starting commit is not evidence for a later commit. This document records the pre-commit checkpoint, not a claim that the later CI has already completed. No browser/visual verification was performed for this non-visual validation change.

## Next development checkpoint

First establish an explicitly isolated database/preview target. Then create and test a minimal forward security migration rather than replaying seed scripts against the existing database; run advisors and role-based integration tests afterwards. Continue the expansion queue with approved logos, venue imagery and circuit layouts, preserving field-level evidence and manual review for unresolved facts. Do not auto-publish the 886 queued tasks.

References:

- Supabase view security: https://supabase.com/docs/guides/database/postgres/row-level-security#views
- Supabase function privileges: https://supabase.com/docs/guides/database/functions#function-privileges
- Advisor view finding: https://supabase.com/docs/guides/database/database-linter?lint=0010_security_definer_view
- Advisor function grants: https://supabase.com/docs/guides/database/database-linter?lint=0028_anon_security_definer_function_executable
- Vercel branch deployment configuration: https://vercel.com/docs/project-configuration/git-configuration
