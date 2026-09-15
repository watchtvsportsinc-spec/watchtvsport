import { pathToFileURL } from "node:url";

export const EXPECTED_FIXTURES = 380;
export const GAMEWEEKS = 38;
export const CALENDAR_PAGE_URL = "https://www.laliga.com/calendar-2026-2027/laliga-easports";
export const CALENDAR_JSON_URL = "https://assets.laliga.com/assets/calendar/calendar-102-1.json";
export const RESULTS_BASE = "https://www.laliga.com/en-GB/laliga-easports/results/2026-27/gameweek-";

const TEAM_ALIASES = new Map([
  ["Athletic Club", "Athletic Club"], ["Atlético de Madrid", "Atletico de Madrid"], ["Atletico de Madrid", "Atletico de Madrid"],
  ["CA Osasuna", "CA Osasuna"], ["Celta", "Celta"], ["RC Celta", "Celta"],
  ["Deportivo Alavés", "Deportivo Alaves"], ["Deportivo Alaves", "Deportivo Alaves"], ["Elche CF", "Elche CF"],
  ["FC Barcelona", "FC Barcelona"], ["Getafe CF", "Getafe CF"], ["Levante UD", "Levante UD"],
  ["Málaga CF", "Malaga CF"], ["Malaga CF", "Malaga CF"], ["R. Racing Club", "Racing Club"],
  ["Real Racing Club", "Racing Club"], ["Racing Club", "Racing Club"], ["Rayo Vallecano", "Rayo Vallecano"],
  ["RC Deportivo", "RC Deportivo"], ["RCD Espanyol de Barcelona", "RCD Espanyol"], ["RCD Espanyol", "RCD Espanyol"],
  ["Real Betis", "Real Betis"], ["Real Madrid", "Real Madrid"], ["Real Sociedad", "Real Sociedad"],
  ["Sevilla FC", "Sevilla FC"], ["Valencia CF", "Valencia CF"], ["Villarreal CF", "Villarreal CF"],
]);

export const TEAMS = [...new Set(TEAM_ALIASES.values())];
const sourceNames = [...TEAM_ALIASES.keys()].sort((a, b) => b.length - a.length);
const esc = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const TEAM_RE = sourceNames.map(esc).join("|");
const RESULT_FIXTURE_RE = new RegExp(`(?:MON|TUE|WED|THU|FRI|SAT|SUN)\\s+(\\d{2}\\.\\d{2}\\.\\d{4})\\s+(\\d{2}:\\d{2})[\\s\\S]{0,220}?(${TEAM_RE})\\s*(?:\\d+)?\\s*-\\s*(?:\\d+)?\\s*(${TEAM_RE})`, "g");

function decodeHtml(value) {
  return value.replaceAll("&amp;", "&").replaceAll("&nbsp;", " ").replaceAll("&#39;", "'").replaceAll("&quot;", '"').replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)));
}

export function htmlToLines(html) {
  return decodeHtml(html.replace(/<script\b[\s\S]*?<\/script>/gi, " ").replace(/<style\b[\s\S]*?<\/style>/gi, " ").replace(/<br\s*\/?>/gi, "\n").replace(/<\/(?:p|div|li|h[1-6]|section|article|span)>/gi, "\n").replace(/<[^>]+>/g, " "))
    .split(/\r?\n/).map((line) => line.replace(/\s+/g, " ").trim()).filter(Boolean);
}

export function htmlToSearchText(html) { return htmlToLines(html).join(" "); }
function canonicalTeam(value) { return TEAM_ALIASES.get(value) ?? null; }
function isoDate(value) { const [day, month, year] = value.split("."); return `${year}-${month}-${day}`; }

export function extractCalendarJsonFixtures(payload) {
  const gameweeks = Array.isArray(payload) ? payload : Object.values(payload ?? {});
  const fixtures = [];
  for (const gameweek of gameweeks) {
    const round = Number(gameweek?.gameweek_week);
    const nominalDate = typeof gameweek?.gameweek_date === "string" ? isoDate(gameweek.gameweek_date) : null;
    if (!Number.isInteger(round) || round < 1 || round > GAMEWEEKS || !Array.isArray(gameweek?.matches)) continue;
    for (const match of gameweek.matches) {
      const home = canonicalTeam(match?.local_name);
      const away = canonicalTeam(match?.away_name);
      if (!home || !away || home === away) continue;
      fixtures.push({
        competition: "laliga",
        season: "2026-27",
        gameweek: round,
        localDate: nominalDate,
        localTime: null,
        timezone: "Europe/Madrid",
        home,
        away,
        sourceUrl: CALENDAR_JSON_URL,
        verificationStatus: "confirmed",
        datePrecision: "matchday_nominal",
      });
    }
  }
  return fixtures;
}

