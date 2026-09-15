import assert from "node:assert/strict";
import test from "node:test";
import { extractMatchdayFixtures, validateFixtures } from "./discover-bundesliga-fixtures.mjs";

test("parses Bundesliga abbreviation fixtures", () => {
  const html = `<div>Friday 28 August</div><div>FCB 5 VFB 1</div><div>Saturday 29 August</div><div>ELV 3 B04 2</div><div>KOE 3 TSG 2</div>`;
  const fixtures = extractMatchdayFixtures(html, 1);
  assert.deepEqual(fixtures.slice(0,3).map(({home,away,matchday}) => ({home,away,matchday})), [
    { home: "Bayern Munich", away: "VfB Stuttgart", matchday: 1 },
    { home: "Elversberg", away: "Bayer Leverkusen", matchday: 1 },
    { home: "Cologne", away: "Hoffenheim", matchday: 1 },
  ]);
});

test("validation rejects incomplete fixture sets", () => {
  const result = validateFixtures([{ home: "Bayern Munich", away: "VfB Stuttgart" }]);
  assert.equal(result.ok, false);
  assert.match(result.issues[0], /expected 306 fixtures/);
});
