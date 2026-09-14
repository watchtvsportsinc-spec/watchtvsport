import { clubSlug, getClubSearchNames } from "./club-aliases";
import type { EventData, Participant } from "./events";

export type SearchSuggestion = {
  id: string;
  label: string;
  value: string;
  kind: "Club" | "Nation";
  href: string;
  searchTerms: string[];
};

function unique(values: string[]): string[] {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));
}

function sportLabel(sport: string): string {
  if (sport === "football") return "Football";
  if (sport === "handball") return "Handball";
  if (sport === "basketball") return "Basketball";
  if (sport === "tennis") return "Tennis";
  if (sport === "formula-1") return "Formula 1";
  if (sport === "motogp") return "MotoGP";

  return sport
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function participantSearchTerms(participant: Participant): string[] {
  if (participant.type === "club") {
    return getClubSearchNames(participant.name);
  }

  return unique([participant.name, participant.shortName ?? ""]);
}

function participantHref(participant: Participant, sport: string): string {
  if (participant.type === "club" && sport === "football") {
    return `/football/club/${clubSlug(participant.name)}`;
  }

  const params = new URLSearchParams({
    view: "all",
    q: participant.name,
    sport,
  });
  return `/?${params.toString()}`;
}

export function buildSearchSuggestions(events: EventData[]): SearchSuggestion[] {
  const participants = new Map<string, SearchSuggestion>();

  for (const event of events) {
    for (const participant of [event.participant1, event.participant2]) {
      if (!participant) continue;
      if (participant.type !== "club" && participant.type !== "national_team") continue;

      // The same organization name may exist in several sports (for example PSG
      // football and handball), so sport is part of the suggestion identity.
      const participantKey = `${event.sport}:${participant.id}`;
      if (participants.has(participantKey)) continue;

      participants.set(participantKey, {
        id: `participant:${event.sport}:${participant.id}`,
        label: `${participant.name} (${sportLabel(event.sport)})`,
        value: participant.name,
        kind: participant.type === "club" ? "Club" : "Nation",
        href: participantHref(participant, event.sport),
        searchTerms: unique([
          ...participantSearchTerms(participant),
          event.sport,
          sportLabel(event.sport),
        ]),
      });
    }
  }

  return Array.from(participants.values()).sort((a, b) =>
    a.label.localeCompare(b.label)
  );
}
