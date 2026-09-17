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

test("one permanent matchup URL can select an exact dated occurrence",async()=>{
  const loader=await read("lib/public-fixtures.ts");
  const eventRoute=await read("app/event/[slug]/page.tsx");
  const nextGames=await read("components/MatchNextGames.tsx");
  const legacyUcl=await read("app/football/champions-league/[fixture]/page.tsx");

  assert.match(loader,/get_public_matchup_page_v1/);
  assert.match(loader,/getPublicMatchupPage/);
  assert.match(eventRoute,/searchParams/);
  assert.match(eventRoute,/event: eventId/);
  assert.match(eventRoute,/alternates: \{ canonical: fixture\.detailPath \}/);
  assert.match(nextGames,/\?event=\$\{encodeURIComponent\(event\.id\)\}/);
  assert.doesNotMatch(nextGames,/competition: competitionSlug/);
  assert.doesNotMatch(nextGames,/event\.slug !== currentEventSlug/);
  assert.match(legacyUcl,/permanentRedirect\(`\/event\/\$\{fixture\}`\)/);
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
