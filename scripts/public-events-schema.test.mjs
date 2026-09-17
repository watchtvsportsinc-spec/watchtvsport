import assert from "node:assert/strict";
import test from "node:test";
import { createJiti } from "jiti";

const jiti = createJiti(import.meta.url);
const {
  MAX_PUBLIC_EVENTS,
  PublicEventsPayloadError,
  parsePublicEventsPayload,
} = await jiti.import("../lib/public-events-schema.ts");
const { parseMultisportPublicEventsPayload } = await jiti.import(
  "../lib/public-events-multisport.ts"
);

function validPayload() {
  return {
    schemaVersion: 1,
    generatedAt: "2026-09-14T18:00:00Z",
    events: [
      {
        id: "event-001",
        slug: "home-vs-away",
        detailPath: "/football/test/home-away?event=event-001",
        sport: "football",
        competition: "Test Competition",
        competitionSlug: "test-competition",
        eventDate: "2026-09-15T18:00:00+00:00",
        status: "scheduled",
        participant1: {
          id: "participant-001",
          name: "Home",
          shortName: "HOM",
          type: "club",
          visualType: "crest",
          visual: "home",
          countryCode: "FR",
          visualProfile: {
            renderFamily: "football_shirt",
            primaryColor: "#004170",
            secondaryColor: "#DA291C",
            accentColor: "#FFFFFF",
            patternStyle: "center_stripe",
            visualStatus: "verified",
            seasonLabel: "2026-27",
            sourceName: "Official club source",
            sourceUrl: "https://example.test/kit",
          },
        },
        participant2: {
          id: "participant-002",
          name: "Away",
          shortName: "AWY",
          type: "club",
          visualType: "crest",
          visual: "away",
        },
        title: "Home vs Away",
        broadcasts: [
          {
            countryCode: "CA",
            countryName: "Canada",
            broadcaster: "Example Sports",
            access: "Paid",
            url: "https://example.test/watch",
            sourceUrl: "https://example.test/evidence",
            coverageType: "partial",
            coverageStatus: "confirmed",
            broadcastType: "live",
            requiresAccount: true,
            isFreeTrial: false,
          },
        ],
      },
    ],
  };
}

test("parses the bounded public Supabase contract", () => {
  const parsed = parsePublicEventsPayload(validPayload());

  assert.equal(parsed.events.length, 1);
  assert.equal(parsed.events[0].broadcasts[0].countryCode, "ca");
  assert.equal(parsed.events[0].broadcasts[0].broadcastType, "live");
  assert.equal(parsed.events[0].participant1.name, "Home");
  assert.equal(parsed.events[0].participant1.countryCode, "FR");
  assert.equal(parsed.events[0].participant1.visualProfile.renderFamily, "football_shirt");
  assert.equal(parsed.events[0].participant1.visualProfile.primaryColor, "#004170");
  assert.equal(parsed.events[0].participant1.visualProfile.patternStyle, "center_stripe");
  assert.equal(parsed.events[0].participant1.visualProfile.visualStatus, "verified");
});

test("defaults French commentary for football broadcasts in France", () => {
  const payload = validPayload();
  payload.events[0].broadcasts[0].countryCode = "FR";
  payload.events[0].broadcasts[0].countryName = "France";

  const parsed = parseMultisportPublicEventsPayload(payload);
  assert.deepEqual(parsed.events[0].broadcasts[0].commentaryLanguages, ["French"]);
});

test("preserves explicit commentary language exceptions for football in France", () => {
  const payload = validPayload();
  payload.events[0].broadcasts[0].countryCode = "FR";
  payload.events[0].broadcasts[0].countryName = "France";
  payload.events[0].broadcasts[0].commentaryLanguages = ["English"];

  const parsed = parseMultisportPublicEventsPayload(payload);
  assert.deepEqual(parsed.events[0].broadcasts[0].commentaryLanguages, ["English"]);
});

test("does not apply the France football language default to other sports", () => {
  const payload = validPayload();
  payload.events[0].sport = "formula-1";
  payload.events[0].broadcasts[0].countryCode = "FR";
  payload.events[0].broadcasts[0].countryName = "France";

  const parsed = parseMultisportPublicEventsPayload(payload);
  assert.equal(parsed.events[0].broadcasts[0].commentaryLanguages, undefined);
});

test("rejects unsafe participant visual values", () => {
  const payload = validPayload();
  payload.events[0].participant1.visualProfile.renderFamily = "official_logo";
  assert.throws(() => parsePublicEventsPayload(payload), /unsupported visual family or pattern/);
});

test("rejects unconfirmed offers instead of presenting them as available", () => {
  const payload = validPayload();
  payload.events[0].broadcasts[0].coverageStatus = "expected";

  assert.throws(
    () => parsePublicEventsPayload(payload),
    PublicEventsPayloadError
  );
});

test("rejects non-HTTPS broadcaster links", () => {
  const payload = validPayload();
  payload.events[0].broadcasts[0].url = "http://example.test/watch";

  assert.throws(
    () => parsePublicEventsPayload(payload),
    /must be an HTTPS URL/
  );
});

test("rejects duplicate event identities and detail paths", () => {
  const payload = validPayload();
  payload.events.push(structuredClone(payload.events[0]));

  assert.throws(() => parsePublicEventsPayload(payload), /duplicate event id/);

  payload.events[1].id = "event-002";
  assert.throws(
    () => parsePublicEventsPayload(payload),
    /duplicate event detail path/
  );
});

test("rejects an unbounded event response", () => {
  const payload = validPayload();
  payload.events = Array.from({ length: MAX_PUBLIC_EVENTS + 1 }, () => ({}));

  assert.throws(() => parsePublicEventsPayload(payload), /bounded array/);
});
