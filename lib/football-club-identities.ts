export type PriorityFootballCompetitionSlug = "premier-league" | "ligue-1";

export type PriorityFootballClubIdentity = {
  slug: string;
  name: string;
  shortName: string;
  aliases: readonly string[];
  countryCode: string;
  competitionSlug: PriorityFootballCompetitionSlug;
  seasonLabel: "2026/27";
  membershipSourceName: string;
  membershipSourceUrl: string;
  kitReviewSourceUrl: string;
  verifiedOn: "2026-09-16";
};

const PREMIER_LEAGUE_SOURCE = {
  seasonLabel: "2026/27" as const,
  membershipSourceName: "Premier League",
  membershipSourceUrl: "https://www.premierleague.com/en/news/4675097/all-380-fixtures-for-202627-premier-league-season/",
  kitReviewSourceUrl: "https://www.premierleague.com/en/news/4672981/premier-league-club-kits-for-202627-season",
  verifiedOn: "2026-09-16" as const,
};

const LIGUE_1_SOURCE = {
  seasonLabel: "2026/27" as const,
  membershipSourceName: "Ligue 1 McDonald's",
  membershipSourceUrl: "https://ligue1.com/fr/articles/l1_article_5293-les-dates-de-reprise-des-clubs-de-l1-2627",
  kitReviewSourceUrl: "https://ligue1.com/fr/articles/l1_article_5082-les-maillots-de-la-saison-2026-2027-l1",
  verifiedOn: "2026-09-16" as const,
};

