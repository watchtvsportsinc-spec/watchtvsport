import { resolve } from "node:path";
import { createJiti } from "jiti";
import { auditFootballLeagueSchedule } from "./football-schedule-quality.mjs";

const root = resolve(new URL("..", import.meta.url).pathname);
const jiti = createJiti(import.meta.url, { interopDefault: true });

const { getAllEvents } = await jiti.import(resolve(root, "lib/events.ts"));
const { getFootballLeagueProfile } = await jiti.import(
  resolve(root, "lib/football-league-profiles.ts"),
);

const events = getAllEvents();
const competitionSlugs = ["ligue-1", "premier-league"];
let failed = false;

for (const competitionSlug of competitionSlugs) {
  const profile = getFootballLeagueProfile("football", competitionSlug);
  if (!profile) {
    console.error(`[FAIL] Missing football league profile for ${competitionSlug}.`);
    failed = true;
    continue;
  }

  const report = auditFootballLeagueSchedule(events, profile);

  if (report.status === "not_loaded") {
    console.log(
      `[SKIP] ${profile.displayName} ${profile.seasonLabel}: no fixtures are wired into getAllEvents() yet.`,
    );
    continue;
  }

  if (report.status === "pass") {
    console.log(
      `[PASS] ${profile.displayName} ${profile.seasonLabel}: ${report.fixtureCount} fixtures, ${report.matchdayCount} matchdays, ${report.participantCount} clubs.`,
    );
    continue;
  }

  failed = true;
  console.error(
    `[FAIL] ${profile.displayName} ${profile.seasonLabel}: ${report.issues.length} schedule-quality issue(s).`,
  );
  for (const row of report.issues) {
    console.error(`  - ${row.code}: ${row.message}`);
  }
}

if (failed) process.exitCode = 1;
