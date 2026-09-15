import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Breadcrumbs from "@/components/Breadcrumbs";
import LocalTime from "@/components/LocalTime";
import { getAllEvents, type EventData } from "@/lib/events";

type PageProps = {
  params: Promise<{ grandPrix: string }>;
};

function grandPrixEvents(slug: string): EventData[] {
  return getAllEvents()
    .filter((event) => event.sport === "formula-1" && event.eventGroupSlug === slug)
    .sort((a, b) => new Date(a.eventDate).getTime() - new Date(b.eventDate).getTime());
}

function selectEdition(events: EventData[], now = new Date()): EventData[] {
  const editions = new Map<string, EventData[]>();
  for (const event of events) {
    const key = event.eventEditionKey ?? new Date(event.eventDate).getUTCFullYear().toString();
    const bucket = editions.get(key) ?? [];
    bucket.push(event);
    editions.set(key, bucket);
  }

  const sorted = Array.from(editions.entries())
    .map(([key, editionEvents]) => ({
      key,
      events: editionEvents.sort((a, b) => new Date(a.eventDate).getTime() - new Date(b.eventDate).getTime()),
    }))
    .sort((a, b) => {
      const aStart = new Date(a.events[0]?.eventDate ?? 0).getTime();
      const bStart = new Date(b.events[0]?.eventDate ?? 0).getTime();
      return aStart - bStart;
    });

  const live = sorted.find((edition) => edition.events.some((event) => event.status === "live"));
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
  const events = selectEdition(grandPrixEvents(grandPrix));
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

export default async function Formula1GrandPrixPage({ params }: PageProps) {
  const { grandPrix } = await params;
  const allEvents = grandPrixEvents(grandPrix);
  const events = selectEdition(allEvents);
  const first = events[0];
  if (!first) notFound();

  const race = events.find((event) => event.sessionType === "race");
  const editionLabel = first.eventEditionLabel;
  const availableEditions = Array.from(
    new Set(allEvents.map((event) => event.eventEditionLabel).filter(Boolean))
  );

  return (
    <main id="main-content" className="v2-calendar">
      <Breadcrumbs
        items={[
          { label: "Home", href: "/" },
          { label: "Formula 1", href: "/formula-1" },
          { label: first.eventGroupName ?? "Grand Prix" },
        ]}
      />

      <section className="v2-calendar-hero" aria-labelledby="gp-title">
        <p className="v2-eyebrow">Formula 1 Grand Prix weekend</p>
        <h1 id="gp-title">{first.eventGroupName}</h1>
        {editionLabel ? <p className="v2-signature">Edition {editionLabel}</p> : null}
        <p className="v2-hero-copy">
          {[first.country, first.venue].filter(Boolean).join(" · ")}. Sessions are listed separately because broadcasters can cover practice, sprint, qualifying and the race differently.
        </p>
        {race ? (
          <p className="v2-signature">
            Race: <LocalTime date={race.eventDate} />
          </p>
        ) : null}
        {availableEditions.length > 1 ? (
          <p className="v2-signature">Available editions: {availableEditions.join(" · ")}</p>
        ) : null}
      </section>

      <section className="v2-results" aria-labelledby="sessions-title">
        <div className="v2-results-heading">
          <div>
            <p className="v2-eyebrow">Weekend schedule</p>
            <h2 id="sessions-title">Sessions</h2>
          </div>
          <p>{events.length}</p>
        </div>

        <div className="v2-event-list">
          {events.map((event) => {
            const confirmedBroadcasts = event.broadcasts.filter(
              (broadcast) => broadcast.coverageStatus === "confirmed"
            );
            return (
              <article className="v2-event-card" id={event.slug} key={event.id}>
                <div className="v2-event-main">
                  <p className="v2-event-competition">{event.stage ?? event.title}</p>
                  <h3>{event.stage ?? event.title}</h3>
                  <p className="v2-event-stage"><LocalTime date={event.eventDate} /></p>
                </div>
                <div className="v2-broadcast-link">
                  <span>{confirmedBroadcasts.length} confirmed official listings</span>
                  <strong>{confirmedBroadcasts.length > 0 ? "Broadcast options available" : "Broadcast data pending"}</strong>
                </div>
              </article>
            );
          })}
        </div>
      </section>
    </main>
  );
}
