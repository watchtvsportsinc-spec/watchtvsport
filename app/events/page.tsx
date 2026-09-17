import type { Metadata } from "next";
import Link from "next/link";
import EventsFilterNav from "@/components/EventsFilterNav";
import FavoriteButton from "@/components/FavoriteButton";
import SearchAutocomplete from "@/components/SearchAutocomplete";
import TimezoneSync from "@/components/TimezoneSync";
import { getCalendarFilterOptions, getDateKey, formatCalendarTime, parseCalendarFilters } from "@/lib/calendar";
import { getClubSearchNames, resolveClubName } from "@/lib/club-aliases";
import type { EventData } from "@/lib/events";
import type { FavoriteCandidate } from "@/lib/favorites";
import { getPublicEventsSnapshot } from "@/lib/public-events";
import { buildSearchSuggestions } from "@/lib/search-suggestions";
import { getSportLabel } from "@/lib/sports-registry";
import styles from "./events-page.module.css";

type EventsPageProps = { searchParams?: Promise<Record<string, string | string[] | undefined>> };
type WindowFilter = "all" | "live" | "today" | "tonight" | "tomorrow" | "week";

const BASE_METADATA = {
  title: "All live & upcoming sports events",
  description: "Browse live and upcoming sports events and filter quickly by sport or competition before opening each event's broadcaster guide.",
};

export async function generateMetadata({ searchParams }: EventsPageProps): Promise<Metadata> {
  const params = (await searchParams) ?? {};
  const hasFacet = Object.values(params).some((value) => Array.isArray(value) ? value.some(Boolean) : Boolean(value));
  return {
    ...BASE_METADATA,
    alternates: { canonical: "/events" },
    robots: hasFacet ? { index: false, follow: true } : { index: true, follow: true },
  };
}

const SPORT_FILTERS = [
  ["", "All", "▦"],
  ["football", "Football", "⚽"],
  ["basketball", "Basketball", "🏀"],
  ["hockey", "Hockey", "🏒"],
  ["formula-1", "Formula 1", "🏁"],
  ["tennis", "Tennis", "🎾"],
  ["ufc", "UFC", "🥊"],
  ["motogp", "MotoGP", "🏍"],
] as const;

function firstValue(value: string | string[] | undefined): string {
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

function normalize(value: string): string {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
}

function addDays(dateKey: string, days: number): string {
  const [year, month, day] = dateKey.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day + days)).toISOString().slice(0, 10);
}

function localHour(date: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat("en", { timeZone, hour: "2-digit", hourCycle: "h23" }).formatToParts(date);
  return Number(parts.find((part) => part.type === "hour")?.value ?? "0");
}

function sportGlyph(sport: string): string {
  return SPORT_FILTERS.find(([value]) => value === sport)?.[2] ?? (sport === "ice-hockey" ? "🏒" : "●");
}

function accessLabel(event: EventData): "Free" | "Paid" | "Access TBC" {
  const confirmed = event.broadcasts.filter((broadcast) => broadcast.coverageStatus === "confirmed");
  if (confirmed.some((broadcast) => broadcast.access === "Free")) return "Free";
  if (confirmed.some((broadcast) => broadcast.access === "Paid")) return "Paid";
  return "Access TBC";
}

function isCurrent(event: EventData, now: Date): boolean {
  if (event.status === "live") return true;
  if (event.status === "finished") return false;
  return Date.parse(event.eventDate) >= now.getTime();
}

function inWindow(event: EventData, window: WindowFilter, now: Date, timeZone: string): boolean {
  if (!isCurrent(event, now)) return false;
  if (window === "all") return true;
  if (window === "live") return event.status === "live";
  if (event.status === "live") return window === "today";
  const today = getDateKey(now, timeZone);
  const tomorrow = addDays(today, 1);
  const date = new Date(event.eventDate);
  const dateKey = getDateKey(date, timeZone);
  if (window === "today") return dateKey === today;
  if (window === "tonight") return dateKey === today && localHour(date, timeZone) >= (localHour(now, timeZone) >= 17 ? localHour(now, timeZone) : 17);
  if (window === "tomorrow") return dateKey === tomorrow;
  return date.getTime() <= now.getTime() + 7 * 24 * 60 * 60 * 1000;
}

function participantSearchNames(name?: string): string[] {
  if (!name) return [];
  return getClubSearchNames(resolveClubName(name));
}

function favoriteForEvent(event: EventData): FavoriteCandidate {
  const participantNames = [event.participant1?.name, event.participant2?.name]
    .filter((name): name is string => Boolean(name));

  return {
    kind: "event",
    entityId: event.id,
    label: event.title,
    href: event.detailPath,
    event: {
      detailPath: event.detailPath,
      eventDate: event.eventDate,
      sport: event.sport,
      competition: event.competition,
      participantNames,
    },
  };
}

