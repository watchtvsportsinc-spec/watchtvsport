import type { MetadataRoute } from "next";
import { getCurrentCountrySummaries } from "@/lib/country-tv";
import { entitySlug, getFootballNations } from "@/lib/entity-pages";
import { getAllEvents, type EventData } from "@/lib/events";
import { getAllMatches, type MatchData } from "@/lib/matches";
import { getPublicCompetitionFixtures, type PublicFixture } from "@/lib/public-fixtures";
import { shouldIncludeInSitemap } from "@/lib/seo-indexability";
import { sportsRegistry } from "@/lib/sports-registry";
import { motogpSeason2026Weekends } from "@/source/motogp-2026-season";

const BASE_URL = "https://watchtvsport.com";

type SitemapEntry = MetadataRoute.Sitemap[number];

function sitemapEntry(path: string): SitemapEntry {
  return { url: `${BASE_URL}${path}` };
}

function confirmedCountryCodes(match: MatchData): string[] {
  return Array.from(
    new Set(
      match.broadcasts
        .filter(
          (broadcast) =>
            broadcast.coverageStatus === "confirmed" &&
            broadcast.countryCode &&
            broadcast.broadcaster &&
            broadcast.url,
        )
        .map((broadcast) => broadcast.countryCode.toLowerCase()),
    ),
  );
}

function sportHubPath(sport: string): string {
  if (sport === "football") return "/football";
  if (sport === "formula-1") return "/formula-1";
  if (sport === "ufc") return "/ufc";
  return `/sports/${sport}`;
}

function competitionPath(sport: string, slug: string): string {
  if (sport === "football") return `/football/competition/${slug}`;
  return `/sports/${sport}/competition/${slug}`;
}

function verifiedBroadcastCount(event: EventData): number {
  return event.broadcasts.filter((broadcast) => broadcast.coverageStatus === "confirmed").length;
}

