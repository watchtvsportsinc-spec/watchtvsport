import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Breadcrumbs from "@/components/Breadcrumbs";
import BroadcastOffers from "@/components/BroadcastOffers";
import EventSessionSchedule, {
  type EventSessionScheduleItem,
} from "@/components/EventSessionSchedule";
import FavoriteButton from "@/components/FavoriteButton";
import LocalTime from "@/components/LocalTime";
import { getAllEvents, type EventData } from "@/lib/events";
import { getPublicCompetitionBroadcastRights } from "@/lib/public-broadcast-rights";
import { getPublicEventsSnapshot } from "@/lib/public-events";
import { getPublicUfcCard } from "@/lib/public-ufc-card";
import {
  evaluateSeoEligibility,
  indexableRobots,
} from "@/lib/seo-indexability";

type PageProps = {
  params: Promise<{ event: string }>;
  searchParams?: Promise<{ country?: string; access?: string }>;
};

function cardEvents(events: EventData[], slug: string) {
  return events
    .filter(
      (event) => event.sport === "ufc" && event.eventGroupSlug === slug
    )
    .sort((a, b) => (a.sequenceNumber ?? 999) - (b.sequenceNumber ?? 999));
}

function countryFlag(code?: string): string {
  if (!code || !/^[A-Za-z]{2}$/.test(code)) return "•";
  return String.fromCodePoint(
    ...code
      .toUpperCase()
      .split("")
      .map((letter) => 127397 + letter.charCodeAt(0))
  );
}

