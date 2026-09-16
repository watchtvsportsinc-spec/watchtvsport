import assert from "node:assert/strict";
import test from "node:test";
import { resolve } from "node:path";
import { createJiti } from "jiti";

const root = resolve(new URL("..", import.meta.url).pathname);
const jiti = createJiti(import.meta.url, { interopDefault: true });

async function catalog() {
  return jiti.import(resolve(root, "lib/competition-catalog.ts"));
}

test("competition taxonomy preserves key product hierarchy", async () => {
  const { getCompetitionCatalogEntry, allCompetitionCatalogEntries } = await catalog();
  assert.equal(getCompetitionCatalogEntry("football", "champions-league")?.category, "continental");
  assert.equal(getCompetitionCatalogEntry("football", "mls")?.category, "domestic-league");
  assert.equal(getCompetitionCatalogEntry("football", "ligue-1")?.displayName, "Ligue 1 McDonald's");
  assert.equal(getCompetitionCatalogEntry("football", "laliga")?.displayName, "LALIGA EA SPORTS");
  assert.equal(getCompetitionCatalogEntry("tennis", "roland-garros")?.category, "grand-slam");
  assert.equal(getCompetitionCatalogEntry("cycling", "tour-de-france")?.category, "tour");
  const keys = allCompetitionCatalogEntries().map((entry) => `${entry.sport}:${entry.slug}`);
  assert.equal(new Set(keys).size, keys.length, "competition catalog keys must be unique");
});

test("permanent competition catalog covers launch navigation", async () => {
  const { allCompetitionCatalogEntries } = await catalog();
  const sports = new Set(allCompetitionCatalogEntries().map((entry) => entry.sport));
  for (const sport of ["football", "basketball", "hockey", "tennis", "rugby", "baseball", "american-football", "cycling"]) {
    assert.ok(sports.has(sport), `missing permanent competition catalog for ${sport}`);
  }
});
