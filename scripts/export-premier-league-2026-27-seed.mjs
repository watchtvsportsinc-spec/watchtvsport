import { discoverPremierLeagueFixtures, EXPECTED_FIXTURES } from "./discover-premier-league-fixtures.mjs";

const TEAM_SLUGS = new Map([
  ["AFC Bournemouth", "afc-bournemouth"], ["Arsenal", "arsenal"], ["Aston Villa", "aston-villa"],
  ["Brentford", "brentford"], ["Brighton & Hove Albion", "brighton-hove-albion"], ["Chelsea", "chelsea"],
  ["Coventry City", "coventry-city"], ["Crystal Palace", "crystal-palace"], ["Everton", "everton"],
  ["Fulham", "fulham"], ["Hull City", "hull-city"], ["Ipswich Town", "ipswich-town"],
  ["Leeds United", "leeds-united"], ["Liverpool", "liverpool"], ["Manchester City", "manchester-city"],
  ["Manchester United", "manchester-united"], ["Newcastle United", "newcastle-united"],
  ["Nottingham Forest", "nottingham-forest"], ["Sunderland", "sunderland"], ["Tottenham Hotspur", "tottenham-hotspur"],
]);

function externalParticipant(name) {
  const slug = TEAM_SLUGS.get(name);
  if (!slug) throw new Error(`Missing participant slug for ${name}`);
  return `participant:football:${slug}`;
}

function eventDate(fixture) {
  return fixture.localTime ? `${fixture.localDate}T${fixture.localTime}:00+01:00` : null;
}

export function buildPremierLeagueBundle(discovery, observedAt = new Date().toISOString()) {
  if (!discovery.ok || discovery.count !== EXPECTED_FIXTURES) throw new Error("Premier League fixture discovery must be fully validated before seed export");

  const records = [];
  records.push({ entityType: "sport", externalKey: "sport:football", evidenceUrl: discovery.sourceUrl, payload: { slug: "football", name: "Football", eventModel: "team_match", participantPages: "teams_and_nations" } });
  records.push({ entityType: "competition", externalKey: "competition:football:premier-league", evidenceUrl: discovery.sourceUrl, payload: { sportExternalKey: "sport:football", slug: "premier-league", name: "Premier League" } });
  records.push({ entityType: "season", externalKey: "season:premier-league:2026-27", evidenceUrl: discovery.sourceUrl, payload: { competitionExternalKey: "competition:football:premier-league", slug: "2026-27", label: "2026/27", isCurrent: true } });

  for (const [name, slug] of TEAM_SLUGS) {
    records.push({ entityType: "participant", externalKey: `participant:football:${slug}`, evidenceUrl: discovery.sourceUrl, payload: { sportExternalKey: "sport:football", participantType: "club", slug, name, isActive: true } });
  }

  for (const fixture of discovery.fixtures) {
    const homeSlug = TEAM_SLUGS.get(fixture.home);
    const awaySlug = TEAM_SLUGS.get(fixture.away);
    const slug = `premier-league-2026-27-${homeSlug}-vs-${awaySlug}`;
    const pageKey = `event-page:${slug}`;
    records.push({
      entityType: "event_page",
      externalKey: pageKey,
      evidenceUrl: discovery.sourceUrl,
      payload: {
        sportExternalKey: "sport:football",
        competitionExternalKey: "competition:football:premier-league",
        homeParticipantExternalKey: externalParticipant(fixture.home),
        awayParticipantExternalKey: externalParticipant(fixture.away),
        pageType: "fixture",
        slug,
        title: `${fixture.home} vs ${fixture.away}`,
        verificationStatus: "confirmed",
        isPublished: false,
        canonicalPath: `/football/match/${slug}`,
      },
    });
    records.push({
      entityType: "event",
      externalKey: `event:${slug}`,
      evidenceUrl: discovery.sourceUrl,
      payload: {
        sportExternalKey: "sport:football",
        competitionExternalKey: "competition:football:premier-league",
        seasonExternalKey: "season:premier-league:2026-27",
        eventPageExternalKey: pageKey,
        homeParticipantExternalKey: externalParticipant(fixture.home),
        awayParticipantExternalKey: externalParticipant(fixture.away),
        slug,
        title: `${fixture.home} vs ${fixture.away}`,
        eventDate: eventDate(fixture),
        officialLocalDate: fixture.localDate,
        timezone: fixture.timezone,
        status: "scheduled",
        eventKind: "match",
        verificationStatus: "confirmed",
        isPublished: false,
        canonicalPath: `/football/match/${slug}`,
      },
    });
  }

  return {
    schemaVersion: 1,
    source: "Premier League official website",
    observedAt,
    idempotencyKey: `premier-league-2026-27:${discovery.count}`,
    records,
  };
}

async function main() {
  const discovery = await discoverPremierLeagueFixtures();
  const bundle = buildPremierLeagueBundle(discovery);
  process.stdout.write(`${JSON.stringify(bundle, null, 2)}\n`);
}

main().catch((error) => { console.error(error instanceof Error ? error.message : error); process.exitCode = 1; });
