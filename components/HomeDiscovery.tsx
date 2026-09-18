"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

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
};

export type HomeDiscoveryInitialState = {
  when?: string;
  date?: string;
  sport?: string;
  competition?: string;
  team?: string;
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
};

type ResultItem = EventResult | GroupResult;

const CATEGORY_DEFINITIONS: CategoryDefinition[] = [
  { id: "football", label: "Football", icon: "⚽", sports: ["football", "soccer"] },
  { id: "basketball", label: "Basketball", icon: "🏀", sports: ["basketball"] },
  { id: "hockey", label: "Hockey", icon: "🏒", sports: ["hockey", "ice-hockey"] },
  { id: "tennis", label: "Tennis", icon: "🎾", sports: ["tennis"] },
  { id: "motorsports", label: "Motorsports", icon: "🏁", sports: ["formula-1", "motogp", "motorsports", "wec", "indycar", "formula-e"] },
  { id: "combat", label: "Combat sports", icon: "🥊", sports: ["ufc", "mma", "boxing", "pfl", "one"] },
  { id: "american-football", label: "American football", icon: "🏈", sports: ["american-football"] },
  { id: "baseball", label: "Baseball", icon: "⚾", sports: ["baseball"] },
  { id: "rugby", label: "Rugby", icon: "🏉", sports: ["rugby"] },
  { id: "cycling", label: "Cycling", icon: "🚴", sports: ["cycling"] },
];

const CATEGORY_BY_SPORT = new Map(
  CATEGORY_DEFINITIONS.flatMap((category) => category.sports.map((sport) => [sport, category.id] as const))
);

const GROUPED_CATEGORIES = new Set(["motorsports", "combat"]);
const TEAM_FILTER_CATEGORIES = new Set([
  "football",
  "basketball",
  "hockey",
  "american-football",
  "baseball",
  "rugby",
]);

