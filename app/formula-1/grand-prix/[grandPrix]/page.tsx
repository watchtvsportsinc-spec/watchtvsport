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
    .filter(
      (event) =>
        event.sport === "formula-1" && event.eventGroupSlug === slug
    )
    .sort((a, b) => new Date(a.eventDate).getTime() - new Date(b.eventDate).getTime());
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
  const events = grandPrixEvents(grandPrix);
  const first = events[0];

  if (!first) {
    return {
      title: "Grand Prix not found | WatchTVSport",
      robots: { index: false, follow: false },
    };
  }

  return {
    title: `${first.eventGroupName} TV schedule & official broadcasters | WatchTVSport`,
    description: `Find the complete ${first.eventGroupName} Formula 1 weekend schedule and official broadcast information.`,
    alternates: { canonical: `/formula-1/grand-prix/${grandPrix}` },
  };
}

export default async function Formula1GrandPrixPage({ params }: PageProps) {
  const { grandPrix } = await params;
  const events = grandPrixEvents(grandPrix);
  const first = events[0];
  if (!first) notFound();

  const race = events.find((event) => event.sessionType === "race");

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
        <p className="v2-hero-copy">
          {[first.country, first.venue].filter(Boolean).join(" · ")}. Sessions are listed separately because broadcasters can cover practice, sprint, qualifying and the race differently.
        </p>
        {race ? (
          <p className="v2-signature">
            Race: <LocalTime date={race.eventDate} />
          </p>
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
