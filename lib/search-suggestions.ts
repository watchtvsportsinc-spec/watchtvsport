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
  const teams = new Map<string, SearchSuggestion>();
  const competitions = new Map<string, SearchSuggestion>();
  const eventSuggestions: SearchSuggestion[] = [];
  const seenEvents = new Set<string>();

  for (const event of events) {
    for (const participant of [event.participant1, event.participant2]) {
      if (!participant) continue;

      // A club name may exist in several sports (for example PSG football and handball),
      // so sport is part of the suggestion identity and is always shown to the user.
      const teamKey = `${event.sport}:${participant.id}`;
      if (teams.has(teamKey)) continue;

      teams.set(teamKey, {
        id: `team:${event.sport}:${participant.id}`,
        label: `${participant.name} (${sportLabel(event.sport)})`,
        value: participant.name,
        kind: "Team",
        href: participantHref(participant, event.sport),
        searchTerms: unique([
          ...participantSearchTerms(participant),
          event.sport,
          sportLabel(event.sport),
        ]),
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
