# Private broadcast review - implementation and rollout

Status: feature branch, disabled by default; NOT deployed to production.
Base inspected: refonte/watchtvsport-v2 at 494398394bccb5e9eea047d76427bfa0f2e59bb1.

## User contract

Only unresolved, concrete broadcast exceptions enter this queue. Reliable imported data must not be sent through a mandatory human review of every event. Source approval, event-level evidence, freshness, geography and publication permissions remain independent gates.

- Swipe right / Valider: save an approval for this proposal/version; this is not publication.
- Swipe left / Refuser: reject this proposal, without deleting any existing public broadcast.
- A verifier: create one deduplicated research job. Until a real worker is installed the UI says waiting, never claims a search ran.
- Modifier les informations: edit approved field names, explain the correction and either save or approve. Event identity and event time are not editable here.
- Rouvrir: compensating action on a not-yet-published proposal, with a new revision and audit entry. Already-published changes require a separate compensation workflow.

## Implemented code

The optional catch-all route under /admin serves standalone private HTML, without the public React layout, analytics or service worker. It calls Supabase Auth and restricted RPCs using a public project key and the current user's signed access token. Privileged project keys are rejected. Every data operation checks the current active reviewer membership, active session and MFA assurance level. Public/premium accounts do not acquire admin rights.

HTTPS HttpOnly host-only cookies are scoped to /admin, SameSite Strict. POST requests require the exact configured Origin and JSON. Responses are private/no-store and noindex, have per-response CSP nonces and cannot be framed. Browser storage is not used for credentials or decisions. There are no external client scripts or new npm dependencies.

The candidate SQL defines private cases, decisions, memberships and research jobs, revision checks, transaction locks, request idempotency and before/after audit. Public wrappers are SECURITY INVOKER; privileged helpers remain in a non-exposed schema, check authorization and have an empty search_path. No direct authenticated table writes are granted. No admin is seeded automatically.

## Deliberately not yet connected

1. The private schema has NOT been applied to the remote database.
2. No Supabase Auth user or authorized reviewer has been created. The administrator email must be explicitly supplied/confirmed, not inferred from a Git commit.
3. No adapter is yet feeding unresolved ingestion exceptions into the cases table. A healthy empty queue is distinct from an API/configuration error.
4. No research worker, source subscription, AI API budget or cron job is installed. Queueing is not execution.
5. No publisher moves approved cases into public.event_broadcasts. The future publisher must recheck source reuse, relevant scope, event/territory/type, evidence freshness, manual locks and publication permissions in a transaction. Stale research results must compare case_version before application. Approved is NOT published.
6. No production domain or public V2 deployment is changed by this branch.

## Activation procedure

First run all CI checks and the SQL tests against an isolated disposable database. The SQL test fixture refuses databases not named wts_review_test. Run a real Supabase staging integration next; PostgreSQL fixtures do not prove the live Auth token/MFA contract.

Promote docs/private-review-schema.sql through a migration created with `supabase migration new private_broadcast_review`; inspect the generated file, apply to staging, run security advisors and verify anon, ordinary account, reviewer without MFA and authorized reviewer access. Do not add watchtvsport_review to exposed Data API schemas.

Create/invite the explicitly authorized user through Supabase Auth (not a hand-written password row). Add that user's immutable auth.users.id to watchtvsport_review.members via trusted administration. Complete MFA setup personally; do not send passwords or TOTP secrets through chat. Check account recovery and session revocation. Confirm rate limiting before exposing login.

Set server-side environment variables for the staging deployment only:

- WATCHTVSPORT_REVIEW_ENABLED=true
- WATCHTVSPORT_REVIEW_ORIGIN=<exact HTTPS origin, no trailing slash>
- SUPABASE_URL=<staging project origin>
- SUPABASE_PUBLISHABLE_KEY=<public project key>

Do not set a service_role key or copy production keys into previews. A missing flag/config returns 503 rather than exposing a fallback UI or demo.

Connect the exception importer and then separately the bounded research worker and publisher. Apply source approval rules and budget caps before enabling network jobs. Test rejected proposals are not recreated from unchanged imports and manual corrections cannot be overwritten.

After live staging tests, integrate into the intended production release. The V2 branch contains unrelated work; do not promote the whole branch just to release this admin route. Confirm the intended public baseline first.

## Tests and remaining verification

scripts/private-review.test.mjs tests handlers with mocked Supabase responses. The SQL fixture/assertions test the private DB contract in ephemeral PostgreSQL, not a user's database. The dedicated workflow also runs existing npm test and Next build on the actual feature checkout. Check each run's result; declaring success from the workflow file alone is not allowed.

Earlier local checks passed for the original handler suite, standalone TypeScript route and mocked DOM interactions (320/390/768/1280px, edits, swipe actions, XSS text handling). Those are not iPhone/Safari, real Supabase Auth, installed PWA or production tests.

Required release checks: real login/MFA/refresh/logout, removed-member and removed-session denial, direct RPC denied to anon/ordinary users, stale revision 409, safe retries, separate event/session/territory identities, slow/offline networks, Safari home-screen launch, no private analytics/cache leakage and source-to-publication audit.

## Rollback

Set WATCHTVSPORT_REVIEW_ENABLED=false and redeploy the admin integration to close access. Revoke membership and sessions for immediate authorization withdrawal. Stop workers independently if later installed. Preserve audit and job history; do not blindly drop the schema or revert public data. This branch changes no public broadcast rows, so there is no data rollback to perform for this inactive implementation.
