import { clubSlug, getAllClubNames, getClubSearchNames, resolveClubSlug } from "./club-aliases";
import { allCompetitionCatalogEntries } from "./competition-catalog";
import { entitySlug } from "./entity-pages";
import type { EventData, Participant } from "./events";
import type { FavoriteCandidate } from "./favorites";
import { getSportBySlug, getSportLabel, sportAllowsParticipantPages, sportsRegistry } from "./sports-registry";
import { formula1Season2026Weekends } from "../source/formula-1-2026-season";
import { ufc2026UpcomingCards } from "../source/ufc-2026-upcoming";

export type SearchSuggestion = {
  id: string;
  label: string;
  value: string;
  kind: "Sport" | "Club" | "Nation" | "Competition" | "Grand Prix" | "UFC Event";
  href: string;
  searchTerms: string[];
  favorite?: FavoriteCandidate;
};

function unique(values: string[]): string[] {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));
}

function participantSearchTerms(participant: Participant): string[] {
  return participant.type === "club"
    ? getClubSearchNames(participant.name)
    : unique([participant.name, participant.shortName ?? ""]);
}

function participantHref(participant: Participant, sport: string): string {
  if (sport === "football") {
    if (participant.type === "club") return `/football/club/${resolveClubSlug(participant.name)}`;
    if (participant.type === "national_team") return `/football/nation/${entitySlug(participant.name)}`;
  }

  const slug = participant.id.startsWith("club:")
    ? participant.id.split(":").slice(2).join(":")
    : clubSlug(participant.name);

  return `/sports/${sport}/club/${slug}`;
}

function sportHref(sport: string): string {
  if (sport === "formula-1") return "/formula-1";
  if (sport === "ufc") return "/ufc";
  if (sport === "football") return "/football";
  return `/sports/${sport}`;
}

function competitionHref(sport: string, slug: string): string {
  if (sport === "football") return `/football/competition/${slug}`;
  if (sport === "formula-1") return "/formula-1";
  if (sport === "ufc") return "/ufc";
  return `/sports/${sport}/competition/${slug}`;
}

function seriesFavorite(sport: string, label: string, href: string): FavoriteCandidate {
  return {
    kind: "competition",
    entityId: `${sport}:${sport}`,
    label,
    href,
  };
}

