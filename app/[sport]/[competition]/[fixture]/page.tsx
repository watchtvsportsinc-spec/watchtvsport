import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import FavoriteButton from "@/components/FavoriteButton";
import { getAllEvents, getEventByDetailPath } from "@/lib/events";
import type { FavoriteCandidate } from "@/lib/favorites";

type PageProps = {
  params: Promise<{
    sport: string;
    competition: string;
    fixture: string;
  }>;
  searchParams?: Promise<{
    returnTo?: string;
  }>;
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

function eventFavorite(event: ReturnType<typeof getEventByDetailPath>): FavoriteCandidate | null {
  if (!event) return null;
  return {
    kind: "event",
    entityId: event.id,
    label: event.title,
    event: {
      detailPath: event.detailPath,
      eventDate: event.eventDate,
      sport: event.sport,
      competition: event.competition,
      participantNames: [event.participant1?.name, event.participant2?.name].filter(
        (name): name is string => Boolean(name)
      ),
    },
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

function resolveEventPath(params: Awaited<PageProps["params"]>): string {
  return `/${params.sport}/${params.competition}/${params.fixture}`;
}

export async function generateStaticParams() {
  return getAllEvents()
    .filter((event) => event.detailPath.startsWith("/football/champions-league/"))
    .map((event) => {
      const [, sport, competition, fixture] = event.detailPath.split("/");
      return { sport, competition, fixture };
    });
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const resolved = await params;
  const event = getEventByDetailPath(resolveEventPath(resolved));

  if (!event) {
    return {
      title: "Event not found | WatchTVSport",
      robots: { index: false, follow: false },
    };
  }

  return {
    title: `${event.title} – Official broadcasters | WatchTVSport`,
    description: `Find official TV channels and streaming platforms for ${event.title}.`,
    alternates: { canonical: event.detailPath },
  };
}

export default async function GenericEventPage({ params, searchParams }: PageProps) {
  const resolved = await params;
  const event = getEventByDetailPath(resolveEventPath(resolved));
  if (!event) notFound();

  const resolvedSearch = (await searchParams) ?? {};
  const returnTo = safeReturnTo(resolvedSearch.returnTo);
  const favorite = eventFavorite(event);
  const confirmedBroadcasts = event.broadcasts.filter(
    (broadcast) => broadcast.coverageStatus === "confirmed"
  );

  return (
    <main id="main-content" className="v2-calendar">
      <section className="v2-calendar-hero" aria-labelledby="event-title">
        <p className="v2-eyebrow">{event.competition}</p>
        <h1 id="event-title">{event.title}</h1>
        <p className="v2-signature">{event.stage}</p>
        <p className="v2-hero-copy">
          {formatDateTime(event.eventDate)}. Times will be localized from the calendar view.
        </p>
        {favorite ? <FavoriteButton favorite={favorite} /> : null}
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
              This fixture is confirmed, but WatchTVSport has not yet verified an official
              broadcaster for this event. No viewing option will be shown until it is confirmed.
            </p>
          </div>
        ) : (
          <div className="v2-event-list">
            {confirmedBroadcasts.map((broadcast) => (
              <article
                className="v2-event-card"
                key={`${broadcast.countryCode}-${broadcast.broadcaster}-${broadcast.url}`}
              >
                <div className="v2-event-main">
                  <p className="v2-event-competition">{broadcast.countryName}</p>
                  <h3>{broadcast.broadcaster}</h3>
                  <p className="v2-event-stage">
                    {broadcast.access} · {broadcast.broadcastType ?? "live"}
                  </p>
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
