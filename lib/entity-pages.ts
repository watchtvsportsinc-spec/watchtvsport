import type { EventData, Participant } from "./events";

export function entitySlug(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ø/gi, "o")
    .replace(/æ/gi, "ae")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function sportLabel(value: string): string {
  if (value === "football") return "Football";
  if (value === "basketball") return "Basketball";
  if (value === "handball") return "Handball";
  if (value === "tennis") return "Tennis";
  if (value === "formula-1") return "Formula 1";
  if (value === "motogp") return "MotoGP";

  return value
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function participantPath(participant: Participant, sport: string): string | null {
  if (sport !== "football") return null;
  if (participant.type === "club") return `/football/club/${entitySlug(participant.name)}`;
  if (participant.type === "national_team") return `/football/nation/${entitySlug(participant.name)}`;
  return null;
}

export function competitionPath(event: Pick<EventData, "sport" | "competitionSlug">): string | null {
  if (event.sport !== "football") return null;
  return `/football/competition/${event.competitionSlug}`;
}

export function getFootballNations(events: EventData[]): Participant[] {
  const nations = new Map<string, Participant>();
  for (const event of events) {
    if (event.sport !== "football") continue;
    for (const participant of [event.participant1, event.participant2]) {
      if (!participant || participant.type !== "national_team") continue;
      nations.set(entitySlug(participant.name), participant);
    }
  }
  return Array.from(nations.values()).sort((a, b) => a.name.localeCompare(b.name));
}

export function getFootballNationBySlug(events: EventData[], slug: string): Participant | null {
  return getFootballNations(events).find((nation) => entitySlug(nation.name) === slug) ?? null;
}
