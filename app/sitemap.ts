import type { MetadataRoute } from "next";
import { matches, type MatchData, type BroadcastInfo } from "@/lib/matches";

type SafeBroadcastInfo = {
  countryCode: string;
  countryName: string;
  broadcaster: string;
  access: "Free" | "Paid";
  url: string;
};

type SafeMatchData = MatchData & {
  slug: string;
  matchDate: string;
};

function ensureMatch(match: MatchData): SafeMatchData {
  return {
    ...match,
    slug: typeof match.slug === "string" && match.slug.trim() ? match.slug : "",
    matchDate:
      typeof match.matchDate === "string" && match.matchDate.trim()
        ? match.matchDate
        : new Date().toISOString(),
  };
}

function normalizeBroadcast(item: BroadcastInfo): SafeBroadcastInfo | null {
  const countryCode =
    typeof item.countryCode === "string" && item.countryCode.trim()
      ? item.countryCode.toLowerCase()
      : "";

  const countryName =
    typeof item.countryName === "string" && item.countryName.trim()
      ? item.countryName
      : "";

  const broadcaster =
    typeof item.broadcaster === "string" && item.broadcaster.trim()
      ? item.broadcaster
      : "";

  const url =
    typeof item.url === "string" && item.url.trim()
      ? item.url
      : "";

  const access = item.access === "Free" || item.access === "Paid" ? item.access : null;

  if (!countryCode || !countryName || !broadcaster || !url || !access) {
    return null;
  }

  return {
    countryCode,
    countryName,
    broadcaster,
    access,
    url,
  };
}

function getSafeBroadcasts(match: MatchData): SafeBroadcastInfo[] {
  const broadcasts = Array.isArray(match.broadcasts) ? match.broadcasts : [];

  return broadcasts
    .map((item) => normalizeBroadcast(item))
    .filter((item): item is SafeBroadcastInfo => item !== null);
}

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = "https://watchtvsport.com";

  const safeMatches: SafeMatchData[] = Object.values(matches)
    .filter(Boolean)
    .map((match) => ensureMatch(match))
    .filter((match) => Boolean(match.slug));

  const staticPages: MetadataRoute.Sitemap = [
    {
      url: `${baseUrl}/`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 1,
    },
  ];

  const matchPages: MetadataRoute.Sitemap = safeMatches.map((match) => ({
    url: `${baseUrl}/match/${match.slug}`,
    lastModified: new Date(match.matchDate),
    changeFrequency: "daily",
    priority: 0.9,
  }));

  const watchPages: MetadataRoute.Sitemap = safeMatches.flatMap((match) => {
    const broadcasts = getSafeBroadcasts(match);

    return broadcasts.map((broadcast) => ({
      url: `${baseUrl}/watch/${match.slug}/${broadcast.countryCode}`,
      lastModified: new Date(match.matchDate),
      changeFrequency: "daily" as const,
      priority: 0.8,
    }));
  });

  return [...staticPages, ...matchPages, ...watchPages];
}