import assert from "node:assert/strict";
import test from "node:test";
import {
  extractCalendarJsonFixtures,
  extractGameweekResults,
  mergeConfirmedKickoffs,
  validateFixtures,
} from "./discover-laliga-fixtures.mjs";

test("parses official LaLiga calendar JSON into home-away fixtures", () => {
  const fixtures = extractCalendarJsonFixtures({
    one: {
      gameweek_week: 1,
      gameweek_date: "16.08.2026",
      matches: [
        { local_name: "Deportivo Alavés", away_name: "Getafe CF" },
        { local_name: "FC Barcelona", away_name: "Athletic Club" },
      ],
    },
    two: {
      gameweek_week: 2,
      gameweek_date: "23.08.2026",
      matches: [{ local_name: "Athletic Club", away_name: "Sevilla FC" }],
    },
  });
  assert.deepEqual(fixtures.map(({ gameweek, localDate, localTime, home, away }) => ({ gameweek, localDate, localTime, home, away })), [
    { gameweek: 1, localDate: "2026-08-16", localTime: null, home: "Deportivo Alaves", away: "Getafe CF" },
    { gameweek: 1, localDate: "2026-08-16", localTime: null, home: "FC Barcelona", away: "Athletic Club" },
    { gameweek: 2, localDate: "2026-08-23", localTime: null, home: "Athletic Club", away: "Sevilla FC" },
  ]);
});

test("parses confirmed LaLiga result rows and canonicalizes team names", () => {
  const html = `
    <div>Watch summary</div><div>SAT 15.08.2026</div><div>17:30</div><div>Deportivo Alavés3 - 0Getafe CF</div>
    <div>Watch summary</div><div>SUN 16.08.2026</div><div>15:00</div><div>R. Racing Club2 - 2Villarreal CF</div>
  `;
  const fixtures = extractGameweekResults(html, 1);
  assert.deepEqual(fixtures.map(({ localDate, localTime, home, away }) => ({ localDate, localTime, home, away })), [
    { localDate: "2026-08-15", localTime: "17:30", home: "Deportivo Alaves", away: "Getafe CF" },
    { localDate: "2026-08-16", localTime: "15:00", home: "Racing Club", away: "Villarreal CF" },
  ]);
});

test("confirmed kickoff replaces nominal matchday date for the same fixture", () => {
  const merged = mergeConfirmedKickoffs(
    [{ gameweek: 1, localDate: "2026-08-16", localTime: null, home: "Deportivo Alaves", away: "Getafe CF", datePrecision: "matchday_nominal" }],
    [{ gameweek: 1, localDate: "2026-08-15", localTime: "17:30", home: "Deportivo Alaves", away: "Getafe CF", datePrecision: "confirmed_kickoff" }],
  );
  assert.equal(merged[0].localDate, "2026-08-15");
  assert.equal(merged[0].localTime, "17:30");
  assert.equal(merged[0].datePrecision, "confirmed_kickoff");
});

test("validation rejects incomplete fixture sets", () => {
  const result = validateFixtures([{ home: "FC Barcelona", away: "Athletic Club" }]);
  assert.equal(result.ok, false);
  assert.match(result.issues[0], /expected 380 fixtures/);
});
