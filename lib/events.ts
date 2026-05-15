import {
  getAllMatches,
  getMatchBySlug,
  type MatchData,
  type BroadcastInfo,
} from "./matches";

export type EntityType = "national_team" | "club" | "player" | "event";
export type VisualType = "flag" | "crest" | "player" | "generic";

export type Participant = {
  name: string;
  shortName?: string;
  type: EntityType;
  visualType: VisualType;
  visual: string;
};

export type EventData = {
  id: string;
  slug: string;
  sport: string;
  competition: string;
  competitionSlug: string;
  stage?: string;
  group?: string;
  eventDate: string;
  participant1?: Participant;
  participant2?: Participant;
  title: string;
  broadcasts: BroadcastInfo[];
};

export function mapMatchToEvent(match: MatchData): EventData {
  return {
    id: match.id,
    slug: match.slug,
    sport: "football",
    competition: match.competition,
    competitionSlug: match.competitionSlug,
    stage: match.stage,
    group: match.group,
    eventDate: match.matchDate,
    participant1: {
      name: match.homeTeam.name,
      shortName: match.homeTeam.code,
      type: "national_team",
      visualType: "flag",
      visual: match.homeTeam.code || "",
    },
    participant2: {
      name: match.awayTeam.name,
      shortName: match.awayTeam.code,
      type: "national_team",
      visualType: "flag",
      visual: match.awayTeam.code || "",
    },
    title: `${match.homeTeam.name} vs ${match.awayTeam.name}`,
    broadcasts: match.broadcasts,
  };
}

export function getAllEvents(): EventData[] {
  return getAllMatches().map(mapMatchToEvent);
}

export function getEventBySlug(slug: string): EventData | null {
  const match = getMatchBySlug(slug);
  return match ? mapMatchToEvent(match) : null;
}

export function getEventTitle(event: EventData): string {
  if (event.participant1 && event.participant2) {
    return `${event.participant1.name} vs ${event.participant2.name}`;
  }

  return event.title;
}

export function getParticipantName(participant?: Participant): string {
  return participant?.name || "";
}

export function getParticipantCode(participant?: Participant): string {
  return participant?.shortName || participant?.visual || "";
}

export function getOtherEventsSimple(currentSlug: string) {
  return getAllEvents()
    .filter((event) => event.slug !== currentSlug)
    .slice(0, 10)
    .map((event) => ({
      slug: event.slug,
      title: getEventTitle(event),
    }));
}