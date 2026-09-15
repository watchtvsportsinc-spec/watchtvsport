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

test("reusable entity visuals render only an explicitly supplied public image before fallback", () => {
  const component = read("components/EntityVisual.tsx");
  assert.match(component, /imageUrl\?: string/);
  assert.match(component, /if \(imageUrl\)/);
  assert.match(component, /<img[\s\S]*src=\{imageUrl\}/);
  assert.match(component, /getEntityVisual\(entityId, label\)/);
});

test("football browse and schedule cards consume logo URLs from the validated public event contract", () => {
  const page = read("app/football/page.tsx");
  assert.match(page, /logoUrl: event\.competitionLogoUrl/);
  assert.match(page, /imageUrl=\{competition\.logoUrl\}/);
  assert.match(page, /imageUrl=\{club\.logoUrl\}/);
  assert.match(page, /imageUrl=\{event\.participant1\.logoUrl\}/);
  assert.match(page, /imageUrl=\{event\.participant2\.logoUrl\}/);
  assert.doesNotMatch(page, /getPublicParticipantProfile/);
});

test("competition participant and match cards reuse validated participant logos", () => {
  const page = read("app/football/competition/[competition]/page.tsx");
  assert.match(page, /eventClubBySlug/);
  assert.match(page, /imageUrl=\{club\.participant\?\.logoUrl\}/);
  assert.match(page, /imageUrl=\{event\.participant1\.logoUrl\}/);
  assert.match(page, /imageUrl=\{event\.participant2\.logoUrl\}/);
});
