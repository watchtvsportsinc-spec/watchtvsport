import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import Breadcrumbs from "@/components/Breadcrumbs";
import FavoriteButton from "@/components/FavoriteButton";
import {
  clubSlug,
  getClubAliases,
  getFixtureSeoAliases,
} from "@/lib/club-aliases";
import { getAllEvents, getEventByDetailPath, type Participant } from "@/lib/events";
import type { FavoriteCandidate } from "@/lib/favorites";

type PageProps = {
  params: Promise<{ fixture: string }>;
  searchParams?: Promise<{ returnTo?: string }>;
};

function safeReturnTo(value?: string): string {
  if (!value || value.length > 1500 || !value.startsWith("/") || value.startsWith("//")) {
    return "/";
  }
  try {
    const parsed = new URL(value, "https://watchtvsport.com");
    if (parsed.origin !== "https://watchtvsport.com") return "/";
    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return "/";
  }
}

function participantFavorite(participant?: Participant): FavoriteCandidate | null {
  if (!participant) return null;
  return {
    kind: "participant",
    entityId: participant.id,
    label: `${participant.name} (Football)`,
  };
}

function formatDateTime(value: string): string {
  return new Intl.DateTimeFormat("en", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "UTC",
    timeZoneName: "short",
  }).format(new Date(value));
}

function eventPath(fixture: string): string {
  return `/football/champions-league/${fixture}`;
}

export async function generateStaticParams() {
  return getAllEvents()
    .filter((event) => event.detailPath.startsWith("/football/champions-league/"))
    .map((event) => ({ fixture: event.detailPath.split("/").at(-1) ?? "" }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { fixture } = await params;
  const event = getEventByDetailPath(eventPath(fixture));
  if (!event) {
    return {
      title: "Event not found | WatchTVSport",
      robots: { index: false, follow: false },
    };
  }

  const aliases = getFixtureSeoAliases(event.participant1?.name, event.participant2?.name);
  return {
    title: `${event.title} – Official broadcasters | WatchTVSport`,
    description: `Find official TV channels and streaming platforms for ${event.title} in the UEFA Champions League.`,
    keywords: aliases,
    alternates: { canonical: event.detailPath },
    openGraph: {
      title: `${event.title} – Official broadcasters`,
      description: `Official TV and streaming information for ${event.title}.`,
      url: event.detailPath,
      type: "website",
    },
  };
}

export default async function ChampionsLeagueEventPage({ params, searchParams }: PageProps) {
  const { fixture } = await params;
  const event = getEventByDetailPath(eventPath(fixture));
  if (!event) notFound();

  const resolvedSearch = (await searchParams) ?? {};
  const returnTo = safeReturnTo(resolvedSearch.returnTo);
  const homeFavorite = participantFavorite(event.participant1);
  const awayFavorite = participantFavorite(event.participant2);
  const competitionFavorite: FavoriteCandidate = {
    kind: "competition",
    entityId: `${event.sport}:${event.competitionSlug}`,
    label: `${event.competition} (Football)`,
  };
  const competitionHref = `/football/competition/${event.competitionSlug}`;
  const confirmedBroadcasts = event.broadcasts.filter(
    (broadcast) => broadcast.coverageStatus === "confirmed"
  );
  const homeAliases = event.participant1 ? getClubAliases(event.participant1.name) : [];
  const awayAliases = event.participant2 ? getClubAliases(event.participant2.name) : [];

  const sportsEventJsonLd = {
    "@context": "https://schema.org",
    "@type": "SportsEvent",
    name: event.title,
    startDate: event.eventDate,
    eventStatus:
      event.status === "finished"
        ? "https://schema.org/EventCompleted"
        : event.status === "live"
          ? "https://schema.org/EventInProgress"
          : "https://schema.org/EventScheduled",
    url: `https://watchtvsport.com${event.detailPath}`,
    competitor: [
      event.participant1
        ? {
            "@type": "SportsTeam",
            name: event.participant1.name,
            url: `https://watchtvsport.com/football/club/${clubSlug(event.participant1.name)}`,
            ...(homeAliases.length ? { alternateName: homeAliases } : {}),
          }
        : null,
      event.participant2
        ? {
            "@type": "SportsTeam",
            name: event.participant2.name,
            url: `https://watchtvsport.com/football/club/${clubSlug(event.participant2.name)}`,
            ...(awayAliases.length ? { alternateName: awayAliases } : {}),
          }
        : null,
    ].filter(Boolean),
  };

  return (
    <main id="main-content" className="v2-calendar">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(sportsEventJsonLd) }}
      />
      <Breadcrumbs
        items={[
          { label: "Home", href: "/" },
          { label: "Football", href: "/football" },
          { label: event.competition, href: competitionHref },
          { label: event.title },
        ]}
      />

      <section className="v2-calendar-hero" aria-labelledby="event-title">
        <p className="v2-eyebrow"><Link href={competitionHref}>{event.competition}</Link></p>
        <h1 id="event-title">{event.title}</h1>
        <p className="v2-signature">{event.stage}</p>
        <p className="v2-hero-copy">
          {formatDateTime(event.eventDate)}. Times will be localized from the calendar view.
        </p>

        <div aria-label="Teams" style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", marginTop: "1rem" }}>
          {event.participant1 ? (
            <Link href={`/football/club/${clubSlug(event.participant1.name)}`}>
              {event.participant1.name} club page
            </Link>
          ) : null}
          {event.participant2 ? (
            <Link href={`/football/club/${clubSlug(event.participant2.name)}`}>
              {event.participant2.name} club page
            </Link>
          ) : null}
        </div>

        <div aria-label="Follow teams and competition" style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", marginTop: "1rem" }}>
          {homeFavorite ? <FavoriteButton favorite={homeFavorite} /> : null}
          {awayFavorite ? <FavoriteButton favorite={awayFavorite} /> : null}
          <FavoriteButton favorite={competitionFavorite} />
        </div>
      </section>

      <section className="v2-results" aria-labelledby="broadcasts-title">
        <div className="v2-results-heading">
          <div>
            <p className="v2-eyebrow">Official viewing options</p>
            <h2 id="broadcasts-title">Broadcasters</h2>
          </div>
          <p>{confirmedBroadcasts.length} confirmed</p>
        </div>

        {confirmedBroadcasts.length === 0 ? (
          <div className="v2-empty-state" role="status">
            <h3>Broadcast information pending</h3>
            <p>
              This fixture is confirmed, but WatchTVSport has not yet verified an official broadcaster for this event. No viewing option will be shown until it is confirmed.
            </p>
          </div>
        ) : (
          <div className="v2-event-list">
            {confirmedBroadcasts.map((broadcast) => (
              <article className="v2-event-card" key={`${broadcast.countryCode}-${broadcast.broadcaster}-${broadcast.url}`}>
                <div className="v2-event-main">
                  <p className="v2-event-competition">{broadcast.countryName}</p>
                  <h3>{broadcast.broadcaster}</h3>
                  <p className="v2-event-stage">{broadcast.access} · {broadcast.broadcastType ?? "live"}</p>
                </div>
                <a
                  className="v2-broadcast-link"
                  href={broadcast.affiliateUrl ?? broadcast.url}
                  rel="noopener noreferrer sponsored"
                  target="_blank"
                >
                  <span>Official broadcaster</span>
                  <strong>Open official service →</strong>
                </a>
              </article>
            ))}
          </div>
        )}

        <p style={{ marginTop: "1rem" }}>
          <Link href={returnTo}>← Back to calendar</Link>
        </p>
      </section>
    </main>
  );
}