export default async function EventsPage({ searchParams }: EventsPageProps) {
  const params = (await searchParams) ?? {};
  const filters = parseCalendarFilters(params);
  const rawWhen = firstValue(params.when) as WindowFilter;
  const when: WindowFilter = ["all", "live", "today", "tonight", "tomorrow", "week"].includes(rawWhen) ? rawWhen : "all";
  const now = new Date();
  const from = new Date(now.getTime() - 12 * 60 * 60 * 1000).toISOString();
  const snapshot = await getPublicEventsSnapshot({ from, limit: 500 });
  const options = getCalendarFilterOptions(snapshot.events);
  const suggestions = buildSearchSuggestions(snapshot.events);
  const query = normalize(filters.query);
  const state = { when, sport: filters.sport, competition: filters.competition, query: filters.query, timeZone: filters.timeZone };

  const events = snapshot.events.filter((event) => {
    if (!inWindow(event, when, now, filters.timeZone)) return false;
    if (filters.sport && event.sport !== filters.sport) return false;
    if (filters.competition && event.competitionSlug !== filters.competition) return false;
    if (!query) return true;
    const haystack = normalize([
      event.title,
      event.competition,
      event.stage,
      event.venue,
      event.participant1?.name,
      event.participant2?.name,
      ...participantSearchNames(event.participant1?.name),
      ...participantSearchNames(event.participant2?.name),
    ].filter(Boolean).join(" "));
    return haystack.includes(query);
  }).sort((a, b) => {
    if (a.status === "live" && b.status !== "live") return -1;
    if (b.status === "live" && a.status !== "live") return 1;
    return Date.parse(a.eventDate) - Date.parse(b.eventDate);
  }).slice(0, 80);

  return (
    <main id="main-content" className="wts-events-page">
      <TimezoneSync />
      {snapshot.warning ? <p className="v2-data-warning" role="status">{snapshot.warning}</p> : null}
      <header className="wts-events-hero">
        <p>All events</p>
        <h1>What's on now and next</h1>
        <span>Filter by time, sport or competition, then open a match to see broadcasters by country.</span>
        <SearchAutocomplete defaultValue={filters.query} sport={filters.sport} competition={filters.competition} timeZone={filters.timeZone} suggestions={suggestions} searchPath="/events" />
      </header>

      <section id="sports-filters" className="wts-events-filters" aria-label="Event filters">
        <EventsFilterNav state={state} />

        <form className="wts-competition-filter" action="/events" method="get">
          <input type="hidden" name="view" value="all" />
          {when !== "all" ? <input type="hidden" name="when" value={when} /> : null}
          {filters.sport ? <input type="hidden" name="sport" value={filters.sport} /> : null}
          {filters.query ? <input type="hidden" name="q" value={filters.query} /> : null}
          {filters.timeZone !== "UTC" ? <input type="hidden" name="tz" value={filters.timeZone} /> : null}
          <select id="events-competition" name="competition" aria-label="Competition" defaultValue={filters.competition}>
            <option value="">All competitions</option>
            {options.competitions.map((option) => <option value={option.value} key={option.value}>{option.label}</option>)}
          </select>
          <button type="submit">Apply</button>
          {(filters.sport || filters.competition || filters.query || when !== "all") ? <Link href="/events">Clear</Link> : null}
        </form>
      </section>

      <section className={`wts-home-section wts-home-schedule wts-events-results ${styles.compactResults}`} aria-labelledby="events-results-title">
        <div className="wts-home-section-heading"><div><span className="wts-section-icon" aria-hidden="true">▣</span><h2 id="events-results-title">{events.length} events</h2></div><Link href="/">Back home →</Link></div>
        <p className="wts-events-timezone">Times shown in {filters.timeZone.replaceAll("_", " ")}.</p>
        {events.length === 0 ? <div className="wts-home-empty"><strong>No events match these filters.</strong><span>Try another sport, competition or time window.</span><Link href="/events">Clear filters</Link></div> : (
          <div className="wts-schedule-list">
            <div className="wts-schedule-columns" aria-hidden="true"><span>Sport / competition</span><span>Event</span><span>Time</span><span>Access</span><span>Actions</span></div>
            {events.map((event) => {
              const access = accessLabel(event);
              return <article className="wts-schedule-row" key={event.id}>
                <div className="wts-schedule-competition"><b aria-hidden="true">{sportGlyph(event.sport)}</b><span><strong>{getSportLabel(event.sport)}</strong><small>{event.competition}</small></span></div>
                <div className="wts-schedule-event"><strong>{event.title}{event.status === "live" ? <span className={styles.liveDot} aria-label="Live" /> : null}</strong><small>{event.stage ?? event.venue ?? "Event"}</small></div>
                <div className="wts-schedule-time"><strong>{event.status === "live" ? "Live now" : formatCalendarTime(event.eventDate, filters.timeZone)}</strong><small>{new Intl.DateTimeFormat("en", { weekday: "short", month: "short", day: "numeric", timeZone: filters.timeZone }).format(new Date(event.eventDate))}</small></div>
                <div className={`wts-access-pill ${access === "Free" ? "is-free" : access === "Paid" ? "is-paid" : "is-tbc"}`}>{access}</div>
                <div className={styles.actions}>
                  <span className={styles.favoriteAction}><FavoriteButton favorite={favoriteForEvent(event)} compact /></span>
                  <Link className="wts-open-event" prefetch={false} href={event.detailPath}><span>Open</span><b aria-hidden="true">›</b></Link>
                </div>
              </article>;
            })}
          </div>
        )}
      </section>
    </main>
  );
}
