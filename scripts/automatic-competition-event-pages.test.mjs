import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("competition discovery is Supabase-driven and publication-gated", async () => {
  const [loader, migration, sitemap] = await Promise.all([
    read("lib/public-competition-directory.ts"),
    read("supabase-v2-automatic-competition-event-pages.sql"),
    read("app/sitemap.ts"),
  ]);
  assert.match(loader, /get_public_competition_directory_v1/);
  assert.match(migration, /c\.is_active = true/);
  assert.match(migration, /s\.is_enabled = true/);
  assert.match(migration, /c\.metadata_status in \('reviewed', 'verified'\)/);
  assert.match(sitemap, /getPublicCompetitionDirectory\(\)/);
  assert.match(sitemap, /competition\.participantCount \+ competition\.publishedEventCount/);
});

test("published events are discovered through a bounded paginated directory", async () => {
  const [loader, migration, sitemap] = await Promise.all([
    read("lib/public-event-directory.ts"),
    read("supabase-v2-automatic-competition-event-pages.sql"),
    read("app/sitemap.ts"),
  ]);
  assert.match(loader, /PAGE_SIZE = 500/);
  assert.match(loader, /MAX_PAGES = 20/);
  assert.match(loader, /get_public_event_directory_v1/);
  assert.match(migration, /e\.is_published = true/);
  assert.match(migration, /e\.verification_status in \('confirmed', 'expected'\)/);
  assert.match(migration, /v_limit integer := greatest\(1, least\(coalesce\(p_limit, 500\), 500\)\)/);
  assert.match(sitemap, /getPublicEventDirectory\(\)/);
  assert.match(sitemap, /event\.detailPath/);
});

test("permanent fixture pages win over edition-specific event slugs", async () => {
  const migration = await read("supabase-v2-automatic-competition-event-pages.sql");
  assert.match(migration, /ep\.entity_kind = 'fixture'/);
  assert.match(migration, /ep\.verification_status = 'confirmed'/);
  assert.match(migration, /ee\.verification_status = 'confirmed'/);
  assert.match(migration, /then '\/event\/' \|\| ep\.slug/);
  assert.match(migration, /else '\/event\/' \|\| e\.slug/);
  assert.match(migration, /then 'permanent-page'/);
});

test("generic competition and event routes remain data-driven", async () => {
  const [competitionRoute, eventRoute, competitionPage, eventPage] = await Promise.all([
    read("app/sports/[sport]/competition/[competition]/page.tsx"),
    read("app/event/[slug]/page.tsx"),
    read("components/UniversalCompetitionPage.tsx"),
    read("components/UniversalEventPage.tsx"),
  ]);
  assert.match(competitionRoute, /UniversalCompetitionPage/);
  assert.match(competitionPage, /getPublicCompetition\(sport,competition\)/);
  assert.match(competitionPage, /getPublicEventsSnapshot/);
  assert.match(eventRoute, /UniversalEventPage/);
  assert.match(eventRoute, /getPublicFixturePage\(slug\)/);
  assert.match(eventPage, /getPublicEventsSnapshot\(\{slug,limit:1\}\)/);
});

test("competition updates are visible quickly and drafts stay hidden", async () => {
  const loader = await read("lib/public-competition.ts");
  assert.match(loader, /revalidate:300/);
  assert.match(loader, /is_enabled=eq\.true/);
  assert.match(loader, /is_active=eq\.true/);
  assert.match(loader, /metadata_status=in\.\(reviewed,verified\)/);
});
