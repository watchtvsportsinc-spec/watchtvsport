"use client";

import Link from "next/link";
import { Fragment, type ReactNode, useEffect, useMemo, useState } from "react";
import SearchAutocomplete from "@/components/SearchAutocomplete";
import { useFavorites } from "@/lib/favorites-client";
import type { SearchSuggestion } from "@/lib/search-suggestions";
import { getSportBySlug, sportsRegistry } from "@/lib/sports-registry";
import { clubSlug, resolveClubSlug } from "@/lib/club-aliases";

export type HomeDiscoveryParticipant = {
  id: string;
  name: string;
  shortName?: string;
  type?: string;
};

export type HomeDiscoveryEvent = {
  id: string;
  detailPath: string;
  sport: string;
  competition: string;
  competitionSlug: string;
  title: string;
  stage?: string;
  eventDate: string;
  status?: "scheduled" | "live" | "finished";
  participant1?: HomeDiscoveryParticipant;
  participant2?: HomeDiscoveryParticipant;
  eventGroupId?: string;
  eventGroupName?: string;
  eventGroupSlug?: string;
  sessionType?: string;
  venue?: string;
  country?: string;
  access: "Free" | "Paid" | "Access TBC";
  accessOptions?: Array<"Free" | "Paid">;
};

export type HomeDiscoveryInitialState = {
  when?: string;
  date?: string;
  sport?: string;
  competition?: string;
  team?: string;
  access?: string;
};

type Period = "live" | "upcoming" | "date";

type CategoryDefinition = {
  id: string;
  label: string;
  icon: string;
  sports: string[];
};

type FilterOption = {
  key: string;
  value: string;
  label: string;
  category: string;
};

type EventResult = {
  kind: "event";
  id: string;
  sortTime: number;
  event: HomeDiscoveryEvent;
};

type GroupResult = {
  kind: "group";
  id: string;
  sortTime: number;
  category: string;
  title: string;
  detailPath: string;
  competition: string;
  venue?: string;
  country?: string;
  startDate: string;
  endDate: string;
  nextSession?: HomeDiscoveryEvent;
  access: "Free" | "Paid" | "Access TBC" | "Access varies";
  accessOptions: Array<"Free" | "Paid">;
  sessionLabels: string[];
  isFavorite: boolean;
};

type ResultItem = EventResult | GroupResult;

const CATEGORY_DEFINITIONS: CategoryDefinition[] = Array.from(
  sportsRegistry.reduce((categories, sport) => {
    const id = sport.discovery.family;
    const current = categories.get(id);
    if (current) current.sports.push(sport.slug);
    else categories.set(id, {
      id,
      label: sport.discovery.familyLabel,
      icon: sport.discovery.icon,
      sports: [sport.slug],
    });
    return categories;
  }, new Map<string, CategoryDefinition>()).values()
);

function categoryForSport(sport: string): string {
  return getSportBySlug(sport)?.discovery.family ?? sport;
}

function categoryGroupsEvents(category: string): boolean {
  return sportsRegistry.some(
    (sport) => sport.discovery.family === category && sport.discovery.groupEvents
  );
}

function categorySupportsTeams(category: string): boolean {
  return sportsRegistry.some(
    (sport) => sport.discovery.family === category && sport.discovery.teamFilter
  );
}

function fallbackLabel(value: string): string {
  return value
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function categoryDefinition(categoryId: string): CategoryDefinition {
  return CATEGORY_DEFINITIONS.find((category) => category.id === categoryId) ?? {
    id: categoryId,
    label: fallbackLabel(categoryId),
    icon: "●",
    sports: [categoryId],
  };
}

function seriesLabel(sport: string, events: HomeDiscoveryEvent[]): string {
  if (sport === "formula-1") return "F1";
  if (sport === "motogp") return "MotoGP";
  if (sport === "ufc") return "UFC";
  if (sport === "mma") return "MMA";
  if (sport === "boxing") return "Boxing";
  if (sport === "pfl") return "PFL";
  if (sport === "one") return "ONE";
  const event = events.find((item) => item.sport === sport);
  return event?.competition || fallbackLabel(sport);
}

function splitCsv(value?: string): string[] {
  if (!value) return [];
  return Array.from(
    new Set(
      value
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean)
    )
  );
}

function normalizeCategory(value: string): string {
  if (["formula-1", "motogp", "motorsports", "wec", "indycar", "formula-e"].includes(value)) return "motorsports";
  if (["ufc", "mma", "boxing", "pfl", "one", "combat", "combat-sports"].includes(value)) return "combat";
  if (value === "ice-hockey") return "hockey";
  if (value === "soccer") return "football";
  return value;
}

function normalizeInitialCategories(value?: string): string[] {
  return splitCsv(value)
    .map(normalizeCategory)
    .filter((category) => category !== "all");
}

function impliedSubfiltersFromSport(value?: string): string[] {
  return splitCsv(value).filter((sport) =>
    ["formula-1", "motogp", "ufc", "mma", "boxing", "pfl", "one", "wec", "indycar", "formula-e"].includes(sport)
  );
}

function isIsoDate(value?: string): boolean {
  return Boolean(value && /^\d{4}-\d{2}-\d{2}$/.test(value));
}

function dateKey(date: Date, timeZone: string): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return values.year + "-" + values.month + "-" + values.day;
}

function addDays(value: string, amount: number): string {
  const parts = value.split("-").map(Number);
  return new Date(Date.UTC(parts[0], parts[1] - 1, parts[2] + amount)).toISOString().slice(0, 10);
}

function dateKeyAsUtcDate(value: string): Date {
  return new Date(value + "T12:00:00Z");
}

