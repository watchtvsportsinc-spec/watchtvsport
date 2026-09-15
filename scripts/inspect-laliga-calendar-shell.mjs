const url = "https://www.laliga.com/calendar-2026-2027/laliga-easports";
const response = await fetch(url, {
  headers: { "user-agent": "WatchTVSport/1.0 (+https://watchtvsport.com)", accept: "text/html,application/xhtml+xml" },
  signal: AbortSignal.timeout(10000),
});
if (!response.ok) throw new Error(`fetch failed ${response.status}`);
const html = await response.text();
const scripts = [...html.matchAll(/<script[^>]+src=["']([^"']+)["']/gi)].map((match) => new URL(match[1], url).href);
const links = [...html.matchAll(/<link[^>]+href=["']([^"']+)["']/gi)].map((match) => new URL(match[1], url).href);
const output = {
  url,
  status: response.status,
  bytes: html.length,
  scripts,
  links,
  nextData: html.match(/<script[^>]+id=["']__NEXT_DATA__["'][^>]*>([\s\S]*?)<\/script>/i)?.[1]?.slice(0, 5000) ?? null,
  snippet: html.slice(0, 5000),
};
process.stdout.write(`${JSON.stringify(output, null, 2)}\n`);
