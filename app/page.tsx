import type { Metadata } from "next";
import Link from "next/link";
import HomeFavoritesStrip from "@/components/HomeFavoritesStrip";
import SearchAutocomplete from "@/components/SearchAutocomplete";
import TimezoneSync from "@/components/TimezoneSync";
import { getPublicEventsSnapshot } from "@/lib/public-events";
import { buildSearchSuggestions } from "@/lib/search-suggestions";
import { formatCalendarTime, getDateKey, parseCalendarFilters } from "@/lib/calendar";
import { getSportLabel } from "@/lib/sports-registry";
import type { EventData } from "@/lib/events";

type HomePageProps = { searchParams?: Promise<Record<string, string | string[] | undefined>> };
type HomeWindow = "live" | "tonight" | "tomorrow" | "week";

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Where to watch sports – live & upcoming TV guide",
    description: "Search a team or competition, open your favorites and find official viewing options for live and upcoming sports.",
    alternates: { canonical: "/" },
  };
}

const SHORTCUTS = [
  { href: "/events", label: "All sports", icon: "▦", sport: "all" },
  { href: "/football", label: "Football", icon: "⚽", sport: "football" },
  { href: "/sports/basketball/competition/nba", label: "NBA", icon: "🏀", sport: "basketball" },
  { href: "/sports/hockey/competition/nhl", label: "NHL", icon: "🏒", sport: "hockey" },
  { href: "/formula-1", label: "Formula 1", icon: "🏁", sport: "formula-1" },
  { href: "/sports/tennis", label: "Tennis", icon: "🎾", sport: "tennis" },
  { href: "/ufc", label: "UFC", icon: "🥊", sport: "ufc" },
  { href: "/sports/motogp", label: "MotoGP", icon: "🏍", sport: "motogp" },
] as const;

const MAJOR_COMPETITIONS = [
  { href: "/football/competition/champions-league", title: "Champions League", subtitle: "Football", sport: "football" },
  { href: "/events?view=all&sport=tennis&q=US%20Open", title: "US Open", subtitle: "Tennis", sport: "tennis" },
  { href: "/events?view=all&sport=formula-1&q=Australian%20Grand%20Prix", title: "Australian Grand Prix", subtitle: "Formula 1", sport: "formula-1" },
  { href: "/sports/hockey/competition/nhl", title: "NHL", subtitle: "Ice hockey", sport: "hockey" },
] as const;

function firstValue(value: string | string[] | undefined): string {
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

function addDays(dateKey: string, days: number): string {
  const [year, month, day] = dateKey.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day + days)).toISOString().slice(0, 10);
}

function localHour(date: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat("en", { timeZone, hour: "2-digit", hourCycle: "h23" }).formatToParts(date);
  const hour = Number(parts.find((part) => part.type === "hour")?.value ?? "0");
  return Number.isFinite(hour) ? hour : 0;
}

function isUpcoming(event: EventData, now: Date): boolean {
  if (event.status === "finished") return false;
  if (event.status === "live") return true;
  return Date.parse(event.eventDate) >= now.getTime();
}

function accessLabel(event: EventData): "Free" | "Paid" | "Access TBC" {
  const confirmed = event.broadcasts.filter((broadcast) => broadcast.coverageStatus === "confirmed");
  if (confirmed.some((broadcast) => broadcast.access === "Free")) return "Free";
  if (confirmed.some((broadcast) => broadcast.access === "Paid")) return "Paid";
  return "Access TBC";
}

function sportGlyph(sport: string): string {
  if (sport === "football") return "⚽";
  if (sport === "basketball") return "🏀";
  if (sport === "hockey" || sport === "ice-hockey") return "🏒";
  if (sport === "formula-1") return "🏁";
  if (sport === "tennis") return "🎾";
  if (sport === "ufc" || sport === "mma") return "🥊";
  if (sport === "motogp") return "🏍";
  return "●";
}

