import test from "node:test";
import assert from "node:assert/strict";
import { buildV2MultisportSeed } from "./export-v2-multisport-seed.mjs";
import { buildSeedApplyPlan } from "./apply-v2-seed-to-supabase.mjs";

test("Supabase apply plan resolves UCL, F1 and UFC dependencies in safe order", async () => {
  const bundle = await buildV2MultisportSeed();
  const plan = buildSeedApplyPlan(bundle);

  assert.equal(plan.operations.length, 525);

  const counts = plan.operations.reduce((acc, operation) => {
    acc[operation.table] = (acc[operation.table] ?? 0) + 1;
    return acc;
  }, {});

  assert.deepEqual(counts, {
    sports: 3,
    competitions: 3,
    seasons: 3,
    participants: 36,
    event_pages: 174,
    event_editions: 30,
    events: 276,
  });

  const tableOrder = ["sports", "competitions", "seasons", "participants", "event_pages", "event_editions", "events"];
  const firstIndex = new Map(tableOrder.map((table) => [table, plan.operations.findIndex((op) => op.table === table)]));
  for (let index = 1; index < tableOrder.length; index += 1) {
    assert.ok(firstIndex.get(tableOrder[index - 1]) < firstIndex.get(tableOrder[index]));
  }

  const sessionEvents = plan.operations.filter(
    (operation) => operation.table === "events" && operation.row.event_kind === "session"
  );
  assert.equal(sessionEvents.length, 132);
  assert.equal(sessionEvents.every((operation) => operation.row.session_order >= 1), true);
  assert.equal(sessionEvents.every((operation) => operation.row.sequence_number >= 1), true);
  assert.equal(sessionEvents.every((operation) => operation.row.is_published === false), true);

  const f1Sessions = sessionEvents.filter((operation) => operation.refs.sport_id === "sport:formula-1");
  const ufcSessions = sessionEvents.filter((operation) => operation.refs.sport_id === "sport:ufc");
  assert.equal(f1Sessions.length, 115);
  assert.equal(ufcSessions.length, 17);
  assert.equal(f1Sessions.some((operation) => operation.row.event_date === null), true);
  assert.equal(ufcSessions.every((operation) => operation.row.event_date !== null), true);
  assert.equal(ufcSessions.every((operation) => operation.row.session_group === "card"), true);

  const ufcPages = plan.operations.filter(
    (operation) => operation.table === "event_pages" && operation.refs.sport_id === "sport:ufc"
  );
  assert.equal(ufcPages.length, 7);
  assert.equal(ufcPages.every((operation) => operation.row.entity_kind === "fight_card"), true);

  const footballMatches = plan.operations.filter(
    (operation) => operation.table === "events" && operation.row.event_kind === "match"
  );
  assert.equal(footballMatches.length, 144);
  assert.equal(footballMatches.every((operation) => operation.refs.home_participant_id), true);
  assert.equal(footballMatches.every((operation) => operation.refs.away_participant_id), true);
});

test("publication stays disabled unless explicitly approved", async () => {
  const bundle = await buildV2MultisportSeed();
  const safePlan = buildSeedApplyPlan(bundle);
  const publishPlan = buildSeedApplyPlan(bundle, { allowPublication: true });

  assert.equal(safePlan.operations.some((operation) => operation.row.is_published === true), false);
  assert.equal(
    publishPlan.operations.some((operation) => operation.table === "event_pages" && operation.row.is_published === true),
    true
  );
});
