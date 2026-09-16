export type FootballLeagueProfile = {
  slug: "ligue-1" | "premier-league";
  displayName: string;
  seasonLabel: string;
  countryName: string;
  countryCode: string;
  teamCount: number;
  fixtureCount: number;
  matchdayCount: number;
  seasonStart: string;
  seasonEnd: string;
  heroCopy: string;
  schedulePendingCopy: string;
  officialSourceName: string;
  officialSourceUrl: string;
};

const PROFILES: Record<FootballLeagueProfile["slug"], FootballLeagueProfile> = {
  "ligue-1": {
    slug: "ligue-1",
    displayName: "Ligue 1 McDonald's",
    seasonLabel: "2026/27",
    countryName: "France",
    countryCode: "FR",
    teamCount: 18,
    fixtureCount: 306,
    matchdayCount: 34,
    seasonStart: "2026-08-21",
    seasonEnd: "2027-05-29",
    heroCopy:
      "Follow the 2026/27 Ligue 1 McDonald's season, its 18 clubs, upcoming fixtures and confirmed official TV or streaming options by country.",
    schedulePendingCopy:
      "The 2026/27 league structure and clubs are ready. Match pages are published only after fixture dates and viewing information have been verified.",
    officialSourceName: "Ligue 1 official website",
    officialSourceUrl: "https://ligue1.com/fr/articles/l1_article_5284-",
  },
  "premier-league": {
    slug: "premier-league",
    displayName: "Premier League",
    seasonLabel: "2026/27",
    countryName: "England",
    countryCode: "GB",
    teamCount: 20,
    fixtureCount: 380,
    matchdayCount: 38,
    seasonStart: "2026-08-21",
    seasonEnd: "2027-05-30",
    heroCopy:
      "Follow the 2026/27 Premier League season, its 20 clubs, upcoming fixtures and confirmed official TV or streaming options by country.",
    schedulePendingCopy:
      "The 2026/27 league structure and clubs are ready. Match pages are published only after fixture dates and viewing information have been verified.",
    officialSourceName: "Premier League official website",
    officialSourceUrl: "https://www.premierleague.com/en/news/4675097/all-380-fixtures-for-202627-premier-league-season/",
  },
};

export function getFootballLeagueProfile(sport: string, competition: string): FootballLeagueProfile | null {
  if (sport !== "football") return null;
  return PROFILES[competition as FootballLeagueProfile["slug"]] ?? null;
}
