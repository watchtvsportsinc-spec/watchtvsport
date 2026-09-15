import type { Metadata } from "next";
import Link from "next/link";
import FavoriteButton from "@/components/FavoriteButton";
import SearchAutocomplete from "@/components/SearchAutocomplete";
import TimezoneSync from "@/components/TimezoneSync";
import type { FavoriteCandidate } from "@/lib/favorites";
import { getPublicEventsSnapshot } from "@/lib/public-events";
import { buildSearchSuggestions } from "@/lib/search-suggestions";
import {
  buildCalendarHref, formatCalendarDay, formatCalendarTime, getCalendarFilterOptions,
  getCalendarPage, getDateKey, parseCalendarFilters, type CalendarEvent,
  type CalendarFilters, type CalendarView,
} from "@/lib/calendar";

export const metadata: Metadata = {
  title: "Where to watch sports – official TV & streaming guide",
  description: "Find official TV channels and streaming platforms for football, Formula 1, UFC and more, by event and country.",
  alternates: { canonical: "/" },
};

type HomePageProps = { searchParams?: Promise<Record<string, string | string[] | undefined>> };
const VIEW_OPTIONS: Array<{ value: CalendarView; label: string }> = [
  { value: "today", label: "Today" }, { value: "tomorrow", label: "Tomorrow" }, { value: "archive", label: "Archives" },
];
const SPORT_SHORTCUTS = [
  ["", "All"], ["football", "Football"], ["formula-1", "Formula 1"], ["ufc", "UFC"],
  ["basketball", "NBA"], ["tennis", "Tennis"], ["motogp", "MotoGP"], ["ice-hockey", "NHL"],
] as const;

function pageTitle(filters: CalendarFilters): string {
  if (filters.view === "all") return filters.query ? "Search results" : "All events";
  if (filters.view === "archive") return "Past events";
  if (filters.view === "tomorrow") return "Tomorrow's events";
  if (filters.view === "date" && filters.date) return new Intl.DateTimeFormat("en", { weekday: "long", month: "long", day: "numeric", year: "numeric", timeZone: "UTC" }).format(new Date(`${filters.date}T12:00:00Z`));
  return "Today's events";
}
function eventHref(event: CalendarEvent, returnTo: string) { const p = new URLSearchParams({ returnTo }); return `${event.detailPath}${event.detailPath.includes("?") ? "&" : "?"}${p}`; }
function eventStage(event: CalendarEvent) { return [event.stage, event.group ? `Group ${event.group}` : ""].filter(Boolean).join(" · "); }
function hiddenInput(name: string, value?: string) { return value ? <input type="hidden" name={name} value={value} /> : null; }

