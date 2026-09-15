export type SportEventModel = "team_match" | "tournament_match" | "race_session" | "cycling_race";

export type SportRegistryEntry = {
  id: string;
  slug: string;
  defaultLabel: string;
  labels: Partial<Record<string, string>>;
  aliases: string[];
  enabled: boolean;
  eventModel: SportEventModel;
  participantPages: "teams-and-nations" | "none";
  competitionPages: boolean;
  eventPages: boolean;
};

export const sportsRegistry: SportRegistryEntry[] = [
  {
    id: "association-football",
    slug: "football",
    defaultLabel: "Football",
    labels: { "fr-FR": "Football", "fr-CA": "Soccer", "en-CA": "Soccer", "en-US": "Soccer", "en-GB": "Football" },
    aliases: ["football", "foot", "soccer", "association football"],
    enabled: true,
    eventModel: "team_match",
    participantPages: "teams-and-nations",
    competitionPages: true,
    eventPages: true,
  },
  {
    id: "basketball",
    slug: "basketball",
    defaultLabel: "Basketball",
    labels: {},
    aliases: ["basketball", "basket", "nba"],
    enabled: true,
    eventModel: "team_match",
    participantPages: "teams-and-nations",
    competitionPages: true,
    eventPages: true,
  },
  {
    id: "ice-hockey",
    slug: "hockey",
    defaultLabel: "Ice Hockey",
    labels: { "fr-FR": "Hockey sur glace", "fr-CA": "Hockey", "en-CA": "Hockey", "en-US": "Hockey" },
    aliases: ["hockey", "ice hockey", "hockey sur glace", "nhl"],
    enabled: true,
    eventModel: "team_match",
    participantPages: "teams-and-nations",
    competitionPages: true,
    eventPages: true,
  },
  {
    id: "american-football",
    slug: "american-football",
    defaultLabel: "American Football",
    labels: { "fr-FR": "Football américain", "fr-CA": "Football américain" },
    aliases: ["american football", "football americain", "football américain", "nfl", "gridiron"],
    enabled: true,
    eventModel: "team_match",
    participantPages: "teams-and-nations",
    competitionPages: true,
    eventPages: true,
  },
  {
    id: "formula-1",
    slug: "formula-1",
    defaultLabel: "Formula 1",
    labels: { "fr-FR": "Formule 1", "fr-CA": "Formule 1" },
    aliases: ["formula 1", "formule 1", "f1"],
    enabled: true,
    eventModel: "race_session",
    participantPages: "none",
    competitionPages: true,
    eventPages: true,
  },
  {
    id: "motogp",
    slug: "motogp",
    defaultLabel: "MotoGP",
    labels: {},
    aliases: ["motogp", "moto gp"],
    enabled: true,
    eventModel: "race_session",
    participantPages: "none",
    competitionPages: true,
    eventPages: true,
  },
  {
    id: "tennis",
    slug: "tennis",
    defaultLabel: "Tennis",
    labels: {},
    aliases: ["tennis", "atp", "wta"],
    enabled: true,
    eventModel: "tournament_match",
    participantPages: "none",
    competitionPages: true,
    eventPages: true,
  },
  {
    id: "cycling",
    slug: "cycling",
    defaultLabel: "Cycling",
    labels: { "fr-FR": "Cyclisme", "fr-CA": "Cyclisme" },
    aliases: ["cycling", "cyclisme", "velo", "vélo"],
    enabled: true,
    eventModel: "cycling_race",
    participantPages: "none",
    competitionPages: true,
    eventPages: true,
  },
];

export function getSportBySlug(slug: string): SportRegistryEntry | null {
  return sportsRegistry.find((sport) => sport.slug === slug) ?? null;
}

export function getSportById(id: string): SportRegistryEntry | null {
  return sportsRegistry.find((sport) => sport.id === id) ?? null;
}

export function getSportLabel(slug: string, locale?: string): string {
  const sport = getSportBySlug(slug);
  if (!sport) return slug.split("-").map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(" ");
  return (locale && sport.labels[locale]) || sport.defaultLabel;
}

export function isSportEnabled(slug: string): boolean {
  return getSportBySlug(slug)?.enabled ?? false;
}

export function sportAllowsParticipantPages(slug: string): boolean {
  return getSportBySlug(slug)?.participantPages === "teams-and-nations";
}