export const priorityFootballClubIdentities = [
  {
    slug: "afc-bournemouth",
    name: "AFC Bournemouth",
    shortName: "Bournemouth",
    aliases: ["Bournemouth", "AFCB", "AFC Bournemouth FC"],
    countryCode: "GB",
    competitionSlug: "premier-league",
    ...PREMIER_LEAGUE_SOURCE,
  },
  {
    slug: "arsenal",
    name: "Arsenal",
    shortName: "Arsenal",
    aliases: ["Arsenal FC", "AFC", "Gunners"],
    countryCode: "GB",
    competitionSlug: "premier-league",
    ...PREMIER_LEAGUE_SOURCE,
  },
  {
    slug: "aston-villa",
    name: "Aston Villa",
    shortName: "Aston Villa",
    aliases: ["Villa", "AVFC", "Aston Villa FC"],
    countryCode: "GB",
    competitionSlug: "premier-league",
    ...PREMIER_LEAGUE_SOURCE,
  },
  {
    slug: "brentford",
    name: "Brentford",
    shortName: "Brentford",
    aliases: ["Brentford FC"],
    countryCode: "GB",
    competitionSlug: "premier-league",
    ...PREMIER_LEAGUE_SOURCE,
  },
  {
    slug: "brighton-hove-albion",
    name: "Brighton & Hove Albion",
    shortName: "Brighton",
    aliases: ["Brighton", "Brighton and Hove Albion", "BHAFC"],
    countryCode: "GB",
    competitionSlug: "premier-league",
    ...PREMIER_LEAGUE_SOURCE,
  },
  {
    slug: "chelsea",
    name: "Chelsea",
    shortName: "Chelsea",
    aliases: ["Chelsea FC", "CFC"],
    countryCode: "GB",
    competitionSlug: "premier-league",
    ...PREMIER_LEAGUE_SOURCE,
  },
  {
    slug: "coventry-city",
    name: "Coventry City",
    shortName: "Coventry",
    aliases: ["Coventry", "Coventry City FC", "CCFC"],
    countryCode: "GB",
    competitionSlug: "premier-league",
    ...PREMIER_LEAGUE_SOURCE,
  },
  {
    slug: "crystal-palace",
    name: "Crystal Palace",
    shortName: "Crystal Palace",
    aliases: ["Palace", "Crystal Palace FC", "CPFC"],
    countryCode: "GB",
    competitionSlug: "premier-league",
    ...PREMIER_LEAGUE_SOURCE,
  },
  {
    slug: "everton",
    name: "Everton",
    shortName: "Everton",
    aliases: ["Everton FC", "EFC"],
    countryCode: "GB",
    competitionSlug: "premier-league",
    ...PREMIER_LEAGUE_SOURCE,
  },
  {
    slug: "fulham",
    name: "Fulham",
    shortName: "Fulham",
    aliases: ["Fulham FC", "FFC"],
    countryCode: "GB",
    competitionSlug: "premier-league",
    ...PREMIER_LEAGUE_SOURCE,
  },
  {
    slug: "hull-city",
    name: "Hull City",
    shortName: "Hull City",
    aliases: ["Hull", "Hull City AFC", "HCAFC"],
    countryCode: "GB",
    competitionSlug: "premier-league",
    ...PREMIER_LEAGUE_SOURCE,
  },
  {
    slug: "ipswich-town",
    name: "Ipswich Town",
    shortName: "Ipswich",
    aliases: ["Ipswich", "Ipswich Town FC", "ITFC"],
    countryCode: "GB",
    competitionSlug: "premier-league",
    ...PREMIER_LEAGUE_SOURCE,
  },
  {
    slug: "leeds-united",
    name: "Leeds United",
    shortName: "Leeds",
    aliases: ["Leeds", "Leeds United FC", "LUFC"],
    countryCode: "GB",
    competitionSlug: "premier-league",
    ...PREMIER_LEAGUE_SOURCE,
  },
  {
    slug: "liverpool",
    name: "Liverpool",
    shortName: "Liverpool",
    aliases: ["Liverpool FC", "LFC"],
    countryCode: "GB",
    competitionSlug: "premier-league",
    ...PREMIER_LEAGUE_SOURCE,
  },
  {
    slug: "manchester-city",
    name: "Manchester City",
    shortName: "Man City",
    aliases: ["Man City", "Manchester City FC", "MCFC"],
    countryCode: "GB",
    competitionSlug: "premier-league",
    ...PREMIER_LEAGUE_SOURCE,
  },
  {
    slug: "manchester-united",
    name: "Manchester United",
    shortName: "Man Utd",
    aliases: ["Man United", "Man Utd", "Manchester Utd", "Manchester United FC", "MUFC", "MUN"],
    countryCode: "GB",
    competitionSlug: "premier-league",
    ...PREMIER_LEAGUE_SOURCE,
  },
  {
    slug: "newcastle-united",
    name: "Newcastle United",
    shortName: "Newcastle",
    aliases: ["Newcastle", "Newcastle United FC", "NUFC"],
    countryCode: "GB",
    competitionSlug: "premier-league",
    ...PREMIER_LEAGUE_SOURCE,
  },
  {
    slug: "nottingham-forest",
    name: "Nottingham Forest",
    shortName: "Nottingham Forest",
    aliases: ["Nott'm Forest", "Nottm Forest", "Nottingham Forest FC", "NFFC"],
    countryCode: "GB",
    competitionSlug: "premier-league",
    ...PREMIER_LEAGUE_SOURCE,
  },
  {
    slug: "sunderland",
    name: "Sunderland",
    shortName: "Sunderland",
    aliases: ["Sunderland AFC", "SAFC"],
    countryCode: "GB",
    competitionSlug: "premier-league",
    ...PREMIER_LEAGUE_SOURCE,
  },
  {
    slug: "tottenham-hotspur",
    name: "Tottenham Hotspur",
    shortName: "Tottenham",
    aliases: ["Tottenham", "Spurs", "Tottenham Hotspur FC", "THFC"],
    countryCode: "GB",
    competitionSlug: "premier-league",
    ...PREMIER_LEAGUE_SOURCE,
  },
  {
    slug: "angers-sco",
    name: "Angers SCO",
    shortName: "Angers",
    aliases: ["Angers", "SCO Angers"],
    countryCode: "FR",
    competitionSlug: "ligue-1",
    ...LIGUE_1_SOURCE,
  },
  {
    slug: "aj-auxerre",
    name: "AJ Auxerre",
    shortName: "Auxerre",
    aliases: ["Auxerre", "AJA"],
    countryCode: "FR",
    competitionSlug: "ligue-1",
    ...LIGUE_1_SOURCE,
  },
  {
    slug: "stade-brestois-29",
    name: "Stade Brestois 29",
    shortName: "Brest",
    aliases: ["Brest", "Stade Brestois", "SB29"],
    countryCode: "FR",
    competitionSlug: "ligue-1",
    ...LIGUE_1_SOURCE,
  },
  {
    slug: "havre-ac",
    name: "Havre AC",
    shortName: "Le Havre",
    aliases: ["Le Havre", "Le Havre AC", "HAC"],
    countryCode: "FR",
    competitionSlug: "ligue-1",
    ...LIGUE_1_SOURCE,
  },
  {
    slug: "le-mans-fc",
    name: "Le Mans FC",
    shortName: "Le Mans",
    aliases: ["Le Mans", "LMFC"],
    countryCode: "FR",
    competitionSlug: "ligue-1",
    ...LIGUE_1_SOURCE,
  },
  {
    slug: "lens",
    name: "RC Lens",
    shortName: "Lens",
    aliases: ["Lens", "Racing Club de Lens", "RCL"],
    countryCode: "FR",
    competitionSlug: "ligue-1",
    ...LIGUE_1_SOURCE,
  },
  {
    slug: "fc-lorient",
    name: "FC Lorient",
    shortName: "Lorient",
    aliases: ["Lorient", "FCL"],
    countryCode: "FR",
    competitionSlug: "ligue-1",
    ...LIGUE_1_SOURCE,
  },
  {
    slug: "lille",
    name: "LOSC",
    shortName: "Lille",
    aliases: ["Lille", "LOSC Lille", "Lille OSC"],
    countryCode: "FR",
    competitionSlug: "ligue-1",
    ...LIGUE_1_SOURCE,
  },
  {
    slug: "olympique-lyonnais",
    name: "Olympique Lyonnais",
    shortName: "Lyon",
    aliases: ["Lyon", "OL"],
    countryCode: "FR",
    competitionSlug: "ligue-1",
    ...LIGUE_1_SOURCE,
  },
  {
    slug: "olympique-de-marseille",
    name: "Olympique de Marseille",
    shortName: "Marseille",
    aliases: ["Marseille", "OM"],
    countryCode: "FR",
    competitionSlug: "ligue-1",
    ...LIGUE_1_SOURCE,
  },
  {
    slug: "as-monaco",
    name: "AS Monaco",
    shortName: "Monaco",
    aliases: ["Monaco", "ASM"],
    countryCode: "MC",
    competitionSlug: "ligue-1",
    ...LIGUE_1_SOURCE,
  },
  {
    slug: "ogc-nice",
    name: "OGC Nice",
    shortName: "Nice",
    aliases: ["Nice", "OGCN"],
    countryCode: "FR",
    competitionSlug: "ligue-1",
    ...LIGUE_1_SOURCE,
  },
  {
    slug: "paris-fc",
    name: "Paris FC",
    shortName: "Paris FC",
    aliases: ["PFC"],
    countryCode: "FR",
    competitionSlug: "ligue-1",
    ...LIGUE_1_SOURCE,
  },
  {
    slug: "paris-saint-germain",
    name: "Paris Saint-Germain",
    shortName: "PSG",
    aliases: ["PSG", "Paris SG", "Paris Saint Germain"],
    countryCode: "FR",
    competitionSlug: "ligue-1",
    ...LIGUE_1_SOURCE,
  },
  {
    slug: "stade-rennais",
    name: "Stade Rennais F.C.",
    shortName: "Rennes",
    aliases: ["Rennes", "Stade Rennais", "Stade Rennais FC", "SRFC"],
    countryCode: "FR",
    competitionSlug: "ligue-1",
    ...LIGUE_1_SOURCE,
  },
  {
    slug: "rc-strasbourg-alsace",
    name: "RC Strasbourg Alsace",
    shortName: "Strasbourg",
    aliases: ["Strasbourg", "Racing Strasbourg", "RCSA"],
    countryCode: "FR",
    competitionSlug: "ligue-1",
    ...LIGUE_1_SOURCE,
  },
  {
    slug: "toulouse-fc",
    name: "Toulouse FC",
    shortName: "Toulouse",
    aliases: ["Toulouse", "TFC"],
    countryCode: "FR",
    competitionSlug: "ligue-1",
    ...LIGUE_1_SOURCE,
  },
  {
    slug: "estac-troyes",
    name: "ESTAC Troyes",
    shortName: "Troyes",
    aliases: ["Troyes", "ESTAC"],
    countryCode: "FR",
    competitionSlug: "ligue-1",
    ...LIGUE_1_SOURCE,
  },
] as const satisfies readonly PriorityFootballClubIdentity[];

