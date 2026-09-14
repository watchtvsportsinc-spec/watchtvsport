import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import FavoriteButton from "@/components/FavoriteButton";
import { clubSlug } from "@/lib/club-aliases";
import { getAllEvents, type EventData } from "@/lib/events";
import type { FavoriteCandidate } from "@/lib/favorites";

type PageProps = {
  params: Promise<{ competition: string }>;
};

function footballCompetitionEvents(slug: string): EventData[] {
  return getAllEvents()
    .filter(
      (event) => event.sport === "football" && event.competitionSlug === slug
    )
    .sort(
      (a, b) =>
        new Date(a.eventDate).getTime() - new Date(b.eventDate).getTime()
    );
}

function competitionName(slug: string): string | null {
  return footballCompetitionEvents(slug)[0]?.competition ?? null;
}

function competitionFavorite(slug: string, label: string): FavoriteCandidate {
  return {
    kind: "competition",
    entityId: `football:${slug}`,
    label: `${label} (Football)`,
  };
}

function formatEventDate(value: string): string {
  return new Intl.DateTimeFormat("en", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "UTC",
    timeZoneName: "short",
  }).format(new Date(value));
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
  const name = competitionName(competition);

  if (!name) {
    return {
      title: "Competition not found | WatchTVSport",
      robots: { index: false, follow: false },
    };
  }

  return {
    title: `${name} TV schedule & official broadcasters | WatchTVSport`,
    description: `Find the ${name} schedule, upcoming fixtures and verified official TV and streaming broadcasters.`,
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
  const events = footballCompetitionEvents(competition);
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

  const favorite = competitionFavorite(competition, name);
  const calendarHref = `/?view=all&sport=football&competition=${encodeURIComponent(competition)}`;

  return (
    <main id="main-content" className="v2-calendar">
      <section className="v2-calendar-hero" aria-labelledby="competition-title">
        <p className="v2-eyebrow">Football competition</p>
        <h1 id="competition-title">{name}</h1>
        <p className="v2-hero-copy">
          Upcoming fixtures and verified official broadcasters for {name}.
        </p>
        <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", marginTop: "1rem" }}>
          <FavoriteButton favorite={favorite} />
          <Link href={calendarHref}>Open full calendar</Link>
        </div>
      </section>

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
                    <p className="v2-event-stage">{formatEventDate(event.eventDate)}</p>
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
            {recent.map((event) => {
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
                    <p className="v2-event-stage">{formatEventDate(event.eventDate)}</p>
                  </div>
                  <Link className="v2-broadcast-link" href={event.detailPath}>
                    <span>Event archive</span>
                    <strong>Open event →</strong>
                  </Link>
                </article>
              );
            })}
          </div>
        </section>
      ) : null}
    </main>
  );
}
