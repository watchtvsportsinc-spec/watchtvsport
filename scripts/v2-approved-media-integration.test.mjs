import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("club pages use approved media assets for logos and hero imagery", () => {
  const page = read("app/football/club/[club]/page.tsx");
  assert.match(page, /getPrimaryMediaAsset\("participant",\s*club,\s*"team_logo"\)/);
  assert.match(page, /getPrimaryMediaAsset\("participant",\s*club,\s*"team_hero"\)/);
  assert.match(page, /images:\s*hero\?\.url\s*\?\s*\[hero\.url\]/);
  assert.match(page, /backgroundImage:.*hero\.url/s);
  assert.match(page, /logo\?\.url\s*\?\s*<img src=\{logo\.url\}/);
  assert.doesNotMatch(page, /profile\?\.logoUrl/);
  assert.doesNotMatch(page, /profile\?\.heroImageUrl/);
});

test("competition pages use approved competition logos", () => {
  const page = read("app/football/competition/[competition]/page.tsx");
  assert.match(page, /getPrimaryMediaAsset\("competition",\s*competition,\s*"competition_logo"\)/);
  assert.match(page, /images:\s*logo\?\.url\s*\?\s*\[logo\.url\]/);
  assert.match(page, /logo:\s*logo\?\.url/);
  assert.match(page, /<img src=\{logo\.url\}/);
});