export function normalizeFootballClubIdentityKey(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ø/gi, "o")
    .replace(/æ/gi, "ae")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function identitySearchNames(identity: PriorityFootballClubIdentity): string[] {
  return Array.from(new Set([
    identity.slug,
    identity.name,
    identity.shortName,
    ...identity.aliases,
  ].map((value) => value.trim()).filter(Boolean)));
}

const identitiesBySlug = new Map(
  priorityFootballClubIdentities.map((identity) => [identity.slug, identity] as const),
);

const identitiesBySearchKey = new Map<string, PriorityFootballClubIdentity | null>();
for (const identity of priorityFootballClubIdentities) {
  for (const value of identitySearchNames(identity)) {
    const key = normalizeFootballClubIdentityKey(value);
    const previous = identitiesBySearchKey.get(key);
    if (previous && previous.slug !== identity.slug) {
      identitiesBySearchKey.set(key, null);
    } else if (previous !== null) {
      identitiesBySearchKey.set(key, identity);
    }
  }
}

export function getPriorityFootballClubIdentityBySlug(slug: string): PriorityFootballClubIdentity | null {
  return identitiesBySlug.get(slug) ?? null;
}

export function resolvePriorityFootballClubIdentity(value: string): PriorityFootballClubIdentity | null {
  return identitiesBySearchKey.get(normalizeFootballClubIdentityKey(value)) ?? null;
}

export function getPriorityFootballClubsByCompetition(
  competitionSlug: PriorityFootballCompetitionSlug,
): PriorityFootballClubIdentity[] {
  return priorityFootballClubIdentities.filter((identity) => identity.competitionSlug === competitionSlug);
}

export function getPriorityFootballClubSearchNames(identity: PriorityFootballClubIdentity): string[] {
  return identitySearchNames(identity);
}
