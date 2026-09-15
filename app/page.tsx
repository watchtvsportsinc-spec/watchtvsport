import type { Metadata } from "next";
import Link from "next/link";
import FavoriteButton from "@/components/FavoriteButton";
import SearchAutocomplete from "@/components/SearchAutocomplete";
import TimezoneSync from "@/components/TimezoneSync";
import type { EventData } from "@/lib/events";
import type { FavoriteCandidate } from "@/lib/favorites";
import { getPublicEventsSnapshot } from "@/lib/public-events";
import { buildSearchSuggestions } from "@/lib/search-suggestions";
import {
  buildCalendarHref, formatCalendarDay, formatCalendarTime, getCalendarFilterOptions,
  getCalendarPage, getDateKey, parseCalendarFilters, type CalendarEvent,
  type CalendarFilters, type CalendarView,
} from "@/lib/calendar";

type HomePageProps = { searchParams?: Promise<Record<string, string | string[] | undefined>> };

export async function generateMetadata({ searchParams }: HomePageProps): Promise<Metadata> {
  const params = (await searchParams) ?? {};
  const hasUtilityParams = Object.values(params).some((value) => Array.isArray(value) ? value.some(Boolean) : Boolean(value));
  return {
    title: "Where to watch sports – official TV & streaming guide",
    description: "Find official TV channels and streaming platforms for football, Formula 1, UFC and more, by event and country.",
    alternates: { canonical: "/" },
    robots: hasUtilityParams ? { index: false, follow: true } : { index: true, follow: true },
  };
}

