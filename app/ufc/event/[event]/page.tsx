import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Breadcrumbs from "@/components/Breadcrumbs";
import BroadcastOffers from "@/components/BroadcastOffers";
import LocalTime from "@/components/LocalTime";
import ParticipantSportVisual from "@/components/ParticipantSportVisual";
import { getAllEvents, type EventData } from "@/lib/events";
import { getPublicEventsSnapshot } from "@/lib/public-events";
import { getPublicUfcCard } from "@/lib/public-ufc-card";
import { evaluateSeoEligibility, indexableRobots } from "@/lib/seo-indexability";

type PageProps = {
  params: Promise<{ event: string }>;
  searchParams?: Promise<{ country?: string; access?: string }>;
};

function cardEvents(events: EventData[], slug: string) {
  return events
    .filter((event) => event.sport === "ufc" && event.eventGroupSlug === slug)
    .sort((a, b) => (a.sequenceNumber ?? 999) - (b.sequenceNumber ?? 999));
}

function schemaStatus(sessions: EventData[]): string {
  if (sessions.some((session) => session.status === "live")) return "https://schema.org/EventInProgress";
  if (sessions.length > 0 && sessions.every((session) => session.status === "finished")) return "https://schema.org/EventCompleted";
  return "https://schema.org/EventScheduled";
}

export async function generateStaticParams() {
  return Array.from(
    new Set(
      getAllEvents()
        .filter((event) => event.sport === "ufc" && event.eventGroupSlug)
        .map((event) => event.eventGroupSlug!)
    )
  ).map((event) => ({ event }));
}

export async function generateMetadata({ params, searchParams }: PageProps): Promise<Metadata> {
  const { event } = await params;
  const resolvedSearch = (await searchParams) ?? {};
  const snapshot = await getPublicEventsSnapshot({ sport: "ufc", limit: 500 });
  const sessions = cardEvents(snapshot.events, event);
  const first = sessions[0];
  if (!first) return { title: "UFC event not found | WatchTVSport", robots: { index: false, follow: false } };

  const verifiedBroadcastCount = sessions.reduce(
    (sum, session) => sum + session.broadcasts.filter((broadcast) => broadcast.coverageStatus === "confirmed").length,
    0,
  );
  const eligibility = evaluateSeoEligibility({
    kind: "event",
    canonicalPath: `/ufc/event/${event}`,
    usefulContentCount: [first.eventGroupName, first.eventDate, first.venue, first.country, sessions.length].filter(Boolean).length,
    verifiedBroadcastCount,
  });
  const hasFacet = Boolean(resolvedSearch.country || resolvedSearch.access);
  const robots = hasFacet ? { index: false, follow: true } : indexableRobots(eligibility.indexable);

  return {
    title: `${first.eventGroupName} – TV schedule & official broadcasters`,
    description: `Find official viewing options by country for ${first.eventGroupName}, including Early Prelims, Prelims and Main Card when available.`,
    alternates: { canonical: `/ufc/event/${event}` },
    robots,
    openGraph: {
      title: `${first.eventGroupName} – Where to watch`,
      description: `Official UFC broadcasters and card times for ${first.eventGroupName}.`,
      url: `/ufc/event/${event}`,
      type: "website",
    },
  };
}

export default async function UfcEventPage({ params, searchParams }: PageProps) {
  const { event } = await params;
  const resolved = (await searchParams) ?? {};
  const [snapshot, bouts] = await Promise.all([
    getPublicEventsSnapshot({ sport: "ufc", limit: 500 }),
    getPublicUfcCard(event),
  ]);
  const sessions = cardEvents(snapshot.events, event);
  const first = sessions[0];
  if (!first) notFound();
  const main = sessions.find((session) => session.sessionType === "main_card") ?? sessions.at(-1)!;
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "SportsEvent",
    name: first.eventGroupName,
    startDate: main.eventDate,
    eventStatus: schemaStatus(sessions),
    location: first.venue ? { "@type": "Place", name: first.venue, address: first.country } : undefined,
    url: `https://watchtvsport.com/ufc/event/${event}`,
  };

  return (
    <main id="main-content" className="v2-calendar">
      {snapshot.warning ? <p className="v2-data-warning" role="status">{snapshot.warning}</p> : null}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "UFC", href: "/ufc" }, { label: first.eventGroupName ?? "UFC event" }]} />

      <section className="v2-calendar-hero" aria-labelledby="ufc-event-title">
        <p className="v2-eyebrow">UFC fight card</p>
        <h1 id="ufc-event-title">{first.eventGroupName}</h1>
        <p className="v2-signature">{[first.venue, first.country].filter(Boolean).join(" · ")}</p>
        <p className="v2-hero-copy">
          Main Card: <LocalTime date={main.eventDate} />. Broadcast availability is tracked separately for Early Prelims, Prelims and Main Card because they can use different official services in the same country.
        </p>
      </section>

      {bouts.length > 0 ? (
        <section className="v2-results" aria-labelledby="confirmed-bouts-title">
          <div className="v2-results-heading">
            <div><p className="v2-eyebrow">Verified fight card</p><h2 id="confirmed-bouts-title">Confirmed bouts</h2></div>
            <p>{bouts.length}</p>
          </div>
          {bouts.map((bout) => (
            <article className="v2-versus-card" key={bout.id}>
              <div>
                <div>
                  <ParticipantSportVisual sport="ufc" label={bout.fighter1.name} countryCode={bout.fighter1.countryCode} visual={bout.fighter1.visual} size="md" />
                  <strong>{bout.fighter1.name}</strong>
                  <small>{bout.fighter1.countryCode ?? "Fighter"}</small>
                </div>
                <b>VS</b>
                <div>
                  <ParticipantSportVisual sport="ufc" label={bout.fighter2.name} countryCode={bout.fighter2.countryCode} visual={bout.fighter2.visual} size="md" />
                  <strong>{bout.fighter2.name}</strong>
                  <small>{bout.fighter2.countryCode ?? "Fighter"}</small>
                </div>
              </div>
              <p className="v2-timezone-note">{bout.titleBout ? "Title bout · " : ""}{bout.weightClass ?? "Confirmed bout"}</p>
            </article>
          ))}
        </section>
      ) : null}

      <section className="v2-results" aria-labelledby="card-schedule-title">
        <div className="v2-results-heading"><div><p className="v2-eyebrow">Fight night schedule</p><h2 id="card-schedule-title">Card sessions</h2></div><p>{sessions.length}</p></div>
        <div className="v2-event-list">
          {sessions.map((session) => {
            const confirmed = session.broadcasts.filter((broadcast) => broadcast.coverageStatus === "confirmed").length;
            return (
              <article className="v2-event-card" key={session.id}>
                <div className="v2-event-main"><p className="v2-event-competition">{session.stage}</p><h3>{session.stage}</h3><p className="v2-event-stage"><LocalTime date={session.eventDate} /></p></div>
                <div className="v2-broadcast-link"><span>{confirmed} confirmed official listings</span><strong>{confirmed ? "Viewing options available" : "Broadcast data pending"}</strong></div>
              </article>
            );
          })}
        </div>
      </section>

      <BroadcastOffers events={sessions} selectedCountry={resolved.country} selectedAccess={resolved.access} title="Where to watch this UFC event" />
    </main>
  );
}
