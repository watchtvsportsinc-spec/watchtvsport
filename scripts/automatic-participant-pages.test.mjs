import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { createJiti } from "jiti";

const root = resolve(new URL("..", import.meta.url).pathname);
const file = (path) => readFile(resolve(root, path), "utf8");
const jiti = createJiti(import.meta.url, { interopDefault: true });

test("team sports use one generic database-backed club route", async () => {
  const [route, registry] = await Promise.all([
    file("app/sports/[sport]/club/[club]/page.tsx"),
    jiti.import(resolve(root, "lib/sports-registry.ts")),
  ]);
  assert.match(route, /UniversalClubProfilePage/);
  assert.match(route, /buildUniversalClubMetadata/);

  for (const slug of ["football", "basketball", "hockey", "american-football", "rugby", "baseball"]) {
    assert.equal(registry.sportAllowsParticipantPages(slug), true, `${slug} should create participant pages`);
  }
});

test("sitemap discovers database participants before they have imported events", async () => {
  const sitemap = await file("app/sitemap.ts");
  assert.match(sitemap, /getPublicParticipantDirectory/);
  assert.match(sitemap, /databaseClubPages/);
  assert.match(sitemap, /participant\.sport/);
  assert.match(sitemap, /participant\.slug/);
  assert.match(sitemap, /eventClubPages/);
});

test("prepared migration backfills profiles and visuals and guards insert automation", async () => {
  const sql = await file("supabase-v2-automatic-participant-pages.sql");
  assert.match(sql, /participant_profiles/);
  assert.match(sql, /participant_visual_profiles/);
  assert.match(sql, /participant_visual_defaults/);
  assert.match(sql, /trg_ensure_participant_profile_row/);
  assert.match(sql, /participant_visual_profile_defaults/);
  assert.match(sql, /get_public_participant_directory_v1/);
  assert.match(sql, /limit 5000/i);
  assert.match(sql, /club','team','franchise','national_team/);
  assert.match(sql, /PREPARED MIGRATION ONLY/);
});

test("club hero uses only approved media and keeps a WatchTVSport fallback", async () => {
  const [page, entityVisual, visuals, mediaReader] = await Promise.all([
    file("components/UniversalClubProfilePage.tsx"),
    file("components/EntityVisual.tsx"),
    file("lib/entity-visuals.ts"),
    file("lib/public-participant-media.ts"),
  ]);
  assert.match(page, /getApprovedParticipantMedia/);
  assert.match(page, /approvedMedia=\{approvedMedia\}/);
  assert.match(page, /participant:\$\{sport\}:\$\{verified\.slug\}/);
  assert.match(entityVisual, /approvedMedia/);
  assert.match(visuals, /canRenderEntityMedia\(options\.approvedMedia\)/);
  assert.match(visuals, /usageStatus: "fallback"/);
  assert.match(mediaReader, /usageStatus !== "approved"/);
});

test("participant media SQL exposes approved crest or logo only", async () => {
  const sql = await file("supabase-v2-automatic-participant-pages.sql");
  assert.match(sql, /get_public_participant_media_v1/);
  assert.match(sql, /usage_status='approved'/);
  assert.match(sql, /media_kind in \('crest','logo'\)/);
  assert.doesNotMatch(sql, /usage_status in \('candidate','review'/);
});
