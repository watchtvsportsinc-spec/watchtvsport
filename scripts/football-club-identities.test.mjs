import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { createJiti } from "jiti";

const root = resolve(new URL("..", import.meta.url).pathname);
const jiti = createJiti(import.meta.url, { interopDefault: true });

async function load() {
  const identities = await jiti.import(resolve(root, "lib/football-club-identities.ts"));
  const aliases = await jiti.import(resolve(root, "lib/club-aliases.ts"));
  return { ...identities, ...aliases };
}

test("priority 2026/27 football identities contain exactly 20 Premier League and 18 Ligue 1 clubs", async () => {
  const { priorityFootballClubIdentities, getPriorityFootballClubsByCompetition } = await load();
  assert.equal(priorityFootballClubIdentities.length, 38);
  assert.equal(getPriorityFootballClubsByCompetition("premier-league").length, 20);
  assert.equal(getPriorityFootballClubsByCompetition("ligue-1").length, 18);
  assert.equal(new Set(priorityFootballClubIdentities.map((club) => club.slug)).size, 38);
});

test("priority club identities carry current official membership and kit-review sources", async () => {
  const { priorityFootballClubIdentities } = await load();
  for (const club of priorityFootballClubIdentities) {
    assert.equal(club.seasonLabel, "2026/27");
    assert.equal(club.verifiedOn, "2026-09-16");
    assert.match(club.membershipSourceUrl, /^https:\/\//);
    assert.match(club.kitReviewSourceUrl, /^https:\/\//);
    if (club.competitionSlug === "premier-league") {
      assert.match(club.membershipSourceUrl, /premierleague\.com/);
      assert.match(club.kitReviewSourceUrl, /premierleague\.com/);
    } else {
      assert.match(club.membershipSourceUrl, /ligue1\.com/);
      assert.match(club.kitReviewSourceUrl, /ligue1\.com/);
    }
  }
});

test("priority club search names are collision-free and always resolve to the stable database slug", async () => {
  const {
    priorityFootballClubIdentities,
    getPriorityFootballClubSearchNames,
    normalizeFootballClubIdentityKey,
    resolveClubSlug,
  } = await load();
  const ownerByKey = new Map();
  for (const club of priorityFootballClubIdentities) {
    for (const searchName of getPriorityFootballClubSearchNames(club)) {
      const key = normalizeFootballClubIdentityKey(searchName);
      const previous = ownerByKey.get(key);
      assert.ok(!previous || previous === club.slug, `alias collision: ${searchName} => ${previous} / ${club.slug}`);
      ownerByKey.set(key, club.slug);
      assert.equal(resolveClubSlug(searchName), club.slug, `${searchName} must resolve to ${club.slug}`);
    }
  }
});

test("stable slugs survive official-name differences for Lens, Lille and Stade Rennais", async () => {
  const { resolveClubName, resolveClubSlug, getClubNameBySlug } = await load();
  assert.equal(resolveClubSlug("RC Lens"), "lens");
  assert.equal(resolveClubName("Lens"), "RC Lens");
  assert.equal(getClubNameBySlug("lens"), "RC Lens");

  assert.equal(resolveClubSlug("LOSC Lille"), "lille");
  assert.equal(resolveClubName("Lille"), "LOSC");
  assert.equal(getClubNameBySlug("lille"), "LOSC");

  assert.equal(resolveClubSlug("Stade Rennais FC"), "stade-rennais");
  assert.equal(resolveClubName("Rennes"), "Stade Rennais F.C.");
});

test("ambiguous generic names are not forced onto PSG, Manchester City or Manchester United", async () => {
  const { resolveClubName } = await load();
  assert.equal(resolveClubName("Paris"), "Paris");
  assert.equal(resolveClubName("City"), "City");
  assert.equal(resolveClubName("United"), "United");
});

test("every priority club already has a WatchTVSport fallback palette baseline", async () => {
  const { priorityFootballClubIdentities } = await load();
  const sql = await readFile(resolve(root, "supabase-v2-participant-visual-palettes-football-seed.sql"), "utf8");
  for (const club of priorityFootballClubIdentities) {
    assert.ok(sql.includes(`('${club.slug}',`), `missing fallback palette baseline for ${club.slug}`);
  }
});

test("prepared Supabase identity seed covers every priority club without being an automatic apply script", async () => {
  const { priorityFootballClubIdentities } = await load();
  const sql = await readFile(resolve(root, "supabase-v2-priority-football-club-identities-2026-27.sql"), "utf8");
  assert.match(sql, /intentionally not applied automatically/i);
  for (const club of priorityFootballClubIdentities) {
    assert.ok(sql.includes(`'${club.slug}'`), `prepared identity seed missing ${club.slug}`);
  }
  for (const forbidden of ["array['Paris'", "array['City'", "array['United'"]) {
    assert.ok(!sql.includes(forbidden), `ambiguous alias must not be seeded: ${forbidden}`);
  }
});
