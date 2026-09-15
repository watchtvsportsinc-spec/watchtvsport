import type { MetadataRoute } from "next";
import { clubSlug } from "@/lib/club-aliases";
import { entitySlug, getFootballNations } from "@/lib/entity-pages";
import { getAllEvents } from "@/lib/events";
import { getAllMatches, type MatchData } from "@/lib/matches";

const BASE_URL = "https://watchtvsport.com";

function sitemapEntry(
  path: string,
  priority: number,
  changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"],
  lastModified: Date = new Date()
): MetadataRoute.Sitemap[number] {
  return {
    url: `${BASE_URL}${path}`,
    lastModified,
    changeFrequency,
    priority,
  };
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
            broadcast.url
        )
        .map((broadcast) => broadcast.countryCode.toLowerCase())
    )
  );
}

export default function sitemap(): MetadataRoute.Sitemap {
  const events = getAllEvents();
  const worldCupMatches = getAllMatches();

  const staticPages: MetadataRoute.Sitemap = [
    sitemapEntry("/", 1, "daily"),
    sitemapEntry("/football", 0.95, "daily"),
    sitemapEntry("/formula-1", 0.95, "daily"),
  ];

  const competitionPages = Array.from(
    new Set(
      events
        .filter((event) => event.sport === "football")
        .map((event) => event.competitionSlug)
    )
  ).map((slug) => sitemapEntry(`/football/competition/${slug}`, 0.9, "daily"));

  const clubPages = Array.from(
    new Map(
      events
        .filter((event) => event.sport === "football")
        .flatMap((event) => [event.participant1, event.participant2])
        .filter((participant) => participant?.type === "club")
        .map((participant) => [participant!.id, participant!] as const)
    ).values()
  ).map((club) => sitemapEntry(`/football/club/${clubSlug(club.name)}`, 0.85, "daily"));

  const nationPages = getFootballNations(events).map((nation) =>
    sitemapEntry(`/football/nation/${entitySlug(nation.name)}`, 0.85, "daily")
  );

  const permanentEventPages = Array.from(
    new Map(
      events
        .filter((event) => event.detailPath.startsWith("/football/"))
        .map((event) => [event.detailPath, event] as const)
    ).values()
  ).map((event) =>
    sitemapEntry(event.detailPath, 0.9, "daily", new Date(event.eventDate))
  );

  const formula1GrandPrixPages = Array.from(
    new Map(
      events
        .filter(
          (event) =>
            event.sport === "formula-1" &&
            event.eventGroupId &&
            event.eventGroupSlug
        )
        .map((event) => [event.eventGroupId!, event] as const)
    ).values()
  ).map((event) =>
    sitemapEntry(
      `/formula-1/grand-prix/${event.eventGroupSlug}`,
      0.9,
      "daily",
      new Date(event.eventDate)
    )
  );

  // Preserve the already indexed World Cup archive URLs.
  const archiveMatchPages = worldCupMatches.map((match) =>
    sitemapEntry(`/match/${match.slug}`, 0.85, "monthly", new Date(match.matchDate))
  );

  const watchPages = worldCupMatches.flatMap((match) =>
    confirmedCountryCodes(match).map((countryCode) =>
      sitemapEntry(
        `/watch/${match.slug}/${countryCode}`,
        0.75,
        "monthly",
        new Date(match.matchDate)
      )
    )
  );

  const countryPages = Array.from(
    new Set(worldCupMatches.flatMap((match) => confirmedCountryCodes(match)))
  ).map((countryCode) => sitemapEntry(`/country/${countryCode}`, 0.8, "daily"));

  return [
    ...staticPages,
    ...competitionPages,
    ...clubPages,
    ...nationPages,
    ...permanentEventPages,
    ...formula1GrandPrixPages,
    ...archiveMatchPages,
    ...watchPages,
    ...countryPages,
  ];
}
