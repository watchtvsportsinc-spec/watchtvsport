// lib/matches.ts

import { broadcastsByCountry } from "./broadcasts";
import { worldCup2026Schedule } from "../source/world-cup-2026-schedule";

export type BroadcastInfo = {
  countryCode: string;
  countryName: string;
  broadcaster: string;
  access: "Free" | "Paid";
  url: string;
  affiliateUrl?: string;
  sourceName?: string;
  sourceUrl?: string;
  lastChecked?: string;
  hasFullCoverage?: boolean;
  notes?: string;
  commentaryLanguages?: string[];
  coverageType?: "full" | "partial";
  matchSlugs?: string[];
  excludedMatchSlugs?: string[];
};

function isBroadcastAvailableForMatch(
  broadcast: BroadcastInfo,
  matchSlug: string
): boolean {
  const coverageType =
    broadcast.coverageType ??
    (broadcast.hasFullCoverage === false ? "partial" : "full");

  if (coverageType === "full") {
    return true;
  }

  if (broadcast.excludedMatchSlugs && broadcast.excludedMatchSlugs.length > 0) {
    return !broadcast.excludedMatchSlugs.includes(matchSlug);
  }

  if (broadcast.matchSlugs && broadcast.matchSlugs.length > 0) {
    return broadcast.matchSlugs.includes(matchSlug);
  }

  return false;
}

export type TeamSlot = {
  name: string;
  shortName: string;
  code: string; // FIFA 3 lettres
  countryCode: string; // ISO 2 lettres pour flags
};

export type MatchStage =
  | "Group"
  | "Round of 32"
  | "Round of 16"
  | "Quarter-final"
  | "Semi-final"
  | "Third-place match"
  | "Final";

export type MatchData = {
  id: string;
  slug: string;
  matchNumber: number;
  stage: MatchStage;
  group?: string;
  competition: string;
  competitionSlug: string;
  matchDate: string;
  homeTeam: TeamSlot;
  awayTeam: TeamSlot;
  hostCity?: string;
  hostCountry?: string;
  stadiumName?: string;
  timezone?: string;
  status?: "scheduled" | "live" | "finished";
  broadcasts: BroadcastInfo[];
};

