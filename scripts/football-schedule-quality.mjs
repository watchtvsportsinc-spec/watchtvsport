function normalizeToken(value) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ø/gi, "o")
    .replace(/æ/gi, "ae")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function extractFootballMatchday(stage) {
  if (typeof stage !== "string" || !stage.trim()) return null;

  const normalized = stage
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();

  const patterns = [
    /\bmatchday\s*[-:#.]?\s*(\d{1,2})\b/i,
    /\bjournee\s*[-:#.]?\s*(\d{1,2})\b/i,
    /\bround\s*[-:#.]?\s*(\d{1,2})\b/i,
    /\bregular\s+season\s*[-:#.·]?\s*(\d{1,2})\b/i,
    /\bsaison\s+reguliere\s*[-:#.·]?\s*(\d{1,2})\b/i,
  ];

  for (const pattern of patterns) {
    const match = normalized.match(pattern);
    if (match) return Number(match[1]);
  }

  if (/^\d{1,2}$/.test(normalized)) return Number(normalized);
  return null;
}

function participantKey(participant) {
  if (!participant || typeof participant !== "object") return null;
  if (typeof participant.slug === "string" && participant.slug.trim()) {
    return normalizeToken(participant.slug);
  }
  if (typeof participant.id === "string" && participant.id.trim()) {
    const tail = participant.id.split(":").filter(Boolean).at(-1);
    if (tail) return normalizeToken(tail);
  }
  if (typeof participant.name === "string" && participant.name.trim()) {
    return normalizeToken(participant.name);
  }
  return null;
}

function issue(code, message, context = {}) {
  return { code, message, ...context };
}

function validDateRange(profile) {
  const start = Date.parse(`${profile.seasonStart}T00:00:00Z`);
  const end = Date.parse(`${profile.seasonEnd}T23:59:59.999Z`);
  return { start, end };
}

export function auditFootballLeagueSchedule(events, profile, options = {}) {
  const fixtures = (events ?? []).filter(
    (event) => event?.sport === "football" && event?.competitionSlug === profile.slug,
  );

  const report = {
    competitionSlug: profile.slug,
    seasonLabel: profile.seasonLabel,
    status: "not_loaded",
    fixtureCount: fixtures.length,
    participantCount: 0,
    matchdayCount: 0,
    expectedFixtureCount: profile.fixtureCount,
    expectedParticipantCount: profile.teamCount,
    expectedMatchdayCount: profile.matchdayCount,
    issues: [],
  };

  if (fixtures.length === 0) return report;
  report.status = "pass";

  const expectedFixturesFromTeams = profile.teamCount * (profile.teamCount - 1);
  const expectedMatchdaysFromTeams = 2 * (profile.teamCount - 1);
  const fixturesPerMatchday = profile.teamCount / 2;

  if (!Number.isInteger(fixturesPerMatchday)) {
    report.issues.push(
      issue("PROFILE_ODD_TEAM_COUNT", `${profile.displayName} has an odd teamCount (${profile.teamCount}).`),
    );
  }
  if (profile.fixtureCount !== expectedFixturesFromTeams) {
    report.issues.push(
      issue(
        "PROFILE_FIXTURE_COUNT_INCONSISTENT",
        `${profile.displayName} profile expects ${profile.fixtureCount} fixtures, but a double round-robin with ${profile.teamCount} teams requires ${expectedFixturesFromTeams}.`,
      ),
    );
  }
  if (profile.matchdayCount !== expectedMatchdaysFromTeams) {
    report.issues.push(
      issue(
        "PROFILE_MATCHDAY_COUNT_INCONSISTENT",
        `${profile.displayName} profile expects ${profile.matchdayCount} matchdays, but a double round-robin with ${profile.teamCount} teams requires ${expectedMatchdaysFromTeams}.`,
      ),
    );
  }
  if (Number.isInteger(fixturesPerMatchday) && profile.fixtureCount !== profile.matchdayCount * fixturesPerMatchday) {
    report.issues.push(
      issue(
        "PROFILE_TOTALS_INCONSISTENT",
        `${profile.displayName} fixtureCount does not equal matchdayCount × fixtures per matchday.`,
      ),
    );
  }

  if (fixtures.length !== profile.fixtureCount) {
    report.issues.push(
      issue(
        "UNEXPECTED_FIXTURE_COUNT",
        `${profile.displayName} ${profile.seasonLabel} has ${fixtures.length} loaded fixtures; expected ${profile.fixtureCount}.`,
        { actual: fixtures.length, expected: profile.fixtureCount },
      ),
    );
  }

  const allowedParticipants = options.expectedParticipantSlugs
    ? new Set(options.expectedParticipantSlugs.map(normalizeToken))
    : null;
  const seenEventIds = new Set();
  const participants = new Set();
  const matchdays = new Map();
  const orderedPairs = new Map();
  const { start: seasonStart, end: seasonEnd } = validDateRange(profile);

  for (const event of fixtures) {
    const eventId = typeof event.id === "string" && event.id ? event.id : "(missing id)";

    if (seenEventIds.has(eventId)) {
      report.issues.push(issue("DUPLICATE_EVENT_ID", `Duplicate event id: ${eventId}.`, { eventId }));
    } else {
      seenEventIds.add(eventId);
    }

    const home = participantKey(event.participant1);
    const away = participantKey(event.participant2);

    if (!home || !away) {
      report.issues.push(
        issue("MISSING_PARTICIPANT", `${eventId} must have two identifiable club participants.`, { eventId }),
      );
    } else {
      participants.add(home);
      participants.add(away);

      if (event.participant1?.type && event.participant1.type !== "club") {
        report.issues.push(
          issue("NON_CLUB_PARTICIPANT", `${eventId} participant1 is not typed as a club.`, { eventId }),
        );
      }
      if (event.participant2?.type && event.participant2.type !== "club") {
        report.issues.push(
          issue("NON_CLUB_PARTICIPANT", `${eventId} participant2 is not typed as a club.`, { eventId }),
        );
      }
      if (home === away) {
        report.issues.push(issue("SAME_PARTICIPANT", `${eventId} has the same club on both sides.`, { eventId }));
      }

      if (allowedParticipants) {
        if (!allowedParticipants.has(home)) {
          report.issues.push(issue("UNKNOWN_PARTICIPANT", `${eventId} contains unknown club ${home}.`, { eventId, participant: home }));
        }
        if (!allowedParticipants.has(away)) {
          report.issues.push(issue("UNKNOWN_PARTICIPANT", `${eventId} contains unknown club ${away}.`, { eventId, participant: away }));
        }
      }

      const pairKey = `${home}>${away}`;
      const existingPair = orderedPairs.get(pairKey);
      if (existingPair) {
        report.issues.push(
          issue(
            "DUPLICATE_HOME_AWAY_PAIR",
            `${home} vs ${away} is loaded more than once (${existingPair}, ${eventId}).`,
            { eventId, firstEventId: existingPair, home, away },
          ),
        );
      } else {
        orderedPairs.set(pairKey, eventId);
      }
    }

    const kickoff = Date.parse(event.eventDate);
    if (!event.eventDate || Number.isNaN(kickoff)) {
      report.issues.push(issue("INVALID_EVENT_DATE", `${eventId} has an invalid eventDate.`, { eventId }));
    } else if (kickoff < seasonStart || kickoff > seasonEnd) {
      report.issues.push(
        issue(
          "EVENT_OUTSIDE_SEASON",
          `${eventId} is outside ${profile.seasonStart}–${profile.seasonEnd}.`,
          { eventId, eventDate: event.eventDate },
        ),
      );
    }

    const matchday = extractFootballMatchday(event.stage);
    if (matchday === null) {
      report.issues.push(
        issue("MISSING_MATCHDAY", `${eventId} stage does not expose a recognizable matchday number.`, {
          eventId,
          stage: event.stage ?? null,
        }),
      );
      continue;
    }
    if (matchday < 1 || matchday > profile.matchdayCount) {
      report.issues.push(
        issue(
          "MATCHDAY_OUT_OF_RANGE",
          `${eventId} uses matchday ${matchday}; expected 1–${profile.matchdayCount}.`,
          { eventId, matchday },
        ),
      );
      continue;
    }

    if (!matchdays.has(matchday)) matchdays.set(matchday, []);
    matchdays.get(matchday).push({ eventId, home, away });
  }

  report.participantCount = participants.size;
  report.matchdayCount = matchdays.size;

  if (participants.size !== profile.teamCount) {
    report.issues.push(
      issue(
        "UNEXPECTED_PARTICIPANT_COUNT",
        `${profile.displayName} has ${participants.size} distinct loaded clubs; expected ${profile.teamCount}.`,
        { actual: participants.size, expected: profile.teamCount },
      ),
    );
  }

  if (allowedParticipants) {
    for (const expected of allowedParticipants) {
      if (!participants.has(expected)) {
        report.issues.push(
          issue("MISSING_EXPECTED_PARTICIPANT", `${profile.displayName} is missing expected club ${expected}.`, {
            participant: expected,
          }),
        );
      }
    }
  }

  if (matchdays.size !== profile.matchdayCount) {
    report.issues.push(
      issue(
        "UNEXPECTED_MATCHDAY_COUNT",
        `${profile.displayName} has ${matchdays.size} recognized matchdays; expected ${profile.matchdayCount}.`,
        { actual: matchdays.size, expected: profile.matchdayCount },
      ),
    );
  }

  for (let matchday = 1; matchday <= profile.matchdayCount; matchday += 1) {
    const rows = matchdays.get(matchday) ?? [];
    if (rows.length !== fixturesPerMatchday) {
      report.issues.push(
        issue(
          "INCOMPLETE_MATCHDAY",
          `Matchday ${matchday} has ${rows.length} fixtures; expected ${fixturesPerMatchday}.`,
          { matchday, actual: rows.length, expected: fixturesPerMatchday },
        ),
      );
    }

    const teamsOnMatchday = new Set();
    for (const row of rows) {
      for (const team of [row.home, row.away]) {
        if (!team) continue;
        if (teamsOnMatchday.has(team)) {
          report.issues.push(
            issue(
              "PARTICIPANT_REPEATED_ON_MATCHDAY",
              `${team} appears more than once on matchday ${matchday}.`,
              { matchday, participant: team, eventId: row.eventId },
            ),
          );
        }
        teamsOnMatchday.add(team);
      }
    }
  }

  if (participants.size === profile.teamCount) {
    const participantList = [...participants].sort();
    for (const home of participantList) {
      for (const away of participantList) {
        if (home === away) continue;
        const pairKey = `${home}>${away}`;
        if (!orderedPairs.has(pairKey)) {
          report.issues.push(
            issue(
              "MISSING_HOME_AWAY_PAIR",
              `Missing scheduled home/away pairing: ${home} vs ${away}.`,
              { home, away },
            ),
          );
        }
      }
    }
  }

  report.status = report.issues.length === 0 ? "pass" : "fail";
  return report;
}
