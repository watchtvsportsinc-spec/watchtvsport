import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const contract = JSON.parse(readFileSync(new URL("../data/v2-football-integrity-contract.json", import.meta.url), "utf8"));

test("2026/27 four-league integrity contract is internally consistent", () => {
  const competitions = Object.values(contract.competitions);
  assert.equal(competitions.reduce((sum, item) => sum + item.clubs, 0), contract.totals.clubs);
  assert.equal(competitions.reduce((sum, item) => sum + item.fixtures, 0), contract.totals.fixtures);
  assert.deepEqual(contract.competitions["premier-league"], { clubs: 20, fixtures: 380 });
  assert.deepEqual(contract.competitions.laliga, { clubs: 20, fixtures: 380 });
  assert.deepEqual(contract.competitions.bundesliga, { clubs: 18, fixtures: 306 });
  assert.deepEqual(contract.competitions["ligue-1"], { clubs: 18, fixtures: 306 });
  assert.match(contract.publicationPolicy, /unpublished/i);
});