const TEAM_META: Record<string, TeamSlot> = {
  Algeria: { name: "Algeria", shortName: "Algeria", code: "ALG", countryCode: "dz" },
  Argentina: { name: "Argentina", shortName: "Argentina", code: "ARG", countryCode: "ar" },
  Australia: { name: "Australia", shortName: "Australia", code: "AUS", countryCode: "au" },
  Austria: { name: "Austria", shortName: "Austria", code: "AUT", countryCode: "at" },
  Belgium: { name: "Belgium", shortName: "Belgium", code: "BEL", countryCode: "be" },
  "Bosnia and Herzegovina": {
    name: "Bosnia and Herzegovina",
    shortName: "Bosnia",
    code: "BIH",
    countryCode: "ba",
  },
  Brazil: { name: "Brazil", shortName: "Brazil", code: "BRA", countryCode: "br" },
  Canada: { name: "Canada", shortName: "Canada", code: "CAN", countryCode: "ca" },
  "Cape Verde": {
    name: "Cape Verde",
    shortName: "Cape Verde",
    code: "CPV",
    countryCode: "cv",
  },
  "Cabo Verde": {
    name: "Cabo Verde",
    shortName: "Cabo Verde",
    code: "CPV",
    countryCode: "cv",
  },
  Colombia: { name: "Colombia", shortName: "Colombia", code: "COL", countryCode: "co" },
  Croatia: { name: "Croatia", shortName: "Croatia", code: "CRO", countryCode: "hr" },
  Curacao: { name: "Curacao", shortName: "Curacao", code: "CUW", countryCode: "cw" },
  "Curaçao": { name: "Curaçao", shortName: "Curaçao", code: "CUW", countryCode: "cw" },
  Czechia: { name: "Czechia", shortName: "Czechia", code: "CZE", countryCode: "cz" },
  Ecuador: { name: "Ecuador", shortName: "Ecuador", code: "ECU", countryCode: "ec" },
  Egypt: { name: "Egypt", shortName: "Egypt", code: "EGY", countryCode: "eg" },
  England: { name: "England", shortName: "England", code: "ENG", countryCode: "gb" },
  France: { name: "France", shortName: "France", code: "FRA", countryCode: "fr" },
  Germany: { name: "Germany", shortName: "Germany", code: "GER", countryCode: "de" },
  Ghana: { name: "Ghana", shortName: "Ghana", code: "GHA", countryCode: "gh" },
  Haiti: { name: "Haiti", shortName: "Haiti", code: "HAI", countryCode: "ht" },
  Iraq: { name: "Iraq", shortName: "Iraq", code: "IRQ", countryCode: "iq" },
  "IR Iran": { name: "IR Iran", shortName: "Iran", code: "IRN", countryCode: "ir" },
  "Ivory Coast": {
    name: "Ivory Coast",
    shortName: "Ivory Coast",
    code: "CIV",
    countryCode: "ci",
  },
  "Côte d'Ivoire": {
    name: "Côte d'Ivoire",
    shortName: "Côte d'Ivoire",
    code: "CIV",
    countryCode: "ci",
  },
  Japan: { name: "Japan", shortName: "Japan", code: "JPN", countryCode: "jp" },
  Jordan: { name: "Jordan", shortName: "Jordan", code: "JOR", countryCode: "jo" },
  Mexico: { name: "Mexico", shortName: "Mexico", code: "MEX", countryCode: "mx" },
  Morocco: { name: "Morocco", shortName: "Morocco", code: "MAR", countryCode: "ma" },
  Netherlands: {
    name: "Netherlands",
    shortName: "Netherlands",
    code: "NED",
    countryCode: "nl",
  },
  "New Zealand": {
    name: "New Zealand",
    shortName: "New Zealand",
    code: "NZL",
    countryCode: "nz",
  },
  Norway: { name: "Norway", shortName: "Norway", code: "NOR", countryCode: "no" },
  Panama: { name: "Panama", shortName: "Panama", code: "PAN", countryCode: "pa" },
  Paraguay: { name: "Paraguay", shortName: "Paraguay", code: "PAR", countryCode: "py" },
  Portugal: { name: "Portugal", shortName: "Portugal", code: "POR", countryCode: "pt" },
  Qatar: { name: "Qatar", shortName: "Qatar", code: "QAT", countryCode: "qa" },
  "DR Congo": { name: "DR Congo", shortName: "DR Congo", code: "COD", countryCode: "cd" },
  "Congo DR": { name: "Congo DR", shortName: "Congo DR", code: "COD", countryCode: "cd" },
  "Saudi Arabia": {
    name: "Saudi Arabia",
    shortName: "Saudi Arabia",
    code: "KSA",
    countryCode: "sa",
  },
  Scotland: { name: "Scotland", shortName: "Scotland", code: "SCO", countryCode: "gb" },
  Senegal: { name: "Senegal", shortName: "Senegal", code: "SEN", countryCode: "sn" },
  "South Africa": {
    name: "South Africa",
    shortName: "South Africa",
    code: "RSA",
    countryCode: "za",
  },
  "South Korea": {
    name: "South Korea",
    shortName: "South Korea",
    code: "KOR",
    countryCode: "kr",
  },
  "Korea Republic": {
    name: "Korea Republic",
    shortName: "Korea Republic",
    code: "KOR",
    countryCode: "kr",
  },
  Spain: { name: "Spain", shortName: "Spain", code: "ESP", countryCode: "es" },
  Sweden: { name: "Sweden", shortName: "Sweden", code: "SWE", countryCode: "se" },
  Switzerland: {
    name: "Switzerland",
    shortName: "Switzerland",
    code: "SUI",
    countryCode: "ch",
  },
  Tunisia: { name: "Tunisia", shortName: "Tunisia", code: "TUN", countryCode: "tn" },
  Turkey: { name: "Turkey", shortName: "Turkey", code: "TUR", countryCode: "tr" },
  "Türkiye": { name: "Türkiye", shortName: "Türkiye", code: "TUR", countryCode: "tr" },
  Uruguay: { name: "Uruguay", shortName: "Uruguay", code: "URU", countryCode: "uy" },
  USA: { name: "USA", shortName: "USA", code: "USA", countryCode: "us" },
  Uzbekistan: {
    name: "Uzbekistan",
    shortName: "Uzbekistan",
    code: "UZB",
    countryCode: "uz",
  },
};

function slugify(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();
}

function toTeamSlot(teamName: string): TeamSlot {
  const found = TEAM_META[teamName];

  if (found) {
    return found;
  }

  return {
    name: teamName,
    shortName: teamName,
    code: teamName.slice(0, 3).toUpperCase(),
    countryCode: teamName.slice(0, 2).toLowerCase(),
  };
}

function getAllBroadcasts(): BroadcastInfo[] {
  return Object.values(broadcastsByCountry).flat();
}

function sortMatchesByDate(matches: MatchData[]): MatchData[] {
  return [...matches].sort(
    (a, b) => new Date(a.matchDate).getTime() - new Date(b.matchDate).getTime()
  );
}

