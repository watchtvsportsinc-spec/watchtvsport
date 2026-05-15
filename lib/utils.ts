import { matches, type MatchData, type BroadcastInfo } from "@/lib/matches";

export type SafeBroadcastInfo = {
  countryCode: string;
  countryName: string;
  broadcaster: string;
  access: "Free" | "Paid";
  url: string;
  affiliateUrl?: string;
  commentaryLanguages?: string[];
};

export type SafeMatchData = MatchData & {
  slug: string;
  group: string;
  matchDate: string;
  competition?: string;
};

export type CountryMatchItem = {
  match: SafeMatchData;
  broadcasts: SafeBroadcastInfo[];
};

export type TimingTone = "upcoming" | "live" | "finished";

export const matchesList: MatchData[] = Array.isArray(matches) ? matches : [];

export function getTeamName(team: MatchData["homeTeam"]): string {
  if (typeof team === "string") return team;

  if (team && typeof team === "object") {
    if ("name" in team && team.name) return String(team.name);
    if ("shortName" in team && team.shortName) return String(team.shortName);
    if ("code" in team && team.code) return String(team.code);
  }

  return "TBD";
}

export function ensureMatch(match: MatchData): SafeMatchData {
  return {
    ...match,
    slug: typeof match.slug === "string" && match.slug.trim() ? match.slug : "",
    group: typeof match.group === "string" && match.group.trim() ? match.group : "TBD",
    matchDate:
      typeof match.matchDate === "string" && match.matchDate.trim()
        ? match.matchDate
        : new Date().toISOString(),
    competition:
      typeof match.competition === "string" && match.competition.trim()
        ? match.competition
        : "FIFA World Cup 2026",
  };
}

export function normalizeBroadcast(item: BroadcastInfo): SafeBroadcastInfo | null {
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

  const url = typeof item.url === "string" && item.url.trim() ? item.url : "";
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
    affiliateUrl:
      typeof item.affiliateUrl === "string" && item.affiliateUrl.trim()
        ? item.affiliateUrl
        : undefined,
    commentaryLanguages: Array.isArray(item.commentaryLanguages)
      ? item.commentaryLanguages.filter(
          (language): language is string =>
            typeof language === "string" && language.trim().length > 0
        )
      : [],
  };
}

export function getSafeBroadcasts(match: MatchData): SafeBroadcastInfo[] {
  const broadcasts = Array.isArray(match.broadcasts) ? match.broadcasts : [];

  return broadcasts
    .map((item) => normalizeBroadcast(item))
    .filter((item): item is SafeBroadcastInfo => item !== null);
}

export function getMatchBySlug(slug: string): MatchData | undefined {
  if (!slug || typeof slug !== "string") return undefined;
  return matchesList.find((match) => match.slug === slug);
}

export function formatStage(stage?: string): string {
  if (!stage) return "";

  const s = stage.toLowerCase();

  // Phases finales (à garder)
  if (s.includes("final") && s.length > 1) return "Final";
  if (s.includes("semi")) return "Semi-finals";
  if (s.includes("quarter")) return "Quarter-finals";
  if (s.includes("round of 16") || s.includes("r16")) return "Round of 16";

  // 👉 Groupes (A → L)
  if (stage.length === 1) {
    return `Group ${stage.toUpperCase()}`;
  }

  return stage;
}

export function formatDate(dateString: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Toronto",
  }).format(new Date(dateString));
}

export function getFeaturedBroadcast(match: MatchData): SafeBroadcastInfo | null {
  const broadcasts = getSafeBroadcasts(match);
  const freeOption = broadcasts.find((item) => item.access === "Free");
  return freeOption ?? broadcasts[0] ?? null;
}

export function getFeaturedMatches(limit = 8): SafeMatchData[] {
  return matchesList
    .map((match) => ensureMatch(match))
    .filter((match) => match.slug)
    .sort(
      (a, b) => new Date(a.matchDate).getTime() - new Date(b.matchDate).getTime()
    )
    .slice(0, limit);
}

export function getFeaturedCountries(
  limit = 8
): { code: string; name: string; matchCount: number }[] {
  const map = new Map<string, { code: string; name: string; matchCount: number }>();

  for (const match of matchesList) {
    const broadcasts = getSafeBroadcasts(match);

    for (const item of broadcasts) {
      const existing = map.get(item.countryCode);

      if (existing) {
        existing.matchCount += 1;
      } else {
        map.set(item.countryCode, {
          code: item.countryCode,
          name: item.countryName,
          matchCount: 1,
        });
      }
    }
  }

  return Array.from(map.values())
    .sort((a, b) => b.matchCount - a.matchCount || a.name.localeCompare(b.name))
    .slice(0, limit);
}

export function getHomepageStats() {
  const safeMatches = matchesList
    .map((match) => ensureMatch(match))
    .filter((match) => match.slug);

  const countryMap = new Map<string, string>();
  let freeOptions = 0;
  let paidOptions = 0;

  for (const match of safeMatches) {
    const broadcasts = getSafeBroadcasts(match);

    for (const item of broadcasts) {
      countryMap.set(item.countryCode, item.countryName);

      if (item.access === "Free") {
        freeOptions += 1;
      } else {
        paidOptions += 1;
      }
    }
  }

  return {
    totalMatches: safeMatches.length,
    totalCountries: countryMap.size,
    freeOptions,
    paidOptions,
  };
}

export function getCountryBroadcasts(
  broadcasts: SafeBroadcastInfo[],
  countryCode: string
): SafeBroadcastInfo[] {
  return broadcasts.filter((item) => item.countryCode === countryCode);
}

