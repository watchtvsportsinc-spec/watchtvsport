import { pathToFileURL } from "node:url";

export const LEAGUES = {
  laliga: {
    name: "LALIGA",
    clubsUrl: "https://www.laliga.com/laliga-easports/clubes",
    allowedHosts: ["laliga.com", "www.laliga.com", "assets.laliga.com", "iaas-public-front-pro.laliga.com"],
    clubPathMarkers: ["/clubes/", "/clubs/"],
  },
};

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

function slugFromClubUrl(url) {
  const parts = new URL(url).pathname.split("/").filter(Boolean);
  const markerIndex = parts.findIndex((part) => part === "clubes" || part === "clubs");
  return markerIndex >= 0 ? parts[markerIndex + 1] ?? "" : "";
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
    const slug = slugFromClubUrl(url);
    if (!slug || ["calendario", "calendar", "clubes", "clubs"].includes(slug)) continue;
    const label = textFromHtml(match[3]) || slug.replaceAll("-", " ");
    if (!links.has(slug)) links.set(slug, { slug, label, url });
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
  if (/escudo|shield|crest|logo/.test(haystack)) score += 8;
  if (/club|team/.test(haystack)) score += 2;
  for (const token of clubTokens) if (haystack.includes(token)) score += 2;
  if (/player|jugador|stadium|estadio|kit|shirt|banner|hero|news/.test(haystack)) score -= 7;
  if (/\.svg(?:\?|$)/i.test(candidate.url)) score += 3;
  if (/\.png(?:\?|$)/i.test(candidate.url)) score += 2;
  if (/assets\./i.test(candidate.url)) score += 1;
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

export async function discoverLeagueLogos(leagueKey, { fetchImpl = fetch } = {}) {
  const config = LEAGUES[leagueKey];
  if (!config) throw new Error(`Unknown league: ${leagueKey}`);
  const listResponse = await fetchImpl(config.clubsUrl, { headers: { "user-agent": "WatchTVSport/1.0 (+https://watchtvsport.com)" } });
  if (!listResponse.ok) throw new Error(`Unable to fetch ${config.clubsUrl}: ${listResponse.status}`);
  const clubs = extractClubLinks(await listResponse.text(), config);
  const results = [];
  for (const club of clubs) {
    const response = await fetchImpl(club.url, { headers: { "user-agent": "WatchTVSport/1.0 (+https://watchtvsport.com)" } });
    if (!response.ok) {
      results.push({ ...club, status: "fetch_failed", httpStatus: response.status });
      continue;
    }
    const logo = extractBestLogo(await response.text(), club, config);
    results.push(logo ? {
      entityType: "participant",
      entityKey: club.slug,
      assetKind: "team_logo",
      status: "discovered",
      sourceName: config.name,
      sourceUrl: club.url,
      mediaUrl: logo.url,
      altText: logo.alt || `${club.label} official team logo`,
      confidenceScore: logo.score,
    } : { ...club, status: "logo_not_found" });
  }
  return results;
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
