import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Breadcrumbs from "@/components/Breadcrumbs";
import BroadcastOffers from "@/components/BroadcastOffers";
import LocalTime from "@/components/LocalTime";
import { getAllEvents, type EventData } from "@/lib/events";
import { getPublicEventsSnapshot } from "@/lib/public-events";
import {
  getFormula1SessionPlan2026,
  getFormula1Weekend2026,
} from "@/source/formula-1-2026-season";

type PageProps = {
  params: Promise<{ grandPrix: string }>;
  searchParams?: Promise<{ country?: string }>;
};

function grandPrixEvents(events: EventData[], slug: string): EventData[] {
  return events
    .filter(
      (event) => event.sport === "formula-1" && event.eventGroupSlug === slug
    )
    .sort((a, b) => new Date(a.eventDate).getTime() - new Date(b.eventDate).getTime());
}

function selectEdition(events: EventData[], now = new Date()): EventData[] {
  const editions = new Map<string, EventData[]>();
  for (const event of events) {
    const key =
      event.eventEditionKey ?? new Date(event.eventDate).getUTCFullYear().toString();
    const bucket = editions.get(key) ?? [];
    bucket.push(event);
    editions.set(key, bucket);
  }

  const sorted = Array.from(editions.entries())
    .map(([key, editionEvents]) => ({
      key,
      events: editionEvents.sort(
        (a, b) => new Date(a.eventDate).getTime() - new Date(b.eventDate).getTime()
      ),
    }))
    .sort((a, b) => {
      const aStart = new Date(a.events[0]?.eventDate ?? 0).getTime();
      const bStart = new Date(b.events[0]?.eventDate ?? 0).getTime();
      return aStart - bStart;
    });

  const live = sorted.find((edition) =>
    edition.events.some((event) => event.status === "live")
  );
  if (live) return live.events;

  const upcoming = sorted.find((edition) =>
    edition.events.some((event) => new Date(event.eventDate).getTime() >= now.getTime())
  );
  if (upcoming) return upcoming.events;

  return sorted.at(-1)?.events ?? [];
}

export async function generateStaticParams() {
  return Array.from(
    new Set(
      getAllEvents()
        .filter((event) => event.sport === "formula-1" && event.eventGroupSlug)
        .map((event) => event.eventGroupSlug!)
    )
  ).map((grandPrix) => ({ grandPrix }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { grandPrix } = await params;
  const snapshot = await getPublicEventsSnapshot();
  const events = selectEdition(grandPrixEvents(snapshot.events, grandPrix));
  const first = events[0];

  if (!first) {
    return {
      title: "Grand Prix not found | WatchTVSport",
      robots: { index: false, follow: false },
    };
  }

  const edition = first.eventEditionLabel ? ` ${first.eventEditionLabel}` : "";
  return {
    title: `${first.eventGroupName}${edition} TV schedule & official broadcasters | WatchTVSport`,
    description: `Find the complete ${first.eventGroupName}${edition} Formula 1 weekend schedule and official broadcast information.`,
    alternates: { canonical: `/formula-1/grand-prix/${grandPrix}` },
  };
}

export default async function Formula1GrandPrixPage({ params, searchParams }: PageProps) {
  const { grandPrix } = await params;
  const resolvedSearch = (await searchParams) ?? {};
  const snapshot = await getPublicEventsSnapshot();
  const allEvents = grandPrixEvents(snapshot.events, grandPrix);
  const events = selectEdition(allEvents);
  const first = events[0];
  const weekend = getFormula1Weekend2026(grandPrix);
  if (!first || !weekend) notFound();

  const race = events.find((event) => event.sessionType === "race");
  const editionLabel = first.eventEditionLabel ?? "2026";
  const availableEditions = Array.from(
    new Set(allEvents.map((event) => event.eventEditionLabel).filter(Boolean))
  );
  const sessionPlan = getFormula1SessionPlan2026(weekend);

  return (
    <main id="main-content" className="v2-calendar">
      <Breadcrumbs
        items={[
          { label: "Home", href: "/" },
          { label: "Formula 1", href: "/formula-1" },
          { label: first.eventGroupName ?? weekend.name },
        ]}
      />

      <section className="v2-calendar-hero" aria-labelledby="gp-title">
        <p className="v2-eyebrow">Formula 1 Grand Prix weekend</p>
        <h1 id="gp-title">{first.eventGroupName ?? weekend.name}</h1>
        <p className="v2-signature">Edition {editionLabel}</p>
        <p className="v2-hero-copy">
          {[first.country ?? weekend.country, first.venue ?? weekend.venue]
            .filter(Boolean)
            .join(" · ")}. Every official Formula 1 session is represented, even when
          broadcast information or an exact session time is still pending.
        </p>
        {race ? (
          <p className="v2-signature">
            Race: <LocalTime date={race.eventDate} />
          </p>
        ) : null}
        {availableEditions.length > 1 ? (
          <p className="v2-signature">
            Available editions: {availableEditions.join(" · ")}
          </p>
        ) : null}
      </section>

      <section className="v2-results" aria-labelledby="sessions-title">
        <div className="v2-results-heading">
          <div>
            <p className="v2-eyebrow">Weekend schedule</p>
            <h2 id="sessions-title">Sessions</h2>
          </div>
          <p>{sessionPlan.length}</p>
        </div>

        <div className="v2-event-list">
          {sessionPlan.map((session) => {
            const event = events.find(
              (candidate) => candidate.sequenceNumber === session.sequenceNumber
            );
            const confirmedBroadcasts =
              event?.broadcasts.filter(
                (broadcast) => broadcast.coverageStatus === "confirmed"
              ) ?? [];

            return (
              <article className="v2-event-card" id={session.slug} key={session.slug}>
                <div className="v2-event-main">
                  <p className="v2-event-competition">{session.label}</p>
                  <h3>{session.label}</h3>
                  <p className="v2-event-stage">
                    {event ? <LocalTime date={event.eventDate} /> : "Exact time TBC"}
                  </p>
                </div>
                <div className="v2-broadcast-link">
                  <span>{confirmedBroadcasts.length} confirmed official listings</span>
                  <strong>
                    {confirmedBroadcasts.length > 0
                      ? "Broadcast options available"
                      : "Broadcast data pending"}
                  </strong>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <BroadcastOffers
        events={events}
        selectedCountry={resolvedSearch.country}
        title="Where to watch this Grand Prix"
      />
    </main>
  );
}
