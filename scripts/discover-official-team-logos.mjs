import { pathToFileURL } from "node:url";

export const LEAGUES = {
  laliga: {
    name: "LALIGA",
    clubsUrl: "https://www.laliga.com/laliga-easports/clubes",
    allowedHosts: ["laliga.com", "www.laliga.com", "assets.laliga.com", "iaas-public-front-pro.laliga.com"],
    clubPathMarkers: ["/clubes/", "/clubs/"],
    slugMode: "after-marker",
  },
  premierleague: {
    name: "Premier League",
    clubsUrl: "https://www.premierleague.com/en/clubs",
    allowedHosts: ["premierleague.com", "www.premierleague.com", "resources.premierleague.com", "static.premierleague.com"],
    clubPathMarkers: ["/en/clubs/", "/clubs/"],
    slugMode: "after-id",
  },
  bundesliga: {
    name: "Bundesliga",
    clubsUrl: "https://www.bundesliga.com/en/bundesliga/clubs",
    allowedHosts: ["bundesliga.com", "www.bundesliga.com", "assets.bundesliga.com"],
    clubPathMarkers: ["/bundesliga/clubs/"],
    slugMode: "after-marker",
  },
  ligue1: {
    name: "Ligue 1",
    clubsUrl: "https://ligue1.com/en/articles/squads-overview?competitionId=1&gameweek=3",
    allowedHosts: ["ligue1.com", "www.ligue1.com", "assets.ligue1.com", "media.ligue1.com"],
    clubPathMarkers: ["/club-sheet/"],
    slugMode: "label",
  },
};

const REQUEST_TIMEOUT_MS = 8_000;
const DISCOVERY_CONCURRENCY = 5;
const USER_AGENT = "WatchTVSport/1.0 (+https://watchtvsport.com)";

function decodeHtml(value = "") {
  return value
    .replaceAll("&amp;", "&")
    .replaceAll("&quot;", '"')
    .replaceAll("&#39;", "'")
    .replaceAll("&apos;", "'");
}

function attrs(tag) {
  const result = {};
  const pattern = /([:\w-]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/g;
  for (const match of tag.matchAll(pattern)) {
    result[match[1].toLowerCase()] = decodeHtml(match[2] ?? match[3] ?? match[4] ?? "");
  }
  return result;
}

function absoluteUrl(value, baseUrl) {
  if (!value || value.startsWith("data:")) return null;
  try {
    const url = new URL(value, baseUrl);
    if (url.protocol !== "https:") return null;
    return url.toString();
  } catch {
    return null;
  }
}

function allowedHost(url, allowedHosts) {
  try {
    const host = new URL(url).hostname.toLowerCase();
    return allowedHosts.some((allowed) => host === allowed || host.endsWith(`.${allowed}`));
  } catch {
    return false;
  }
}

function textFromHtml(value) {
  return decodeHtml(value.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim());
}

function normalizeSlug(value) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function slugFromClubUrl(url, label, config) {
  if (config.slugMode === "label") return normalizeSlug(label);
  const parts = new URL(url).pathname.split("/").filter(Boolean);
  const markerParts = config.clubPathMarkers
    .map((marker) => marker.split("/").filter(Boolean))
    .sort((a, b) => b.length - a.length);

  for (const marker of markerParts) {
    for (let index = 0; index <= parts.length - marker.length; index += 1) {
      if (!marker.every((part, offset) => parts[index + offset] === part)) continue;
      const nextIndex = index + marker.length;
      if (config.slugMode === "after-id") return parts[nextIndex + 1] ?? "";
      return parts[nextIndex] ?? "";
    }
  }
  return "";
}

export function extractClubLinks(html, config) {
  const links = new Map();
  const anchorPattern = /<a\b[^>]*href\s*=\s*(?:"([^"]+)"|'([^']+)')[^>]*>([\s\S]*?)<\/a>/gi;
  for (const match of html.matchAll(anchorPattern)) {
    const href = match[1] ?? match[2] ?? "";
    const url = absoluteUrl(href, config.clubsUrl);
    if (!url || !allowedHost(url, config.allowedHosts)) continue;
    const path = new URL(url).pathname;
    if (!config.clubPathMarkers.some((marker) => path.includes(marker))) continue;
    const label = textFromHtml(match[3]);
    const slug = slugFromClubUrl(url, label, config);
    if (!slug || ["calendario", "calendar", "clubes", "clubs", "overview", "info"].includes(slug)) continue;
    const finalLabel = label || slug.replaceAll("-", " ");
    if (!links.has(slug)) links.set(slug, { slug, label: finalLabel, url });
  }
  return [...links.values()];
}

