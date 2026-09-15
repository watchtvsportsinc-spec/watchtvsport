import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import Breadcrumbs from "@/components/Breadcrumbs";
import FavoriteButton from "@/components/FavoriteButton";
import LocalTime from "@/components/LocalTime";
import { clubSlug } from "@/lib/club-aliases";
import { getAllEvents, type EventData } from "@/lib/events";
import type { FavoriteCandidate } from "@/lib/favorites";
import { getPublicEventsSnapshot } from "@/lib/public-events";

type PageProps = { params: Promise<{ competition: string }> };

function footballCompetitionEvents(events: EventData[], slug: string): EventData[] {
  return events
    .filter((event) => event.sport === "football" && event.competitionSlug === slug)
    .sort((a, b) => new Date(a.eventDate).getTime() - new Date(b.eventDate).getTime());
}

function competitionFavorite(slug: string, label: string): FavoriteCandidate {
  return {
    kind: "competition",
    entityId: `football:${slug}`,
    label: `${label} (Football)`,
  };
}

function participantLink(name?: string) {
  return name ? `/football/club/${clubSlug(name)}` : null;
}

export async function generateStaticParams() {
  return Array.from(
    new Set(
      getAllEvents()
        .filter((event) => event.sport === "football")
        .map((event) => event.competitionSlug)
    )
  ).map((competition) => ({ competition }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { competition } = await params;
  const snapshot = await getPublicEventsSnapshot();
  const events = footballCompetitionEvents(snapshot.events, competition);
  const name = events[0]?.competition;
  if (!name) {
    return {
      title: "Competition not found | WatchTVSport",
      robots: { index: false, follow: false },
    };
  }
  return {
    title: `${name} TV schedule & official broadcasters | WatchTVSport`,
    description: `Find the ${name} schedule, participating teams, upcoming fixtures and verified official TV and streaming broadcasters.`,
    alternates: { canonical: `/football/competition/${competition}` },
    openGraph: {
      title: `${name} TV schedule & official broadcasters`,
      description: `Upcoming ${name} fixtures and official broadcast information.`,
      url: `/football/competition/${competition}`,
      type: "website",
    },
  };
}

export default async function CompetitionPage({ params }: PageProps) {
  const { competition } = await params;
  const snapshot = await getPublicEventsSnapshot();
  const events = footballCompetitionEvents(snapshot.events, competition);
  const name = events[0]?.competition;
  if (!name) notFound();

  const now = Date.now();
  const upcoming = events.filter(
    (event) =>
      event.status === "live" ||
      (event.status !== "finished" && new Date(event.eventDate).getTime() >= now)
  );
  const recent = events
    .filter(
      (event) =>
        event.status === "finished" || new Date(event.eventDate).getTime() < now
    )
    .reverse()
    .slice(0, 12);

  const clubs = Array.from(
    new Map(
      events.flatMap((event) =>
        [event.participant1, event.participant2]
          .filter((participant) => participant?.type === "club")
          .map((participant) => [clubSlug(participant!.name), participant!] as const)
      )
    ).values()
  ).sort((a, b) => a.name.localeCompare(b.name));

  const favorite = competitionFavorite(competition, name);
  const calendarHref = `/?view=all&sport=football&competition=${encodeURIComponent(competition)}`;

  return (
    <main id="main-content" className="v2-calendar">
      <Breadcrumbs
        items={[
          { label: "Home", href: "/" },
          { label: "Football", href: "/football" },
          { label: name },
        ]}
      />

      <section className="v2-calendar-hero" aria-labelledby="competition-title">
        <p className="v2-eyebrow">Football competition</p>
        <h1 id="competition-title">{name}</h1>
        <p className="v2-hero-copy">
          Upcoming fixtures, participating teams and verified official broadcasters for {name}.
        </p>
        <div
          style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", marginTop: "1rem" }}
        >
          <FavoriteButton favorite={favorite} />
          <Link href={calendarHref}>Open full calendar</Link>
        </div>
      </section>

      {clubs.length > 0 ? (
        <section className="v2-results" aria-labelledby="participants-title">
          <div className="v2-results-heading">
            <div>
              <p className="v2-eyebrow">Participants</p>
              <h2 id="participants-title">Teams</h2>
            </div>
            <p>{clubs.length} clubs</p>
          </div>
          <div className="v2-entity-grid">
            {clubs.map((club) => (
              <Link key={clubSlug(club.name)} href={`/football/club/${clubSlug(club.name)}`}>
                <strong>{club.name}</strong>
                <span>Club</span>
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      <section className="v2-results" aria-labelledby="upcoming-title">
        <div className="v2-results-heading">
          <div>
            <p className="v2-eyebrow">Schedule</p>
            <h2 id="upcoming-title">Upcoming events</h2>
          </div>
          <p>{upcoming.length} scheduled</p>
        </div>
        {upcoming.length === 0 ? (
          <div className="v2-empty-state" role="status">
            <h3>No upcoming event currently confirmed</h3>
            <p>New fixtures will appear here as soon as they are confirmed.</p>
          </div>
        ) : (
          <div className="v2-event-list">
            {upcoming.map((event) => {
              const homeHref = participantLink(event.participant1?.name);
              const awayHref = participantLink(event.participant2?.name);
              return (
                <article className="v2-event-card" key={event.id}>
                  <div className="v2-event-main">
                    <p className="v2-event-competition">{event.stage ?? name}</p>
                    <h3>
                      {homeHref && event.participant1 ? (
                        <Link href={homeHref}>{event.participant1.name}</Link>
                      ) : (
                        event.participant1?.name ?? event.title
                      )}
                      {event.participant2 ? (
                        <>
                          <span aria-hidden="true"> vs </span>
                          {awayHref ? (
                            <Link href={awayHref}>{event.participant2.name}</Link>
                          ) : (
                            event.participant2.name
                          )}
                        </>
                      ) : null}
                    </h3>
                    <p className="v2-event-stage">
                      <LocalTime date={event.eventDate} />
                    </p>
                  </div>
                  <Link className="v2-broadcast-link" href={event.detailPath}>
                    <span>Event details</span>
                    <strong>View broadcasters →</strong>
                  </Link>
                </article>
              );
            })}
          </div>
        )}
      </section>

      {recent.length > 0 ? (
        <section className="v2-results" aria-labelledby="recent-title">
          <div className="v2-results-heading">
            <div>
              <p className="v2-eyebrow">Archive</p>
              <h2 id="recent-title">Recent events</h2>
            </div>
          </div>
          <div className="v2-event-list">
            {recent.map((event) => (
              <article className="v2-event-card" key={event.id}>
                <div className="v2-event-main">
                  <p className="v2-event-competition">{event.stage ?? name}</p>
                  <h3>{event.title}</h3>
                  <p className="v2-event-stage">
                    <LocalTime date={event.eventDate} />
                  </p>
                </div>
                <Link className="v2-broadcast-link" href={event.detailPath}>
                  <span>Event archive</span>
                  <strong>Open event →</strong>
                </Link>
              </article>
            ))}
          </div>
        </section>
      ) : null}
    </main>
  );
}
