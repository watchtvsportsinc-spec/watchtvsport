import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const root = resolve(new URL("..", import.meta.url).pathname);
const file = (path) => readFile(resolve(root, path), "utf8");

test("public reads require explicit Supabase activation", async () => {
  const runtimePaths = [
    file("lib/public-events.ts"),
    file("lib/header-search-suggestions.ts"),
    file("lib/public-sport-competitions.ts"),
    file("lib/public-fixtures.ts"),
    file("lib/participant-profiles.ts"),
    file("lib/public-broadcast-rights.ts"),
    file("lib/public-competition.ts"),
    file("lib/public-media-assets.ts"),
    file("lib/public-participant-events.ts"),
    file("lib/public-ufc-card.ts"),
  ];
  const [events, search, competitions, fixtures, ...remainingReads] = await Promise.all(runtimePaths);

  assert.match(events, /WATCHTVSPORT_DATA_SOURCE\?\.trim\(\) \|\| "local"/);
  assert.match(search, /WATCHTVSPORT_DATA_SOURCE\?\.trim\(\) !== "supabase"/);
  assert.match(competitions, /WATCHTVSPORT_DATA_SOURCE\?\.trim\(\)!=="supabase"/);
  assert.match(fixtures, /WATCHTVSPORT_DATA_SOURCE\?\.trim\(\)==="supabase"/);

  for (const source of [events, search, competitions, fixtures, ...remainingReads]) {
    assert.doesNotMatch(source, /jywqhiiwsmudthaujhmi/);
    assert.doesNotMatch(source, /sb_publishable_/);
  }

  for (const source of remainingReads) {
    assert.match(source, /getEnabledPublicSupabaseConfig/);
  }
});

test("public Supabase configuration is centralized and server-only", async () => {
  const [config, correctionRoute] = await Promise.all([
    file("lib/public-supabase-config.ts"),
    file("app/api/report-error/route.ts"),
  ]);

  assert.match(config, /import "server-only"/);
  assert.match(config, /WATCHTVSPORT_DATA_SOURCE\?\.trim\(\) !== "supabase"/);
  assert.match(config, /url\.protocol === "https:"/);
  assert.match(config, /key\.length > 4_096/);
  assert.doesNotMatch(config, /jywqhiiwsmudthaujhmi|sb_publishable_/);
  assert.match(correctionRoute, /readPublicSupabaseConfig/);
  assert.doesNotMatch(correctionRoute, /jywqhiiwsmudthaujhmi|sb_publishable_/);
});

test("competition directory reads remain cacheable", async () => {
  const competitions = await file("lib/public-sport-competitions.ts");
  assert.doesNotMatch(competitions, /cache:"no-store"/);
  assert.match(competitions, /revalidate:3600/);
  assert.match(competitions, /public-sport-competitions/);
});
