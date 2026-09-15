import assert from "node:assert/strict";
import test from "node:test";
import { buildV2MultisportSeed } from "./export-v2-multisport-seed.mjs";

function count(bundle, entityType) {
  return bundle.records.filter((record) => record.entityType === entityType).length;
}

test("combined V2 seed contains UCL and the complete 2026 F1 weekend structure", async () => {
  const bundle = await buildV2MultisportSeed();

  assert.equal(bundle.schemaVersion, 1);
  assert.equal(bundle.source, "watchtvsport-curated-2026");
  assert.equal(count(bundle, "sport"), 2);
  assert.equal(count(bundle, "competition"), 2);
  assert.equal(count(bundle, "season"), 2);
  assert.equal(count(bundle, "participant"), 36);

  const f1Pages = bundle.records.filter(
    (record) => record.entityType === "event_page" && record.externalKey.startsWith("page:formula-1:grand-prix:")
  );
  const f1Editions = bundle.records.filter(
    (record) => record.entityType === "event_edition" && record.externalKey.startsWith("edition:formula-1:")
  );
  const f1Sessions = bundle.records.filter(
    (record) => record.entityType === "event" && record.externalKey.startsWith("event:f1:2026:")
  );

  assert.equal(f1Pages.length, 23);
  assert.equal(f1Editions.length, 23);
  assert.equal(f1Sessions.length, 23 * 5);

  const sessionsByWeekend = new Map();
  for (const event of f1Sessions) {
    const weekend = event.payload.eventPageExternalKey;
    const sessions = sessionsByWeekend.get(weekend) ?? [];
    sessions.push(event.payload);
    sessionsByWeekend.set(weekend, sessions);
  }

  assert.equal(sessionsByWeekend.size, 23);
  for (const sessions of sessionsByWeekend.values()) {
    assert.equal(sessions.length, 5);
    assert.deepEqual(
      sessions.map((session) => session.sequenceNumber).sort((a, b) => a - b),
      [1, 2, 3, 4, 5]
    );
    assert.ok(sessions.some((session) => session.sessionType === "race"));
    assert.ok(sessions.some((session) => session.sessionType === "qualifying"));
    assert.ok(sessions.some((session) => session.sessionType === "practice"));
  }

  const uclEvents = bundle.records.filter(
    (record) => record.entityType === "event" && record.externalKey.startsWith("event:ucl-2026-27:")
  );
  assert.equal(uclEvents.length, 144);
  assert.ok(uclEvents.every((event) => event.payload.eventKind === "match"));

  const tbcSessions = f1Sessions.filter((event) => event.payload.timingStatus === "tbc");
  assert.ok(tbcSessions.length > 0);
  assert.ok(tbcSessions.every((event) => event.payload.eventDate === null));
});