function categoryForSport(sport: string): string {
  return CATEGORY_BY_SPORT.get(sport) ?? sport;
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

function uniqueAccess(events: HomeDiscoveryEvent[]): "Free" | "Paid" | "Access TBC" | "Access varies" {
  const values = Array.from(new Set(events.map((event) => event.access)));
  if (values.length === 1) return values[0] as "Free" | "Paid" | "Access TBC";
  if (values.length === 0) return "Access TBC";
  return "Access varies";
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

export default function HomeDiscovery({
  events,
  timeZone,
  initial,
}: {
  events: HomeDiscoveryEvent[];
  timeZone: string;
  initial: HomeDiscoveryInitialState;
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
  const [showMoreSports, setShowMoreSports] = useState(false);
  const [visibleLimit, setVisibleLimit] = useState(20);

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

      if (GROUPED_CATEGORIES.has(category)) {
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
    effectiveCategories.length === 1 && TEAM_FILTER_CATEGORIES.has(effectiveCategories[0])
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

  const periodEvents = useMemo(() => {
    return events.filter((event) => {
      const eventTime = Date.parse(event.eventDate);
      if (!Number.isFinite(eventTime)) return false;
      if (period === "live") return event.status === "live";
      if (period === "date") {
        return dateKey(new Date(event.eventDate), timeZone) === selectedDate;
      }
      if (event.status === "live") return true;
      return event.status !== "finished" && eventTime >= now.getTime();
    });
  }, [events, now, period, selectedDate, timeZone]);

  const filteredEvents = useMemo(() => {
    const categorySet = new Set(effectiveCategories);

    return periodEvents
      .filter(
        (event) =>
          effectiveCategories.length === 0 ||
          categorySet.has(categoryForSport(event.sport))
      )
      .filter((event) => {
        if (effectiveSubfilterKeys.length === 0) return true;

        const category = categoryForSport(event.sport);
        const eventFilterKey = GROUPED_CATEGORIES.has(category)
          ? category + "::" + event.sport
          : category + "::" + event.competitionSlug;

        return effectiveSubfilterSet.has(eventFilterKey);
      })
      .filter((event) => {
        if (!effectiveTeam) return true;
        return (
          event.participant1?.id === effectiveTeam ||
          event.participant2?.id === effectiveTeam
        );
      })
      .sort((a, b) => Date.parse(a.eventDate) - Date.parse(b.eventDate));
  }, [
    effectiveCategories,
    effectiveSubfilterKeys.length,
    effectiveSubfilterSet,
    effectiveTeam,
    periodEvents,
  ]);

  const allGroups = useMemo(() => {
    const groups = new Map<string, HomeDiscoveryEvent[]>();
    for (const event of events) {
      if (!event.eventGroupId) continue;
      const list = groups.get(event.eventGroupId) ?? [];
      list.push(event);
      groups.set(event.eventGroupId, list);
    }
    for (const list of groups.values()) {
      list.sort((a, b) => Date.parse(a.eventDate) - Date.parse(b.eventDate));
    }
    return groups;
  }, [events]);

  const resultItems = useMemo<ResultItem[]>(() => {
    const output: ResultItem[] = [];
    const groupedMatches = new Map<string, HomeDiscoveryEvent[]>();

    for (const event of filteredEvents) {
      const category = categoryForSport(event.sport);
      if (event.eventGroupId && GROUPED_CATEGORIES.has(category)) {
        const list = groupedMatches.get(event.eventGroupId) ?? [];
        list.push(event);
        groupedMatches.set(event.eventGroupId, list);
        continue;
      }

      output.push({
        kind: "event",
        id: event.id,
        sortTime: Date.parse(event.eventDate),
        event,
      });
    }

    for (const [groupId, matchingSessions] of groupedMatches) {
      const fullSessions = allGroups.get(groupId) ?? matchingSessions;
      const first = fullSessions[0];
      const last = fullSessions[fullSessions.length - 1] ?? first;
      const liveSession = fullSessions.find((event) => event.status === "live");
      const futureSession = fullSessions.find(
        (event) =>
          event.status !== "finished" &&
          Date.parse(event.eventDate) >= now.getTime()
      );
      const nextSession = liveSession ?? futureSession ?? matchingSessions[0] ?? first;
      const category = categoryForSport(first.sport);

      output.push({
        kind: "group",
        id: groupId,
        sortTime: Math.min(
          ...matchingSessions.map((event) => Date.parse(event.eventDate))
        ),
        category,
        title: first.eventGroupName || first.title,
        detailPath: stripHash(first.detailPath),
        competition: first.competition,
        venue: first.venue,
        country: first.country,
        startDate: first.eventDate,
        endDate: last.eventDate,
        nextSession,
        access: uniqueAccess(fullSessions),
      });
    }

    return output.sort((a, b) => a.sortTime - b.sortTime);
  }, [allGroups, filteredEvents, now]);

  const liveCount = useMemo(
    () => events.filter((event) => event.status === "live").length,
    [events]
  );
  const upcomingCount = useMemo(
    () =>
      events.filter(
        (event) =>
          event.status === "live" ||
          (event.status !== "finished" &&
            Date.parse(event.eventDate) >= now.getTime())
      ).length,
    [events, now]
  );

  const selectedCategoryLabels = effectiveCategories.map(
    (category) => categoryDefinition(category).label
  );
  const selectedSubfilterLabels = subfilterOptions
    .filter((option) => effectiveSubfilterSet.has(option.key))
    .map((option) =>
      effectiveCategories.length > 1
        ? categoryDefinition(option.category).label + " · " + option.label
        : option.label
    );
  const selectedTeamLabel = teamOptions.find(
    (option) => option.value === effectiveTeam
  )?.label;

  const resultTitle =
    [
      joinLabels(selectedCategoryLabels),
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

  const hiddenSelectionExists = availableCategories
    .slice(6)
    .some((category) => effectiveCategories.includes(category.id));
  const sportsToShow =
    showMoreSports || hiddenSelectionExists
      ? availableCategories
      : availableCategories.slice(0, 6);
  const hasMoreSports = availableCategories.length > 6;

  const secondaryLabel =
    effectiveCategories.length > 1
      ? "Competitions / series"
      : effectiveCategories[0] === "motorsports"
        ? "Series"
        : effectiveCategories[0] === "combat"
          ? "Organization"
          : effectiveCategories[0] === "tennis"
            ? "Tournament"
            : "Competition";

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
    period,
    selectedDate,
  ]);

  useEffect(() => {
    if (!teamPickerOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setTeamPickerOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [teamPickerOpen]);

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
    setTeamQuery("");
    setVisibleLimit(20);
  }

  function clearCategories() {
    setSelectedCategories([]);
    setSelectedSubfilters([]);
    setSelectedTeam("");
    setTeamPickerOpen(false);
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
        <Link className="wts-discovery-favorites-link" href="/favorites">
          <span aria-hidden="true">★</span>
          Favorites
        </Link>
      </div>

      <div className="wts-discovery-panel">
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
              <div
                className="wts-filter-pills-dynamic"
                role="group"
                aria-label="Secondary filters"
              >
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
                {subfilterOptions.map((option) => {
                  const active = effectiveSubfilterSet.has(option.key);
                  return (
                    <button
                      type="button"
                      className={active ? "is-active" : undefined}
                      aria-pressed={active}
                      key={option.key}
                      onClick={() => toggleSubfilter(option.key)}
                    >
                      {effectiveCategories.length > 1 ? (
                        <small className="wts-filter-chip-prefix">
                          {categoryDefinition(option.category).label}
                        </small>
                      ) : null}
                      {option.label}
                    </button>
                  );
                })}
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
            {resultItems.slice(0, visibleLimit).map((item) => {
              if (item.kind === "group") {
                const nextSession = item.nextSession;
                const live = Boolean(nextSession?.status === "live");
                return (
                  <Link
                    className="wts-discovery-card is-group"
                    href={item.detailPath}
                    key={item.id}
                  >
                    <div className="wts-discovery-card-time">
                      <span
                        className={
                          live
                            ? "wts-result-status is-live"
                            : "wts-result-status is-upcoming"
                        }
                      >
                        {live
                          ? "Live"
                          : item.category === "motorsports"
                            ? "Weekend"
                            : "Event"}
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
                      </p>
                      <h3>{item.title}</h3>
                      <span>
                        {nextSession
                          ? (live ? "Live: " : "Next: ") +
                            (nextSession.stage || "Session")
                          : "Schedule"}
                        {item.venue ? " · " + item.venue : ""}
                      </span>
                    </div>
                    <span
                      className={
                        "wts-result-access " + accessClass(item.access)
                      }
                    >
                      {item.access}
                    </span>
                    <div className="wts-discovery-card-open">
                      <span>
                        {item.category === "motorsports"
                          ? "Open weekend"
                          : "Open event"}
                      </span>
                      <b aria-hidden="true">›</b>
                    </div>
                  </Link>
                );
              }

              const event = item.event;
              return (
                <Link
                  className="wts-discovery-card"
                  href={event.detailPath}
                  key={item.id}
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
                  <span
                    className={
                      "wts-result-access " + accessClass(event.access)
                    }
                  >
                    {event.access}
                  </span>
                  <div className="wts-discovery-card-open">
                    <span>Open</span>
                    <b aria-hidden="true">›</b>
                  </div>
                </Link>
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
              {filteredTeamOptions.map((option) => (
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
