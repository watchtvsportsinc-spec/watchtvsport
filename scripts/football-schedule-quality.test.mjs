import assert from "node:assert/strict";
import test from "node:test";
import {
  auditFootballLeagueSchedule,
  extractFootballMatchday,
} from "./football-schedule-quality.mjs";

const profile = {
  slug: "test-league",
  displayName: "Test League",
  seasonLabel: "2026/27",
  teamCount: 4,
  fixtureCount: 12,
  matchdayCount: 6,
  seasonStart: "2026-08-01",
  seasonEnd: "2027-05-31",
};

const clubs = ["alpha", "bravo", "charlie", "delta"];

function participant(slug) {
  return { id: `club:football:${slug}`, slug, name: slug, type: "club" };
}

function completeSeason() {
  const rounds = [
    [["alpha", "delta"], ["bravo", "charlie"]],
    [["charlie", "alpha"], ["delta", "bravo"]],
    [["alpha", "bravo"], ["charlie", "delta"]],
    [["delta", "alpha"], ["charlie", "bravo"]],
    [["alpha", "charlie"], ["bravo", "delta"]],
    [["bravo", "alpha"], ["delta", "charlie"]],
  ];

  const dates = [
    "2026-08-15T18:00:00Z",
    "2026-09-15T18:00:00Z",
    "2026-10-15T18:00:00Z",
    "2026-11-15T18:00:00Z",
    "2026-12-15T18:00:00Z",
    "2027-01-15T18:00:00Z",
  ];

  return rounds.flatMap((fixtures, roundIndex) =>
    fixtures.map(([home, away], fixtureIndex) => ({
      id: `test:${roundIndex + 1}:${fixtureIndex + 1}`,
      sport: "football",
      competitionSlug: "test-league",
      stage: `Regular season · Matchday ${roundIndex + 1}`,
      eventDate: dates[roundIndex],
      participant1: participant(home),
      participant2: participant(away),
    })),
  );
}

test("extractFootballMatchday accepts normalized English and French labels", () => {
  assert.equal(extractFootballMatchday("League phase · Matchday 7"), 7);
  assert.equal(extractFootballMatchday("Journée 12"), 12);
  assert.equal(extractFootballMatchday("Round 4"), 4);
  assert.equal(extractFootballMatchday("Regular season · 3"), 3);
  assert.equal(extractFootballMatchday("TBC"), null);
});

test("an unloaded configured league is skipped without a false failure", () => {
  const report = auditFootballLeagueSchedule([], profile);
  assert.equal(report.status, "not_loaded");
  assert.equal(report.issues.length, 0);
});

test("a complete double round-robin season passes", () => {
  const report = auditFootballLeagueSchedule(completeSeason(), profile, {
    expectedParticipantSlugs: clubs,
  });
  assert.equal(report.status, "pass", JSON.stringify(report.issues, null, 2));
  assert.equal(report.fixtureCount, 12);
  assert.equal(report.matchdayCount, 6);
  assert.equal(report.participantCount, 4);
});

test("a partial season cannot masquerade as complete once fixtures are loaded", () => {
  const report = auditFootballLeagueSchedule(completeSeason().slice(0, 2), profile);
  assert.equal(report.status, "fail");
  assert.ok(report.issues.some((row) => row.code === "UNEXPECTED_FIXTURE_COUNT"));
  assert.ok(report.issues.some((row) => row.code === "UNEXPECTED_MATCHDAY_COUNT"));
});

test("duplicate ids, repeated teams and duplicate ordered pairs are detected", () => {
  const events = completeSeason();
  events[1] = {
    ...events[1],
    id: events[0].id,
    participant1: participant("alpha"),
    participant2: participant("delta"),
  };

  const report = auditFootballLeagueSchedule(events, profile);
  const codes = new Set(report.issues.map((row) => row.code));
  assert.ok(codes.has("DUPLICATE_EVENT_ID"));
  assert.ok(codes.has("PARTICIPANT_REPEATED_ON_MATCHDAY"));
  assert.ok(codes.has("DUPLICATE_HOME_AWAY_PAIR"));
  assert.ok(codes.has("MISSING_HOME_AWAY_PAIR"));
});

test("unknown clubs can be rejected when an authoritative roster is supplied", () => {
  const events = completeSeason().map((event) => ({
    ...event,
    participant1:
      event.participant1.slug === "alpha" ? participant("echo") : event.participant1,
    participant2:
      event.participant2.slug === "alpha" ? participant("echo") : event.participant2,
  }));

  const report = auditFootballLeagueSchedule(events, profile, {
    expectedParticipantSlugs: clubs,
  });
  const codes = new Set(report.issues.map((row) => row.code));
  assert.ok(codes.has("UNKNOWN_PARTICIPANT"));
  assert.ok(codes.has("MISSING_EXPECTED_PARTICIPANT"));
});

test("invalid dates and unparseable matchdays are rejected", () => {
  const events = completeSeason();
  events[0] = { ...events[0], eventDate: "not-a-date", stage: "TBC" };

  const report = auditFootballLeagueSchedule(events, profile);
  const codes = new Set(report.issues.map((row) => row.code));
  assert.ok(codes.has("INVALID_EVENT_DATE"));
  assert.ok(codes.has("MISSING_MATCHDAY"));
});