function createMatch(input: {
  slug: string;
  matchNumber: number;
  stage: MatchStage;
  group?: string;
  matchDate: string;
  homeTeam: string;
  awayTeam: string;
  hostCity?: string;
  hostCountry?: string;
  stadiumName?: string;
  timezone?: string;
  status?: "scheduled" | "live" | "finished";
}): MatchData {
  return {
    id: `wc2026-${input.matchNumber}`,
    slug: input.slug,
    matchNumber: input.matchNumber,
    stage: input.stage,
    group: input.group,
    competition: "FIFA World Cup 2026",
    competitionSlug: "fifa-world-cup-2026",
    matchDate: input.matchDate,
    homeTeam: toTeamSlot(input.homeTeam),
    awayTeam: toTeamSlot(input.awayTeam),
    hostCity: input.hostCity,
    hostCountry: input.hostCountry,
    stadiumName: input.stadiumName,
    timezone: input.timezone ?? "UTC",
    status: input.status ?? "scheduled",
    broadcasts: getAllBroadcasts().filter((broadcast) =>
      isBroadcastAvailableForMatch(broadcast, input.slug)
    ),
  };
}

function mapStage(
  stage:
    | "Group Stage"
    | "Round of 32"
    | "Round of 16"
    | "Quarter-final"
    | "Semi-final"
    | "Third Place"
    | "Final"
): MatchStage {
  switch (stage) {
    case "Group Stage":
      return "Group";
    case "Round of 32":
      return "Round of 32";
    case "Round of 16":
      return "Round of 16";
    case "Quarter-final":
      return "Quarter-final";
    case "Semi-final":
      return "Semi-final";
    case "Final":
      return "Final";
    case "Third Place":
      return "Third-place match";
    default:
      return "Group";
  }
}

const matches: MatchData[] = sortMatchesByDate(
  worldCup2026Schedule.map((match, index) => {
    const isoDate = `${match.dateGmt}T${match.timeGmt}:00Z`;

    return createMatch({
      slug: `${slugify(match.homeTeam)}-vs-${slugify(match.awayTeam)}-${match.dateGmt}`,
      matchNumber: index + 1,
      stage: mapStage(match.stage),
      group: match.group,
      matchDate: isoDate,
      homeTeam: match.homeTeam,
      awayTeam: match.awayTeam,
      hostCity: match.city,
      stadiumName: match.stadium,
      hostCountry: undefined,
      timezone: "UTC",
      status: "scheduled",
    });
  })
);

export function getAllMatches(): MatchData[] {
  return matches;
}

export function getMatchBySlug(slug: string): MatchData | undefined {
  return matches.find((match) => match.slug === slug);
}

export function getMatchesByStage(stage: MatchStage): MatchData[] {
  return matches.filter((match) => match.stage === stage);
}

export function getGroupStageMatches(): MatchData[] {
  return matches.filter((match) => match.stage === "Group");
}

export function getMatchesByGroup(group: string): MatchData[] {
  const normalizedGroup = group.trim().toUpperCase();
  return matches.filter((match) => match.group?.toUpperCase() === normalizedGroup);
}

export function getMatchesForCountry(countryCode: string): MatchData[] {
  const normalizedCountryCode = countryCode.trim().toLowerCase();

  return matches.filter((match) =>
    match.broadcasts.some(
      (broadcast) => broadcast.countryCode.toLowerCase() === normalizedCountryCode
    )
  );
}

export function getAvailableCountryCodes(): string[] {
  return Array.from(
    new Set(getAllBroadcasts().map((broadcast) => broadcast.countryCode.toLowerCase()))
  ).sort();
}

export function getAvailableCountries(): Array<{
  countryCode: string;
  countryName: string;
}> {
  const map = new Map<string, string>();

  for (const broadcast of getAllBroadcasts()) {
    const code = broadcast.countryCode.toLowerCase();
    if (!map.has(code)) {
      map.set(code, broadcast.countryName);
    }
  }

  return Array.from(map.entries())
    .map(([countryCode, countryName]) => ({ countryCode, countryName }))
    .sort((a, b) => a.countryName.localeCompare(b.countryName));
}

export function getRelatedMatches(slug: string, limit = 6): MatchData[] {
  const currentMatch = getMatchBySlug(slug);

  if (!currentMatch) {
    return getAllMatches().slice(0, limit);
  }

  const sameGroupMatches = matches.filter(
    (match) =>
      match.slug !== slug &&
      currentMatch.group !== undefined &&
      match.group === currentMatch.group
  );

  const sameStageMatches = matches.filter(
    (match) =>
      match.slug !== slug &&
      match.stage === currentMatch.stage &&
      match.group !== currentMatch.group
  );

  return [...sameGroupMatches, ...sameStageMatches].slice(0, limit);
}

export { matches };