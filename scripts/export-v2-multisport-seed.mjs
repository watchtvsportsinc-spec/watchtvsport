import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createJiti } from "jiti";
import { validateImportBundle } from "./import-validation.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const DEFAULT_OUTPUT = resolve(ROOT, "data/imports/seed-2026-ucl-f1.json");
const OBSERVED_AT = "2026-09-14T21:00:00-04:00";

const UEFA_EVIDENCE =
  "https://www.uefa.com/uefachampionsleague/news/02a8-2174c9e9019d-f909a77bd77a-1000--2026-27-champions-league-all-the-league-phase-fixtures/";
const F1_CALENDAR_EVIDENCE = "https://www.formula1.com/en/racing/2026";
const F1_FORMAT_EVIDENCE =
  "https://www.formula1.com/en/latest/article/the-beginners-guide-to-the-formula-1-weekend.5RFZzGXNhEi9AEuMXwo987";

function record(entityType, externalKey, evidenceUrl, payload) {
  return { entityType, externalKey, evidenceUrl, payload };
}

function slugFromParticipantId(id) {
  return id.replace(/^club:(?:football:)?/, "");
}

function uniqueBy(items, keyFn) {
  return Array.from(new Map(items.map((item) => [keyFn(item), item])).values());
}

export async function buildV2MultisportSeed() {
  const jiti = createJiti(import.meta.url, { interopDefault: true });
  const { championsLeague202627LeaguePhase } = await jiti.import(
    resolve(ROOT, "source/champions-league-2026-27-league-phase.ts")
  );
  const {
    formula1Season2026Weekends,
    getFormula1SessionPlan2026,
  } = await jiti.import(resolve(ROOT, "source/formula-1-2026-season.ts"));

  const records = [];

  records.push(
    record("sport", "sport:football", UEFA_EVIDENCE, {
      slug: "football",
      name: "Football",
      registryId: "association-football",
      eventModel: "team_match",
      participantPages: "teams-and-nations",
    }),
    record("sport", "sport:formula-1", F1_CALENDAR_EVIDENCE, {
      slug: "formula-1",
      name: "Formula 1",
      registryId: "formula-1",
      eventModel: "race_session",
      participantPages: "none",
    }),
    record("competition", "competition:football:champions-league", UEFA_EVIDENCE, {
      sportExternalKey: "sport:football",
      slug: "champions-league",
      name: "UEFA Champions League",
    }),
    record("season", "season:football:champions-league:2026-27", UEFA_EVIDENCE, {
      competitionExternalKey: "competition:football:champions-league",
      slug: "2026-27",
      label: "2026/27",
      isCurrent: true,
    }),
    record("competition", "competition:formula-1:formula-1", F1_CALENDAR_EVIDENCE, {
      sportExternalKey: "sport:formula-1",
      slug: "formula-1",
      name: "Formula 1",
    }),
    record("season", "season:formula-1:formula-1:2026", F1_CALENDAR_EVIDENCE, {
      competitionExternalKey: "competition:formula-1:formula-1",
      slug: "2026",
      label: "2026",
      isCurrent: true,
    })
  );

  const clubs = uniqueBy(
    championsLeague202627LeaguePhase.flatMap((event) => [event.participant1, event.participant2]),
    (participant) => participant.id
  );

  for (const club of clubs) {
    records.push(
      record("participant", `participant:football:${slugFromParticipantId(club.id)}`, UEFA_EVIDENCE, {
        sportExternalKey: "sport:football",
        participantType: "club",
        slug: slugFromParticipantId(club.id),
        name: club.name,
        shortName: club.shortName ?? club.name,
        isActive: true,
      })
    );
  }

  const fixturePages = uniqueBy(championsLeague202627LeaguePhase, (event) => event.detailPath);
  for (const event of fixturePages) {
    records.push(
      record("event_page", `page:football:${event.detailPath}`, UEFA_EVIDENCE, {
        sportExternalKey: "sport:football",
        competitionExternalKey: "competition:football:champions-league",
        pageType: "head_to_head",
        slug: event.slug,
        title: event.title,
        canonicalPath: event.detailPath,
        homeParticipantExternalKey: `participant:football:${slugFromParticipantId(event.participant1.id)}`,
        awayParticipantExternalKey: `participant:football:${slugFromParticipantId(event.participant2.id)}`,
        isPublished: true,
        verificationStatus: "confirmed",
      })
    );
  }

  for (const event of championsLeague202627LeaguePhase) {
    records.push(
      record("event", `event:${event.id}`, UEFA_EVIDENCE, {
        sportExternalKey: "sport:football",
        competitionExternalKey: "competition:football:champions-league",
        seasonExternalKey: "season:football:champions-league:2026-27",
        eventPageExternalKey: `page:football:${event.detailPath}`,
        eventKind: "match",
        slug: event.slug,
        title: event.title,
        phase: event.stage,
        eventDate: event.eventDate,
        status: event.status ?? "scheduled",
        homeParticipantExternalKey: `participant:football:${slugFromParticipantId(event.participant1.id)}`,
        awayParticipantExternalKey: `participant:football:${slugFromParticipantId(event.participant2.id)}`,
        canonicalPath: event.detailPath,
        verificationStatus: "confirmed",
      })
    );
  }

  for (const weekend of formula1Season2026Weekends) {
    const pageKey = `page:formula-1:grand-prix:${weekend.slug}`;
    const editionKey = `edition:formula-1:${weekend.slug}:2026`;
    const canonicalPath = `/formula-1/grand-prix/${weekend.slug}`;

    records.push(
      record("event_page", pageKey, F1_CALENDAR_EVIDENCE, {
        sportExternalKey: "sport:formula-1",
        competitionExternalKey: "competition:formula-1:formula-1",
        pageType: "multi_session",
        eventGroupType: "race_weekend",
        slug: weekend.slug,
        title: weekend.name,
        canonicalPath,
        isPublished: true,
        verificationStatus: "confirmed",
      }),
      record("event_edition", editionKey, F1_CALENDAR_EVIDENCE, {
        eventPageExternalKey: pageKey,
        seasonExternalKey: "season:formula-1:formula-1:2026",
        editionKey: "2026",
        label: "2026",
        roundNumber: weekend.round,
        venueName: weekend.venue,
        countryName: weekend.country,
        status: weekend.status,
        isPublished: true,
        verificationStatus: "confirmed",
      })
    );

    const sessionPlan = getFormula1SessionPlan2026(weekend);
    if (sessionPlan.length !== 5) {
      throw new Error(`${weekend.slug} must contain exactly five F1 weekend sessions`);
    }

    for (const session of sessionPlan) {
      const evidenceUrl = session.eventDate ? F1_CALENDAR_EVIDENCE : F1_FORMAT_EVIDENCE;
      records.push(
        record("event", `event:f1:2026:${weekend.slug}:${session.slug}`, evidenceUrl, {
          sportExternalKey: "sport:formula-1",
          competitionExternalKey: "competition:formula-1:formula-1",
          seasonExternalKey: "season:formula-1:formula-1:2026",
          eventPageExternalKey: pageKey,
          eventEditionExternalKey: editionKey,
          eventKind: "session",
          sessionType: session.sessionType,
          sessionLabel: session.label,
          sequenceNumber: session.sequenceNumber,
          slug: `${weekend.slug}-${session.slug}`,
          title: `${weekend.name} 2026 — ${session.label}`,
          eventDate: session.eventDate ?? null,
          status: weekend.status,
          venueName: weekend.venue,
          countryName: weekend.country,
          canonicalPath: `${canonicalPath}#${session.slug}`,
          verificationStatus: session.eventDate ? "confirmed" : "expected",
          timingStatus: session.eventDate ? "confirmed" : "tbc",
        })
      );
    }
  }

  const bundle = {
    schemaVersion: 1,
    source: "watchtvsport-curated-2026",
    idempotencyKey: "seed-ucl-2026-27-f1-2026-v1",
    observedAt: OBSERVED_AT,
    records,
  };

  const validation = validateImportBundle(bundle);
  if (!validation.ok) {
    throw new Error(`Generated seed is invalid:\n${JSON.stringify(validation.issues, null, 2)}`);
  }

  return bundle;
}

async function main() {
  const output = process.argv[2] ? resolve(process.cwd(), process.argv[2]) : DEFAULT_OUTPUT;
  const bundle = await buildV2MultisportSeed();
  await mkdir(dirname(output), { recursive: true });
  await writeFile(output, `${JSON.stringify(bundle, null, 2)}\n`, "utf8");

  const counts = bundle.records.reduce((acc, item) => {
    acc[item.entityType] = (acc[item.entityType] ?? 0) + 1;
    return acc;
  }, {});

  console.log(`Wrote ${bundle.records.length} records to ${output}`);
  console.log(JSON.stringify(counts, null, 2));
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
