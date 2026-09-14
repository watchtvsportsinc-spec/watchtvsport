import type { Metadata } from "next";
import Link from "next/link";
import FavoriteButton from "@/components/FavoriteButton";
import TimezoneSync from "@/components/TimezoneSync";
import type { FavoriteCandidate } from "@/lib/favorites";
import {
  buildCalendarHref,
  formatCalendarDay,
  formatCalendarTime,
  getCalendarFilterOptions,
  getCalendarPage,
  getDateKey,
  parseCalendarFilters,
  type CalendarEvent,
  type CalendarFilters,
  type CalendarView,
} from "@/lib/calendar";

export const metadata: Metadata = {
  title: "Sports broadcast calendar",
  description:
    "Find official TV channels and streaming platforms for sports events worldwide.",
  alternates: { canonical: "/" },
};

type HomePageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

const VIEW_OPTIONS: Array<{ value: CalendarView; label: string }> = [
  { value: "today", label: "Today" },
  { value: "tomorrow", label: "Tomorrow" },
  { value: "archive", label: "Archives" },
];

function pageTitle(filters: CalendarFilters): string {
  if (filters.view === "all") {
    return filters.query ? "Search results" : "All events";
  }
  if (filters.view === "archive") return "Past competitions";
  if (filters.view === "tomorrow") return "Tomorrow's events";

  if (filters.view === "date" && filters.date) {
    return new Intl.DateTimeFormat("en", {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
      timeZone: "UTC",
    }).format(new Date(`${filters.date}T12:00:00Z`));
  }

  return "Today's events";
}

function eventHref(event: CalendarEvent, returnTo: string): string {
  const params = new URLSearchParams({ returnTo });
  const separator = event.detailPath.includes("?") ? "&" : "?";
  return `${event.detailPath}${separator}${params.toString()}`;
}

function eventStage(event: CalendarEvent): string {
  if (event.stage === "Group" && event.group) return `Group ${event.group}`;
  return [event.stage, event.group ? `Group ${event.group}` : ""]
    .filter(Boolean)
    .join(" · ");
}

function eventFavorite(event: CalendarEvent): FavoriteCandidate {
  return {
    kind: "event",
    entityId: event.id,
    label: event.title,
    event: {
      detailPath: event.detailPath,
      eventDate: event.eventDate,
      sport: event.sport,
      competition: event.competition,
      participantNames: [
        event.participant1?.name,
        event.participant2?.name,
      ].filter((name): name is string => Boolean(name)),
    },
  };
}

function hiddenInput(name: string, value: string | undefined) {
  return value ? <input type="hidden" name={name} value={value} /> : null;
}