function fixtureSeoInput(fixture: PublicFixture) {
  const schedulePoint = fixture.exactDate || fixture.windowStart || fixture.windowEnd;
  const usefulContentCount = [
    fixture.participant1?.name,
    fixture.participant2?.name,
    fixture.seasonLabel,
    fixture.matchweek,
    schedulePoint,
  ].filter(Boolean).length;
  return {
    kind: "fixture" as const,
    canonicalPath: fixture.detailPath,
    usefulContentCount,
    hasOfficialScheduleWindow: Boolean(schedulePoint),
  };
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const events = getAllEvents();
  const worldCupMatches = getAllMatches();
  const [ligue1Fixtures, premierLeagueFixtures, currentCountries] = await Promise.all([
    getPublicCompetitionFixtures("football", "ligue-1"),
    getPublicCompetitionFixtures("football", "premier-league"),
    getCurrentCountrySummaries(),
  ]);
  const leagueFixtures = [...ligue1Fixtures, ...premierLeagueFixtures];

  const eventCountBySport = new Map<string, number>();
  const broadcastCountBySport = new Map<string, number>();
  const competitionStats = new Map<string, { sport: string; slug: string; events: number; broadcasts: number }>();

  for (const event of events) {
    const broadcasts = verifiedBroadcastCount(event);
    eventCountBySport.set(event.sport, (eventCountBySport.get(event.sport) ?? 0) + 1);
    broadcastCountBySport.set(event.sport, (broadcastCountBySport.get(event.sport) ?? 0) + broadcasts);
    const key = `${event.sport}:${event.competitionSlug}`;
    const current = competitionStats.get(key) ?? { sport: event.sport, slug: event.competitionSlug, events: 0, broadcasts: 0 };
    current.events += 1;
    current.broadcasts += broadcasts;
    competitionStats.set(key, current);
  }

  for (const fixture of leagueFixtures) {
    const key = `${fixture.sport}:${fixture.competitionSlug}`;
    if (!competitionStats.has(key)) {
      competitionStats.set(key, { sport: fixture.sport, slug: fixture.competitionSlug, events: 0, broadcasts: 0 });
    }
  }

  const staticPages = [
    sitemapEntry("/"),
    sitemapEntry("/sports"),
    sitemapEntry("/events"),
    sitemapEntry("/country"),
    sitemapEntry("/motorsports"),
    sitemapEntry("/combat-sports"),
    sitemapEntry("/combat-sports/mma"),
    sitemapEntry("/archive/world-cup-2026"),
    sitemapEntry("/methodology"),
  ];

  const sportPages = sportsRegistry
    .filter((sport) =>
      shouldIncludeInSitemap({
        kind: "sport",
        canonicalPath: sportHubPath(sport.slug),
        published: sport.enabled,
        eventCount: eventCountBySport.get(sport.slug) ?? 0,
        verifiedBroadcastCount: broadcastCountBySport.get(sport.slug) ?? 0,
      }),
    )
    .map((sport) => sitemapEntry(sportHubPath(sport.slug)));

  const competitionPages = Array.from(competitionStats.values())
    .filter((competition) => {
      const relatedFixtures = leagueFixtures.filter(
        (fixture) => fixture.sport === competition.sport && fixture.competitionSlug === competition.slug,
      );
      return shouldIncludeInSitemap({
        kind: "competition",
        canonicalPath: competitionPath(competition.sport, competition.slug),
        eventCount: competition.events + relatedFixtures.length,
        verifiedBroadcastCount: competition.broadcasts,
        usefulContentCount: relatedFixtures.length > 0 ? 2 : 0,
        hasVerifiedProfile: relatedFixtures.length > 0,
        participantCount: new Set(
          relatedFixtures.flatMap((fixture) => [fixture.participant1.id, fixture.participant2.id]),
        ).size,
      });
    })
    .map((competition) => sitemapEntry(competitionPath(competition.sport, competition.slug)));

  // Team pages remain discoverable through competition and event links, but are
  // intentionally not submitted here. Their metadata uses a separate verified
  // participant-profile gate, so a future participant sitemap should be built
  // from that profile source rather than assuming every referenced team is indexable.
  const nationPages = getFootballNations(events).map((nation) =>
    sitemapEntry(`/football/nation/${entitySlug(nation.name)}`),
  );

  const permanentEventPages = Array.from(
    new Map(
      events
        .filter((event) => event.detailPath.startsWith("/football/"))
        .map((event) => [event.detailPath, event] as const),
    ).values(),
  )
    .filter((event) =>
      shouldIncludeInSitemap({
        kind: "event",
        canonicalPath: event.detailPath,
        usefulContentCount: [event.eventDate, event.competition, event.participant1?.name, event.participant2?.name, event.stage].filter(Boolean).length,
        verifiedBroadcastCount: verifiedBroadcastCount(event),
      }),
    )
    .map((event) => sitemapEntry(event.detailPath));

  const leagueFixturePages = leagueFixtures
    .filter((fixture) => shouldIncludeInSitemap(fixtureSeoInput(fixture)))
    .map((fixture) => sitemapEntry(fixture.detailPath));

  const f1Pages = Array.from(
    new Map(
      events
        .filter((event) => event.sport === "formula-1" && event.eventGroupId && event.eventGroupSlug)
        .map((event) => [event.eventGroupId!, event] as const),
    ).values(),
  ).map((event) => sitemapEntry(`/formula-1/grand-prix/${event.eventGroupSlug}`));

  const f1EditionPages = Array.from(
    new Map(
      events
        .filter((event) => event.sport === "formula-1" && event.eventGroupSlug)
        .map((event) => {
          const year = event.eventEditionKey || String(new Date(event.eventDate).getUTCFullYear());
          return [`${event.eventGroupSlug}:${year}`, { event, year }] as const;
        }),
    ).values(),
  ).map(({ event, year }) => sitemapEntry(`/formula-1/grand-prix/${event.eventGroupSlug}/${year}`));

  const motogpPages = motogpSeason2026Weekends.map((weekend) =>
    sitemapEntry(`/sports/motogp/grand-prix/${weekend.slug}`),
  );

  const ufcPages = Array.from(
    new Map(
      events
        .filter((event) => event.sport === "ufc" && event.eventGroupSlug)
        .map((event) => [event.eventGroupSlug!, event] as const),
    ).values(),
  ).map((event) => sitemapEntry(`/ufc/event/${event.eventGroupSlug}`));

  // Keep historical World Cup URLs discoverable: they already carry search equity.
  // We intentionally omit lastModified until a real content-update timestamp exists.
  const archiveMatchPages = worldCupMatches.map((match) => sitemapEntry(`/match/${match.slug}`));
  const watchPages = worldCupMatches.flatMap((match) =>
    confirmedCountryCodes(match).map((code) => sitemapEntry(`/watch/${match.slug}/${code}`)),
  );

  const archivedCountryCodes = worldCupMatches.flatMap((match) => confirmedCountryCodes(match));
  const countryPages = Array.from(
    new Set([
      ...currentCountries.countries.map((country) => country.countryCode),
      ...archivedCountryCodes,
    ]),
  ).map((code) => sitemapEntry(`/country/${code}`));

  const deduped = new Map<string, SitemapEntry>();
  for (const entry of [
    ...staticPages,
    ...sportPages,
    ...competitionPages,
    ...nationPages,
    ...permanentEventPages,
    ...leagueFixturePages,
    ...f1Pages,
    ...f1EditionPages,
    ...motogpPages,
    ...ufcPages,
    ...archiveMatchPages,
    ...watchPages,
    ...countryPages,
  ]) {
    deduped.set(entry.url, entry);
  }

  return Array.from(deduped.values());
}
