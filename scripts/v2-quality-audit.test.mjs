import assert from "node:assert/strict";
import test from "node:test";
import { resolve } from "node:path";
import { createJiti } from "jiti";

const root = resolve(new URL("..", import.meta.url).pathname);
const jiti = createJiti(import.meta.url, { interopDefault: true });

async function load() {
  const { getAllEvents } = await jiti.import(resolve(root, "lib/events.ts"));
  const { sportsRegistry } = await jiti.import(resolve(root, "lib/sports-registry.ts"));
  return { events: getAllEvents(), sportsRegistry };
}

test("V2 launch sports satisfy runtime structural guardrails", async () => {
  const { events, sportsRegistry } = await load();
  const enabled = new Set(sportsRegistry.filter((s) => s.enabled).map((s) => s.slug));
  const ids = new Set();

  for (const event of events) {
    assert.ok(enabled.has(event.sport), `unknown/disabled sport: ${event.sport}`);
    assert.ok(event.id && !ids.has(event.id), `duplicate event id: ${event.id}`);
    ids.add(event.id);
    assert.ok(event.detailPath.startsWith("/"), `invalid detail path: ${event.detailPath}`);
    assert.ok(event.title.trim().length > 0, `empty title: ${event.id}`);

    for (const broadcast of event.broadcasts) {
      if (broadcast.coverageStatus !== "confirmed") continue;
      assert.ok(broadcast.countryCode.trim(), `confirmed broadcast missing country: ${event.id}`);
      assert.ok(broadcast.countryName.trim(), `confirmed broadcast missing country name: ${event.id}`);
      assert.ok(broadcast.broadcaster.trim(), `confirmed broadcast missing broadcaster: ${event.id}`);
      assert.ok(/^https:\/\//.test(broadcast.url), `confirmed broadcast URL must be https: ${event.id}`);
      assert.ok(["Free", "Paid"].includes(broadcast.access), `invalid access type: ${event.id}`);
    }
  }

  const ucl = events.filter((e) => e.sport === "football" && e.competitionSlug === "champions-league");
  const datedF1 = events.filter((e) => e.sport === "formula-1");
  const ufc = events.filter((e) => e.sport === "ufc");
  assert.equal(ucl.length, 144);
  // Runtime local events intentionally contain only F1 sessions with a verified exact timestamp.
  // The complete 23 x 5 = 115 structural session template, including 63 TBC sessions,
  // is validated by export-v2-multisport-seed.test.mjs and rendered from the weekend plan.
  assert.ok(datedF1.length > 0 && datedF1.length < 115);
  assert.equal(ufc.length, 17);
  assert.ok(ucl.every((e) => e.participant1 && e.participant2));
  assert.ok(datedF1.every((e) => !e.participant1 && !e.participant2 && e.eventGroupSlug));
  assert.ok(ufc.every((e) => !e.participant1 && !e.participant2 && e.eventGroupSlug));
});

test("participant-page policy prevents page explosion for individual/race sports", async () => {
  const { sportsRegistry } = await load();
  for (const slug of ["formula-1", "ufc", "tennis", "cycling", "motogp"]) {
    const sport = sportsRegistry.find((item) => item.slug === slug);
    assert.ok(sport, `missing registry entry: ${slug}`);
    assert.equal(sport.participantPages, "none", `${slug} must not create participant pages`);
  }
});
