import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import Breadcrumbs from "@/components/Breadcrumbs";
import FavoriteButton from "@/components/FavoriteButton";
import { competitionPath, entitySlug, getFootballNationBySlug, getFootballNations } from "@/lib/entity-pages";
import { getAllEvents, type EventData } from "@/lib/events";
import type { FavoriteCandidate } from "@/lib/favorites";

type PageProps = {
  params: Promise<{ nation: string }>;
};

function nationEvents(entityId: string): EventData[] {
  return getAllEvents()
    .filter(
      (event) =>
        event.sport === "football" &&
        (event.participant1?.id === entityId || event.participant2?.id === entityId)
    )
    .sort((a, b) => new Date(a.eventDate).getTime() - new Date(b.eventDate).getTime());
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

export async function generateStaticParams() {
  return getFootballNations(getAllEvents()).map((nation) => ({ nation: entitySlug(nation.name) }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { nation } = await params;
  const participant = getFootballNationBySlug(getAllEvents(), nation);

  if (!participant) {
    return {
      title: "National team not found | WatchTVSport",
      robots: { index: false, follow: false },
    };
  }

  return {
    title: `${participant.name} football TV schedule & official broadcasters | WatchTVSport`,
    description: `Find upcoming ${participant.name} football matches and verified official TV and streaming broadcasters.`,
    keywords: [
      participant.name,
      participant.shortName ?? "",
      `${participant.name} football`,
      `${participant.name} TV`,
      `${participant.name} schedule`,
    ].filter(Boolean),
    alternates: { canonical: `/football/nation/${nation}` },
  };
}

export default async function NationPage({ params }: PageProps) {
  const { nation } = await params;
  const participant = getFootballNationBySlug(getAllEvents(), nation);
  if (!participant) notFound();

  const events = nationEvents(participant.id);
  const now = Date.now();
  const upcoming = events.filter(
    (event) =>
      event.status === "live" ||
      (event.status !== "finished" && new Date(event.eventDate).getTime() >= now)
  );
  const recent = events
    .filter(
      (event) => event.status === "finished" || new Date(event.eventDate).getTime() < now
    )
    .reverse()
    .slice(0, 8);

  const favorite: FavoriteCandidate = {
    kind: "participant",
    entityId: participant.id,
    label: `${participant.name} (Football)`,
  };

  const teamJsonLd = {
    "@context": "https://schema.org",
    "@type": "SportsTeam",
    name: participant.name,
    sport: "Football",
    url: `https://watchtvsport.com/football/nation/${nation}`,
  };

  return (
    <main id="main-content" className="v2-calendar">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(teamJsonLd) }}
      />
      <Breadcrumbs
        items={[
          { label: "Home", href: "/" },
          { label: "Football", href: "/football" },
          { label: participant.name },
        ]}
      />

      <section className="v2-calendar-hero" aria-labelledby="nation-title">
        <p className="v2-eyebrow">National football team</p>
        <h1 id="nation-title">{participant.name}</h1>
        <p className="v2-hero-copy">
          Upcoming matches and verified official broadcasters for {participant.name}.
        </p>
        <FavoriteButton favorite={favorite} />
      </section>

      <section className="v2-results" aria-labelledby="upcoming-title">
        <div className="v2-results-heading">
          <div>
            <p className="v2-eyebrow">Schedule</p>
            <h2 id="upcoming-title">Upcoming matches</h2>
          </div>
          <p>{upcoming.length} scheduled</p>
        </div>

        {upcoming.length === 0 ? (
          <div className="v2-empty-state" role="status">
            <h3>No upcoming match currently confirmed</h3>
            <p>New fixtures will appear here as soon as they are confirmed.</p>
          </div>
        ) : (
          <div className="v2-event-list">
            {upcoming.map((event) => {
              const competitionHref = competitionPath(event);
              return (
                <article className="v2-event-card" key={event.id}>
                  <div className="v2-event-main">
                    <p className="v2-event-competition">
                      {competitionHref ? <Link href={competitionHref}>{event.competition}</Link> : event.competition}
                    </p>
                    <h3>{event.title}</h3>
                    <p className="v2-event-stage">
                      {formatEventDate(event.eventDate)} · {event.stage ?? "Scheduled"}
                    </p>
                  </div>
                  <Link className="v2-broadcast-link" href={event.detailPath}>
                    <span>Match details</span>
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
              <h2 id="recent-title">Recent matches</h2>
            </div>
          </div>
          <div className="v2-event-list">
            {recent.map((event) => (
              <article className="v2-event-card" key={event.id}>
                <div className="v2-event-main">
                  <p className="v2-event-competition">{event.competition}</p>
                  <h3>{event.title}</h3>
                  <p className="v2-event-stage">{formatEventDate(event.eventDate)}</p>
                </div>
                <Link className="v2-broadcast-link" href={event.detailPath}>
                  <span>Match archive</span>
                  <strong>Open match →</strong>
                </Link>
              </article>
            ))}
          </div>
        </section>
      ) : null}
    </main>
  );
}
