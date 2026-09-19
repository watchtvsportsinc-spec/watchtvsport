import assert from "node:assert/strict";
import test from "node:test";
import { resolve } from "node:path";
import { createJiti } from "jiti";

const root = resolve(new URL("..", import.meta.url).pathname);
const jiti = createJiti(import.meta.url, { interopDefault: true });

function event(overrides = {}) {
  return {
    id: "test-event",
    slug: "test-event",
    detailPath: "/event/test-event",
    sport: "football",
    competition: "Test competition",
    competitionSlug: "test-competition",
    eventDate: "2026-09-20T12:00:00Z",
    title: "Test event",
    broadcasts: [],
    ...overrides,
  };
}

test("competition rights are never promoted to event confirmations", async () => {
  const { getPriorityBroadcasts } = await jiti.import(resolve(root, "lib/priority-broadcasts.ts"));

  assert.deepEqual(getPriorityBroadcasts(event({ sport: "football", competitionSlug: "champions-league" })), []);
  assert.deepEqual(getPriorityBroadcasts(event({ sport: "formula-1", competitionSlug: "formula-1" })), []);
  assert.deepEqual(getPriorityBroadcasts(event({
    sport: "ufc",
    competitionSlug: "ufc",
    eventGroupSlug: "ufc-331-van-vs-pantoja-2",
    sessionType: "main_card",
  })), []);
});

test("event-specific official evidence can still create a confirmation", async () => {
  const { getPriorityBroadcasts } = await jiti.import(resolve(root, "lib/priority-broadcasts.ts"));
  const offers = getPriorityBroadcasts(event({
    sport: "ufc",
    competitionSlug: "ufc",
    eventGroupSlug: "ufc-332-silva-vs-wang",
    sessionType: "main_card",
  }));

  assert.equal(offers.length, 1);
  assert.equal(offers[0].broadcaster, "CBS");
  assert.equal(offers[0].coverageStatus, "confirmed");
  assert.match(offers[0].sourceUrl, /^https:\/\/www\.ufc\.com\/news\//);
});
