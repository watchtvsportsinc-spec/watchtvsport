import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const root = resolve(new URL("..", import.meta.url).pathname);
const file = (path) => readFile(resolve(root, path), "utf8");

test("sitemap preserves canonical archives and excludes utility pages", async () => {
  const sitemap = await file("app/sitemap.ts");

  for (const required of [
    'sitemapEntry("/archive/world-cup-2026")',
    'sitemapEntry("/methodology")',
    '`/match/${match.slug}`',
    '`/watch/${match.slug}/${code}`',
  ]) {
    assert.ok(sitemap.includes(required), `missing sitemap contract: ${required}`);
  }

  for (const utilityPath of ["/favorites", "/calendar", "/schedule", "/thank-you-calendar", "/report-error"]) {
    assert.ok(!sitemap.includes(`sitemapEntry("${utilityPath}")`), `utility page must stay out of sitemap: ${utilityPath}`);
  }

  assert.match(sitemap, /new Map<string, SitemapEntry>\(\)/);
  assert.match(sitemap, /deduped\.set\(entry\.url, entry\)/);
});

test("view-state and personal pages cannot create duplicate indexable URLs", async () => {
  const [home, events, favorites] = await Promise.all([
    file("app/page.tsx"),
    file("app/events/page.tsx"),
    file("app/favorites/page.tsx"),
  ]);

  assert.match(home, /hasViewState \? \{ index: false, follow: true \}/);
  assert.match(home, /alternates: \{ canonical: "\/" \}/);
  assert.match(events, /hasFacet \? \{ index: false, follow: true \}/);
  assert.match(events, /alternates: \{ canonical: "\/events" \}/);
  assert.match(favorites, /robots: \{ index: false, follow: true \}/);
});

test("SEO eligibility keeps utility pages and unstable canonicals out", async () => {
  const policy = await file("lib/seo-indexability.ts");
  assert.match(policy, /kind === "utility"/);
  assert.match(policy, /unstable-canonical/);
  assert.match(policy, /index: false, follow: true/);
});
