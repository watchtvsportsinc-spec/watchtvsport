import { pathToFileURL } from "node:url";

export const EXPECTED_FIXTURES = 306;
export const MATCHDAYS = 34;
export const SOURCE_BASE = "https://www.bundesliga.com/en/bundesliga/matchday/2026-2027/";

const TEAM_ALIASES = new Map([
  ["FCA", "Augsburg"],
  ["B04", "Bayer Leverkusen"],
  ["FCB", "Bayern Munich"],
  ["BVB", "Borussia Dortmund"],
  ["BMG", "Borussia Mönchengladbach"],
  ["KOE", "Cologne"],
  ["SGE", "Eintracht Frankfurt"],
  ["ELV", "Elversberg"],
  ["SCF", "Freiburg"],
  ["HSV", "Hamburg"],
  ["TSG", "Hoffenheim"],
  ["M05", "Mainz"],
  ["SCP", "Paderborn"],
  ["RBL", "RB Leipzig"],
  ["S04", "Schalke"],
  ["FCU", "Union Berlin"],
  ["VFB", "VfB Stuttgart"],
  ["SVW", "Werder Bremen"],
]);

export const TEAMS = [...TEAM_ALIASES.values()];
const ABBR_RE = [...TEAM_ALIASES.keys()].join("|");

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

function canonicalTeam(abbr) {
  return TEAM_ALIASES.get(abbr.toUpperCase()) ?? null;
}

function pairKey(home, away) {
  return `${home}|${away}`;
}

export function extractMatchdayFixtures(html, matchday) {
  const text = htmlToSearchText(html);
  const fixtures = [];
  const seen = new Set();
  const loose = new RegExp(`(${ABBR_RE})\\s*(?:\\d+)?\\s*(${ABBR_RE})`, "g");

  for (const match of text.matchAll(loose)) {
    const home = canonicalTeam(match[1]);
    const away = canonicalTeam(match[2]);
    if (!home || !away || home === away) continue;
    const key = pairKey(home, away);
    if (seen.has(key)) continue;
    seen.add(key);
    fixtures.push({
      competition: "bundesliga",
      season: "2026-27",
      matchday,
      localDate: null,
      localTime: null,
      timezone: "Europe/Berlin",
      home,
      away,
      sourceUrl: `${SOURCE_BASE}${matchday}`,
      verificationStatus: "confirmed",
      datePrecision: "matchday_only",
    });
  }

  return fixtures.slice(0, 9);
}

export function validateFixtures(fixtures) {
  const issues = [];
  const pairKeys = new Set();
  if (fixtures.length !== EXPECTED_FIXTURES) issues.push(`expected ${EXPECTED_FIXTURES} fixtures, found ${fixtures.length}`);
  for (const fixture of fixtures) {
    if (!TEAMS.includes(fixture.home) || !TEAMS.includes(fixture.away)) issues.push(`unknown team in ${fixture.home} v ${fixture.away}`);
    const pair = pairKey(fixture.home, fixture.away);
    if (pairKeys.has(pair)) issues.push(`duplicate home-away pair ${pair}`);
    pairKeys.add(pair);
  }
  if (pairKeys.size !== EXPECTED_FIXTURES) issues.push(`expected ${EXPECTED_FIXTURES} unique home-away pairs, found ${pairKeys.size}`);
  return { ok: issues.length === 0, issues };
}

async function fetchText(fetchImpl, url) {
  const response = await fetchImpl(url, {
    headers: { "user-agent": "WatchTVSport/1.0 (+https://watchtvsport.com)", accept: "text/html,application/xhtml+xml" },
    signal: AbortSignal.timeout(10000),
  });
  if (!response.ok) throw new Error(`Unable to fetch ${url}: ${response.status}`);
  return response.text();
}

export async function discoverBundesligaFixtures({ fetchImpl = fetch } = {}) {
  const fixtures = [];
  for (let index = 1; index <= MATCHDAYS; index += 5) {
    const group = Array.from({ length: Math.min(5, MATCHDAYS - index + 1) }, (_, offset) => index + offset);
    const pages = await Promise.all(group.map(async (matchday) => extractMatchdayFixtures(await fetchText(fetchImpl, `${SOURCE_BASE}${matchday}`), matchday)));
    fixtures.push(...pages.flat());
  }
  const validation = validateFixtures(fixtures);
  return {
    source: "Bundesliga official website",
    sourceUrl: `${SOURCE_BASE}1`,
    ...validation,
    count: fixtures.length,
    fixtures,
  };
}

async function main() {
  const result = await discoverBundesligaFixtures();
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  if (!result.ok) process.exitCode = 2;
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  main().catch((error) => { console.error(error instanceof Error ? error.message : error); process.exitCode = 1; });
}