function formatBoutSegment(value: string): string {
  return value
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function schemaStatus(sessions: EventData[]): string {
  if (sessions.some((session) => session.status === "live")) {
    return "https://schema.org/EventInProgress";
  }
  if (
    sessions.length > 0 &&
    sessions.every((session) => session.status === "finished")
  ) {
    return "https://schema.org/EventCompleted";
  }
  return "https://schema.org/EventScheduled";
}

export async function generateStaticParams() {
  return Array.from(
    new Set(
      getAllEvents()
        .filter((event) => event.sport === "ufc" && event.eventGroupSlug)
        .map((event) => event.eventGroupSlug!)
    )
  ).map((event) => ({ event }));
}

export async function generateMetadata({
  params,
  searchParams,
}: PageProps): Promise<Metadata> {
  const { event } = await params;
  const resolvedSearch = (await searchParams) ?? {};
  const snapshot = await getPublicEventsSnapshot({
    sport: "ufc",
    limit: 500,
  });
  const sessions = cardEvents(snapshot.events, event);
  const first = sessions[0];

  if (!first) {
    return {
      title: "UFC event not found | WatchTVSport",
      robots: { index: false, follow: false },
    };
  }

  const verifiedBroadcastCount = sessions.reduce(
    (sum, session) =>
      sum +
      session.broadcasts.filter(
        (broadcast) => broadcast.coverageStatus === "confirmed"
      ).length,
    0
  );

  const eligibility = evaluateSeoEligibility({
    kind: "event",
    canonicalPath: `/ufc/event/${event}`,
    usefulContentCount: [
      first.eventGroupName,
      first.eventDate,
      first.venue,
      first.country,
      sessions.length,
    ].filter(Boolean).length,
    verifiedBroadcastCount,
  });

  const hasFacet = Boolean(
    resolvedSearch.country || resolvedSearch.access
  );
  const robots = hasFacet
    ? { index: false, follow: true }
    : indexableRobots(eligibility.indexable);

  return {
    title: `${first.eventGroupName} – TV schedule & official broadcasters`,
    description: `Find the full schedule and official viewing options for ${first.eventGroupName}, including Early Prelims, Prelims and Main Card when available.`,
    alternates: { canonical: `/ufc/event/${event}` },
    robots,
    openGraph: {
      title: `${first.eventGroupName} – Where to watch`,
      description: `Fight card, session times and official UFC broadcasters for ${first.eventGroupName}.`,
      url: `/ufc/event/${event}`,
      type: "website",
    },
  };
}

export default async function UfcEventPage({
  params,
  searchParams,
}: PageProps) {
  const { event } = await params;
  const resolved = (await searchParams) ?? {};

  const [snapshot, bouts] = await Promise.all([
    getPublicEventsSnapshot({ sport: "ufc", limit: 500 }),
    getPublicUfcCard(event),
  ]);

  const sessions = cardEvents(snapshot.events, event);
  const first = sessions[0];
  if (!first) notFound();

  const main =
    sessions.find((session) => session.sessionType === "main_card") ??
    sessions.at(-1)!;
  const mainBout =
    bouts.find((bout) => bout.titleBout) ??
    [...bouts].sort((a, b) => a.order - b.order)[0];
  const canonicalPath = `/ufc/event/${event}`;

  const competitionRights = await getPublicCompetitionBroadcastRights({
    sport: "ufc",
    competition: first.competitionSlug,
    eventDate: main.eventDate,
  });

  const scheduleSessions: EventSessionScheduleItem[] = sessions.map(
    (session) => ({
      id: session.sessionType?.replaceAll("_", "-") ?? session.slug,
      label:
        session.stage ??
        session.sessionType?.replaceAll("_", " ") ??
        session.title,
      eventDate: session.eventDate,
      status: session.status,
      confirmedBroadcastCount: session.broadcasts.filter(
        (broadcast) => broadcast.coverageStatus === "confirmed"
      ).length,
    })
  );

  const favorite = {
    kind: "group" as const,
    entityId: first.eventGroupId ?? `ufc-card:${event}`,
    label: first.eventGroupName ?? first.title,
    href: canonicalPath,
  };

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "SportsEvent",
    name: first.eventGroupName,
    startDate: sessions[0]?.eventDate,
    endDate: main.eventDate,
    eventStatus: schemaStatus(sessions),
    location: first.venue
      ? {
          "@type": "Place",
          name: first.venue,
          address: first.country,
        }
      : undefined,
    url: `https://watchtvsport.com${canonicalPath}`,
  };

  return (
    <main id="main-content" className="v2-calendar">
      {snapshot.warning ? (
        <p className="v2-data-warning" role="status">
          {snapshot.warning}
        </p>
      ) : null}

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <Breadcrumbs
        items={[
          { label: "Home", href: "/" },
          { label: "UFC", href: "/ufc" },
          { label: first.eventGroupName ?? "UFC event" },
        ]}
      />

      <section
        className="v2-calendar-hero wts-ufc-event-hero"
        aria-labelledby="ufc-event-title"
      >
        <div className="wts-ufc-hero-header">
          <div>
            <p className="wts-ufc-event-kicker">UFC · Fight Night</p>
            <h1 id="ufc-event-title">{first.eventGroupName}</h1>
          </div>
          <FavoriteButton favorite={favorite} />
        </div>

        {mainBout ? (
          <div className="wts-ufc-main-event">
            <div className="wts-ufc-main-event-label">
              <span>{mainBout.titleBout ? "TITLE FIGHT" : "MAIN EVENT"}</span>
              <strong>{mainBout.weightClass ?? "Main Event"}</strong>
            </div>

            <div className="wts-ufc-main-fighter is-red">
              <span className="wts-ufc-main-flag" aria-hidden="true">
                {countryFlag(mainBout.fighter1.countryCode)}
              </span>
              <div>
                <small>{mainBout.fighter1.countryCode ?? "Fighter"}</small>
                <strong>{mainBout.fighter1.name}</strong>
              </div>
            </div>

            <div className="wts-ufc-main-vs" aria-hidden="true">VS</div>

            <div className="wts-ufc-main-fighter is-blue">
              <div>
                <small>{mainBout.fighter2.countryCode ?? "Fighter"}</small>
                <strong>{mainBout.fighter2.name}</strong>
              </div>
              <span className="wts-ufc-main-flag" aria-hidden="true">
                {countryFlag(mainBout.fighter2.countryCode)}
              </span>
            </div>
          </div>
        ) : null}

        <div className="wts-ufc-event-program">
          <div className="wts-ufc-program-meta">
            <span>
              <b>Venue</b>
              {first.venue ?? "Venue TBC"}
              {first.country ? " · " + first.country : ""}
            </span>
            <span>
              <b>Main Card</b>
              <LocalTime date={main.eventDate} showTimeZone />
            </span>
          </div>

          <div className="wts-ufc-program-sessions" aria-label="Fight night program">
            {sessions.map((session) => (
              <span
                className={session.sessionType === "main_card" ? "is-main" : undefined}
                key={session.id}
              >
                <b>
                  {session.stage ??
                    session.sessionType?.replaceAll("_", " ") ??
                    "Session"}
                </b>
                <LocalTime date={session.eventDate} />
              </span>
            ))}
          </div>
        </div>
      </section>

      <EventSessionSchedule
        eyebrow="Fight night schedule"
        title="Early Prelims, Prelims & Main Card"
        sessions={scheduleSessions}
      />

      {bouts.length > 0 ? (
        <section
          className="v2-results"
          aria-labelledby="confirmed-bouts-title"
        >
          <div className="v2-results-heading">
            <div>
              <p className="v2-eyebrow">Verified fight card</p>
              <h2 id="confirmed-bouts-title">Confirmed bouts</h2>
            </div>
            <p>{bouts.length}</p>
          </div>

          <div className="wts-ufc-bout-list">
            {bouts.map((bout) => (
              <article className="wts-ufc-bout-row" key={bout.id}>
                <div className="wts-ufc-bout-meta">
                  <span className={bout.titleBout ? "is-title" : undefined}>
                    {bout.titleBout ? "Title bout" : formatBoutSegment(bout.segment)}
                  </span>
                  <strong>{bout.weightClass ?? "Confirmed bout"}</strong>
                </div>

                <div className="wts-ufc-fighter is-left">
                  <span className="wts-ufc-fighter-flag" aria-hidden="true">
                    {countryFlag(bout.fighter1.countryCode)}
                  </span>
                  <div>
                    <strong>{bout.fighter1.name}</strong>
                    <small>{bout.fighter1.countryCode ?? "Fighter"}</small>
                  </div>
                </div>

                <div className="wts-ufc-vs" aria-hidden="true">VS</div>

                <div className="wts-ufc-fighter is-right">
                  <div>
                    <strong>{bout.fighter2.name}</strong>
                    <small>{bout.fighter2.countryCode ?? "Fighter"}</small>
                  </div>
                  <span className="wts-ufc-fighter-flag" aria-hidden="true">
                    {countryFlag(bout.fighter2.countryCode)}
                  </span>
                </div>
              </article>
            ))}
          </div>
        </section>
      ) : null}

      <BroadcastOffers
        events={sessions}
        selectedCountry={resolved.country}
        selectedAccess={resolved.access}
        competitionRights={competitionRights}
        title="Where to watch this UFC event"
      />
    </main>
  );
}
