import { readFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";

const SOURCES_URL = new URL("../data/verified-club-logo-sources.json", import.meta.url);
const REQUEST_TIMEOUT_MS = 8_000;
const USER_AGENT = "WatchTVSport/1.0 (+https://watchtvsport.com)";

function attrs(tag) {
  const out = {};
  const re = /([:\w-]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/g;
  for (const match of tag.matchAll(re)) out[match[1].toLowerCase()] = match[2] ?? match[3] ?? match[4] ?? "";
  return out;
}

function absolute(value, base) {
  if (!value || value.startsWith("data:")) return null;
  try {
    const u = new URL(value, base);
    return u.protocol === "https:" ? u.toString() : null;
  } catch { return null; }
}

function sameSite(url, base) {
  try {
    const host = new URL(url).hostname.replace(/^www\./, "");
    const baseHost = new URL(base).hostname.replace(/^www\./, "");
    return host === baseHost || host.endsWith(`.${baseHost}`);
  } catch { return false; }
}

function score(candidate, source) {
  const text = `${candidate.alt} ${candidate.title} ${candidate.className} ${candidate.url}`.toLowerCase();
  const tokens = source.name.toLowerCase().split(/[^a-z0-9]+/).filter((token) => token.length > 3);
  let value = 0;
  if (/logo|crest|badge|emblem|brand/.test(text)) value += 8;
  if (/header|navbar|site-logo|club-logo/.test(text)) value += 4;
  for (const token of tokens) if (text.includes(token)) value += 2;
  if (/sponsor|partner|player|hero|news|ticket|store|footer/.test(text)) value -= 6;
  if (/\.svg(?:\?|$)/i.test(candidate.url)) value += 3;
  if (/\.png(?:\?|$)/i.test(candidate.url)) value += 2;
  return value;
}

export function discoverLogoFromHtml(html, source) {
  const candidates = [];
  for (const match of html.matchAll(/<img\b[^>]*>/gi)) {
    const a = attrs(match[0]);
    const raw = a.src || a["data-src"] || a["data-lazy-src"] || a.srcset?.split(",")[0]?.trim().split(/\s+/)[0];
    const url = absolute(raw, source.officialWebsiteUrl);
    if (!url || !sameSite(url, source.officialWebsiteUrl)) continue;
    const candidate = { url, alt: a.alt ?? "", title: a.title ?? "", className: a.class ?? "" };
    candidates.push({ ...candidate, score: score(candidate, source) });
  }
  candidates.sort((a, b) => b.score - a.score);
  return candidates[0]?.score >= 8 ? candidates[0] : null;
}

async function main() {
  const sources = JSON.parse(await readFile(SOURCES_URL, "utf8"));
  const results = [];
  for (const source of sources) {
    try {
      const response = await fetch(source.officialWebsiteUrl, {
        headers: { "user-agent": USER_AGENT, accept: "text/html,application/xhtml+xml" },
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });
      if (!response.ok) {
        results.push({ ...source, status: "fetch_failed", httpStatus: response.status });
        continue;
      }
      const logo = discoverLogoFromHtml(await response.text(), source);
      results.push(logo ? {
        ...source,
        entityType: "participant",
        assetKind: "team_logo",
        status: "discovered",
        mediaUrl: logo.url,
        altText: logo.alt || `${source.name} official club logo`,
        confidenceScore: logo.score,
      } : { ...source, status: "logo_not_found" });
    } catch (error) {
      results.push({ ...source, status: "fetch_failed", error: error instanceof Error ? error.name : "FetchError" });
    }
  }
  process.stdout.write(`${JSON.stringify({ discovered: results.filter((r) => r.status === "discovered").length, unresolved: results.filter((r) => r.status !== "discovered").length, results }, null, 2)}\n`);
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) main().catch((error) => { console.error(error); process.exitCode = 1; });
