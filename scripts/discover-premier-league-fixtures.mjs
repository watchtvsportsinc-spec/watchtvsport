import { pathToFileURL } from "node:url";

export const SOURCE_URL = "https://www.premierleague.com/en/news/4675097/all-380-fixtures-for-202627-premier-league-season/";
export const EXPECTED_FIXTURES = 380;

const MONTHS = new Map([
  ["January", "01"], ["February", "02"], ["March", "03"], ["April", "04"],
  ["May", "05"], ["June", "06"], ["July", "07"], ["August", "08"],
  ["September", "09"], ["October", "10"], ["November", "11"], ["December", "12"],
]);

export const TEAMS = [
  "AFC Bournemouth", "Arsenal", "Aston Villa", "Brentford", "Brighton & Hove Albion",
  "Chelsea", "Coventry City", "Crystal Palace", "Everton", "Fulham", "Hull City",
  "Ipswich Town", "Leeds United", "Liverpool", "Manchester City", "Manchester United",
  "Newcastle United", "Nottingham Forest", "Sunderland", "Tottenham Hotspur",
];

const teamAlternation = TEAMS
  .slice()
  .sort((a, b) => b.length - a.length)
  .map((team) => team.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
  .join("|");
const FIXTURE_RE = new RegExp(`^(?:(\\d{1,2}:\\d{2})\\s+)?(${teamAlternation})\\s+v\\s+(${teamAlternation})(?:\\s+\\([^)]*\\))?$`);
const DATE_RE = /^(?:Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)\s+(\d{1,2})\s+([A-Z][a-z]+)(?:\s+(\d{4}))?$/;

function decodeHtml(value) {
  return value
    .replaceAll("&amp;", "&")
    .replaceAll("&nbsp;", " ")
    .replaceAll("&#39;", "'")
    .replaceAll("&quot;", '"')
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)));
}

export function htmlToLines(html) {
  return decodeHtml(
    html
      .replace(/<script\b[\s\S]*?<\/script>/gi, " ")
      .replace(/<style\b[\s\S]*?<\/style>/gi, " ")
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/(?:p|div|li|h[1-6])>/gi, "\n")
      .replace(/<[^>]+>/g, " ")
  )
    .split(/\r?\n/)
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter(Boolean);
}

function isoDate(day, month, year) {
  const mm = MONTHS.get(month);
  if (!mm) return null;
  return `${year}-${mm}-${String(day).padStart(2, "0")}`;
}

export function extractFixturesFromLines(lines, defaultYear = 2026) {
  let currentDate = null;
  let currentYear = defaultYear;
  const fixtures = [];
  for (const line of lines) {
    const dateMatch = line.match(DATE_RE);
    if (dateMatch) {
      if (dateMatch[3]) currentYear = Number(dateMatch[3]);
      else if (dateMatch[2] === "January" && currentDate?.slice(5, 7) === "12") currentYear += 1;
      currentDate = isoDate(Number(dateMatch[1]), dateMatch[2], currentYear);
      continue;
    }
    if (!currentDate) continue;
    const fixtureMatch = line.match(FIXTURE_RE);
    if (!fixtureMatch) continue;
    const [, localTime, home, away] = fixtureMatch;
    fixtures.push({
      competition: "premier-league",
      season: "2026-27",
      localDate: currentDate,
      localTime: localTime ?? null,
      timezone: "Europe/London",
      home,
      away,
      sourceUrl: SOURCE_URL,
      verificationStatus: "confirmed",
    });
  }
  return fixtures;
}

export function validateFixtures(fixtures) {
  const issues = [];
  if (fixtures.length !== EXPECTED_FIXTURES) issues.push(`expected ${EXPECTED_FIXTURES} fixtures, found ${fixtures.length}`);
  const keys = new Set();
  for (const fixture of fixtures) {
    if (!TEAMS.includes(fixture.home) || !TEAMS.includes(fixture.away)) issues.push(`unknown team in ${fixture.home} v ${fixture.away}`);
    if (fixture.home === fixture.away) issues.push(`same home/away team: ${fixture.home}`);
    const key = `${fixture.localDate}|${fixture.home}|${fixture.away}`;
    if (keys.has(key)) issues.push(`duplicate fixture ${key}`);
    keys.add(key);
  }
  return { ok: issues.length === 0, issues };
}

export async function discoverPremierLeagueFixtures({ fetchImpl = fetch } = {}) {
  const response = await fetchImpl(SOURCE_URL, {
    headers: { "user-agent": "WatchTVSport/1.0 (+https://watchtvsport.com)", accept: "text/html,application/xhtml+xml" },
    signal: AbortSignal.timeout(10000),
  });
  if (!response.ok) throw new Error(`Unable to fetch official Premier League fixtures: ${response.status}`);
  const fixtures = extractFixturesFromLines(htmlToLines(await response.text()));
  const validation = validateFixtures(fixtures);
  return { source: "Premier League official website", sourceUrl: SOURCE_URL, ...validation, count: fixtures.length, fixtures };
}

async function main() {
  const result = await discoverPremierLeagueFixtures();
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  if (!result.ok) process.exitCode = 2;
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
}