const VIEW_OPTIONS: Array<{ value: CalendarView; label: string }> = [
  { value: "today", label: "Today" }, { value: "tomorrow", label: "Tomorrow" }, { value: "archive", label: "Archives" },
];
const SPORT_SHORTCUTS = [
  ["/", "All", ""], ["/football", "Football", "football"], ["/formula-1", "Formula 1", "formula-1"], ["/ufc", "UFC", "ufc"],
  ["/sports/basketball", "NBA", "basketball"], ["/sports/tennis", "Tennis", "tennis"], ["/sports/motogp", "MotoGP", "motogp"], ["/sports/hockey", "NHL", "hockey"],
] as const;
const COUNTRIES = [
  ["🇨🇦", "Canada"], ["🇫🇷", "France"], ["🇺🇸", "United States"], ["🇬🇧", "United Kingdom"],
  ["🇪🇸", "Spain"], ["🇩🇪", "Germany"], ["🇮🇹", "Italy"], ["🌐", "More countries"],
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
function sportName(sport: string) { return sport === "football" ? "Football" : sport === "formula-1" ? "Formula 1" : sport === "ufc" ? "UFC" : sport; }
function eventVisualClass(event: EventData) { return event.sport === "formula-1" ? "is-f1" : event.sport === "ufc" ? "is-ufc" : "is-football"; }
function confirmedOffers(event: EventData) { return event.broadcasts.filter((b) => b.coverageStatus === "confirmed").length; }

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
  const featuredEvents = dataSnapshot.events
    .filter((event) => new Date(event.eventDate).getTime() >= now.getTime())
    .sort((a, b) => new Date(a.eventDate).getTime() - new Date(b.eventDate).getTime())
    .slice(0, 4);

  return <main id="main-content" className="v2-calendar v2-home">
    <TimezoneSync />
    <a className="v2-skip-link" href="#calendar-results">Skip to events</a>
    {dataSnapshot.warning ? <p className="v2-data-warning" role="status">{dataSnapshot.warning}</p> : null}

    <section className="v2-calendar-hero v2-home-hero" aria-labelledby="calendar-title">
      <div className="v2-hero-content">
        <p className="v2-eyebrow">Official sports broadcast guide</p>
        <h1 id="calendar-title">Every sport.<br />Every screen.<br /><span>Anywhere in the world.</span></h1>
        <p className="v2-hero-copy">Discover where to watch your sports legally in your country. Simple, independent and built for fans.</p>
        <SearchAutocomplete defaultValue={filters.query} sport={filters.sport} competition={filters.competition} timeZone={filters.timeZone} suggestions={searchSuggestions} />
        <nav className="v2-sport-pills" aria-label="Sports shortcuts">
          {SPORT_SHORTCUTS.map(([href,label,value]) => <Link key={label} className={filters.sport === value ? "is-active" : undefined} href={href}>{label}</Link>)}
        </nav>
      </div>
      <div className="v2-hero-collage" aria-hidden="true">
        <div className="v2-hero-photo v2-photo-football"><span>Football</span></div>
        <div className="v2-hero-photo v2-photo-f1"><span>Formula 1</span></div>
        <div className="v2-hero-photo v2-photo-ufc"><span>UFC</span><em>Sport has no borders.</em></div>
      </div>
    </section>

    <section className="v2-trust-strip" aria-label="WatchTVSport principles">
      <div><b>◎</b><strong>By country</strong><span>Find official broadcasters near you</span></div>
      <div><b>▣</b><strong>Independent</strong><span>Clear access information</span></div>
      <div><b>ϟ</b><strong>Always current</strong><span>Verified data, TBC when unknown</span></div>
      <div><b>♡</b><strong>For every fan</strong><span>Sports from around the world</span></div>
    </section>

    <section className="v2-featured" aria-labelledby="featured-title">
      <div className="v2-section-heading"><div><p className="v2-eyebrow">Coming up</p><h2 id="featured-title">Next events</h2></div><Link href="/?view=all#calendar-results">View full calendar →</Link></div>
      <div className="v2-featured-grid">
        {featuredEvents.map((event) => <Link className={`v2-featured-card ${eventVisualClass(event)}`} href={event.detailPath} key={event.id}>
          <div className="v2-featured-image"><span>{sportName(event.sport)}</span></div>
          <div className="v2-featured-body">
            <p>{sportName(event.sport)} · {event.competition}</p>
            <h3>{event.eventGroupName ?? event.title}</h3>
            <time dateTime={event.eventDate}>{new Intl.DateTimeFormat("en", { weekday:"short", month:"short", day:"numeric", hour:"2-digit", minute:"2-digit" }).format(new Date(event.eventDate))}</time>
            <div><span>{confirmedOffers(event)} confirmed</span><strong>Where to watch →</strong></div>
          </div>
        </Link>)}
      </div>
    </section>

    <section id="sports" className="v2-visual-section" aria-labelledby="sports-title">
      <div className="v2-section-heading"><div><p className="v2-eyebrow">Explore</p><h2 id="sports-title">Choose your sport</h2></div><Link href="/?view=all">View all sports →</Link></div>
      <div className="v2-sport-gallery">
        <Link className="football" href="/football"><span>⚽</span><strong>Football</strong></Link>
        <Link className="f1" href="/formula-1"><span>F1</span><strong>Formula 1</strong></Link>
        <Link className="ufc" href="/ufc"><span>UFC</span><strong>UFC</strong></Link>
        <Link className="nba" href="/sports/basketball"><span>●</span><strong>NBA</strong></Link>
        <Link className="tennis" href="/sports/tennis"><span>●</span><strong>Tennis</strong></Link>
        <Link className="motogp" href="/sports/motogp"><span>GP</span><strong>MotoGP</strong></Link>
        <Link className="nhl" href="/sports/hockey"><span>◆</span><strong>NHL</strong></Link>
      </div>
    </section>

    <section id="countries" className="v2-visual-section" aria-labelledby="countries-title">
      <div className="v2-section-heading"><div><p className="v2-eyebrow">Worldwide</p><h2 id="countries-title">Browse by country</h2></div></div>
      <div className="v2-country-grid">{COUNTRIES.map(([flag,name]) => <div key={name}><span>{flag}</span><strong>{name}</strong></div>)}</div>
    </section>

    <section className="v2-promo-grid" aria-label="Featured sports">
      <Link className="v2-promo-card champions" href="/football"><span>Football</span><h2>Champions League</h2><p>The biggest clubs. Every official screen.</p><strong>View football →</strong></Link>
      <Link className="v2-promo-card formula" href="/formula-1"><span>Formula 1</span><h2>Every Grand Prix</h2><p>Practice, qualifying, sprints and races.</p><strong>View Grand Prix →</strong></Link>
      <Link className="v2-promo-card fight" href="/ufc"><span>UFC</span><h2>Every fight night</h2><p>Prelims, main cards and official broadcasters.</p><strong>View UFC →</strong></Link>
    </section>

    <section className="v2-calendar-controls" aria-label="Calendar filters">
      <nav className="v2-date-tabs" aria-label="Choose a period">{VIEW_OPTIONS.map(o => <Link key={o.value} href={buildCalendarHref(filters,{view:o.value,date:undefined,page:1})} className={filters.view===o.value?"is-active":undefined}>{o.label}</Link>)}</nav>
      <form className="v2-date-picker" action="/" method="get"><input type="hidden" name="view" value="date" />{hiddenInput("q",filters.query)}{hiddenInput("sport",filters.sport)}{hiddenInput("competition",filters.competition)}{filters.timeZone!=="UTC"?hiddenInput("tz",filters.timeZone):null}<label htmlFor="calendar-date">Choose date</label><div><input id="calendar-date" type="date" name="date" defaultValue={filters.date??today} required/><button type="submit">Go</button></div></form>
      <form className="v2-filter-form" action="/" method="get">{filters.view!=="today"?hiddenInput("view",filters.view):null}{filters.view==="date"?hiddenInput("date",filters.date):null}{hiddenInput("q",filters.query)}{filters.timeZone!=="UTC"?hiddenInput("tz",filters.timeZone):null}<label>Sport<select name="sport" defaultValue={filters.sport}><option value="">All sports</option>{options.sports.map(o=><option key={o.value} value={o.value}>{o.label}</option>)}</select></label><label>Competition<select name="competition" defaultValue={filters.competition}><option value="">All competitions</option>{options.competitions.map(o=><option key={o.value} value={o.value}>{o.label}</option>)}</select></label><button type="submit">Apply</button>{hasFilters?<Link className="v2-reset-link" href={buildCalendarHref(filters,{query:"",sport:"",competition:"",page:1})}>Clear</Link>:null}</form>
    </section>

    <section id="calendar-results" className="v2-results" aria-labelledby="results-title">
      <div className="v2-results-heading"><div><p className="v2-eyebrow">Full schedule</p><h2 id="results-title">{pageTitle(filters)}</h2></div><p>{calendar.total} {calendar.total===1?"event":"events"}</p></div>
      {competitionFavorite?<div className="v2-follow-row"><FavoriteButton favorite={competitionFavorite}/></div>:null}
      <p className="v2-timezone-note">Times shown in {filters.timeZone.replaceAll("_"," ")}. Your device timezone is detected when available.</p>
      {calendar.total===0?<div className="v2-empty-state" role="status"><h3>{hasFilters?"No matching events":"No events on this date"}</h3><p>Confirmed schedules appear here as soon as they are available. Missing broadcaster information is never guessed.</p><Link href={hasFilters?buildCalendarHref(filters,{query:"",sport:"",competition:"",page:1}):buildCalendarHref(filters,{view:"all",page:1})}>{hasFilters?"Clear filters":"Browse all events"}</Link></div>:
      <div className="v2-event-groups">{Array.from(groupedEvents.entries()).map(([dateKey,events])=><section className="v2-event-group" key={dateKey}><h3>{formatCalendarDay(events[0].eventDate,filters.timeZone)}</h3><div className="v2-event-list">{events.map(event=>{const anchor=`event-${event.id}`;const href=eventHref(event,buildCalendarHref(filters,{},anchor));return <article className="v2-event-card" id={anchor} key={event.id}><div className="v2-event-time"><time dateTime={event.eventDate}>{formatCalendarTime(event.eventDate,filters.timeZone)}</time><span className={`v2-status v2-status-${event.statusLabel.toLowerCase().replaceAll(" ","-")}`}>{event.statusLabel}</span></div><div className="v2-event-main"><p className="v2-event-competition">{event.sportLabel} · {event.competition}</p><h4><Link prefetch={false} href={href}>{event.title}</Link></h4><p className="v2-event-stage">{eventStage(event)||"Event"}</p></div><Link prefetch={false} className="v2-broadcast-link" href={href}><span>{event.confirmedBroadcastCount} confirmed official {event.confirmedBroadcastCount===1?"listing":"listings"}</span><strong>Where to watch →</strong></Link></article>})}</div></section>)}</div>}
      {calendar.pageCount>1?<nav className="v2-pagination" aria-label="Event list pages">{calendar.page>1?<Link prefetch={false} href={buildCalendarHref(filters,{page:calendar.page-1},"calendar-results")}>← Previous</Link>:<span/>}<span>Page {calendar.page} of {calendar.pageCount}</span>{calendar.page<calendar.pageCount?<Link prefetch={false} href={buildCalendarHref(filters,{page:calendar.page+1},"calendar-results")}>Next →</Link>:<span/>}</nav>:null}
    </section>

    <section className="v2-world-banner"><div><p>The world watches sport differently.</p><h2>We help you find the right screen.</h2></div><div className="v2-world-stats"><span><strong>200+</strong> territories ready</span><span><strong>Official</strong> broadcasters only</span><span><strong>Multi-sport</strong> by design</span><span><strong>Independent</strong> guide</span></div></section>
  </main>;
}
