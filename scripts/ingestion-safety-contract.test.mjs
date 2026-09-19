import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const root = resolve(new URL("..", import.meta.url).pathname);
const file = (path) => readFile(resolve(root, path), "utf8");

test("ingestion schema preserves idempotency and empty-response protections", async () => {
  const [migration, assertions] = await Promise.all([
    file("supabase-v2-ingestion-migration.sql"),
    file("supabase-v2-ingestion-tests.sql"),
  ]);

  assert.match(migration, /UNIQUE \(source_id, idempotency_key\)/i);
  assert.match(migration, /btrim\(idempotency_key\) <> ''/i);
  assert.match(assertions, /empty response cannot become a collected import/i);
  assert.match(assertions, /idempotent no-op import completes without duplicate writes/i);
});

test("automated imports cannot overwrite manually protected values", async () => {
  const [migration, assertions] = await Promise.all([
    file("supabase-v2-ingestion-migration.sql"),
    file("supabase-v2-ingestion-tests.sql"),
  ]);

  assert.match(migration, /import target is protected by a manual lock/i);
  assert.match(assertions, /manual field protection blocks an automated overwrite/i);
});

test("seed application remains dry-run and unpublished by default", async () => {
  const applyScript = await file("scripts/apply-v2-seed-to-supabase.mjs");
  assert.match(applyScript, /flags\.has\("--apply"\)/);
  assert.match(applyScript, /flags\.has\("--publish"\)/);
  assert.match(applyScript, /Plan contains published rows without --publish approval/);
  assert.match(applyScript, /mode: args\.apply \? "apply" : "dry-run"/);
});
