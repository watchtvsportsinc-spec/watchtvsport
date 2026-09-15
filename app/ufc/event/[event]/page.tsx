import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Breadcrumbs from "@/components/Breadcrumbs";
import BroadcastOffers from "@/components/BroadcastOffers";
import LocalTime from "@/components/LocalTime";
import { getAllEvents, type EventData } from "@/lib/events";
import { getPublicEventsSnapshot } from "@/lib/public-events";

type PageProps = {
  params: Promise<{ event: string }>;
  searchParams?: Promise<{ country?: string }>;
};

function cardEvents(events: EventData[], slug: string): EventData[] {
  return events
    .filter((event) => event.sport === "ufc" && event.eventGroupSlug === slug)
    .sort((a, b) => (a.sequenceNumber ?? 999) - (b.sequenceNumber ?? 999));
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

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { event } = await params;
  const snapshot = await getPublicEventsSnapshot();
  const sessions = cardEvents(snapshot.events, event);
  const first = sessions[0];
  if (!first) {
    return {
      title: "UFC event not found | WatchTVSport",
      robots: { index: false, follow: false },
    };
  }

  return {
    title: `${first.eventGroupName} – TV schedule & official broadcasters | WatchTVSport`,
    description: `Find official viewing options by country for ${first.eventGroupName}, including Early Prelims, Prelims and Main Card when available.`,
    alternates: { canonical: `/ufc/event/${event}` },
    keywords: [
      first.eventGroupName ?? "UFC",
      "UFC",
      "MMA",
      "UFC live",
      "UFC TV",
      "UFC stream official",
    ],
  };
}

export default async function UfcEventPage({ params, searchParams }: PageProps) {
  const { event } = await params;
  const resolvedSearch = (await searchParams) ?? {};
  const snapshot = await getPublicEventsSnapshot();
  const sessions = cardEvents(snapshot.events, event);
  const first = sessions[0];
  if (!first) notFound();

  const main = sessions.find((session) => session.sessionType === "main_card") ?? sessions.at(-1)!;
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "SportsEvent",
    name: first.eventGroupName,
    startDate: main.eventDate,
    location: first.venue
      ? {
          "@type": "Place",
          name: first.venue,
          address: first.country,
        }
      : undefined,
    url: `https://watchtvsport.com/ufc/event/${event}`,
  };

  return (
    <main id="main-content" className="v2-calendar">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <Breadcrumbs
        items={[
          { label: "Home", href: "/" },
          { label: "UFC", href: "/ufc" },
          { label: first.eventGroupName ?? "UFC event" },
        ]}
      />

      <section className="v2-calendar-hero" aria-labelledby="ufc-event-title">
        <p className="v2-eyebrow">UFC fight card</p>
        <h1 id="ufc-event-title">{first.eventGroupName}</h1>
        <p className="v2-signature">
          {[first.venue, first.country].filter(Boolean).join(" · ")}
        </p>
        <p className="v2-hero-copy">
          Main Card: <LocalTime date={main.eventDate} />. Broadcast availability is tracked separately for each part of the card because Early Prelims, Prelims and the Main Card can use different services in the same country.
        </p>
      </section>

      <section className="v2-results" aria-labelledby="card-schedule-title">
        <div className="v2-results-heading">
          <div>
            <p className="v2-eyebrow">Fight night schedule</p>
            <h2 id="card-schedule-title">Card sessions</h2>
          </div>
          <p>{sessions.length}</p>
        </div>
        <div className="v2-event-list">
          {sessions.map((session) => {
            const confirmed = session.broadcasts.filter(
              (broadcast) => broadcast.coverageStatus === "confirmed"
            ).length;
            return (
              <article className="v2-event-card" key={session.id}>
                <div className="v2-event-main">
                  <p className="v2-event-competition">{session.stage}</p>
                  <h3>{session.stage}</h3>
                  <p className="v2-event-stage"><LocalTime date={session.eventDate} /></p>
                </div>
                <div className="v2-broadcast-link">
                  <span>{confirmed} confirmed official listings</span>
                  <strong>{confirmed ? "Viewing options available" : "Broadcast data pending"}</strong>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <BroadcastOffers
        events={sessions}
        selectedCountry={resolvedSearch.country}
        title="Where to watch this UFC event"
      />
    </main>
  );
}
