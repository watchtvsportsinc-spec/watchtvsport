import { pathToFileURL } from "node:url";

export const EXPECTED_FIXTURES = 380;
export const GAMEWEEKS = 38;
export const SOURCE_BASE = "https://www.laliga.com/en-GB/laliga-easports/results/2026-27/gameweek-";

const TEAM_ALIASES = new Map([
  ["Athletic Club", "Athletic Club"],
  ["Atlético de Madrid", "Atletico de Madrid"],
  ["Atletico de Madrid", "Atletico de Madrid"],
  ["CA Osasuna", "CA Osasuna"],
  ["Celta", "Celta"],
  ["RC Celta", "Celta"],
  ["Deportivo Alavés", "Deportivo Alaves"],
  ["Deportivo Alaves", "Deportivo Alaves"],
  ["Elche CF", "Elche CF"],
  ["FC Barcelona", "FC Barcelona"],
  ["Getafe CF", "Getafe CF"],
  ["Levante UD", "Levante UD"],
  ["Málaga CF", "Malaga CF"],
  ["Malaga CF", "Malaga CF"],
  ["R. Racing Club", "Racing Club"],
  ["Real Racing Club", "Racing Club"],
  ["Racing Club", "Racing Club"],
  ["Rayo Vallecano", "Rayo Vallecano"],
  ["RC Deportivo", "RC Deportivo"],
  ["RCD Espanyol de Barcelona", "RCD Espanyol"],
  ["RCD Espanyol", "RCD Espanyol"],
  ["Real Betis", "Real Betis"],
  ["Real Madrid", "Real Madrid"],
  ["Real Sociedad", "Real Sociedad"],
  ["Sevilla FC", "Sevilla FC"],
  ["Valencia CF", "Valencia CF"],
  ["Villarreal CF", "Villarreal CF"],
]);

export const TEAMS = [...new Set(TEAM_ALIASES.values())];
const sourceNames = [...TEAM_ALIASES.keys()].sort((a, b) => b.length - a.length);
const esc = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const TEAM_RE = sourceNames.map(esc).join("|");
const FIXTURE_RE = new RegExp(`(?:MON|TUE|WED|THU|FRI|SAT|SUN)\\s+(\\d{2}\\.\\d{2}\\.\\d{4})\\s+(\\d{2}:\\d{2})[\\s\\S]{0,220}?(${TEAM_RE})\\s*(?:\\d+)?\\s*-\\s*(?:\\d+)?\\s*(${TEAM_RE})`, "g");

function decodeHtml(value) {
  return value
    .replaceAll("&amp;", "&")
    .replaceAll("&nbsp;", " ")
    .replaceAll("&#39;", "'")
    .replaceAll("&quot;", '"')
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)));
}

export function htmlToSearchText(html) {
  return decodeHtml(html
    .replace(/<script\b[\s\S]*?<\/script>/gi, " ")
    .replace(/<style\b[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " "));
}

function isoDate(value) {
  const [day, month, year] = value.split(".");
  return `${year}-${month}-${day}`;
}

export function extractGameweekFixtures(html, gameweek) {
  const text = htmlToSearchText(html);
  const fixtures = [];
  for (const match of text.matchAll(FIXTURE_RE)) {
    const [, sourceDate, localTime, sourceHome, sourceAway] = match;
    const home = TEAM_ALIASES.get(sourceHome);
    const away = TEAM_ALIASES.get(sourceAway);
    if (!home || !away || home === away) continue;
    fixtures.push({
      competition: "laliga",
      season: "2026-27",
      gameweek,
      localDate: isoDate(sourceDate),
      localTime,
      timezone: "Europe/Madrid",
      home,
      away,
      sourceUrl: `${SOURCE_BASE}${gameweek}`,
      verificationStatus: "confirmed",
    });
  }
  return fixtures;
}

export function validateFixtures(fixtures) {
  const issues = [];
  const pairKeys = new Set();
  if (fixtures.length !== EXPECTED_FIXTURES) issues.push(`expected ${EXPECTED_FIXTURES} fixtures, found ${fixtures.length}`);
  for (const fixture of fixtures) {
    if (!TEAMS.includes(fixture.home) || !TEAMS.includes(fixture.away)) issues.push(`unknown team in ${fixture.home} v ${fixture.away}`);
    const pair = `${fixture.home}|${fixture.away}`;
    if (pairKeys.has(pair)) issues.push(`duplicate home-away pair ${pair}`);
    pairKeys.add(pair);
  }
  if (pairKeys.size !== EXPECTED_FIXTURES) issues.push(`expected ${EXPECTED_FIXTURES} unique home-away pairs, found ${pairKeys.size}`);
  return { ok: issues.length === 0, issues };
}

async function fetchGameweek(fetchImpl, gameweek) {
  const url = `${SOURCE_BASE}${gameweek}`;
  const response = await fetchImpl(url, {
    headers: { "user-agent": "WatchTVSport/1.0 (+https://watchtvsport.com)", accept: "text/html,application/xhtml+xml" },
    signal: AbortSignal.timeout(10000),
  });
  if (!response.ok) throw new Error(`Unable to fetch LaLiga gameweek ${gameweek}: ${response.status}`);
  return extractGameweekFixtures(await response.text(), gameweek);
}

export async function discoverLaLigaFixtures({ fetchImpl = fetch } = {}) {
  const gameweeks = Array.from({ length: GAMEWEEKS }, (_, index) => index + 1);
  const chunks = [];
  for (let index = 0; index < gameweeks.length; index += 5) {
    const group = gameweeks.slice(index, index + 5);
    chunks.push(...(await Promise.all(group.map((gameweek) => fetchGameweek(fetchImpl, gameweek)))).flat());
  }
  const validation = validateFixtures(chunks);
  return {
    source: "LALIGA official website",
    sourceUrl: "https://www.laliga.com/en-GB/laliga-easports/results",
    ...validation,
    count: chunks.length,
    fixtures: chunks,
  };
}

async function main() {
  const result = await discoverLaLigaFixtures();
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  if (!result.ok) process.exitCode = 2;
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  main().catch((error) => { console.error(error instanceof Error ? error.message : error); process.exitCode = 1; });
}