export default async function HomePage({ searchParams }: HomePageProps) {
  const filters = parseCalendarFilters((await searchParams) ?? {});
  const now = new Date();
  const calendar = getCalendarPage(filters, now);
  const options = getCalendarFilterOptions();
  const today = getDateKey(now, filters.timeZone);
  const groupedEvents = new Map<string, CalendarEvent[]>();

  for (const event of calendar.events) {
    const key = getDateKey(new Date(event.eventDate), filters.timeZone);
    const group = groupedEvents.get(key) ?? [];
    group.push(event);
    groupedEvents.set(key, group);
  }

  const hasFilters = Boolean(
    filters.query || filters.sport || filters.competition
  );
  const showCategoryFilters = Boolean(
    options.sports.length > 1 ||
      options.competitions.length > 1 ||
      filters.sport ||
      filters.competition
  );
  const timezoneLabel = filters.timeZone.replaceAll("_", " ");

  return (
    <main id="main-content" className="v2-calendar">
      <TimezoneSync />
      <a className="v2-skip-link" href="#calendar-results">
        Skip to events
      </a>

      <section className="v2-calendar-hero" aria-labelledby="calendar-title">
        <p className="v2-eyebrow">Official sports broadcast guide</p>
        <h1 id="calendar-title">Where to watch sport</h1>
        <p className="v2-signature">Le sport se regarde partout.</p>
        <p className="v2-hero-copy">
          Search events and compare official TV channels and platforms by
          territory. WatchTVSport does not host video streams.
        </p>

        <form className="v2-search" action="/" method="get" role="search">
          <label htmlFor="event-search">Team, competition or event</label>
          <div className="v2-search-row">
            <input
              id="event-search"
              name="q"
              type="search"
              defaultValue={filters.query}
              maxLength={100}
              placeholder="Search France, World Cup..."
            />
            <button type="submit">Search</button>
          </div>
          <input type="hidden" name="view" value="all" />
          {hiddenInput("sport", filters.sport)}
          {hiddenInput("competition", filters.competition)}
          {filters.timeZone !== "UTC"
            ? hiddenInput("tz", filters.timeZone)
            : null}
        </form>
      </section>

      <section className="v2-calendar-controls" aria-label="Calendar filters">
        <nav className="v2-date-tabs" aria-label="Choose a period">
          {VIEW_OPTIONS.map((option) => {
            const active = filters.view === option.value;
            return (
              <Link
                key={option.value}
                href={buildCalendarHref(filters, {
                  view: option.value,
                  date: undefined,
                  page: 1,
                })}
                className={active ? "is-active" : undefined}
                aria-current={active ? "page" : undefined}
              >
                {option.label}
              </Link>
            );
          })}
        </nav>

        <form className="v2-date-picker" action="/" method="get">
          <input type="hidden" name="view" value="date" />
          {hiddenInput("q", filters.query)}
          {hiddenInput("sport", filters.sport)}
          {hiddenInput("competition", filters.competition)}
          {filters.timeZone !== "UTC"
            ? hiddenInput("tz", filters.timeZone)
            : null}
          <label htmlFor="calendar-date">Choose date</label>
          <div>
            <input
              id="calendar-date"
              type="date"
              name="date"
              defaultValue={filters.date ?? today}
              required
            />
            <button type="submit">Go</button>
          </div>
        </form>

        {showCategoryFilters ? (
          <form className="v2-filter-form" action="/" method="get">
          {filters.view !== "today"
            ? hiddenInput("view", filters.view)
            : null}
          {filters.view === "date" ? hiddenInput("date", filters.date) : null}
          {hiddenInput("q", filters.query)}
          {filters.timeZone !== "UTC"
            ? hiddenInput("tz", filters.timeZone)
            : null}

          <label htmlFor="sport-filter">
            Sport
            <select
              id="sport-filter"
              name="sport"
              defaultValue={filters.sport}
            >
              <option value="">All sports</option>
              {options.sports.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label htmlFor="competition-filter">
            Competition
            <select
              id="competition-filter"
              name="competition"
              defaultValue={filters.competition}
            >
              <option value="">All competitions</option>
              {options.competitions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <button type="submit">Apply filters</button>

          {hasFilters ? (
            <Link
              className="v2-reset-link"
              href={buildCalendarHref(filters, {
                query: "",
                sport: "",
                competition: "",
                page: 1,
              })}
            >
              Clear filters
            </Link>
          ) : null}
          </form>
        ) : null}
      </section>

      <section
        id="calendar-results"
        className="v2-results"
        aria-labelledby="results-title"
      >
        <div className="v2-results-heading">
          <div>
            <p className="v2-eyebrow">Calendar</p>
            <h2 id="results-title">{pageTitle(filters)}</h2>
          </div>
          <p>
            {calendar.total} {calendar.total === 1 ? "event" : "events"}
          </p>
        </div>

        <p className="v2-timezone-note">
          Times shown in {timezoneLabel}. Your device timezone is detected when
          available.
        </p>
        <noscript>
          <p className="v2-timezone-note">
            JavaScript is off, so calendar times remain in UTC.
          </p>
        </noscript>

        {calendar.total === 0 ? (
          <div className="v2-empty-state" role="status">
            <h3>{hasFilters ? "No matching events" : "No events on this date"}</h3>
            <p>
              {hasFilters
                ? "Try a different search or clear the active filters."
                : "No confirmed event with official broadcast information is listed for this date."}
            </p>
            <Link
              href={
                hasFilters
                  ? buildCalendarHref(filters, {
                      query: "",
                      sport: "",
                      competition: "",
                      page: 1,
                    })
                  : buildCalendarHref(filters, {
                      view: "archive",
                      date: undefined,
                      page: 1,
                    })
              }
            >
              {hasFilters ? "Clear filters" : "Browse past competitions"}
            </Link>
          </div>
        ) : (
          <div className="v2-event-groups">
            {Array.from(groupedEvents.entries()).map(([dateKey, events]) => (
              <section className="v2-event-group" key={dateKey}>
                <h3>{formatCalendarDay(events[0].eventDate, filters.timeZone)}</h3>
                <div className="v2-event-list">
                  {events.map((event) => {
                    const anchor = `event-${event.id}`;
                    const returnTo = buildCalendarHref(filters, {}, anchor);
                    const href = eventHref(event, returnTo);

                    return (
                      <article className="v2-event-card" id={anchor} key={event.id}>
                        <div className="v2-event-time">
                          <time dateTime={event.eventDate}>
                            {formatCalendarTime(event.eventDate, filters.timeZone)}
                          </time>
                          <span
                            className={`v2-status v2-status-${event.statusLabel
                              .toLowerCase()
                              .replace(" ", "-")}`}
                          >
                            {event.statusLabel}
                          </span>
                        </div>

                        <div className="v2-event-main">
                          <p className="v2-event-competition">
                            {event.sportLabel} · {event.competition}
                          </p>
                          <h4>
                            <Link prefetch={false} href={href}>
                              {event.participant1?.name ?? event.title}
                              {event.participant2 ? (
                                <>
                                  <span aria-hidden="true"> vs </span>
                                  <span className="sr-only"> versus </span>
                                  {event.participant2.name}
                                </>
                              ) : null}
                            </Link>
                          </h4>
                          <p className="v2-event-stage">
                            {eventStage(event)}
                          </p>
                          <FavoriteButton
                            compact
                            favorite={eventFavorite(event)}
                          />
                        </div>

                        <Link
                          prefetch={false}
                          className="v2-broadcast-link"
                          href={href}
                          aria-label={`View official broadcasters for ${event.title}`}
                        >
                          <span>
                            {event.confirmedBroadcastCount} confirmed official
                            {event.confirmedBroadcastCount === 1 ? " listing" : " listings"}
                          </span>
                          <strong>View broadcasters →</strong>
                        </Link>
                      </article>
                    );
                  })}
                </div>
              </section>
            ))}
          </div>
        )}

        {calendar.pageCount > 1 ? (
          <nav className="v2-pagination" aria-label="Event list pages">
            {calendar.page > 1 ? (
              <Link
                prefetch={false}
                href={buildCalendarHref(
                  filters,
                  { page: calendar.page - 1 },
                  "calendar-results"
                )}
              >
                ← Previous
              </Link>
            ) : (
              <span />
            )}
            <span>
              Page {calendar.page} of {calendar.pageCount}
            </span>
            {calendar.page < calendar.pageCount ? (
              <Link
                prefetch={false}
                href={buildCalendarHref(
                  filters,
                  { page: calendar.page + 1 },
                  "calendar-results"
                )}
              >
                Next →
              </Link>
            ) : (
              <span />
            )}
          </nav>
        ) : null}
      </section>
    </main>
  );
}
