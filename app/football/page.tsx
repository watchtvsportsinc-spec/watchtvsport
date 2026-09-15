import type { Metadata } from "next";
import Link from "next/link";
import Breadcrumbs from "@/components/Breadcrumbs";
import EntityVisual from "@/components/EntityVisual";
import LocalTime from "@/components/LocalTime";
import { clubSlug } from "@/lib/club-aliases";
import { entitySlug, getFootballNations } from "@/lib/entity-pages";
import { getAllEvents } from "@/lib/events";

export const metadata: Metadata = {
  title: "Football TV schedule & official broadcasters | WatchTVSport",
  description:
    "Browse football competitions, clubs, national teams and upcoming matches with verified official broadcasters.",
  alternates: { canonical: "/football" },
};

export default function FootballPage() {
  const events = getAllEvents().filter((event) => event.sport === "football");
  const now = Date.now();
  const upcoming = events
    .filter(
      (event) =>
        event.status === "live" ||
        (event.status !== "finished" && new Date(event.eventDate).getTime() >= now)
    )
    .sort((a, b) => new Date(a.eventDate).getTime() - new Date(b.eventDate).getTime())
    .slice(0, 18);

  const competitions = Array.from(
    new Map(
      events.map((event) => [
        event.competitionSlug,
        { slug: event.competitionSlug, name: event.competition, logoUrl: event.competitionLogoUrl },
      ])
    ).values()
  ).sort((a, b) => a.name.localeCompare(b.name));

  const clubs = Array.from(
    new Map(
      events.flatMap((event) =>
        [event.participant1, event.participant2]
          .filter((participant) => participant?.type === "club")
          .map((participant) => [participant!.name, participant!] as const)
      )
    ).values()
  ).sort((a, b) => a.name.localeCompare(b.name));

  const nations = getFootballNations(events);

  return (
    <main id="main-content" className="v2-calendar">
      <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Football" }]} />

      <section className="v2-calendar-hero" aria-labelledby="football-title">
        <p className="v2-eyebrow">Sport</p>
        <h1 id="football-title">Football</h1>
        <p className="v2-hero-copy">
          Explore football competitions, clubs, national teams and upcoming events with official broadcast information.
        </p>
      </section>

      <section className="v2-results" aria-labelledby="competitions-title">
        <div className="v2-results-heading">
          <div>
            <p className="v2-eyebrow">Browse</p>
            <h2 id="competitions-title">Competitions</h2>
          </div>
          <p>{competitions.length}</p>
        </div>
        <div className="v2-entity-grid">
          {competitions.map((competition) => (
            <Link key={competition.slug} href={`/football/competition/${competition.slug}`}>
              <span style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <EntityVisual entityId={`competition:football:${competition.slug}`} label={competition.name} size="sm" imageUrl={competition.logoUrl} imageAlt={`${competition.name} logo`} />
                <strong>{competition.name}</strong>
              </span>
              <span>Competition</span>
            </Link>
          ))}
        </div>
      </section>

      {clubs.length > 0 ? (
        <section className="v2-results" aria-labelledby="clubs-title">
          <div className="v2-results-heading">
            <div>
              <p className="v2-eyebrow">Teams</p>
              <h2 id="clubs-title">Clubs</h2>
            </div>
            <p>{clubs.length}</p>
          </div>
          <div className="v2-entity-grid">
            {clubs.map((club) => (
              <Link key={club.id} href={`/football/club/${clubSlug(club.name)}`}>
                <span style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <EntityVisual entityId={club.id} label={club.name} size="sm" imageUrl={club.logoUrl} imageAlt={`${club.name} logo`} />
                  <strong>{club.name}</strong>
                </span>
                <span>Club</span>
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      {nations.length > 0 ? (
        <section className="v2-results" aria-labelledby="nations-title">
          <div className="v2-results-heading">
            <div>
              <p className="v2-eyebrow">Teams</p>
              <h2 id="nations-title">National teams</h2>
            </div>
            <p>{nations.length}</p>
          </div>
          <div className="v2-entity-grid">
            {nations.map((nation) => (
              <Link key={nation.id} href={`/football/nation/${entitySlug(nation.name)}`}>
                <span style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <EntityVisual entityId={nation.id} label={nation.name} size="sm" imageUrl={nation.logoUrl} imageAlt={`${nation.name} logo`} />
                  <strong>{nation.name}</strong>
                </span>
                <span>Nation</span>
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      <section className="v2-results" aria-labelledby="upcoming-title">
        <div className="v2-results-heading">
          <div>
            <p className="v2-eyebrow">Next up</p>
            <h2 id="upcoming-title">Upcoming football events</h2>
          </div>
        </div>
        <div className="v2-event-list">
          {upcoming.map((event) => (
            <article className="v2-event-card" key={event.id}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }} aria-hidden="true">
                {event.participant1 ? <EntityVisual entityId={event.participant1.id} label={event.participant1.name} size="sm" imageUrl={event.participant1.logoUrl} imageAlt="" /> : null}
                {event.participant2 ? <EntityVisual entityId={event.participant2.id} label={event.participant2.name} size="sm" imageUrl={event.participant2.logoUrl} imageAlt="" /> : null}
              </div>
              <div className="v2-event-main">
                <p className="v2-event-competition">{event.competition}</p>
                <h3>{event.title}</h3>
                <p className="v2-event-stage"><LocalTime date={event.eventDate} /></p>
              </div>
              <Link className="v2-broadcast-link" href={event.detailPath}>
                <span>Event details</span>
                <strong>View broadcasters →</strong>
              </Link>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