export function getCountryDisplayName(
  broadcasts: SafeBroadcastInfo[],
  countryCode: string
): string {
  const found = broadcasts.find((item) => item.countryCode === countryCode);
  return found?.countryName ?? countryCode.toUpperCase();
}

export function getOtherCountryOptions(
  broadcasts: SafeBroadcastInfo[],
  currentCountryCode: string
): SafeBroadcastInfo[] {
  const unique = new Map<string, SafeBroadcastInfo>();

  for (const item of broadcasts) {
    if (item.countryCode === currentCountryCode) continue;
    if (!unique.has(item.countryCode)) {
      unique.set(item.countryCode, item);
    }
  }

  return Array.from(unique.values()).sort((a, b) =>
    a.countryName.localeCompare(b.countryName)
  );
}

export function getPrimaryBroadcast(
  items: SafeBroadcastInfo[]
): SafeBroadcastInfo | null {
  if (!items.length) return null;
  const freeOption = items.find((item) => item.access === "Free");
  return freeOption ?? items[0];
}

export function getOtherMatches(currentSlug: string, limit = 6): SafeMatchData[] {
  return matchesList
    .map((match) => ensureMatch(match))
    .filter((match) => match.slug && match.slug !== currentSlug)
    .sort(
      (a, b) => new Date(a.matchDate).getTime() - new Date(b.matchDate).getTime()
    )
    .slice(0, limit);
}

export function getCountryMatches(countryCode: string): CountryMatchItem[] {
  return matchesList
    .map((match) => ensureMatch(match))
    .map((match) => {
      const broadcasts = getSafeBroadcasts(match).filter(
        (item) => item.countryCode === countryCode
      );

      return {
        match,
        broadcasts,
      };
    })
    .filter((item) => item.match.slug && item.broadcasts.length > 0)
    .sort(
      (a, b) =>
        new Date(a.match.matchDate).getTime() - new Date(b.match.matchDate).getTime()
    );
}

export function getCountryNameFromMatches(
  countryMatches: CountryMatchItem[],
  fallbackCode: string
): string {
  const firstBroadcast = countryMatches[0]?.broadcasts[0];
  return firstBroadcast?.countryName ?? fallbackCode.toUpperCase();
}

export function getCountrySummary(countryMatches: CountryMatchItem[]) {
  const freeCount = countryMatches.filter((item) =>
    item.broadcasts.some((broadcast) => broadcast.access === "Free")
  ).length;

  const paidCount = countryMatches.filter((item) =>
    item.broadcasts.some((broadcast) => broadcast.access === "Paid")
  ).length;

  const broadcasterMap = new Map<string, SafeBroadcastInfo>();

  for (const item of countryMatches) {
    for (const broadcast of item.broadcasts) {
      const key = `${broadcast.countryCode}-${broadcast.broadcaster}`;
      if (!broadcasterMap.has(key)) {
        broadcasterMap.set(key, broadcast);
      }
    }
  }

  const broadcasters = Array.from(broadcasterMap.values()).sort((a, b) =>
    a.broadcaster.localeCompare(b.broadcaster)
  );

  return {
    freeCount,
    paidCount,
    broadcasters,
  };
}

export function getOtherCountryCodes(
  currentCode: string,
  limit = 12
): { code: string; name: string }[] {
  const map = new Map<string, string>();

  for (const match of matchesList) {
    const broadcasts = getSafeBroadcasts(match);

    for (const item of broadcasts) {
      if (item.countryCode === currentCode) continue;
      if (!map.has(item.countryCode)) {
        map.set(item.countryCode, item.countryName);
      }
    }
  }

  return Array.from(map.entries())
    .map(([code, name]) => ({ code, name }))
    .sort((a, b) => a.name.localeCompare(b.name))
    .slice(0, limit);
}

export function getMatchTimingState(matchDate: string): {
  label: string;
  tone: TimingTone;
} {
  const start = new Date(matchDate).getTime();
  const end = start + 2 * 60 * 60 * 1000;
  const now = Date.now();

  if (Number.isNaN(start)) {
    return {
      label: "Scheduled",
      tone: "upcoming",
    };
  }

  if (now >= start && now < end) {
    return {
      label: "LIVE",
      tone: "live",
    };
  }

  if (now >= end) {
    return {
      label: "Finished",
      tone: "finished",
    };
  }

  const diff = start - now;
  const totalMinutes = Math.max(0, Math.floor(diff / (1000 * 60)));
  const days = Math.floor(totalMinutes / (60 * 24));
  const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
  const minutes = totalMinutes % 60;

  if (days > 0) {
    return {
      label: `Starts in ${days}d ${hours}h`,
      tone: "upcoming",
    };
  }

  if (hours > 0) {
    return {
      label: `Starts in ${hours}h ${minutes}m`,
      tone: "upcoming",
    };
  }

  return {
    label: `Starts in ${minutes}m`,
    tone: "upcoming",
  };
}

export function getTimingBadgeStyle(tone: TimingTone) {
  if (tone === "live") {
    return {
      background: "rgba(239,68,68,0.16)",
      color: "#F87171",
      border: "1px solid rgba(239,68,68,0.35)",
      boxShadow: "0 0 0 1px rgba(239,68,68,0.08) inset",
    };
  }

  if (tone === "finished") {
    return {
      background: "rgba(148,163,184,0.12)",
      color: "#CBD5E1",
      border: "1px solid rgba(148,163,184,0.20)",
      boxShadow: "none",
    };
  }

  return {
    background: "rgba(59,130,246,0.15)",
    color: "#BFDBFE",
    border: "1px solid rgba(59,130,246,0.28)",
    boxShadow: "none",
  };
}

export function normalizeCountryCode(value: unknown): string {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

export function normalizeSlug(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}