export type MatchStatus = "scheduled" | "live" | "finished";

export type MatchScore = {
  slug: string;
  status: MatchStatus;
  homeScore?: number;
  awayScore?: number;
  minute?: string;
};

export const matchScores: MatchScore[] = [
  {
    slug: "mexico-vs-south-africa-2026-06-11",
    status: "finished",
    homeScore: 2,
    awayScore: 1,
  },

  {
    slug: "korea-republic-vs-czechia-2026-06-12",
    status: "live",
    homeScore: 1,
    awayScore: 1,
    minute: "67'",
  },

  {
    slug: "canada-vs-bosnia-and-herzegovina-2026-06-12",
    status: "scheduled",
  },
];

export function getMatchScore(slug: string) {
  return matchScores.find((match) => match.slug === slug);
}

export function isMatchFinished(slug: string) {
  return getMatchScore(slug)?.status === "finished";
}