function sportClass(sport: string): string {
  if (sport === "football") return "football";
  if (sport === "basketball") return "basketball";
  if (sport === "hockey" || sport === "ice-hockey") return "hockey";
  if (sport === "formula-1") return "formula-1";
  if (sport === "tennis") return "tennis";
  if (sport === "ufc" || sport === "mma") return "ufc";
  if (sport === "motogp") return "motogp";
  return "all";
}

function homeHref(window: HomeWindow, timeZone: string): string {
  const params = new URLSearchParams({ when: window });
  if (timeZone !== "UTC") params.set("tz", timeZone);
  return `/?${params.toString()}#home-schedule`;
}

function eventsHref(timeZone: string, when?: HomeWindow): string {
  const params = new URLSearchParams({ view: "all" });
  if (when) params.set("when", when);
  if (timeZone !== "UTC") params.set("tz", timeZone);
  return `/events?${params.toString()}`;
}

function selectedEvents(events: EventData[], window: HomeWindow, now: Date, timeZone: string): EventData[] {
  const today = getDateKey(now, timeZone);
  const tomorrow = addDays(today, 1);
  const endOfWeek = now.getTime() + 7 * 24 * 60 * 60 * 1000;
  const thresholdHour = localHour(now, timeZone) >= 17 ? localHour(now, timeZone) : 17;

  return events.filter((event) => {
    if (window === "live") return event.status === "live";
    if (!isUpcoming(event, now) || event.status === "live") return false;
    const date = new Date(event.eventDate);
    const dateKey = getDateKey(date, timeZone);
    if (window === "tonight") return dateKey === today && localHour(date, timeZone) >= thresholdHour;
    if (window === "tomorrow") return dateKey === tomorrow;
    const time = date.getTime();
    return time >= now.getTime() && time <= endOfWeek;
  }).sort((a, b) => Date.parse(a.eventDate) - Date.parse(b.eventDate));
}

function eventMeta(event: EventData, timeZone: string): string {
  if (event.status === "live") return "Live now";
  return formatCalendarTime(event.eventDate, timeZone);
}

