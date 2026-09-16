import type { MetadataRoute } from "next";
import { clubSlug } from "@/lib/club-aliases";
import { entitySlug, getFootballNations } from "@/lib/entity-pages";
import { getAllEvents, type Participant } from "@/lib/events";
import { getAllMatches, type MatchData } from "@/lib/matches";
import { getPublicCompetitionDirectory } from "@/lib/public-competition-directory";
import { getPublicEventDirectory } from "@/lib/public-event-directory";
import { getPublicCompetitionFixtures } from "@/lib/public-fixtures";
import { getPublicParticipantDirectory } from "@/lib/public-participants";
import { isSeoIndexable } from "@/lib/seo-indexability";
import { sportsRegistry, sportAllowsParticipantPages } from "@/lib/sports-registry";

const BASE_URL = "https://watchtvsport.com";

type SitemapEntry = MetadataRoute.Sitemap[number];

function sitemapEntry(path: string, lastModified?: Date): SitemapEntry {
  return {
    url: `${BASE_URL}${path}`,
    ...(lastModified && !Number.isNaN(lastModified.getTime()) ? { lastModified } : {}),
  };
}

function safeDate(value?: string): Date | undefined {
  if (!value) return undefined;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date;
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

function participantSlug(participant: Participant): string {
  if (participant.slug) return participant.slug;
  if (participant.id.startsWith("club:")) {
    const parsed = participant.id.split(":").slice(2).join(":");
    if (parsed) return parsed;
  }
  return clubSlug(participant.name);
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const events = getAllEvents();
  const worldCupMatches = getAllMatches();
  const [
    ligue1Fixtures,
    premierLeagueFixtures,
    participantDirectory,
    competitionDirectory,
    eventDirectory,
  ] = await Promise.all([
    getPublicCompetitionFixtures("football", "ligue-1"),
    getPublicCompetitionFixtures("football", "premier-league"),
    getPublicParticipantDirectory(),
    getPublicCompetitionDirectory(),
    getPublicEventDirectory(),
  ]);

  const eventCountBySport = new Map<string, number>();
  for (const event of events) {
    eventCountBySport.set(event.sport, (eventCountBySport.get(event.sport) ?? 0) + 1);
  }
  for (const event of eventDirectory) {
    eventCountBySport.set(event.sport, (eventCountBySport.get(event.sport) ?? 0) + 1);
  }

  const staticPages = [
    sitemapEntry("/"),
    sitemapEntry("/sports"),
    sitemapEntry("/events"),
    sitemapEntry("/motorsports"),
    sitemapEntry("/combat-sports"),
    sitemapEntry("/combat-sports/mma"),
    sitemapEntry("/archive/world-cup-2026"),
    sitemapEntry("/methodology"),
    sitemapEntry("/report-error"),
  ];

  const sportPages = sportsRegistry
    .filter((sport) =>
      isSeoIndexable({
        canonicalPath: sportHubPath(sport.slug),
        published: sport.enabled,
        usefulContentCount: eventCountBySport.get(sport.slug) ?? 0,
      }),
    )
    .map((sport) => sitemapEntry(sportHubPath(sport.slug)));

  // Primary competition discovery comes from Supabase. Formula 1 and UFC use
  // dedicated canonical hubs rather than duplicate generic competition URLs.
  const databaseCompetitionPages = competitionDirectory
    .filter((competition) => competition.sport !== "formula-1" && competition.sport !== "ufc")
    .filter((competition) =>
      isSeoIndexable({
        canonicalPath: competitionPath(competition.sport, competition.slug),
        usefulContentCount: competition.participantCount + competition.publishedEventCount,
      }),
    )
    .map((competition) =>
      sitemapEntry(
        competitionPath(competition.sport, competition.slug),
        safeDate(competition.lastModified),
      ),
    );

  // Compatibility fallback while the competition directory RPC is not yet
  // available or during a partial migration.
  const eventCompetitionPages = events
    .filter((event) => event.sport !== "formula-1" && event.sport !== "ufc")
    .map((event) => competitionPath(event.sport, event.competitionSlug));
  const fixtureCompetitionPages = [
    ...(ligue1Fixtures.length ? [competitionPath("football", "ligue-1")] : []),
    ...(premierLeagueFixtures.length ? [competitionPath("football", "premier-league")] : []),
  ];
  const fallbackCompetitionPages = Array.from(
    new Set([...eventCompetitionPages, ...fixtureCompetitionPages]),
  ).map((path) => sitemapEntry(path));
  const competitionPages = [...databaseCompetitionPages, ...fallbackCompetitionPages];

  // Primary participant source: Supabase directory. Every active club/team is
  // discoverable even before its first event is imported.
  const databaseClubPages = participantDirectory
    .filter((participant) => sportAllowsParticipantPages(participant.sport))
    .map((participant) => `/sports/${participant.sport}/club/${participant.slug}`);

  // Compatibility fallback for participants bundled in runtime events.
  const eventClubMap = new Map(
    events.flatMap((event) => {
      if (!sportAllowsParticipantPages(event.sport)) return [];
      return [event.participant1, event.participant2]
        .filter(
          (participant): participant is Participant =>
            Boolean(
              participant &&
                (participant.type === "club" || participant.type === "national_team"),
            ),
        )
        .map(
          (participant) =>
            [`${event.sport}:${participant.id}`, { sport: event.sport, participant }] as const,
        );
    }),
  );
  const eventClubPages = Array.from(eventClubMap.values()).map(({ sport, participant }) =>
    `/sports/${sport}/club/${participantSlug(participant)}`,
  );
  const clubPages = Array.from(new Set([...databaseClubPages, ...eventClubPages])).map((path) => sitemapEntry(path));

  const nationPages = getFootballNations(events).map((nation) =>
    sitemapEntry(`/football/nation/${entitySlug(nation.name)}`),
  );

  // Every published Supabase event becomes discoverable automatically. The
  // directory selects a stable permanent fixture path whenever one exists.
  const databaseEventPages = eventDirectory
    .filter((event) =>
      isSeoIndexable({
        canonicalPath: event.detailPath,
        usefulContentCount: event.eventDate ? 1 : 0,
      }),
    )
    .map((event) =>
      sitemapEntry(event.detailPath, safeDate(event.lastModified ?? event.eventDate)),
    );

  // Legacy/permanent bundled paths stay discoverable while migration completes.
  const permanentEventPages = Array.from(
    new Map(
      events
        .filter((event) => event.detailPath.startsWith("/football/"))
        .map((event) => [event.detailPath, event] as const),
    ).values(),
  ).map((event) => sitemapEntry(event.detailPath));

  const leagueFixturePages = [...ligue1Fixtures, ...premierLeagueFixtures]
    .filter((fixture) =>
      isSeoIndexable({
        canonicalPath: fixture.detailPath,
        usefulContentCount: fixture.exactDate ? 1 : 0,
      }),
    )
    .map((fixture) =>
      sitemapEntry(
        fixture.detailPath,
        fixture.exactDate ? new Date(fixture.exactDate) : undefined,
      ),
    );

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
          const year = new Date(event.eventDate).getUTCFullYear();
          return [`${event.eventGroupSlug}:${year}`, { event, year }] as const;
        }),
    ).values(),
  ).map(({ event, year }) =>
    sitemapEntry(`/formula-1/grand-prix/${event.eventGroupSlug}/${year}`, new Date(event.eventDate)),
  );

  const ufcPages = Array.from(
    new Map(
      events
        .filter((event) => event.sport === "ufc" && event.eventGroupSlug)
        .map((event) => [event.eventGroupSlug!, event] as const),
    ).values(),
  ).map((event) => sitemapEntry(`/ufc/event/${event.eventGroupSlug}`));

  // Keep historical World Cup URLs discoverable: they already carry search equity.
  const archiveMatchPages = worldCupMatches.map((match) =>
    sitemapEntry(`/match/${match.slug}`, new Date(match.matchDate)),
  );
  const watchPages = worldCupMatches.flatMap((match) =>
    confirmedCountryCodes(match).map((code) =>
      sitemapEntry(`/watch/${match.slug}/${code}`, new Date(match.matchDate)),
    ),
  );
  const countryPages = Array.from(
    new Set(worldCupMatches.flatMap((match) => confirmedCountryCodes(match))),
  ).map((code) => sitemapEntry(`/country/${code}`));

  const deduped = new Map<string, SitemapEntry>();
  for (const entry of [
    ...staticPages,
    ...sportPages,
    ...competitionPages,
    ...clubPages,
    ...nationPages,
    ...databaseEventPages,
    ...permanentEventPages,
    ...leagueFixturePages,
    ...f1Pages,
    ...f1EditionPages,
    ...ufcPages,
    ...archiveMatchPages,
    ...watchPages,
    ...countryPages,
  ]) {
    deduped.set(entry.url, entry);
  }

  return Array.from(deduped.values());
}