export default async function HomePage({ searchParams }: HomePageProps) {
  const filters = parseCalendarFilters((await searchParams) ?? {});
  const now = new Date();
  const dataSnapshot = await getPublicEventsSnapshot();
  const calendar = getCalendarPage(dataSnapshot.events, filters, now);
  const options = getCalendarFilterOptions(dataSnapshot.events);
  const searchSuggestions = buildSearchSuggestions(dataSnapshot.events);
  const today = getDateKey(now, filters.timeZone);
  const groupedEvents = new Map<string, CalendarEvent[]>();
  for (const event of calendar.events) { const key = getDateKey(new Date(event.eventDate), filters.timeZone); groupedEvents.set(key, [...(groupedEvents.get(key) ?? []), event]); }
  const hasFilters = Boolean(filters.query || filters.sport || filters.competition);
  const selectedCompetitionEvent = filters.competition ? dataSnapshot.events.find(e => e.competitionSlug === filters.competition && (!filters.sport || e.sport === filters.sport)) : undefined;
  const competitionFavorite: FavoriteCandidate | null = selectedCompetitionEvent ? { kind: "competition", entityId: `${selectedCompetitionEvent.sport}:${selectedCompetitionEvent.competitionSlug}`, label: selectedCompetitionEvent.competition } : null;

  return <main id="main-content" className="v2-calendar v2-home">
    <TimezoneSync />
    <a className="v2-skip-link" href="#calendar-results">Skip to events</a>
    {dataSnapshot.warning ? <p className="v2-data-warning" role="status">{dataSnapshot.warning}</p> : null}

    <section className="v2-calendar-hero v2-home-hero" aria-labelledby="calendar-title">
      <div className="v2-hero-content">
        <p className="v2-eyebrow">Official sports broadcast guide</p>
        <h1 id="calendar-title">Every sport.<br />Every screen.<br /><span>Anywhere in the world.</span></h1>
        <p className="v2-hero-copy">Find where to watch your sports events legally. Compare official TV channels and streaming platforms by country.</p>
        <SearchAutocomplete defaultValue={filters.query} sport={filters.sport} competition={filters.competition} timeZone={filters.timeZone} suggestions={searchSuggestions} />
        <nav className="v2-sport-pills" aria-label="Sports shortcuts">
          {SPORT_SHORTCUTS.map(([value,label]) => <Link key={label} className={filters.sport === value ? "is-active" : undefined} href={buildCalendarHref(filters,{ sport:value, page:1 })}>{label}</Link>)}
        </nav>
      </div>
      <div className="v2-hero-art" aria-hidden="true"><span>FOOTBALL</span><span>F1</span><span>UFC</span></div>
    </section>

    <section className="v2-trust-strip" aria-label="WatchTVSport principles">
      <div><strong>◎ By country</strong><span>Official options near you</span></div>
      <div><strong>✓ Verified</strong><span>No invented broadcasters</span></div>
      <div><strong>◷ Up to date</strong><span>TBC stays clearly marked</span></div>
      <div><strong>♡ For fans</strong><span>Legal viewing information</span></div>
    </section>

    <section className="v2-calendar-controls" aria-label="Calendar filters">
      <nav className="v2-date-tabs" aria-label="Choose a period">{VIEW_OPTIONS.map(o => <Link key={o.value} href={buildCalendarHref(filters,{view:o.value,date:undefined,page:1})} className={filters.view===o.value?"is-active":undefined}>{o.label}</Link>)}</nav>
      <form className="v2-date-picker" action="/" method="get"><input type="hidden" name="view" value="date" />{hiddenInput("q",filters.query)}{hiddenInput("sport",filters.sport)}{hiddenInput("competition",filters.competition)}{filters.timeZone!=="UTC"?hiddenInput("tz",filters.timeZone):null}<label htmlFor="calendar-date">Choose date</label><div><input id="calendar-date" type="date" name="date" defaultValue={filters.date??today} required/><button type="submit">Go</button></div></form>
      <form className="v2-filter-form" action="/" method="get">{filters.view!=="today"?hiddenInput("view",filters.view):null}{filters.view==="date"?hiddenInput("date",filters.date):null}{hiddenInput("q",filters.query)}{filters.timeZone!=="UTC"?hiddenInput("tz",filters.timeZone):null}<label>Sport<select name="sport" defaultValue={filters.sport}><option value="">All sports</option>{options.sports.map(o=><option key={o.value} value={o.value}>{o.label}</option>)}</select></label><label>Competition<select name="competition" defaultValue={filters.competition}><option value="">All competitions</option>{options.competitions.map(o=><option key={o.value} value={o.value}>{o.label}</option>)}</select></label><button type="submit">Apply</button>{hasFilters?<Link className="v2-reset-link" href={buildCalendarHref(filters,{query:"",sport:"",competition:"",page:1})}>Clear</Link>:null}</form>
    </section>

    <section id="calendar-results" className="v2-results" aria-labelledby="results-title">
      <div className="v2-results-heading"><div><p className="v2-eyebrow">Next events</p><h2 id="results-title">{pageTitle(filters)}</h2></div><p>{calendar.total} {calendar.total===1?"event":"events"}</p></div>
      {competitionFavorite?<div className="v2-follow-row"><FavoriteButton favorite={competitionFavorite}/></div>:null}
      <p className="v2-timezone-note">Times shown in {filters.timeZone.replaceAll("_"," ")}. Your device timezone is detected when available.</p>
      {calendar.total===0?<div className="v2-empty-state" role="status"><h3>{hasFilters?"No matching events":"No events on this date"}</h3><p>Confirmed schedules appear here as soon as they are available. Missing broadcaster information is never guessed.</p><Link href={hasFilters?buildCalendarHref(filters,{query:"",sport:"",competition:"",page:1}):buildCalendarHref(filters,{view:"all",page:1})}>{hasFilters?"Clear filters":"Browse all events"}</Link></div>:
      <div className="v2-event-groups">{Array.from(groupedEvents.entries()).map(([dateKey,events])=><section className="v2-event-group" key={dateKey}><h3>{formatCalendarDay(events[0].eventDate,filters.timeZone)}</h3><div className="v2-event-list">{events.map(event=>{const anchor=`event-${event.id}`;const href=eventHref(event,buildCalendarHref(filters,{},anchor));return <article className="v2-event-card" id={anchor} key={event.id}><div className="v2-event-time"><time dateTime={event.eventDate}>{formatCalendarTime(event.eventDate,filters.timeZone)}</time><span className={`v2-status v2-status-${event.statusLabel.toLowerCase().replaceAll(" ","-")}`}>{event.statusLabel}</span></div><div className="v2-event-main"><p className="v2-event-competition">{event.sportLabel} · {event.competition}</p><h4><Link prefetch={false} href={href}>{event.title}</Link></h4><p className="v2-event-stage">{eventStage(event)||"Event"}</p></div><Link prefetch={false} className="v2-broadcast-link" href={href}><span>{event.confirmedBroadcastCount} confirmed official {event.confirmedBroadcastCount===1?"listing":"listings"}</span><strong>Where to watch →</strong></Link></article>})}</div></section>)}</div>}
      {calendar.pageCount>1?<nav className="v2-pagination" aria-label="Event list pages">{calendar.page>1?<Link prefetch={false} href={buildCalendarHref(filters,{page:calendar.page-1},"calendar-results")}>← Previous</Link>:<span/>}<span>Page {calendar.page} of {calendar.pageCount}</span>{calendar.page<calendar.pageCount?<Link prefetch={false} href={buildCalendarHref(filters,{page:calendar.page+1},"calendar-results")}>Next →</Link>:<span/>}</nav>:null}
    </section>

    <section className="v2-discovery"><div><p className="v2-eyebrow">Explore</p><h2>Choose your sport</h2></div><div className="v2-discovery-grid"><Link href="/?view=all&sport=football"><strong>⚽ Football</strong><span>Champions League and more</span></Link><Link href="/?view=all&sport=formula-1"><strong>🏎 Formula 1</strong><span>Grand Prix & sessions</span></Link><Link href="/?view=all&sport=ufc"><strong>🥊 UFC</strong><span>Fight cards, prelims & main cards</span></Link><Link href="/?view=all"><strong>＋ More sports</strong><span>Architecture ready to expand</span></Link></div></section>
  </main>;
}