export function buildSearchSuggestions(events: EventData[]): SearchSuggestion[] {
  const sports = new Map<string, SearchSuggestion>();
  const participants = new Map<string, SearchSuggestion>();
  const competitions = new Map<string, SearchSuggestion>();
  const raceWeekends = new Map<string, SearchSuggestion>();
  const fightCards = new Map<string, SearchSuggestion>();

  for (const sport of sportsRegistry.filter((item) => item.enabled)) {
    const label = getSportLabel(sport.slug);
    const href = sportHref(sport.slug);
    const canFavoriteSeries = sport.eventModel === "race_session" || sport.eventModel === "fight_card";

    sports.set(sport.slug, {
      id: `sport:${sport.slug}`,
      label,
      value: label,
      kind: "Sport",
      href,
      searchTerms: unique([sport.slug, label, ...sport.aliases]),
      ...(canFavoriteSeries ? { favorite: seriesFavorite(sport.slug, label, href) } : {}),
    });
  }

  for (const entry of allCompetitionCatalogEntries()) {
    const sport = getSportBySlug(entry.sport);
    const sportLabel = getSportLabel(entry.sport);
    const key = `${entry.sport}:${entry.slug}`;
    const href = competitionHref(entry.sport, entry.slug);

    competitions.set(key, {
      id: `competition:${key}`,
      label: `${entry.displayName} (${sportLabel})`,
      value: entry.displayName,
      kind: "Competition",
      href,
      searchTerms: unique([
        entry.displayName,
        ...(entry.aliases ?? []),
        entry.slug.replaceAll("-", " "),
        entry.region ?? "",
        entry.sport,
        sportLabel,
        ...(sport?.aliases ?? []),
      ]),
      favorite: {
        kind: "competition",
        entityId: key,
        label: entry.displayName,
        href,
      },
    });
  }

  // Club search must not depend on the current upcoming-event window.
  for (const clubName of getAllClubNames()) {
    const slug = clubSlug(clubName);
    const key = `football:club:${slug}`;
    const href = `/football/club/${slug}`;

    participants.set(key, {
      id: `participant:${key}`,
      label: `${clubName} (Football)`,
      value: clubName,
      kind: "Club",
      href,
      searchTerms: unique([...getClubSearchNames(clubName), "football", "soccer"]),
      favorite: {
        kind: "participant",
        entityId: `club:football:${slug}`,
        label: clubName,
        href,
      },
    });
  }

  // Seed Formula 1 weekends so header search can find/favorite them even without event payload.
  for (const weekend of formula1Season2026Weekends) {
    const groupId = `f1-${weekend.slug}`;
    const key = `formula-1:${groupId}`;
    const href = `/formula-1/grand-prix/${weekend.slug}`;

    raceWeekends.set(key, {
      id: `race:${key}`,
      label: `${weekend.name} (Formula 1)`,
      value: weekend.name,
      kind: "Grand Prix",
      href,
      searchTerms: unique([
        weekend.name,
        weekend.slug.replaceAll("-", " "),
        weekend.country,
        weekend.venue,
        "formula 1",
        "formule 1",
        "f1",
      ]),
      favorite: {
        kind: "group",
        entityId: groupId,
        label: weekend.name,
        href,
      },
    });
  }

  // Seed UFC cards for the same reason.
  for (const card of ufc2026UpcomingCards) {
    const groupId = `ufc-card:${card.slug}`;
    const key = `ufc:${groupId}`;
    const href = `/ufc/event/${card.slug}`;

    fightCards.set(key, {
      id: `fight-card:${key}`,
      label: `${card.name} (UFC)`,
      value: card.name,
      kind: "UFC Event",
      href,
      searchTerms: unique([
        card.name,
        card.slug.replaceAll("-", " "),
        card.city,
        card.country,
        card.venue,
        "ufc",
        "mma",
      ]),
      favorite: {
        kind: "group",
        entityId: groupId,
        label: card.name,
        href,
      },
    });
  }

  for (const event of events) {
    const sport = getSportBySlug(event.sport);
    const sportLabel = getSportLabel(event.sport);

    if (sport && !sports.has(event.sport)) {
      const href = sportHref(event.sport);
      const canFavoriteSeries = sport.eventModel === "race_session" || sport.eventModel === "fight_card";

      sports.set(event.sport, {
        id: `sport:${event.sport}`,
        label: sportLabel,
        value: sportLabel,
        kind: "Sport",
        href,
        searchTerms: unique([event.sport, sportLabel, ...sport.aliases]),
        ...(canFavoriteSeries ? { favorite: seriesFavorite(event.sport, sportLabel, href) } : {}),
      });
    }

    if (sportAllowsParticipantPages(event.sport)) {
      for (const participant of [event.participant1, event.participant2]) {
        if (!participant || (participant.type !== "club" && participant.type !== "national_team")) continue;

        const key =
          event.sport === "football" && participant.type === "club"
            ? `football:club:${resolveClubSlug(participant.name)}`
            : `${event.sport}:${participant.id}`;

        if (participants.has(key)) continue;

        const href = participantHref(participant, event.sport);
        participants.set(key, {
          id: `participant:${key}`,
          label: `${participant.name} (${sportLabel})`,
          value: participant.name,
          kind: participant.type === "club" ? "Club" : "Nation",
          href,
          searchTerms: unique([
            ...participantSearchTerms(participant),
            event.sport,
            sportLabel,
            ...(sport?.aliases ?? []),
          ]),
          favorite: {
            kind: "participant",
            entityId: participant.id,
            label: participant.name,
            href,
          },
        });
      }
    }

    if (
      sport?.eventModel === "race_session" &&
      event.eventGroupId &&
      event.eventGroupName &&
      event.eventGroupSlug
    ) {
      const key = `${event.sport}:${event.eventGroupId}`;
      const href =
        event.sport === "formula-1"
          ? `/formula-1/grand-prix/${event.eventGroupSlug}`
          : event.detailPath;

      if (!raceWeekends.has(key)) {
        raceWeekends.set(key, {
          id: `race:${key}`,
          label: `${event.eventGroupName} (${sportLabel})`,
          value: event.eventGroupName,
          kind: "Grand Prix",
          href,
          searchTerms: unique([
            event.eventGroupName,
            event.eventGroupSlug.replaceAll("-", " "),
            event.country ?? "",
            event.venue ?? "",
            event.sport,
            sportLabel,
            ...sport.aliases,
          ]),
          favorite: {
            kind: "group",
            entityId: event.eventGroupId,
            label: event.eventGroupName,
            href,
          },
        });
      }
    }

    if (
      sport?.eventModel === "fight_card" &&
      event.eventGroupId &&
      event.eventGroupName &&
      event.eventGroupSlug
    ) {
      const key = `${event.sport}:${event.eventGroupId}`;
      const href = `/ufc/event/${event.eventGroupSlug}`;

      if (!fightCards.has(key)) {
        fightCards.set(key, {
          id: `fight-card:${key}`,
          label: `${event.eventGroupName} (${sportLabel})`,
          value: event.eventGroupName,
          kind: "UFC Event",
          href,
          searchTerms: unique([
            event.eventGroupName,
            event.eventGroupSlug.replaceAll("-", " "),
            event.country ?? "",
            event.venue ?? "",
            event.sport,
            event.competition,
            sportLabel,
            ...sport.aliases,
          ]),
          favorite: {
            kind: "group",
            entityId: event.eventGroupId,
            label: event.eventGroupName,
            href,
          },
        });
      }
    }

    const competitionKey = `${event.sport}:${event.competitionSlug}`;
    if (!competitions.has(competitionKey)) {
      const href = competitionHref(event.sport, event.competitionSlug);
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
        favorite: {
          kind: "competition",
          entityId: competitionKey,
          label: event.competition,
          href,
        },
      });
    }
  }

  return [
    ...Array.from(sports.values()).sort((a, b) => a.label.localeCompare(b.label)),
    ...Array.from(participants.values()).sort((a, b) => a.label.localeCompare(b.label)),
    ...Array.from(raceWeekends.values()).sort((a, b) => a.label.localeCompare(b.label)),
    ...Array.from(fightCards.values()).sort((a, b) => a.label.localeCompare(b.label)),
    ...Array.from(competitions.values()).sort((a, b) => a.label.localeCompare(b.label)),
  ];
}
