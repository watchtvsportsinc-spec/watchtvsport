import assert from "node:assert/strict";
import test from "node:test";
import { resolve } from "node:path";
import { createJiti } from "jiti";

const root = resolve(new URL("..", import.meta.url).pathname);
const jiti = createJiti(import.meta.url, { interopDefault: true });

async function catalog() { return jiti.import(resolve(root, "lib/competition-catalog.ts")); }
async function leagueProfiles() { return jiti.import(resolve(root, "lib/football-league-profiles.ts")); }

test("competition taxonomy preserves key product hierarchy", async () => {
  const { getCompetitionCatalogEntry, allCompetitionCatalogEntries } = await catalog();
  assert.equal(getCompetitionCatalogEntry("football", "champions-league")?.category, "continental");
  assert.equal(getCompetitionCatalogEntry("football", "mls")?.category, "domestic-league");
  assert.equal(getCompetitionCatalogEntry("football", "ligue-1")?.displayName, "Ligue 1 McDonald's");
  assert.equal(getCompetitionCatalogEntry("football", "premier-league")?.displayName, "Premier League");
  assert.equal(getCompetitionCatalogEntry("football", "laliga")?.displayName, "LALIGA EA SPORTS");
  assert.equal(getCompetitionCatalogEntry("tennis", "roland-garros")?.category, "grand-slam");
  assert.equal(getCompetitionCatalogEntry("cycling", "tour-de-france")?.category, "tour");
  const keys = allCompetitionCatalogEntries().map((entry) => `${entry.sport}:${entry.slug}`);
  assert.equal(new Set(keys).size, keys.length, "competition catalog keys must be unique");
});

test("permanent competition catalog covers launch navigation", async () => {
  const { allCompetitionCatalogEntries } = await catalog();
  const sports = new Set(allCompetitionCatalogEntries().map((entry) => entry.sport));
  for (const sport of ["football", "basketball", "hockey", "tennis", "rugby", "baseball", "american-football", "cycling"]) assert.ok(sports.has(sport), `missing permanent competition catalog for ${sport}`);
});

test("major competitions expose useful search aliases", async () => {
  const { getCompetitionCatalogEntry } = await catalog();
  assert.ok(getCompetitionCatalogEntry("football", "champions-league")?.aliases?.includes("UCL"));
  assert.ok(getCompetitionCatalogEntry("football", "champions-league")?.aliases?.includes("C1"));
  assert.ok(getCompetitionCatalogEntry("hockey", "nhl")?.aliases?.includes("LNH"));
  assert.ok(getCompetitionCatalogEntry("tennis", "roland-garros")?.aliases?.includes("French Open"));
  assert.ok(getCompetitionCatalogEntry("baseball", "world-baseball-classic")?.aliases?.includes("WBC"));
});

test("2026/27 Ligue 1 and Premier League profiles are explicit and complete", async () => {
  const { getFootballLeagueProfile } = await leagueProfiles();
  const ligue1 = getFootballLeagueProfile("football", "ligue-1");
  const premierLeague = getFootballLeagueProfile("football", "premier-league");

  assert.equal(ligue1?.displayName, "Ligue 1 McDonald's");
  assert.equal(ligue1?.teamCount, 18);
  assert.equal(ligue1?.fixtureCount, 306);
  assert.equal(ligue1?.matchdayCount, 34);
  assert.equal(ligue1?.seasonStart, "2026-08-21");
  assert.equal(ligue1?.seasonEnd, "2027-05-29");

  assert.equal(premierLeague?.displayName, "Premier League");
  assert.equal(premierLeague?.teamCount, 20);
  assert.equal(premierLeague?.fixtureCount, 380);
  assert.equal(premierLeague?.matchdayCount, 38);
  assert.equal(premierLeague?.seasonStart, "2026-08-21");
  assert.equal(premierLeague?.seasonEnd, "2027-05-30");

  assert.equal(getFootballLeagueProfile("basketball", "premier-league"), null);
});
