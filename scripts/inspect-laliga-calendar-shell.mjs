const url = "https://www.laliga.com/calendar-2026-2027/laliga-easports";
const headers = { "user-agent": "WatchTVSport/1.0 (+https://watchtvsport.com)", accept: "text/html,application/xhtml+xml" };
const response = await fetch(url, { headers, signal: AbortSignal.timeout(10000) });
if (!response.ok) throw new Error(`fetch failed ${response.status}`);
const html = await response.text();
const scripts = [...html.matchAll(/<script[^>]+src=["']([^"']+)["']/gi)].map((match) => new URL(match[1], url).href);
const links = [...html.matchAll(/<link[^>]+href=["']([^"']+)["']/gi)].map((match) => new URL(match[1], url).href);

const inspectedScripts = [];
for (const scriptUrl of scripts.filter((value) => value.includes("assets.laliga.com") && !value.includes("jquery"))) {
  const scriptResponse = await fetch(scriptUrl, { headers: { ...headers, accept: "application/javascript,text/javascript,*/*" }, signal: AbortSignal.timeout(10000) });
  const text = scriptResponse.ok ? await scriptResponse.text() : "";
  const candidates = [...text.matchAll(/(?:https?:\\?\/\\?\/[^"'`\s)]+|\/[A-Za-z0-9_?=&.\/-]{8,})/g)]
    .map((match) => match[0].replaceAll("\\/", "/"))
    .filter((value) => /api|calendar|calend|match|fixture|season|round|jornada/i.test(value));
  inspectedScripts.push({
    url: scriptUrl,
    status: scriptResponse.status,
    bytes: text.length,
    candidates: [...new Set(candidates)].slice(0, 200),
    fetchSnippets: [...text.matchAll(/.{0,180}(?:fetch\(|ajax|\.get\(|\.getJSON\(|axios).{0,300}/gi)].map((match) => match[0]).slice(0, 50),
  });
}

const output = {
  url,
  status: response.status,
  bytes: html.length,
  scripts,
  links,
  nextData: html.match(/<script[^>]+id=["']__NEXT_DATA__["'][^>]*>([\s\S]*?)<\/script>/i)?.[1]?.slice(0, 5000) ?? null,
  inspectedScripts,
  snippet: html.slice(0, 2500),
};
process.stdout.write(`${JSON.stringify(output, null, 2)}\n`);
