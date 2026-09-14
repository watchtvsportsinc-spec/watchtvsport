import { clubSlug, getClubSearchNames } from "./club-aliases";
import { entitySlug } from "./entity-pages";
import type { EventData, Participant } from "./events";
import { getSportBySlug, getSportLabel, sportAllowsParticipantPages } from "./sports-registry";

export type SearchSuggestion = {
  id: string;
  label: string;
  value: string;
  kind: "Club" | "Nation" | "Competition";
  href: string;
  searchTerms: string[];
};

function unique(values: string[]): string[] {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));
}

function participantSearchTerms(participant: Participant): string[] {
  if (participant.type === "club") return getClubSearchNames(participant.name);
  return unique([participant.name, participant.shortName ?? ""]);
}

function participantHref(participant: Participant, sport: string): string {
  if (sport === "football") {
    if (participant.type === "club") return `/football/club/${clubSlug(participant.name)}`;
    if (participant.type === "national_team") return `/football/nation/${entitySlug(participant.name)}`;
  }
  const params = new URLSearchParams({ view: "all", q: participant.name, sport });
  return `/?${params.toString()}`;
}

export function buildSearchSuggestions(events: EventData[]): SearchSuggestion[] {
  const participants = new Map<string, SearchSuggestion>();
  const competitions = new Map<string, SearchSuggestion>();

  for (const event of events) {
    const sport = getSportBySlug(event.sport);
    const sportLabel = getSportLabel(event.sport);

    if (sportAllowsParticipantPages(event.sport)) {
      for (const participant of [event.participant1, event.participant2]) {
        if (!participant) continue;
        if (participant.type !== "club" && participant.type !== "national_team") continue;
        const participantKey = `${event.sport}:${participant.id}`;
        if (participants.has(participantKey)) continue;
        participants.set(participantKey, {
          id: `participant:${event.sport}:${participant.id}`,
          label: `${participant.name} (${sportLabel})`,
          value: participant.name,
          kind: participant.type === "club" ? "Club" : "Nation",
          href: participantHref(participant, event.sport),
          searchTerms: unique([
            ...participantSearchTerms(participant),
            event.sport,
            sportLabel,
            ...(sport?.aliases ?? []),
          ]),
        });
      }
    }

    const competitionKey = `${event.sport}:${event.competitionSlug}`;
    if (!competitions.has(competitionKey)) {
      const href = event.sport === "football"
        ? `/football/competition/${event.competitionSlug}`
        : `/?${new URLSearchParams({ view: "all", sport: event.sport, competition: event.competitionSlug }).toString()}`;
      competitions.set(competitionKey, {
        id: `competition:${competitionKey}`,
        label: `${event.competition} (${sportLabel})`,
        value: event.competition,
        kind: "Competition",
        href,
        searchTerms: unique([
          event.competition,
          event.competitionSlug.replaceAll("-", " "),
          event.sport,
          sportLabel,
          ...(sport?.aliases ?? []),
        ]),
      });
    }
  }

  return [
    ...Array.from(participants.values()).sort((a, b) => a.label.localeCompare(b.label)),
    ...Array.from(competitions.values()).sort((a, b) => a.label.localeCompare(b.label)),
  ];
}
