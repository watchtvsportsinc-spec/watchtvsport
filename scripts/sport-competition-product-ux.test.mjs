import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const root = resolve(new URL("..", import.meta.url).pathname);
const file = (path) => readFile(resolve(root, path), "utf8");

test("sport and competition pages keep TV discovery and monetization hooks", async () => {
  const [sportHub, competitionPage, f1, raceSeries] = await Promise.all([
    file("components/SportHubPage.tsx"),
    file("components/UniversalCompetitionPage.tsx"),
    file("app/formula-1/page.tsx"),
    file("components/RaceSeriesPage.tsx"),
  ]);
  assert.match(sportHub, /confirmedListings/);
  assert.match(sportHub, /data-monetization-slot="sport-hub-top"/);
  assert.match(competitionPage, /CompetitionSchedule/);
  assert.match(competitionPage, /data-monetization-slot="competition-top"/);
  assert.match(f1, /confirmed listings/);
  assert.match(raceSeries, /confirmed/);
});

test("competition UX exposes live, today, upcoming and schedule filters", async () => {
  const [grid, schedule] = await Promise.all([
    file("components/SportCompetitionGrid.tsx"),
    file("components/CompetitionSchedule.tsx"),
  ]);
  for (const token of ["LIVE", "TODAY", "UPCOMING"]) assert.ok(grid.includes(token));
  for (const token of ["upcoming", "finished", "all"]) assert.ok(schedule.includes(token));
});
