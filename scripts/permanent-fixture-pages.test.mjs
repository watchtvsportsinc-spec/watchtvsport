import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const root=resolve(new URL("..",import.meta.url).pathname);
const read=(path)=>readFile(resolve(root,path),"utf8");

test("league fixtures use permanent URLs and two scheduling states",async()=>{
  const loader=await read("lib/public-fixtures.ts");
  const eventRoute=await read("app/event/[slug]/page.tsx");
  assert.match(loader,/schedule_pending/);
  assert.match(loader,/schedule_confirmed/);
  assert.match(eventRoute,/getPublicFixturePage/);
  assert.match(eventRoute,/PermanentFixturePage/);
  assert.doesNotMatch(eventRoute,/matchweek.*canonical/i);
});

test("priority leagues use matchweek-oriented permanent fixture hubs",async()=>{
  const route=await read("app/football/competition/[competition]/page.tsx");
  const leaguePage=await read("components/LeagueCompetitionPage.tsx");
  const schedule=await read("components/LeagueFixtureSchedule.tsx");
  assert.match(route,/ligue-1/);
  assert.match(route,/premier-league/);
  assert.match(leaguePage,/Full fixture list ready/);
  assert.match(schedule,/Kick-off TBC/);
});

test("football club pages surface pending league fixture windows",async()=>{
  const route=await read("app/sports/[sport]/club/[club]/page.tsx");
  const pending=await read("components/ClubPendingFixtures.tsx");
  assert.match(route,/ClubPendingFixtures/);
  assert.match(pending,/schedule_pending/);
  assert.match(pending,/fixtureWindowLabel/);
});
