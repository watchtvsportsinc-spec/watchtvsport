import assert from "node:assert/strict";
import test from "node:test";
import { extractGameweekFixtures, validateFixtures } from "./discover-laliga-fixtures.mjs";

test("parses official LaLiga result rows into canonical team names", () => {
  const html = `
    <div>Watch summary</div><div>SAT 15.08.2026</div><div>17:30</div><div>Deportivo Alavés3 - 0Getafe CF</div>
    <div>Watch summary</div><div>SUN 16.08.2026</div><div>15:00</div><div>R. Racing Club2 - 2Villarreal CF</div>
    <div>Watch summary</div><div>THU 27.08.2026</div><div>19:00</div><div>FC Barcelona2 - 0Athletic Club</div>
  `;
  const fixtures = extractGameweekFixtures(html, 1);
  assert.deepEqual(fixtures.map(({ localDate, localTime, home, away, gameweek }) => ({ localDate, localTime, home, away, gameweek })), [
    { localDate: "2026-08-15", localTime: "17:30", home: "Deportivo Alaves", away: "Getafe CF", gameweek: 1 },
    { localDate: "2026-08-16", localTime: "15:00", home: "Racing Club", away: "Villarreal CF", gameweek: 1 },
    { localDate: "2026-08-27", localTime: "19:00", home: "FC Barcelona", away: "Athletic Club", gameweek: 1 },
  ]);
});

test("validation rejects incomplete fixture sets", () => {
  const result = validateFixtures([{ home: "FC Barcelona", away: "Athletic Club" }]);
  assert.equal(result.ok, false);
  assert.match(result.issues[0], /expected 380 fixtures/);
});