function formatDateChip(value: string, today: string): { top: string; bottom: string } {
  if (value === today) {
    return {
      top: "Today",
      bottom: new Intl.DateTimeFormat("en", { month: "short", day: "numeric", timeZone: "UTC" }).format(dateKeyAsUtcDate(value)),
    };
  }
  if (value === addDays(today, 1)) {
    return {
      top: "Tomorrow",
      bottom: new Intl.DateTimeFormat("en", { month: "short", day: "numeric", timeZone: "UTC" }).format(dateKeyAsUtcDate(value)),
    };
  }
  return {
    top: new Intl.DateTimeFormat("en", { weekday: "short", timeZone: "UTC" }).format(dateKeyAsUtcDate(value)),
    bottom: new Intl.DateTimeFormat("en", { month: "short", day: "numeric", timeZone: "UTC" }).format(dateKeyAsUtcDate(value)),
  };
}

function formatTime(value: string, timeZone: string): string {
  return new Intl.DateTimeFormat("en", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(value));
}

function formatShortDate(value: string, timeZone: string): string {
  return new Intl.DateTimeFormat("en", {
    timeZone,
    month: "short",
    day: "numeric",
  }).format(new Date(value));
}

function formatLongDateKey(value: string): string {
  return new Intl.DateTimeFormat("en", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(dateKeyAsUtcDate(value));
}

function formatDateRange(start: string, end: string, timeZone: string): string {
  const first = formatShortDate(start, timeZone);
  const last = formatShortDate(end, timeZone);
  return first === last ? first : first + " – " + last;
}

function localTimeZoneLabel(timeZone: string): string {
  if (timeZone === "UTC") return "UTC";
  const finalPart = timeZone.split("/").at(-1) || timeZone;
  return finalPart.replaceAll("_", " ");
}

function stripHash(path: string): string {
  return path.split("#", 1)[0] || path;
}

function groupedEventKey(event: HomeDiscoveryEvent): string | null {
  const category = categoryForSport(event.sport);
  if (!categoryGroupsEvents(category)) return null;
  if (event.eventGroupId) return event.eventGroupId;
  if (event.eventGroupSlug) return `${event.sport}:${event.eventGroupSlug}`;

  const basePath = stripHash(event.detailPath);
  return basePath ? `path:${basePath}` : null;
}

function groupedEventType(category: string): string {
  if (category === "motorsports") return "Grand Prix";
  if (category === "combat") return "Fight event";
  return "Event";
}

function groupedEventSummary(category: string): string {
  if (category === "motorsports") return "Practice, qualifying & race on one page";
  if (category === "combat") return "Full fight card, prelims & main action on one page";
  return "Full event schedule on one page";
}

function groupedDetailPath(event: HomeDiscoveryEvent): string {
  if (event.sport === "formula-1" && event.eventGroupSlug) {
    return `/formula-1/grand-prix/${event.eventGroupSlug}`;
  }
  if (event.sport === "ufc" && event.eventGroupSlug) {
    return `/ufc/event/${event.eventGroupSlug}`;
  }
  return stripHash(event.detailPath);
}

function uniqueAccess(events: HomeDiscoveryEvent[]): "Free" | "Paid" | "Access TBC" | "Access varies" {
  const values = Array.from(new Set(events.map((event) => event.access)));
  if (values.length === 1) return values[0] as "Free" | "Paid" | "Access TBC";
  if (values.length === 0) return "Access TBC";
  return "Access varies";
}

function availableAccess(events: HomeDiscoveryEvent[]): Array<"Free" | "Paid"> {
  const values = new Set(events.flatMap((event) => event.accessOptions ?? (event.access === "Free" || event.access === "Paid" ? [event.access] : [])));
  return (["Paid", "Free"] as const).filter((access) => values.has(access));
}

function statusLabel(event: HomeDiscoveryEvent): string {
  if (event.status === "live") return "Live";
  if (event.status === "finished") return "Finished";
  return "Upcoming";
}

function statusClass(event: HomeDiscoveryEvent): string {
  if (event.status === "live") return "is-live";
  if (event.status === "finished") return "is-finished";
  return "is-upcoming";
}

function accessClass(access: string): string {
  if (access === "Free") return "is-free";
  if (access === "Paid") return "is-paid";
  if (access === "Access varies") return "is-varies";
  return "is-tbc";
}

function joinLabels(labels: string[]): string {
  if (labels.length === 0) return "";
  if (labels.length <= 3) return labels.join(" + ");
  return labels.slice(0, 2).join(" + ") + " +" + (labels.length - 2);
}

function stableClubFavoriteId(sport: string, label: string): string {
  const slug = sport === "football" ? resolveClubSlug(label) : clubSlug(label);
  return `club:${sport}:${slug}`;
}

export default function HomeDiscovery({
  events,
  timeZone,
  initial,
  searchSuggestions,
  favoritesSlot,
}: {
  events: HomeDiscoveryEvent[];
  timeZone: string;
  initial: HomeDiscoveryInitialState;
  searchSuggestions: SearchSuggestion[];
  favoritesSlot?: ReactNode;
}) {
  const [now] = useState(() => new Date());
  const today = dateKey(now, timeZone);
  const initialPeriod: Period =
    initial.when === "live"
      ? "live"
      : isIsoDate(initial.date) || initial.when === "tomorrow"
        ? "date"
        : "upcoming";
  const initialDate =
    initial.when === "tomorrow"
      ? addDays(today, 1)
      : isIsoDate(initial.date)
        ? (initial.date as string)
        : today;

  const [period, setPeriod] = useState<Period>(initialPeriod);
  const [selectedDate, setSelectedDate] = useState(initialDate);
  const [selectedCategories, setSelectedCategories] = useState<string[]>(normalizeInitialCategories(initial.sport));
  const [selectedSubfilters, setSelectedSubfilters] = useState<string[]>([
    ...splitCsv(initial.competition),
    ...impliedSubfiltersFromSport(initial.sport),
  ]);
  const [selectedTeam, setSelectedTeam] = useState(initial.team || "");
  const [teamPickerOpen, setTeamPickerOpen] = useState(false);
  const [teamQuery, setTeamQuery] = useState("");
  const [competitionPickerOpen, setCompetitionPickerOpen] = useState(false);
  const [competitionQuery, setCompetitionQuery] = useState("");
  const [accessFilter, setAccessFilter] = useState<"All" | "Free" | "Paid">(
    initial.access === "Free" || initial.access === "Paid" ? initial.access : "All"
  );
  const [showMoreSports, setShowMoreSports] = useState(false);
  const [visibleLimit, setVisibleLimit] = useState(20);
  const favorites = useFavorites();

  const dateChoices = useMemo(
    () => Array.from({ length: 7 }, (_, index) => addDays(today, index)),
    [today]
  );

  const availableCategories = useMemo(() => {
    const seen = new Set(events.map((event) => categoryForSport(event.sport)));
    const configured = CATEGORY_DEFINITIONS.filter((category) => seen.has(category.id));
    const configuredIds = new Set(configured.map((category) => category.id));
    const unknown = Array.from(seen)
      .filter((category) => !configuredIds.has(category))
      .sort()
      .map(categoryDefinition);
    return [...configured, ...unknown];
  }, [events]);

  const availableCategoryIds = useMemo(
    () => new Set(availableCategories.map((category) => category.id)),
    [availableCategories]
  );

  const effectiveCategories = useMemo(
    () => selectedCategories.filter((category) => availableCategoryIds.has(category)),
    [availableCategoryIds, selectedCategories]
  );

  const categoryEvents = useMemo(() => {
    if (effectiveCategories.length === 0) return events;
    const selected = new Set(effectiveCategories);
    return events.filter((event) => selected.has(categoryForSport(event.sport)));
  }, [effectiveCategories, events]);

  const subfilterOptions = useMemo<FilterOption[]>(() => {
    if (effectiveCategories.length === 0) return [];

    const options: FilterOption[] = [];

    for (const category of effectiveCategories) {
      const eventsForCategory = categoryEvents.filter(
        (event) => categoryForSport(event.sport) === category
      );

      if (categoryGroupsEvents(category)) {
        const sports = Array.from(new Set(eventsForCategory.map((event) => event.sport)));
        for (const sport of sports) {
          options.push({
            key: category + "::" + sport,
            value: sport,
            label: seriesLabel(sport, eventsForCategory),
            category,
          });
        }
        continue;
      }

      const competitions = new Map<string, string>();
      for (const event of eventsForCategory) {
        competitions.set(event.competitionSlug, event.competition);
      }

      for (const [value, label] of competitions) {
        options.push({
          key: category + "::" + value,
          value,
          label,
          category,
        });
      }
    }

    return options.sort((a, b) => {
      const categoryDifference = categoryDefinition(a.category).label.localeCompare(
        categoryDefinition(b.category).label
      );
      return categoryDifference || a.label.localeCompare(b.label);
    });
  }, [categoryEvents, effectiveCategories]);

  const effectiveSubfilterKeys = useMemo(() => {
    const optionKeys = new Set(subfilterOptions.map((option) => option.key));
    const resolved = new Set<string>();

    for (const token of selectedSubfilters) {
      if (optionKeys.has(token)) {
        resolved.add(token);
        continue;
      }

      for (const option of subfilterOptions) {
        if (option.value === token) resolved.add(option.key);
      }
    }

    return Array.from(resolved);
  }, [selectedSubfilters, subfilterOptions]);

  const effectiveSubfilterSet = useMemo(
    () => new Set(effectiveSubfilterKeys),
    [effectiveSubfilterKeys]
  );

  const singleTeamCategory =
    effectiveCategories.length === 1 && categorySupportsTeams(effectiveCategories[0])
      ? effectiveCategories[0]
      : "";

  const selectedCompetitionOptions = useMemo(
    () =>
      subfilterOptions.filter(
        (option) =>
          option.category === singleTeamCategory && effectiveSubfilterSet.has(option.key)
      ),
    [effectiveSubfilterSet, singleTeamCategory, subfilterOptions]
  );

  const teamOptions = useMemo<FilterOption[]>(() => {
    if (!singleTeamCategory || selectedCompetitionOptions.length === 0) return [];

    const selectedCompetitionValues = new Set(
      selectedCompetitionOptions.map((option) => option.value)
    );
    const participants = new Map<string, string>();

    for (const event of categoryEvents) {
      if (categoryForSport(event.sport) !== singleTeamCategory) continue;
      if (!selectedCompetitionValues.has(event.competitionSlug)) continue;

      for (const participant of [event.participant1, event.participant2]) {
        if (!participant || participant.type === "player" || participant.type === "event") continue;
        participants.set(participant.id, participant.name);
      }
    }

    return Array.from(participants, ([value, label]) => ({
      key: value,
      value,
      label,
      category: singleTeamCategory,
    })).sort((a, b) => a.label.localeCompare(b.label));
  }, [categoryEvents, selectedCompetitionOptions, singleTeamCategory]);

  const effectiveTeam =
    selectedTeam && teamOptions.some((option) => option.value === selectedTeam)
      ? selectedTeam
      : "";

  const favoriteParticipantIds = useMemo(
    () =>
      new Set(
        favorites.items
          .filter((item) => item.kind === "participant")
          .map((item) => item.entityId)
      ),
    [favorites.items]
  );

  const scopeEvents = useMemo(() => {
    const categorySet = new Set(effectiveCategories);
    return events
      .filter((event) => effectiveCategories.length === 0 || categorySet.has(categoryForSport(event.sport)))
      .filter((event) => {
        if (effectiveSubfilterKeys.length === 0) return true;
        const category = categoryForSport(event.sport);
        const eventFilterKey = categoryGroupsEvents(category)
          ? category + "::" + event.sport
          : category + "::" + event.competitionSlug;
        return effectiveSubfilterSet.has(eventFilterKey);
      })
      .filter((event) => !effectiveTeam || event.participant1?.id === effectiveTeam || event.participant2?.id === effectiveTeam);
  }, [effectiveCategories, effectiveSubfilterKeys.length, effectiveSubfilterSet, effectiveTeam, events]);

  const periodEvents = useMemo(() => {
    return scopeEvents.filter((event) => {
      const eventTime = Date.parse(event.eventDate);
      if (!Number.isFinite(eventTime)) return false;
      if (period === "live") return event.status === "live";
      if (period === "date") {
        return dateKey(new Date(event.eventDate), timeZone) === selectedDate;
      }
      if (event.status === "live") return true;
      return event.status !== "finished" && eventTime >= now.getTime();
    });
  }, [now, period, scopeEvents, selectedDate, timeZone]);

  const filteredEvents = useMemo(() => {
    return periodEvents
      .filter((event) =>
        accessFilter === "All" ||
        (event.accessOptions ?? [event.access]).includes(accessFilter)
      )
      .sort((a, b) => Date.parse(a.eventDate) - Date.parse(b.eventDate));
  }, [accessFilter, periodEvents]);

  const allGroups = useMemo(() => {
    const groups = new Map<string, HomeDiscoveryEvent[]>();
    for (const event of events) {
      const groupKey = groupedEventKey(event);
      if (!groupKey) continue;
      const list = groups.get(groupKey) ?? [];
      list.push(event);
      groups.set(groupKey, list);
    }
    for (const list of groups.values()) {
      list.sort((a, b) => Date.parse(a.eventDate) - Date.parse(b.eventDate));
    }
    return groups;
  }, [events]);

  const resultItems = useMemo<ResultItem[]>(() => {
    const output: ResultItem[] = [];
    const groupedMatches = new Map<
      string,
      { groupId: string; localDate: string; sessions: HomeDiscoveryEvent[] }
    >();

    for (const event of filteredEvents) {
      const groupId = groupedEventKey(event);
      if (groupId) {
        const localDate = dateKey(new Date(event.eventDate), timeZone);
        const dailyKey = groupId + "@@" + localDate;
        const current = groupedMatches.get(dailyKey) ?? {
          groupId,
          localDate,
          sessions: [],
        };
        current.sessions.push(event);
        groupedMatches.set(dailyKey, current);
        continue;
      }

      output.push({
        kind: "event",
        id: event.id,
        sortTime: Date.parse(event.eventDate),
        event,
      });
    }

    for (const [dailyKey, dailyGroup] of groupedMatches) {
      const { groupId, sessions: matchingSessions } = dailyGroup;
      matchingSessions.sort(
        (a, b) => Date.parse(a.eventDate) - Date.parse(b.eventDate)
      );

      const fullSessions = allGroups.get(groupId) ?? matchingSessions;
      const first = matchingSessions[0];
      const last = matchingSessions[matchingSessions.length - 1] ?? first;
      const liveSession = matchingSessions.find((event) => event.status === "live");
      const futureSession = matchingSessions.find(
        (event) =>
          event.status !== "finished" &&
          Date.parse(event.eventDate) >= now.getTime()
      );
      const nextSession = liveSession ?? futureSession ?? matchingSessions[0] ?? first;
      const category = categoryForSport(first.sport);
      const sessionLabels = Array.from(
        new Set(
          matchingSessions
            .map((event) => event.stage || (event.sessionType ? fallbackLabel(event.sessionType) : ""))
            .filter(Boolean)
        )
      );

      const detailPath = groupedDetailPath(first);
      const isFavorite = favorites.items.some((favorite) => {
        const favoritePath = stripHash(favorite.href || favorite.event?.detailPath || "");
        if (favoritePath && favoritePath === detailPath) return true;
        if (favorite.entityId === groupId) return true;
        return fullSessions.some((session) => favorite.entityId === session.id);
      });

      output.push({
        kind: "group",
        id: dailyKey,
        sortTime: Math.min(
          ...matchingSessions.map((event) => Date.parse(event.eventDate))
        ),
        category,
        title: first.eventGroupName || first.title,
        detailPath,
        competition: first.competition,
        venue: first.venue,
        country: first.country,
        startDate: first.eventDate,
        endDate: last.eventDate,
        nextSession,
        access: uniqueAccess(matchingSessions),
        accessOptions: availableAccess(matchingSessions),
        sessionLabels,
        isFavorite,
      });
    }

    const prioritizeGrandPrixFavorites =
      effectiveCategories.length === 1 &&
      effectiveCategories[0] === "motorsports";

    return output.sort((a, b) => {
      if (prioritizeGrandPrixFavorites) {
        const aFavorite = a.kind === "group" && a.category === "motorsports" && a.isFavorite;
        const bFavorite = b.kind === "group" && b.category === "motorsports" && b.isFavorite;
        if (aFavorite !== bFavorite) return aFavorite ? -1 : 1;
      }
      return a.sortTime - b.sortTime;
    });
  }, [allGroups, effectiveCategories, favorites.items, filteredEvents, now]);

  const liveCount = useMemo(
    () => scopeEvents.filter((event) => event.status === "live").length,
    [scopeEvents]
  );
  const upcomingCount = useMemo(
    () =>
      scopeEvents.filter(
        (event) =>
          event.status === "live" ||
          (event.status !== "finished" &&
            Date.parse(event.eventDate) >= now.getTime())
      ).length,
    [scopeEvents, now]
  );

  const selectedCategoryLabels = effectiveCategories.map(
    (category) => categoryDefinition(category).label
  );
  const selectedSubfilterLabels = subfilterOptions
    .filter((option) => effectiveSubfilterSet.has(option.key))
    .map((option) => option.label);
  const selectedTeamLabel = teamOptions.find(
    (option) => option.value === effectiveTeam
  )?.label;

  const resultTitle =
    [
      selectedSubfilterLabels.length === 0 ? joinLabels(selectedCategoryLabels) : "",
      joinLabels(selectedSubfilterLabels),
      selectedTeamLabel,
    ]
      .filter(Boolean)
      .join(" · ") ||
    (period === "live"
      ? "Live now"
      : period === "date"
        ? formatLongDateKey(selectedDate)
        : "Live & upcoming");

  const resultNoun =
    effectiveCategories.length === 1 && effectiveCategories[0] === "motorsports"
      ? "weekend"
      : effectiveCategories.length === 1 &&
          ["football", "basketball", "hockey"].includes(effectiveCategories[0])
        ? "match"
        : "event";

  const filteredTeamOptions = teamOptions.filter((option) =>
    option.label.toLowerCase().includes(teamQuery.trim().toLowerCase())
  );
  const isFavoriteTeamOption = (option: FilterOption) =>
    favoriteParticipantIds.has(option.value) ||
    favoriteParticipantIds.has(stableClubFavoriteId(option.category, option.label));
  const favoriteTeamOptions = filteredTeamOptions.filter(isFavoriteTeamOption);
  const otherTeamOptions = filteredTeamOptions.filter(
    (option) => !isFavoriteTeamOption(option)
  );

  const hiddenSelectionExists = availableCategories
    .slice(6)
    .some((category) => effectiveCategories.includes(category.id));
  const sportsToShow =
    showMoreSports || hiddenSelectionExists
      ? availableCategories
      : availableCategories.slice(0, 6);
  const hasMoreSports = availableCategories.length > 6;

  const favoriteCompetitionIds = useMemo(
    () => new Set(
      favorites.items
        .filter((item) => item.kind === "competition")
        .map((item) => item.entityId.split(":").at(-1) || item.entityId)
    ),
    [favorites.items]
  );
  const orderedSubfilterOptions = useMemo(() => {
    const counts = new Map<string, number>();
    for (const event of categoryEvents) {
      counts.set(event.competitionSlug, (counts.get(event.competitionSlug) ?? 0) + 1);
    }
    return [...subfilterOptions].sort((a, b) => {
      const favoriteDifference = Number(favoriteCompetitionIds.has(b.value)) - Number(favoriteCompetitionIds.has(a.value));
      const selectedDifference = Number(effectiveSubfilterSet.has(b.key)) - Number(effectiveSubfilterSet.has(a.key));
      return favoriteDifference || selectedDifference || (counts.get(b.value) ?? 0) - (counts.get(a.value) ?? 0) || a.label.localeCompare(b.label);
    });
  }, [categoryEvents, effectiveSubfilterSet, favoriteCompetitionIds, subfilterOptions]);
  const primarySubfiltersByCategory = effectiveCategories.map((category) => {
    const options = orderedSubfilterOptions.filter((option) => option.category === category);
    return {
      category,
      options: options.length > 5 ? options.slice(0, 4) : options,
      hasMore: options.length > 5,
    };
  });
  const filteredCompetitionOptions = orderedSubfilterOptions.filter((option) => {
    const query = competitionQuery.trim().toLowerCase();
    return !query || option.label.toLowerCase().includes(query) || categoryDefinition(option.category).label.toLowerCase().includes(query);
  });

  const secondaryLabel = effectiveCategories.length > 1
    ? "Competitions / series"
    : sportsRegistry.find((sport) => sport.discovery.family === effectiveCategories[0])?.discovery.secondaryLabel ?? "Competition";

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);

    if (period === "live") params.set("when", "live");
    else params.delete("when");

    if (period === "date") params.set("date", selectedDate);
    else params.delete("date");

    if (effectiveCategories.length > 0) {
      params.set("sport", effectiveCategories.join(","));
    } else {
      params.delete("sport");
    }

    if (effectiveSubfilterKeys.length > 0) {
      params.set("competition", effectiveSubfilterKeys.join(","));
    } else {
      params.delete("competition");
    }

    if (effectiveTeam) params.set("team", effectiveTeam);
    else params.delete("team");

    if (accessFilter !== "All") params.set("access", accessFilter);
    else params.delete("access");

    params.delete("view");
    params.delete("page");

    const query = params.toString();
    const nextUrl =
      window.location.pathname +
      (query ? "?" + query : "") +
      window.location.hash;
    window.history.replaceState(window.history.state, "", nextUrl);
  }, [
    effectiveCategories,
    effectiveSubfilterKeys,
    effectiveTeam,
    accessFilter,
    period,
    selectedDate,
  ]);

  useEffect(() => {
    if (!teamPickerOpen && !competitionPickerOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setTeamPickerOpen(false);
        setCompetitionPickerOpen(false);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [competitionPickerOpen, teamPickerOpen]);

  function toggleCategory(category: string) {
    const current = effectiveCategories;
    const next = current.includes(category)
      ? current.filter((item) => item !== category)
      : [...current, category];

    const nextCategorySet = new Set(next);
    const retainedSubfilters = effectiveSubfilterKeys.filter((key) =>
      nextCategorySet.has(key.split("::", 1)[0])
    );

    setSelectedCategories(next);
    setSelectedSubfilters(retainedSubfilters);
    setSelectedTeam("");
    setTeamPickerOpen(false);
    setCompetitionPickerOpen(false);
    setTeamQuery("");
    setVisibleLimit(20);
  }

  function clearCategories() {
    setSelectedCategories([]);
    setSelectedSubfilters([]);
    setSelectedTeam("");
    setTeamPickerOpen(false);
    setCompetitionPickerOpen(false);
    setTeamQuery("");
    setVisibleLimit(20);
  }

  function toggleSubfilter(key: string) {
    const current = effectiveSubfilterKeys;
    const next = current.includes(key)
      ? current.filter((item) => item !== key)
      : [...current, key];

    setSelectedSubfilters(next);
    setVisibleLimit(20);
  }

  function clearSubfilters() {
    setSelectedSubfilters([]);
    setSelectedTeam("");
    setTeamPickerOpen(false);
    setVisibleLimit(20);
  }

  function chooseDate(value: string) {
    setSelectedDate(value);
    setPeriod("date");
    setVisibleLimit(20);
  }

  function resetAll() {
    setPeriod("upcoming");
    setSelectedDate(today);
    setSelectedCategories([]);
    setSelectedSubfilters([]);
    setSelectedTeam("");
    setTeamPickerOpen(false);
    setTeamQuery("");
    setAccessFilter("All");
    setVisibleLimit(20);
  }

  return (
    <section className="wts-discovery" aria-labelledby="wts-discovery-title">
      <div className="wts-discovery-intro">
        <div>
          <p className="wts-discovery-eyebrow">Official sports TV guide</p>
          <h1 id="wts-discovery-title">Find your event. See where to watch.</h1>
          <p className="wts-discovery-copy">
            Choose one or several sports and competitions. The list updates here;
            open a page only when you have found the event you want.
          </p>
        </div>
        <Link
          className="wts-discovery-favorites-link"
          href="/favorites"
          aria-label="Open favorites"
          title="Favorites"
        >
          <span aria-hidden="true">★</span>
        </Link>
      </div>

      {favoritesSlot}

      <div className="wts-discovery-panel">
        <div className="wts-discovery-search">
          <div>
            <strong>Know what you want?</strong>
            <span>Search a team, competition, Grand Prix or event.</span>
          </div>
          <SearchAutocomplete
            suggestions={searchSuggestions}
            timeZone={timeZone}
            searchPath="/events"
          />
        </div>
        <div className="wts-period-row" aria-label="Time filters">
          <button
            className={period === "live" ? "is-active is-live" : "is-live"}
            type="button"
            aria-pressed={period === "live"}
            onClick={() => {
              setPeriod("live");
              setVisibleLimit(20);
            }}
          >
            <i aria-hidden="true" />
            Live
            <span>{liveCount}</span>
          </button>
          <button
            className={period === "upcoming" ? "is-active" : undefined}
            type="button"
            aria-pressed={period === "upcoming"}
            onClick={() => {
              setPeriod("upcoming");
              setVisibleLimit(20);
            }}
          >
            Upcoming
            <span>{upcomingCount}</span>
          </button>
          <p className="wts-timezone-note">
            Times in your local timezone · {localTimeZoneLabel(timeZone)}
          </p>
        </div>

        <div className="wts-date-rail" aria-label="Choose date">
          {dateChoices.map((value) => {
            const label = formatDateChip(value, today);
            const active = period === "date" && selectedDate === value;
            return (
              <button
                className={active ? "wts-date-chip is-active" : "wts-date-chip"}
                type="button"
                aria-pressed={active}
                key={value}
                onClick={() => chooseDate(value)}
              >
                <strong>{label.top}</strong>
                <span>{label.bottom}</span>
              </button>
            );
          })}
          <label
            className={
              period === "date" && !dateChoices.includes(selectedDate)
                ? "wts-calendar-control is-active"
                : "wts-calendar-control"
            }
          >
            <span aria-hidden="true">▣</span>
            <b>Calendar</b>
            <input
              aria-label="Choose another date"
              type="date"
              value={selectedDate}
              onChange={(event) => {
                if (event.target.value) chooseDate(event.target.value);
              }}
            />
          </label>
        </div>

        <div className="wts-filter-stack">
          <div className="wts-filter-level">
            <div className="wts-filter-level-label">
              <span>1</span>
              <strong>Sport</strong>
              <small>multiple allowed</small>
            </div>
            <div
              className="wts-filter-pills-dynamic"
              role="group"
              aria-label="Sports"
            >
              <button
                type="button"
                className={
                  effectiveCategories.length === 0 ? "is-active" : undefined
                }
                aria-pressed={effectiveCategories.length === 0}
                onClick={clearCategories}
              >
                <span aria-hidden="true">▦</span>
                All sports
              </button>
              {sportsToShow.map((category) => {
                const active = effectiveCategories.includes(category.id);
                return (
                  <button
                    type="button"
                    className={active ? "is-active" : undefined}
                    aria-pressed={active}
                    key={category.id}
                    onClick={() => toggleCategory(category.id)}
                  >
                    <span aria-hidden="true">{category.icon}</span>
                    {category.label}
                  </button>
                );
              })}
              {hasMoreSports ? (
                <button
                  type="button"
                  className="wts-filter-more"
                  aria-expanded={showMoreSports}
                  onClick={() => setShowMoreSports((current) => !current)}
                >
                  {showMoreSports ? "Less" : "More"}
                  <span aria-hidden="true">
                    {showMoreSports ? "↑" : "↓"}
                  </span>
                </button>
              ) : null}
            </div>
          </div>

          {effectiveCategories.length > 0 && subfilterOptions.length > 0 ? (
            <div className="wts-filter-level is-child">
              <div className="wts-filter-level-label">
                <span>2</span>
                <strong>{secondaryLabel}</strong>
                <small>multiple allowed</small>
              </div>
              <div className="wts-secondary-filter-content">
                <div className="wts-filter-pills-dynamic" role="group" aria-label="All competition filters">
                <button
                  type="button"
                  className={
                    effectiveSubfilterKeys.length === 0
                      ? "is-active"
                      : undefined
                  }
                  aria-pressed={effectiveSubfilterKeys.length === 0}
                  onClick={clearSubfilters}
                >
                  All selected sports
                </button>
                </div>
                <div className="wts-competition-groups">
                  {primarySubfiltersByCategory.map(({ category, options, hasMore }) => {
                    const definition = categoryDefinition(category);
                    return (
                      <div className="wts-competition-group" key={category}>
                        <strong><span aria-hidden="true">{definition.icon}</span>{definition.label}</strong>
                        <div className="wts-filter-pills-dynamic" role="group" aria-label={definition.label + " " + secondaryLabel.toLowerCase()}>
                          {options.map((option) => {
                            const active = effectiveSubfilterSet.has(option.key);
                            return (
                              <button type="button" className={active ? "is-active" : undefined} aria-pressed={active} key={option.key} onClick={() => toggleSubfilter(option.key)}>
                                {option.label}
                              </button>
                            );
                          })}
                          {hasMore ? (
                            <button type="button" className="wts-filter-more" onClick={() => {
                              setCompetitionQuery("");
                              setCompetitionPickerOpen(true);
                            }}>
                              More <span aria-hidden="true">＋</span>
                            </button>
                          ) : null}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : null}

          {selectedCompetitionOptions.length > 0 && teamOptions.length > 0 ? (
            <div className="wts-filter-level is-child">
              <div className="wts-filter-level-label">
                <span>3</span>
                <strong>Team</strong>
                <small>optional</small>
              </div>
              <div className="wts-team-filter-inline">
                <button
                  type="button"
                  className={
                    effectiveTeam
                      ? "wts-team-select has-selection"
                      : "wts-team-select"
                  }
                  onClick={() => {
                    setTeamQuery("");
                    setTeamPickerOpen(true);
                  }}
                >
                  <span aria-hidden="true">{effectiveTeam ? "✓" : "⌕"}</span>
                  <strong>{selectedTeamLabel || "All teams"}</strong>
                  <b aria-hidden="true">⌄</b>
                </button>
                {effectiveTeam ? (
                  <button
                    type="button"
                    className="wts-team-clear"
                    aria-label={"Clear team filter " + selectedTeamLabel}
                    onClick={() => setSelectedTeam("")}
                  >
                    Clear
                  </button>
                ) : null}
              </div>
            </div>
          ) : null}

          <div className="wts-filter-level is-child">
            <div className="wts-filter-level-label">
              <span>{selectedCompetitionOptions.length > 0 && teamOptions.length > 0 ? "4" : "3"}</span>
              <strong>Access</strong>
              <small>optional</small>
            </div>
            <div className="wts-filter-pills-dynamic" role="group" aria-label="Access type">
              {(["All", "Free", "Paid"] as const).map((access) => (
                <button
                  type="button"
                  className={accessFilter === access ? "is-active" : undefined}
                  aria-pressed={accessFilter === access}
                  key={access}
                  onClick={() => {
                    setAccessFilter(access);
                    setVisibleLimit(20);
                  }}
                >
                  {access === "All" ? "All access" : access + " available"}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="wts-discovery-results">
        <div className="wts-discovery-results-heading">
          <div>
            <p>
              {period === "live"
                ? "Now"
                : period === "date"
                  ? formatLongDateKey(selectedDate)
                  : "Now & next"}
            </p>
            <h2>{resultTitle}</h2>
          </div>
          <span aria-live="polite">
            {resultItems.length} {resultNoun}
            {resultItems.length === 1 ? "" : "s"}
          </span>
        </div>

        {resultItems.length === 0 ? (
          <div className="wts-discovery-empty">
            <strong>
              {period === "live"
                ? "No live events match these filters."
                : "No events match these filters."}
            </strong>
            <span>Change the date or clear one of the filters.</span>
            <button type="button" onClick={resetAll}>
              Show all upcoming
            </button>
          </div>
        ) : (
          <div className="wts-discovery-list">
            {resultItems.slice(0, visibleLimit).map((item, index, visibleItems) => {
              const itemDate = dateKey(new Date(item.sortTime), timeZone);
              const previousDate = index > 0
                ? dateKey(new Date(visibleItems[index - 1].sortTime), timeZone)
                : "";
              const dateHeading = itemDate !== previousDate ? (
                <h3 className="wts-discovery-date-heading">{formatLongDateKey(itemDate)}</h3>
              ) : null;
              if (item.kind === "group") {
                const nextSession = item.nextSession;
                const live = Boolean(nextSession?.status === "live");
                return (
                  <Fragment key={item.id}>
                    {dateHeading}
                  <Link
                    className="wts-discovery-card is-group"
                    href={item.detailPath}
                  >
                    <div className="wts-discovery-card-time">
                      <span
                        className={
                          live
                            ? "wts-result-status is-live"
                            : "wts-result-status is-upcoming"
                        }
                      >
                        {live ? "Live" : groupedEventType(item.category)}
                      </span>
                      <strong>
                        {nextSession
                          ? formatTime(nextSession.eventDate, timeZone)
                          : "TBC"}
                      </strong>
                      <small>
                        {formatDateRange(
                          item.startDate,
                          item.endDate,
                          timeZone
                        )}
                      </small>
                    </div>
                    <div className="wts-discovery-card-main">
                      <p>
                        {categoryDefinition(item.category).icon}{" "}
                        {item.competition}
                        {item.isFavorite ? <strong className="wts-result-favorite-mark">★ Favorite</strong> : null}
                      </p>
                      <h3>{item.title}</h3>
                      <span>
                        {item.sessionLabels.length > 0
                          ? item.sessionLabels.join(" · ")
                          : groupedEventSummary(item.category)}
                        {nextSession && item.sessionLabels.length > 1
                          ? " · " + (live ? "Live" : "Next") + ": " + (nextSession.stage || "Session")
                          : ""}
                        {item.venue ? " · " + item.venue : ""}
                      </span>
                    </div>
                    <span className="wts-result-access-stack">
                      {item.accessOptions.length > 0 ? item.accessOptions.map((access) => (
                        <span className={"wts-result-access " + accessClass(access)} key={access}>{access}</span>
                      )) : (
                        <span className={"wts-result-access " + accessClass(item.access)}>{item.access}</span>
                      )}
                    </span>
                    <div className="wts-discovery-card-open">
                      <span>
                        {item.category === "motorsports"
                          ? "View Grand Prix"
                          : item.category === "combat"
                            ? "View fight card"
                            : "View event"}
                      </span>
                      <b aria-hidden="true">›</b>
                    </div>
                  </Link>
                  </Fragment>
                );
              }

              const event = item.event;
              const eventAccessOptions = event.accessOptions?.length
                ? event.accessOptions
                : [event.access];
              return (
                <Fragment key={item.id}>
                  {dateHeading}
                <Link
                  className="wts-discovery-card"
                  href={event.detailPath}
                >
                  <div className="wts-discovery-card-time">
                    <span
                      className={
                        "wts-result-status " + statusClass(event)
                      }
                    >
                      {statusLabel(event)}
                    </span>
                    <strong>
                      {event.status === "live"
                        ? "LIVE"
                        : formatTime(event.eventDate, timeZone)}
                    </strong>
                    <small>
                      {formatShortDate(event.eventDate, timeZone)}
                    </small>
                  </div>
                  <div className="wts-discovery-card-main">
                    <p>
                      {categoryDefinition(categoryForSport(event.sport)).icon}{" "}
                      {event.competition}
                    </p>
                    <h3>{event.title}</h3>
                    <span>{event.stage || event.venue || "Event"}</span>
                  </div>
                  <span className="wts-result-access-stack">
                    {eventAccessOptions.map((access) => (
                      <span className={"wts-result-access " + accessClass(access)} key={access}>{access}</span>
                    ))}
                  </span>
                  <div className="wts-discovery-card-open">
                    <span>Open</span>
                    <b aria-hidden="true">›</b>
                  </div>
                </Link>
                </Fragment>
              );
            })}
          </div>
        )}

        {resultItems.length > visibleLimit ? (
          <button
            className="wts-discovery-show-more"
            type="button"
            onClick={() => setVisibleLimit((current) => current + 20)}
          >
            Show more
          </button>
        ) : null}
      </div>

      {competitionPickerOpen ? (
        <div
          className="wts-team-picker-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setCompetitionPickerOpen(false);
          }}
        >
          <section className="wts-team-picker" role="dialog" aria-modal="true" aria-labelledby="wts-competition-picker-title">
            <div className="wts-team-picker-header">
              <div>
                <p>Multiple choices allowed</p>
                <h2 id="wts-competition-picker-title">Choose competitions or series</h2>
              </div>
              <button type="button" aria-label="Close competition selector" onClick={() => setCompetitionPickerOpen(false)}>×</button>
            </div>
            <label className="wts-team-picker-search">
              <span aria-hidden="true">⌕</span>
              <input autoFocus type="search" value={competitionQuery} onChange={(event) => setCompetitionQuery(event.target.value)} placeholder="Search competitions…" />
            </label>
            <div className="wts-team-picker-list">
              {filteredCompetitionOptions.map((option) => {
                const active = effectiveSubfilterSet.has(option.key);
                return (
                  <button type="button" className={active ? "is-active" : undefined} key={option.key} onClick={() => toggleSubfilter(option.key)}>
                    <span>
                      <strong>{option.label}</strong>
                      <small>{categoryDefinition(option.category).label}{favoriteCompetitionIds.has(option.value) ? " · ★ Favorite" : ""}</small>
                    </span>
                    <b aria-hidden="true">{active ? "✓" : "+"}</b>
                  </button>
                );
              })}
            </div>
            <div className="wts-team-picker-footer">
              <button type="button" onClick={clearSubfilters}>Clear selection</button>
              <button type="button" className="is-primary" onClick={() => setCompetitionPickerOpen(false)}>Show results</button>
            </div>
          </section>
        </div>
      ) : null}

      {teamPickerOpen ? (
        <div
          className="wts-team-picker-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setTeamPickerOpen(false);
            }
          }}
        >
          <section
            className="wts-team-picker"
            role="dialog"
            aria-modal="true"
            aria-labelledby="wts-team-picker-title"
          >
            <div className="wts-team-picker-header">
              <div>
                <p>Optional filter</p>
                <h2 id="wts-team-picker-title">Choose a team</h2>
              </div>
              <button
                type="button"
                aria-label="Close team selector"
                onClick={() => setTeamPickerOpen(false)}
              >
                ×
              </button>
            </div>
            <label className="wts-team-picker-search">
              <span aria-hidden="true">⌕</span>
              <input
                autoFocus
                type="search"
                value={teamQuery}
                placeholder="Search teams..."
                onChange={(event) => setTeamQuery(event.target.value)}
              />
            </label>
            <div className="wts-team-picker-list">
              {favoriteTeamOptions.length > 0 ? (
                <>
                  <p className="wts-team-picker-group-label">★ Favorites</p>
                  {favoriteTeamOptions.map((option) => (
                    <button
                      type="button"
                      className={
                        effectiveTeam === option.value ? "is-active" : undefined
                      }
                      key={"favorite:" + option.value}
                      onClick={() => {
                        setSelectedTeam(option.value);
                        setTeamPickerOpen(false);
                        setVisibleLimit(20);
                      }}
                    >
                      <span>{option.label}</span>
                      <b aria-hidden="true">★</b>
                    </button>
                  ))}
                  <p className="wts-team-picker-group-label">All teams</p>
                </>
              ) : null}
              <button
                type="button"
                className={!effectiveTeam ? "is-active" : undefined}
                onClick={() => {
                  setSelectedTeam("");
                  setTeamPickerOpen(false);
                }}
              >
                <span>All teams</span>
                {!effectiveTeam ? <b aria-hidden="true">✓</b> : null}
              </button>
              {otherTeamOptions.map((option) => (
                <button
                  type="button"
                  className={
                    effectiveTeam === option.value ? "is-active" : undefined
                  }
                  key={option.value}
                  onClick={() => {
                    setSelectedTeam(option.value);
                    setTeamPickerOpen(false);
                    setVisibleLimit(20);
                  }}
                >
                  <span>{option.label}</span>
                  {effectiveTeam === option.value ? (
                    <b aria-hidden="true">✓</b>
                  ) : null}
                </button>
              ))}
              {filteredTeamOptions.length === 0 ? (
                <p>No team found.</p>
              ) : null}
            </div>
          </section>
        </div>
      ) : null}
    </section>
  );
}
