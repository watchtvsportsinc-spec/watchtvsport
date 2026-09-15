import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

// Source-level regression tests only; these do not execute or validate a remote migration.
const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const queue = read("supabase-v2-enrichment-work-queue.sql").replace(/--[^\n]*/g, "");
const automation = read("supabase-v2-participant-profile-automation.sql").replace(/--[^\n]*/g, "");

test("the internal audit view obeys caller RLS and is not a public endpoint", () => {
  assert.match(queue, /create or replace view public\.participant_profile_audit\s+with\s*\(security_invoker\s*=\s*true\)/i);
  assert.match(queue, /revoke all on table public\.participant_profile_audit from PUBLIC, anon, authenticated;/i);
  assert.match(queue, /grant select on table public\.participant_profile_audit to service_role;/i);
});

for (const name of ["ensure_participant_profile_row", "apply_confirmed_participant_profile_claim"]) {
  test(`${name} remains a trigger but cannot be invoked by client roles`, () => {
    assert.ok(automation.includes(`for each row execute function public.${name}();`));
    assert.ok(automation.includes(`revoke execute on function public.${name}() from PUBLIC, anon, authenticated;`));
  });
}

test("the enrichment queue still denies public reads and does not auto-publish", () => {
  assert.match(queue, /alter table public\.enrichment_tasks enable row level security;/i);
  assert.match(queue, /create policy public_select_enrichment_tasks on public\.enrichment_tasks for select using \(false\);/i);
  assert.doesNotMatch(queue, /update\s+public\.media_assets/i);
});

test("the server loader validates requested identity and preserves timeout/fallback", () => {
  const loader = read("lib/public-media.ts");
  assert.match(loader, /if \(!isPublicMediaLookup\(lookup\)\) return null;/);
  assert.match(loader, /return parsePrimaryMediaAsset\(await response\.json\(\), lookup\);/);
  assert.match(loader, /signal: AbortSignal\.timeout\(REQUEST_TIMEOUT_MS\)/);
  assert.match(loader, /if \(!response\.ok\) return null;/);
  assert.match(loader, /catch\s*\{\s*return null;/);
  assert.doesNotMatch(loader, /service_role|SUPABASE_SECRET_KEY/);
});

test("unpublished fixture preview is localhost/development only and keeps secrets external", () => {
  const loader = read("lib/dev-preview-fixtures.ts");
  assert.match(loader, /process\.env\.NODE_ENV !== "production"/);
  assert.match(loader, /WATCHTVSPORT_PREVIEW_UNPUBLISHED === "1"/);
  assert.match(loader, /process\.env\.SUPABASE_SECRET_KEY \|\| process\.env\.SUPABASE_SERVICE_ROLE_KEY/);
  assert.doesNotMatch(loader, /sb_secret_[A-Za-z0-9_-]+/);
  assert.doesNotMatch(loader, /eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}/);
  assert.match(loader, /cache: "no-store"/);
});

test("only this work branch has automatic Vercel deployments disabled", () => {
  const config = JSON.parse(read("vercel.json"));
  assert.deepEqual(config.git.deploymentEnabled, { "work/v2-expansion-assets-leagues": false });
});
