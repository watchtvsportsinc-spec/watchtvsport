import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import Breadcrumbs from "@/components/Breadcrumbs";
import BroadcastOffers from "@/components/BroadcastOffers";
import LocalTime from "@/components/LocalTime";
import { getAllEvents, type EventData } from "@/lib/events";
import { getPublicEventsSnapshot } from "@/lib/public-events";
import heroStyles from "../grand-prix-background.module.css";

const SITE_URL = "https://watchtvsport.com";

type PageProps = { params: Promise<{ grandPrix: string; year: string }>; searchParams?: Promise<{ country?: string; access?: string }> };

function editionEvents(events: EventData[], grandPrix: string, year: string) {
  return events
    .filter((event) => event.sport === "formula-1" && event.eventGroupSlug === grandPrix && String(new Date(event.eventDate).getUTCFullYear()) === year)
    .sort((a, b) => Date.parse(a.eventDate) - Date.parse(b.eventDate));
}

function schemaStatus(event: EventData) {
  if (event.status === "live") return "https://schema.org/EventInProgress";
  if (event.status === "finished" || Date.parse(event.eventDate) < Date.now()) return "https://schema.org/EventCompleted";
  return "https://schema.org/EventScheduled";
}

export function generateStaticParams() {
  const pairs = new Map<string, { grandPrix: string; year: string }>();
  for (const event of getAllEvents().filter((item) => item.sport === "formula-1" && item.eventGroupSlug)) {
    const year = String(new Date(event.eventDate).getUTCFullYear());
    pairs.set(`${event.eventGroupSlug}:${year}`, { grandPrix: event.eventGroupSlug!, year });
  }
  return Array.from(pairs.values());
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { grandPrix, year } = await params;
  const snapshot = await getPublicEventsSnapshot({ sport: "formula-1", limit: 500 });
  const events = editionEvents(snapshot.events, grandPrix, year);
  const first = events[0];
  if (!first) return { title: "Grand Prix edition not found | WatchTVSport", robots: { index: false, follow: false } };
  const name = `${first.eventGroupName ?? "Formula 1 Grand Prix"} ${year}`;
  return {
    title: `${name} – F1 session times & official broadcasters`,
    description: `Verified ${name} Formula 1 weekend schedule, session times and official TV or streaming broadcasters by country.`,
    alternates: { canonical: `/formula-1/grand-prix/${grandPrix}/${year}` },
    openGraph: { title: `${name} – Where to watch F1`, description: `Official session times and broadcaster information for ${name}.`, url: `/formula-1/grand-prix/${grandPrix}/${year}`, type: "website" },
  };
}

export default async function Formula1GrandPrixEditionPage({ params, searchParams }: PageProps) {
  const { grandPrix, year } = await params;
  if (!/^20\d{2}$/.test(year)) notFound();
  const selected = (await searchParams) ?? {};
  const snapshot = await getPublicEventsSnapshot({ sport: "formula-1", limit: 500 });
  const events = editionEvents(snapshot.events, grandPrix, year);
  const first = events[0];
  if (!first) notFound();
  const race = events.find((event) => event.sessionType === "race") ?? events.at(-1)!;
  const name = `${first.eventGroupName ?? "Formula 1 Grand Prix"} ${year}`;
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "SportsEvent",
    name,
    startDate: events[0].eventDate,
    endDate: race.eventDate,
    eventStatus: schemaStatus(race),
    sport: "Formula 1",
    url: `${SITE_URL}/formula-1/grand-prix/${grandPrix}/${year}`,
    location: first.venue || first.country ? { "@type": "Place", name: [first.venue, first.country].filter(Boolean).join(", ") } : undefined,
  };

  return <main id="main-content" className={`v2-calendar ${heroStyles.page}`}>
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
    <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Formula 1", href: "/formula-1" }, { label: first.eventGroupName ?? "Grand Prix", href: `/formula-1/grand-prix/${grandPrix}` }, { label: year }]} />
    <section className="v2-calendar-hero wts-standard-hero">
      <p className="v2-eyebrow">Formula 1 · dated edition</p>
      <h1>{name}</h1>
      <p className="v2-hero-copy">This page represents the concrete {year} edition and therefore carries event-specific dates and structured data.</p>
      <p className="v2-signature">Race: <LocalTime date={race.eventDate} /></p>
      <p><Link href={`/formula-1/grand-prix/${grandPrix}`}>← Permanent Grand Prix page</Link></p>
    </section>
    <section className="v2-results">
      <div className="v2-results-heading"><div><p className="v2-eyebrow">Weekend schedule</p><h2>Sessions</h2></div><p>{events.length}</p></div>
      <div className="v2-event-list">{events.map((event) => <article className="v2-event-card" key={event.id}><div className="v2-event-main"><p className="v2-event-competition">{event.sessionType ?? event.stage ?? "Session"}</p><h3>{event.title}</h3><p className="v2-event-stage"><LocalTime date={event.eventDate} /></p></div><div className="v2-broadcast-link"><span>{event.broadcasts.filter((item) => item.coverageStatus === "confirmed").length} confirmed official listings</span></div></article>)}</div>
    </section>
    <BroadcastOffers events={events} selectedCountry={selected.country} selectedAccess={selected.access} title={`Where to watch ${name}`} />
  </main>;
}
