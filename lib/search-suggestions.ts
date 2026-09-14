import { getClubSearchNames } from "./club-aliases";
import type { EventData, Participant } from "./events";

export type SearchSuggestion = {
  id: string;
  label: string;
  value: string;
  kind: "Team" | "Competition" | "Event";
  searchTerms: string[];
};

function unique(values: string[]): string[] {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));
}

function participantSearchTerms(participant: Participant): string[] {
  if (participant.type === "club") {
    return getClubSearchNames(participant.name);
  }

  return unique([participant.name, participant.shortName ?? ""]);
}

export function buildSearchSuggestions(events: EventData[]): SearchSuggestion[] {
  const teams = new Map<string, SearchSuggestion>();
  const competitions = new Map<string, SearchSuggestion>();
  const eventSuggestions: SearchSuggestion[] = [];
  const seenEvents = new Set<string>();

  for (const event of events) {
    for (const participant of [event.participant1, event.participant2]) {
      if (!participant) continue;
      if (teams.has(participant.id)) continue;

      teams.set(participant.id, {
        id: participant.id,
        label: participant.name,
        value: participant.name,
        kind: "Team",
        searchTerms: participantSearchTerms(participant),
      });
    }

    if (!competitions.has(event.competitionSlug)) {
      competitions.set(event.competitionSlug, {
        id: `competition:${event.competitionSlug}`,
        label: event.competition,
        value: event.competition,
        kind: "Competition",
        searchTerms: unique([event.competition, event.competitionSlug.replaceAll("-", " ")]),
      });
    }

    if (!seenEvents.has(event.title) && eventSuggestions.length < 100) {
      seenEvents.add(event.title);
      eventSuggestions.push({
        id: `event:${event.id}`,
        label: event.title,
        value: event.title,
        kind: "Event",
        searchTerms: unique([
          event.title,
          event.participant1?.name ?? "",
          event.participant2?.name ?? "",
          event.competition,
        ]),
      });
    }
  }

  return [
    ...Array.from(teams.values()).sort((a, b) => a.label.localeCompare(b.label)),
    ...Array.from(competitions.values()).sort((a, b) => a.label.localeCompare(b.label)),
    ...eventSuggestions,
  ];
}