function candidateImageUrl(attributes, baseUrl) {
  const direct = [attributes.src, attributes["data-src"], attributes["data-lazy-src"]]
    .map((value) => absoluteUrl(value, baseUrl))
    .find(Boolean);
  if (direct) return direct;
  const srcset = attributes.srcset ?? attributes["data-srcset"];
  if (!srcset) return null;
  const first = srcset.split(",")[0]?.trim().split(/\s+/)[0];
  return absoluteUrl(first, baseUrl);
}

function scoreCandidate(candidate, club) {
  const haystack = `${candidate.alt} ${candidate.title} ${candidate.url}`.toLowerCase();
  const clubTokens = club.slug.split("-").filter((token) => token.length > 2);
  let score = 0;
  if (/escudo|shield|crest|badge|logo|wappen/.test(haystack)) score += 8;
  if (/club|team|verein/.test(haystack)) score += 2;
  for (const token of clubTokens) if (haystack.includes(token)) score += 2;
  if (/player|jugador|spieler|stadium|estadio|stadion|kit|shirt|banner|hero|news/.test(haystack)) score -= 7;
  if (/league|liga|bundesliga|ligue-1-logo|premier-league-logo/.test(haystack) && !clubTokens.some((token) => haystack.includes(token))) score -= 10;
  if (/\.svg(?:\?|$)/i.test(candidate.url)) score += 3;
  if (/\.png(?:\?|$)/i.test(candidate.url)) score += 2;
  if (/assets\.|resources\.|static\.|media\./i.test(candidate.url)) score += 1;
  return score;
}

export function extractBestLogo(html, club, config) {
  const candidates = [];
  for (const match of html.matchAll(/<img\b[^>]*>/gi)) {
    const attributes = attrs(match[0]);
    const url = candidateImageUrl(attributes, club.url);
    if (!url || !allowedHost(url, config.allowedHosts)) continue;
    const candidate = {
      url,
      alt: attributes.alt ?? "",
      title: attributes.title ?? "",
    };
    candidates.push({ ...candidate, score: scoreCandidate(candidate, club) });
  }
  candidates.sort((a, b) => b.score - a.score);
  const best = candidates[0];
  return best && best.score >= 6 ? best : null;
}

async function fetchPage(fetchImpl, url) {
  const response = await fetchImpl(url, {
    headers: { "user-agent": USER_AGENT, accept: "text/html,application/xhtml+xml" },
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
  return response;
}

async function discoverClub(fetchImpl, club, config) {
  try {
    const response = await fetchPage(fetchImpl, club.url);
    if (!response.ok) return { ...club, status: "fetch_failed", httpStatus: response.status };
    const logo = extractBestLogo(await response.text(), club, config);
    return logo ? {
      entityType: "participant",
      entityKey: club.slug,
      assetKind: "team_logo",
      status: "discovered",
      sourceName: config.name,
      sourceUrl: club.url,
      mediaUrl: logo.url,
      altText: logo.alt || `${club.label} official team logo`,
      confidenceScore: logo.score,
    } : { ...club, status: "logo_not_found" };
  } catch (error) {
    return {
      ...club,
      status: "fetch_failed",
      error: error instanceof Error ? error.name : "FetchError",
    };
  }
}

async function mapConcurrent(items, concurrency, worker) {
  const results = new Array(items.length);
  let cursor = 0;
  async function run() {
    while (true) {
      const index = cursor++;
      if (index >= items.length) return;
      results[index] = await worker(items[index], index);
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, run));
  return results;
}

export async function discoverLeagueLogos(leagueKey, { fetchImpl = fetch } = {}) {
  const config = LEAGUES[leagueKey];
  if (!config) throw new Error(`Unknown league: ${leagueKey}`);
  const listResponse = await fetchPage(fetchImpl, config.clubsUrl);
  if (!listResponse.ok) throw new Error(`Unable to fetch ${config.clubsUrl}: ${listResponse.status}`);
  const clubs = extractClubLinks(await listResponse.text(), config);
  return mapConcurrent(clubs, DISCOVERY_CONCURRENCY, (club) => discoverClub(fetchImpl, club, config));
}

async function main() {
  const leagueIndex = process.argv.indexOf("--league");
  const league = leagueIndex >= 0 ? process.argv[leagueIndex + 1] : "laliga";
  const results = await discoverLeagueLogos(league);
  const summary = {
    league,
    discovered: results.filter((item) => item.status === "discovered").length,
    unresolved: results.filter((item) => item.status !== "discovered").length,
    results,
  };
  process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`);
  if (summary.unresolved > 0) process.exitCode = 2;
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
}
