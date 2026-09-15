import assert from "node:assert/strict";
import test from "node:test";
import { extractFixturesFromLines, htmlToLines, validateFixtures } from "./discover-premier-league-fixtures.mjs";

test("parses dated Premier League fixture lines with optional broadcaster", () => {
  const html = `
    <h2>Friday 21 August 2026</h2>
    <p>20:00 Arsenal v Coventry City (Sky Sports)</p>
    <h2>Saturday 22 August</h2>
    <p>12:30 Hull City v Manchester United (TNT Sports)</p>
    <p>Everton v Crystal Palace</p>
  `;
  const fixtures = extractFixturesFromLines(htmlToLines(html));
  assert.deepEqual(fixtures.map(({ localDate, localTime, home, away }) => ({ localDate, localTime, home, away })), [
    { localDate: "2026-08-21", localTime: "20:00", home: "Arsenal", away: "Coventry City" },
    { localDate: "2026-08-22", localTime: "12:30", home: "Hull City", away: "Manchester United" },
    { localDate: "2026-08-22", localTime: null, home: "Everton", away: "Crystal Palace" },
  ]);
});

test("rolls undated January headings into the next calendar year", () => {
  const fixtures = extractFixturesFromLines([
    "Sunday 27 December 2026",
    "Arsenal v Chelsea",
    "Saturday 2 January",
    "Chelsea v Arsenal",
  ]);
  assert.equal(fixtures[0].localDate, "2026-12-27");
  assert.equal(fixtures[1].localDate, "2027-01-02");
});

test("validation refuses incomplete fixture collections", () => {
  const result = validateFixtures([{ localDate: "2026-08-21", home: "Arsenal", away: "Coventry City" }]);
  assert.equal(result.ok, false);
  assert.match(result.issues[0], /expected 380 fixtures/);
});
