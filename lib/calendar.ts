import type { EventData } from "./events";
import { clubSlug, getClubSearchNames, resolveClubSlug } from "./club-aliases";
import { getSportLabel, sportsRegistry } from "./sports-registry";
import type {
  FavoriteEventFeed,
  FavoriteEventSummary,
  FavoriteLookup,
} from "./favorites";

export const CALENDAR_PAGE_SIZE = 24;

export type CalendarView = "today" | "tomorrow" | "date" | "archive" | "all";

export type CalendarFilters = {
  view: CalendarView;
  date?: string;
  query: string;
  sport: string;
  competition: string;
  timeZone: string;
  page: number;
};

export type CalendarFilterOption = {
  value: string;
  label: string;
};

export type CalendarEvent = EventData & {
  sportLabel: string;
  statusLabel: "Live" | "Finished" | "Past event" | "Scheduled";
  confirmedBroadcastCount: number;
};

export type CalendarPage = {
  events: CalendarEvent[];
  total: number;
  page: number;
  pageCount: number;
};

type CalendarSearchParams = Record<string, string | string[] | undefined>;

const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const ALLOWED_VIEWS = new Set<CalendarView>(["today", "tomorrow", "date", "archive", "all"]);

function firstValue(value: string | string[] | undefined): string {
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

function normalizeSearchValue(value: string): string {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
}

function isValidTimeZone(value: string): boolean {
  if (!value || value.length > 80) return false;
  try {
    new Intl.DateTimeFormat("en", { timeZone: value }).format(new Date());
    return true;
  } catch {
    return false;
  }
}

function isValidIsoDate(value: string): boolean {
  if (!ISO_DATE_PATTERN.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

function positiveInteger(value: string): number {
  const parsed = Number.parseInt(value, 10);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : 1;
}

function isConfirmedBroadcast(broadcast: EventData["broadcasts"][number]): boolean {
  return Boolean(
    broadcast.coverageStatus === "confirmed" &&
      broadcast.countryCode.trim() &&
      broadcast.countryName.trim() &&
      broadcast.broadcaster.trim() &&
      broadcast.url.trim() &&
      (broadcast.access === "Free" || broadcast.access === "Paid")
  );
}

function getStatusLabel(event: EventData, now: Date): CalendarEvent["statusLabel"] {
  if (event.status === "live") return "Live";
  if (event.status === "finished") return "Finished";
  const startTime = new Date(event.eventDate).getTime();
  if (Number.isFinite(startTime) && startTime < now.getTime()) return "Past event";
  return "Scheduled";
}

function toCalendarEvent(event: EventData, now: Date): CalendarEvent {
  return {
    ...event,
    sportLabel: getSportLabel(event.sport),
    statusLabel: getStatusLabel(event, now),
    confirmedBroadcastCount: event.broadcasts.filter(isConfirmedBroadcast).length,
  };
}

function toFavoriteEventSummary(event: EventData, now: Date): FavoriteEventSummary {
  const calendarEvent = toCalendarEvent(event, now);
  return {
    id: event.id,
    detailPath: event.detailPath,
    title: event.title,
    sport: event.sport,
    sportLabel: calendarEvent.sportLabel,
    competition: event.competition,
    eventDate: event.eventDate,
    statusLabel: calendarEvent.statusLabel,
    participantNames: [event.participant1?.name, event.participant2?.name].filter((name): name is string => Boolean(name)),
    confirmedBroadcastCount: calendarEvent.confirmedBroadcastCount,
  };
}

function addDays(dateKey: string, days: number): string {
  const [year, month, day] = dateKey.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day + days)).toISOString().slice(0, 10);
}

export function getDateKey(date: Date, timeZone: string): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

export function parseCalendarFilters(searchParams: CalendarSearchParams): CalendarFilters {
  const requestedView = firstValue(searchParams.view) as CalendarView;
  const requestedDate = firstValue(searchParams.date);
  const requestedTimeZone = firstValue(searchParams.tz);
  const view = ALLOWED_VIEWS.has(requestedView) ? requestedView : "today";
  return {
    view: view === "date" && !isValidIsoDate(requestedDate) ? "today" : view,
    date: isValidIsoDate(requestedDate) ? requestedDate : undefined,
    query: firstValue(searchParams.q).slice(0, 100).trim(),
    sport: firstValue(searchParams.sport).slice(0, 80).trim(),
    competition: firstValue(searchParams.competition).slice(0, 120).trim(),
    timeZone: isValidTimeZone(requestedTimeZone) ? requestedTimeZone : "UTC",
    page: positiveInteger(firstValue(searchParams.page)),
  };
}

export function getCalendarFilterOptions(events: EventData[]): {
  sports: CalendarFilterOption[];
  competitions: CalendarFilterOption[];
} {
  const competitions = new Map<string, string>();

  for (const event of events) {
    competitions.set(event.competitionSlug, event.competition);
  }

  return {
    sports: sportsRegistry
      .filter((sport) => sport.enabled)
      .map((sport) => ({ value: sport.slug, label: sport.defaultLabel }))
      .sort((a, b) => a.label.localeCompare(b.label)),
    competitions: Array.from(competitions, ([value, label]) => ({ value, label })).sort(
      (a, b) => a.label.localeCompare(b.label)
    ),
  };
}

export function getCalendarPage(events: EventData[], filters: CalendarFilters, now = new Date()): CalendarPage {
  const today = getDateKey(now, filters.timeZone);
  const selectedDate = filters.view === "tomorrow" ? addDays(today, 1) : filters.view === "date" ? filters.date ?? today : today;
  const query = normalizeSearchValue(filters.query);

  const filteredEvents = events
    .filter((event) => {
      const eventDate = getDateKey(new Date(event.eventDate), filters.timeZone);
      const matchesDate = filters.view === "all" ? true : filters.view === "archive" ? eventDate < today : eventDate === selectedDate;
      const matchesSport = !filters.sport || event.sport === filters.sport;
      const matchesCompetition = !filters.competition || event.competitionSlug === filters.competition;
      const searchableText = normalizeSearchValue(
        [
          event.title,
          event.competition,
          event.stage,
          event.group,
          event.participant1?.name,
          event.participant1?.shortName,
          ...(event.participant1?.type === "club" ? getClubSearchNames(event.participant1.name) : []),
          event.participant2?.name,
          event.participant2?.shortName,
          ...(event.participant2?.type === "club" ? getClubSearchNames(event.participant2.name) : []),
        ].filter(Boolean).join(" ")
      );
      const matchesQuery = !query || searchableText.includes(query);
      return matchesDate && matchesSport && matchesCompetition && matchesQuery;
    })
    .sort((a, b) => {
      const aTime = new Date(a.eventDate).getTime();
      const bTime = new Date(b.eventDate).getTime();
      const difference = aTime - bTime;
      if (filters.view === "archive") return -difference;
      if (filters.view !== "all") return difference;
      const aIsPast = aTime < now.getTime();
      const bIsPast = bTime < now.getTime();
      if (aIsPast !== bIsPast) return aIsPast ? 1 : -1;
      return aIsPast ? -difference : difference;
    });

  const total = filteredEvents.length;
  const pageCount = Math.max(1, Math.ceil(total / CALENDAR_PAGE_SIZE));
  const page = Math.min(filters.page, pageCount);
  const offset = (page - 1) * CALENDAR_PAGE_SIZE;

  return {
    events: filteredEvents.slice(offset, offset + CALENDAR_PAGE_SIZE).map((event) => toCalendarEvent(event, now)),
    total,
    page,
    pageCount,
  };
}

function participantFavoriteIds(event: EventData, participant: EventData["participant1"]): string[] {
  if (!participant) return [];
  const ids = [participant.id];
  if (participant.type === "club") {
    const slug = event.sport === "football" ? resolveClubSlug(participant.name) : clubSlug(participant.name);
    ids.push(`club:${event.sport}:${slug}`);
  }
  return ids;
}

export function getFavoriteEventFeed(events: EventData[], lookup: FavoriteLookup, now = new Date()): FavoriteEventFeed {
  const eventIds = new Set(lookup.eventIds);
  const participantIds = new Set(lookup.participantIds);
  const competitionIds = new Set(lookup.competitionIds);

  const exactEvents = events
    .filter((event) => eventIds.has(event.id))
    .sort((a, b) => new Date(b.eventDate).getTime() - new Date(a.eventDate).getTime())
    .map((event) => toFavoriteEventSummary(event, now));

  const upcomingEvents = events
    .filter((event) => {
      if (eventIds.has(event.id)) return false;
      const followsCompetition = competitionIds.has(event.competitionSlug) || competitionIds.has(`${event.sport}:${event.competitionSlug}`);
      const followsParticipant = [event.participant1, event.participant2].some((participant) => participantFavoriteIds(event, participant).some((id) => participantIds.has(id)));
      if (!followsCompetition && !followsParticipant) return false;
      const startTime = new Date(event.eventDate).getTime();
      return event.status === "live" || (event.status !== "finished" && Number.isFinite(startTime) && startTime >= now.getTime());
    })
    .sort((a, b) => new Date(a.eventDate).getTime() - new Date(b.eventDate).getTime())
    .slice(0, 24)
    .map((event) => toFavoriteEventSummary(event, now));

  return { exactEvents, upcomingEvents };
}

export function buildCalendarHref(filters: CalendarFilters, changes: Partial<CalendarFilters> = {}, hash?: string): string {
  const next = { ...filters, ...changes };
  const params = new URLSearchParams();
  if (next.view !== "today") params.set("view", next.view);
  if (next.view === "date" && next.date) params.set("date", next.date);
  if (next.query) params.set("q", next.query);
  if (next.sport) params.set("sport", next.sport);
  if (next.competition) params.set("competition", next.competition);
  if (next.timeZone !== "UTC") params.set("tz", next.timeZone);
  if (next.page > 1) params.set("page", String(next.page));
  const query = params.toString();
  const fragment = hash ? `#${encodeURIComponent(hash)}` : "";
  return `${query ? `/?${query}` : "/"}${fragment}`;
}

export function formatCalendarDay(date: string, timeZone: string): string {
  return new Intl.DateTimeFormat("en", {
    timeZone,
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(new Date(date));
}

export function formatCalendarTime(date: string, timeZone: string): string {
  return new Intl.DateTimeFormat("en", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(date));
}
