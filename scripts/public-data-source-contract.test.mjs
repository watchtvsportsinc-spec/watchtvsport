import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const root = resolve(new URL("..", import.meta.url).pathname);
const file = (path) => readFile(resolve(root, path), "utf8");

test("public reads require explicit Supabase activation", async () => {
  const [events, search, competitions, fixtures] = await Promise.all([
    file("lib/public-events.ts"),
    file("lib/header-search-suggestions.ts"),
    file("lib/public-sport-competitions.ts"),
    file("lib/public-fixtures.ts"),
  ]);

  assert.match(events, /WATCHTVSPORT_DATA_SOURCE\?\.trim\(\) \|\| "local"/);
  assert.match(search, /WATCHTVSPORT_DATA_SOURCE\?\.trim\(\) !== "supabase"/);
  assert.match(competitions, /WATCHTVSPORT_DATA_SOURCE\?\.trim\(\)!=="supabase"/);
  assert.match(fixtures, /WATCHTVSPORT_DATA_SOURCE\?\.trim\(\)==="supabase"/);

  for (const source of [events, search, competitions, fixtures]) {
    assert.doesNotMatch(source, /jywqhiiwsmudthaujhmi/);
    assert.doesNotMatch(source, /sb_publishable_/);
  }
});

test("competition directory reads remain cacheable", async () => {
  const competitions = await file("lib/public-sport-competitions.ts");
  assert.doesNotMatch(competitions, /cache:"no-store"/);
  assert.match(competitions, /revalidate:3600/);
  assert.match(competitions, /public-sport-competitions/);
});