export default async function HomePage({ searchParams }: HomePageProps) {
  const params = (await searchParams) ?? {};
  const filters = parseCalendarFilters(params);
  const now = new Date();
  const snapshot = await getPublicEventsSnapshot();
  const suggestions = buildSearchSuggestions(snapshot.events);
  const live = selectedEvents(snapshot.events, "live", now, filters.timeZone);
  const tonight = selectedEvents(snapshot.events, "tonight", now, filters.timeZone);
  const tomorrow = selectedEvents(snapshot.events, "tomorrow", now, filters.timeZone);
  const week = selectedEvents(snapshot.events, "week", now, filters.timeZone);
  const requested = firstValue(params.when) as HomeWindow;
  const valid = requested === "live" || requested === "tonight" || requested === "tomorrow" || requested === "week";
  const defaultWindow: HomeWindow = live.length > 0 ? "live" : tonight.length > 0 ? "tonight" : "week";
  const activeWindow = valid ? requested : defaultWindow;
  const windowEvents = activeWindow === "live" ? live : activeWindow === "tonight" ? tonight : activeWindow === "tomorrow" ? tomorrow : week;
  const visibleEvents = windowEvents.slice(0, 10);
  const counts: Record<HomeWindow, number> = { live: live.length, tonight: tonight.length, tomorrow: tomorrow.length, week: week.length };

  return (
    <main id="main-content" className="wts-home-v3">
      <TimezoneSync />
      {snapshot.warning ? <p className="v2-data-warning" role="status">{snapshot.warning}</p> : null}

      <section className="wts-home-search-zone" aria-label="Find sports">
        <div className="wts-home-search-copy"><p>Official sports TV guide</p><h1>Find your event. Find where it is shown.</h1></div>
        <SearchAutocomplete searchPath="/events" timeZone={filters.timeZone} suggestions={suggestions} />
        <nav className="wts-home-shortcuts" aria-label="Sports and competitions">
          {SHORTCUTS.map((item) => <Link href={item.href} key={item.label}><span aria-hidden="true">{item.icon}</span><strong>{item.label}</strong></Link>)}
          <Link href="/events"><span aria-hidden="true">•••</span><strong>More</strong></Link>
        </nav>
      </section>

      <HomeFavoritesStrip />

      <section id="home-schedule" className="wts-home-section wts-home-schedule" aria-labelledby="home-schedule-title">
        <div className="wts-home-section-heading wts-schedule-heading">
          <div><span className="wts-section-icon" aria-hidden="true">▣</span><h2 id="home-schedule-title">TV schedule</h2></div>
          <Link href={eventsHref(filters.timeZone, activeWindow)}>View all events →</Link>
        </div>

        <div className="wts-home-window-tabs" role="navigation" aria-label="Schedule period">
          {([
            ["live", "Live", counts.live],
            ["tonight", "Tonight", counts.tonight],
            ["tomorrow", "Tomorrow", counts.tomorrow],
            ["week", "This week", counts.week],
          ] as const).map(([value, label, count]) => <Link className={activeWindow === value ? "is-active" : undefined} href={homeHref(value, filters.timeZone)} key={value}>{value === "live" ? <i aria-hidden="true" /> : null}{label}<span>{count}</span></Link>)}
        </div>

        {visibleEvents.length === 0 ? (
          <div className="wts-home-empty"><strong>No events in this window.</strong><span>Try another period or open the full schedule.</span><Link href={eventsHref(filters.timeZone)}>Browse all events</Link></div>
        ) : (
          <div className="wts-schedule-list">
            <div className="wts-schedule-columns" aria-hidden="true"><span>Status</span><span>Sport / competition</span><span>Event</span><span>Time</span><span>Access</span><span>Match page</span></div>
            {visibleEvents.map((event) => {
              const access = accessLabel(event);
              return (
                <article className="wts-schedule-row" key={event.id}>
                  <div className="wts-schedule-status"><span className={event.status === "live" ? "is-live" : "is-upcoming"}>{event.status === "live" ? "Live" : "Upcoming"}</span></div>
                  <div className="wts-schedule-competition"><b aria-hidden="true">{sportGlyph(event.sport)}</b><span><strong>{getSportLabel(event.sport)}</strong><small>{event.competition}</small></span></div>
                  <div className="wts-schedule-event"><strong>{event.title}</strong><small>{event.stage ?? event.venue ?? "Event"}</small></div>
                  <div className="wts-schedule-time"><strong>{eventMeta(event, filters.timeZone)}</strong><small>{event.status === "live" ? "In progress" : new Intl.DateTimeFormat("en", { month: "short", day: "numeric", timeZone: filters.timeZone }).format(new Date(event.eventDate))}</small></div>
                  <div className={`wts-access-pill ${access === "Free" ? "is-free" : access === "Paid" ? "is-paid" : "is-tbc"}`}>{access}</div>
                  <Link className="wts-open-event" prefetch={false} href={event.detailPath}><span>Open</span><b aria-hidden="true">›</b></Link>
                </article>
              );
            })}
          </div>
        )}
      </section>

      <section className="wts-home-section wts-major-section" aria-labelledby="major-title">
        <div className="wts-home-section-heading"><div><span className="wts-section-icon" aria-hidden="true">🏆</span><h2 id="major-title">Major competitions</h2></div><Link href="/events">View all →</Link></div>
        <div className="wts-major-grid">
          {MAJOR_COMPETITIONS.map((item) => <Link className={`wts-major-card wts-sport-bg wts-bg-${sportClass(item.sport)}`} href={item.href} key={item.title}><span><strong>{item.title}</strong><small>{item.subtitle}</small></span><b aria-hidden="true">→</b></Link>)}
        </div>
      </section>
    </main>
  );
}
