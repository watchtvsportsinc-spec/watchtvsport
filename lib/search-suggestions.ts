import { clubSlug, getClubSearchNames } from "./club-aliases";
import type { EventData, Participant } from "./events";

export type SearchSuggestion = {
  id: string;
  label: string;
  value: string;
  kind: "Team" | "Competition" | "Event";
  href: string;
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

function participantHref(participant: Participant): string {
  if (participant.type === "club") {
    return `/football/club/${clubSlug(participant.name)}`;
  }

  const params = new URLSearchParams({ view: "all", q: participant.name });
  return `/?${params.toString()}`;
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
        href: participantHref(participant),
        searchTerms: participantSearchTerms(participant),
      });
    }

    if (!competitions.has(event.competitionSlug)) {
      const params = new URLSearchParams({
        view: "all",
        competition: event.competitionSlug,
      });

      competitions.set(event.competitionSlug, {
        id: `competition:${event.competitionSlug}`,
        label: event.competition,
        value: event.competition,
        kind: "Competition",
        href: `/?${params.toString()}`,
        searchTerms: unique([
          event.competition,
          event.competitionSlug.replaceAll("-", " "),
        ]),
      });
    }

    if (!seenEvents.has(event.id) && eventSuggestions.length < 160) {
      seenEvents.add(event.id);
      eventSuggestions.push({
        id: `event:${event.id}`,
        label: event.title,
        value: event.title,
        kind: "Event",
        href: event.detailPath,
        searchTerms: unique([
          event.title,
          event.participant1?.name ?? "",
          event.participant2?.name ?? "",
          event.competition,
          ...(event.participant1?.type === "club"
            ? getClubSearchNames(event.participant1.name)
            : []),
          ...(event.participant2?.type === "club"
            ? getClubSearchNames(event.participant2.name)
            : []),
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