export function extractGameweekResults(html, gameweek) {
  const text = htmlToSearchText(html);
  const fixtures = [];
  for (const match of text.matchAll(RESULT_FIXTURE_RE)) {
    const [, sourceDate, localTime, sourceHome, sourceAway] = match;
    const home = canonicalTeam(sourceHome); const away = canonicalTeam(sourceAway);
    if (!home || !away || home === away) continue;
    fixtures.push({ competition: "laliga", season: "2026-27", gameweek, localDate: isoDate(sourceDate), localTime, timezone: "Europe/Madrid", home, away, sourceUrl: `${RESULTS_BASE}${gameweek}`, verificationStatus: "confirmed", datePrecision: "confirmed_kickoff" });
  }
  return fixtures;
}

export function mergeConfirmedKickoffs(calendarFixtures, confirmedFixtures) {
  const confirmed = new Map(confirmedFixtures.map((fixture) => [`${fixture.home}|${fixture.away}`, fixture]));
  return calendarFixtures.map((fixture) => confirmed.get(`${fixture.home}|${fixture.away}`) ? { ...fixture, ...confirmed.get(`${fixture.home}|${fixture.away}`) } : fixture);
}

export function validateFixtures(fixtures) {
  const issues = []; const pairKeys = new Set();
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

async function fetchText(fetchImpl, url) {
  const response = await fetchImpl(url, { headers: { "user-agent": "WatchTVSport/1.0 (+https://watchtvsport.com)", accept: "text/html,application/xhtml+xml" }, signal: AbortSignal.timeout(10000) });
  if (!response.ok) throw new Error(`Unable to fetch ${url}: ${response.status}`);
  return response.text();
}

async function fetchJson(fetchImpl, url) {
  const response = await fetchImpl(url, { headers: { "user-agent": "WatchTVSport/1.0 (+https://watchtvsport.com)", accept: "application/json" }, signal: AbortSignal.timeout(10000) });
  if (!response.ok) throw new Error(`Unable to fetch ${url}: ${response.status}`);
  return response.json();
}

async function fetchConfirmedGameweeks(fetchImpl) {
  const gameweeks = Array.from({ length: GAMEWEEKS }, (_, index) => index + 1); const fixtures = [];
  for (let index = 0; index < gameweeks.length; index += 5) {
    const group = gameweeks.slice(index, index + 5);
    const results = await Promise.all(group.map(async (gameweek) => { try { return extractGameweekResults(await fetchText(fetchImpl, `${RESULTS_BASE}${gameweek}`), gameweek); } catch { return []; } }));
    fixtures.push(...results.flat());
  }
  return fixtures;
}

export async function discoverLaLigaFixtures({ fetchImpl = fetch } = {}) {
  const calendarPayload = await fetchJson(fetchImpl, CALENDAR_JSON_URL);
  const calendarFixtures = extractCalendarJsonFixtures(calendarPayload);
  const baselineValidation = validateFixtures(calendarFixtures);
  if (!baselineValidation.ok) return { source: "LALIGA official website", sourceUrl: CALENDAR_JSON_URL, calendarPageUrl: CALENDAR_PAGE_URL, ...baselineValidation, count: calendarFixtures.length, confirmedKickoffs: 0, fixtures: calendarFixtures };
  const confirmedFixtures = await fetchConfirmedGameweeks(fetchImpl);
  const fixtures = mergeConfirmedKickoffs(calendarFixtures, confirmedFixtures);
  const validation = validateFixtures(fixtures);
  return { source: "LALIGA official website", sourceUrl: CALENDAR_JSON_URL, calendarPageUrl: CALENDAR_PAGE_URL, ...validation, count: fixtures.length, confirmedKickoffs: fixtures.filter((fixture) => fixture.localTime).length, fixtures };
}

async function main() { const result = await discoverLaLigaFixtures(); process.stdout.write(`${JSON.stringify(result, null, 2)}\n`); if (!result.ok) process.exitCode = 2; }
if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) main().catch((error) => { console.error(error instanceof Error ? error.message : error); process.exitCode = 1; });
