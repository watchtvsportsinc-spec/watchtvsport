import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import Breadcrumbs from "@/components/Breadcrumbs";
import FavoriteButton from "@/components/FavoriteButton";
import LocalTime from "@/components/LocalTime";
import {
  clubSlug,
  getAllClubNames,
  getClubAliases,
  getClubNameBySlug,
} from "@/lib/club-aliases";
import type { EventData } from "@/lib/events";
import type { FavoriteCandidate } from "@/lib/favorites";
import { getPublicEventsSnapshot } from "@/lib/public-events";

type PageProps = { params: Promise<{ club: string }> };

function resolveClubName(events: EventData[], slug: string): string | null {
  for (const event of events) {
    if (event.sport !== "football") continue;
    for (const participant of [event.participant1, event.participant2]) {
      if (participant?.type === "club" && clubSlug(participant.name) === slug) {
        return participant.name;
      }
    }
  }
  return getClubNameBySlug(slug);
}

function clubEvents(events: EventData[], clubName: string): EventData[] {
  const target = clubSlug(clubName);
  return events
    .filter(
      (event) =>
        event.sport === "football" &&
        [event.participant1, event.participant2].some(
          (participant) =>
            participant?.type === "club" && clubSlug(participant.name) === target
        )
    )
    .sort((a, b) => new Date(a.eventDate).getTime() - new Date(b.eventDate).getTime());
}

function favoriteForClub(clubName: string): FavoriteCandidate {
  return {
    kind: "participant",
    entityId: `club:football:${clubSlug(clubName)}`,
    label: `${clubName} (Football)`,
  };
}

function competitionHref(event: EventData): string {
  return `/football/competition/${event.competitionSlug}`;
}

export async function generateStaticParams() {
  return getAllClubNames().map((name) => ({ club: clubSlug(name) }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { club } = await params;
  const snapshot = await getPublicEventsSnapshot();
  const clubName = resolveClubName(snapshot.events, club);
  if (!clubName) {
    return {
      title: "Club not found | WatchTVSport",
      robots: { index: false, follow: false },
    };
  }
  const aliases = getClubAliases(clubName);
  const aliasText = aliases.slice(0, 5).join(", ");
  return {
    title: `${clubName} TV schedule & official broadcasters | WatchTVSport`,
    description: `Find upcoming ${clubName} matches, official TV channels and streaming options${aliasText ? ` for searches including ${aliasText}` : ""}.`,
    keywords: [
      clubName,
      ...aliases,
      `${clubName} TV`,
      `${clubName} live stream`,
      `${clubName} schedule`,
    ],
    alternates: { canonical: `/football/club/${club}` },
  };
}

export default async function ClubPage({ params }: PageProps) {
  const { club } = await params;
  const snapshot = await getPublicEventsSnapshot();
  const clubName = resolveClubName(snapshot.events, club);
  if (!clubName) notFound();

  const aliases = getClubAliases(clubName);
  const events = clubEvents(snapshot.events, clubName);
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
    .slice(0, 8);
  const favorite = favoriteForClub(clubName);

  const teamJsonLd = {
    "@context": "https://schema.org",
    "@type": "SportsTeam",
    name: clubName,
    alternateName: aliases,
    sport: "Football",
    url: `https://watchtvsport.com/football/club/${club}`,
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
          { label: clubName },
        ]}
      />

      <section className="v2-calendar-hero" aria-labelledby="club-title">
        <p className="v2-eyebrow">Football club</p>
        <h1 id="club-title">{clubName}</h1>
        <p className="v2-hero-copy">
          Upcoming matches and verified official broadcasters for {clubName}.
        </p>
        <FavoriteButton favorite={favorite} />
        {aliases.length > 0 ? (
          <p className="v2-signature">Also known as: {aliases.join(" · ")}</p>
        ) : null}
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
            <p>WatchTVSport will show new fixtures here as soon as they are confirmed.</p>
          </div>
        ) : (
          <div className="v2-event-list">
            {upcoming.map((event) => (
              <article className="v2-event-card" key={event.id}>
                <div className="v2-event-main">
                  <p className="v2-event-competition">
                    <Link href={competitionHref(event)}>{event.competition}</Link>
                  </p>
                  <h3>{event.title}</h3>
                  <p className="v2-event-stage">
                    <LocalTime date={event.eventDate} />
                    {event.stage ? <> · {event.stage}</> : null}
                  </p>
                </div>
                <Link className="v2-broadcast-link" href={event.detailPath}>
                  <span>Match details</span>
                  <strong>View broadcasters →</strong>
                </Link>
              </article>
            ))}
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
                  <p className="v2-event-competition">
                    <Link href={competitionHref(event)}>{event.competition}</Link>
                  </p>
                  <h3>{event.title}</h3>
                  <p className="v2-event-stage">
                    <LocalTime date={event.eventDate} />
                  </p>
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
