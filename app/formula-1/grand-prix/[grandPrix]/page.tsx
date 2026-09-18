import type { Metadata } from "next";
import Link from "next/link";
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
import {
  getFormula1SessionPlan2026,
  getFormula1Weekend2026,
} from "@/source/formula-1-2026-season";
import heroStyles from "./grand-prix-background.module.css";

type PageProps = {
  params: Promise<{ grandPrix: string }>;
  searchParams?: Promise<{ country?: string; access?: string }>;
};

function grandPrixEvents(events: EventData[], slug: string) {
  return events
    .filter(
      (event) =>
        event.sport === "formula-1" && event.eventGroupSlug === slug
    )
    .sort(
      (a, b) =>
        new Date(a.eventDate).getTime() - new Date(b.eventDate).getTime()
    );
}

function editionKey(event: EventData) {
  return (
    event.eventEditionKey ??
    new Date(event.eventDate).getUTCFullYear().toString()
  );
}

function selectEdition(events: EventData[], now = new Date()) {
  const editions = new Map<string, EventData[]>();

  for (const event of events) {
    const key = editionKey(event);
    editions.set(key, [...(editions.get(key) ?? []), event]);
  }

  const sorted = Array.from(editions.entries())
    .map(([key, items]) => ({
      key,
      events: items.sort(
        (a, b) =>
          new Date(a.eventDate).getTime() - new Date(b.eventDate).getTime()
      ),
    }))
    .sort(
      (a, b) =>
        new Date(a.events[0]?.eventDate ?? 0).getTime() -
        new Date(b.events[0]?.eventDate ?? 0).getTime()
    );

  return (
    sorted.find((edition) =>
      edition.events.some((event) => event.status === "live")
    )?.events ??
    sorted.find((edition) =>
      edition.events.some(
        (event) => new Date(event.eventDate).getTime() >= now.getTime()
      )
    )?.events ??
    sorted.at(-1)?.events ??
    []
  );
}

export async function generateStaticParams() {
  return Array.from(
    new Set(
      getAllEvents()
        .filter(
          (event) => event.sport === "formula-1" && event.eventGroupSlug
        )
        .map((event) => event.eventGroupSlug!)
    )
  ).map((grandPrix) => ({ grandPrix }));
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { grandPrix } = await params;
  const snapshot = await getPublicEventsSnapshot({
    sport: "formula-1",
    limit: 500,
  });
  const events = selectEdition(grandPrixEvents(snapshot.events, grandPrix));
  const first = events[0];

  if (!first) {
    return {
      title: "Grand Prix not found | WatchTVSport",
      robots: { index: false, follow: false },
    };
  }

  return {
    title: `${first.eventGroupName} F1 TV schedule & official broadcasters`,
    description: `Formula 1 weekend schedule for ${first.eventGroupName}, with practice, qualifying, race times and verified official viewing options by country.`,
    alternates: { canonical: `/formula-1/grand-prix/${grandPrix}` },
    openGraph: {
      title: `${first.eventGroupName} – F1 TV guide`,
      description: `Practice, qualifying, race times and official broadcasters for ${first.eventGroupName}.`,
      url: `/formula-1/grand-prix/${grandPrix}`,
      type: "website",
    },
  };
}

export default async function Formula1GrandPrixPage({
  params,
  searchParams,
}: PageProps) {
  const { grandPrix } = await params;
  const resolved = (await searchParams) ?? {};
  const snapshot = await getPublicEventsSnapshot({
    sport: "formula-1",
    limit: 500,
  });

  const allEvents = grandPrixEvents(snapshot.events, grandPrix);
  const events = selectEdition(allEvents);
  const first = events[0];
  const weekend = getFormula1Weekend2026(grandPrix);

  if (!first || !weekend) notFound();

  const race = events.find((event) => event.sessionType === "race");
  const editionLabel = first.eventEditionLabel ?? editionKey(first);
  const editionYear = String(new Date(first.eventDate).getUTCFullYear());
  const currentYear = String(new Date().getUTCFullYear());
  const sessionPlan = getFormula1SessionPlan2026(weekend);
  const canonicalPath = `/formula-1/grand-prix/${grandPrix}`;

  const competitionRights = await getPublicCompetitionBroadcastRights({
    sport: "formula-1",
    competition: first.competitionSlug,
    eventDate: race?.eventDate ?? first.eventDate,
  });

  const scheduleSessions: EventSessionScheduleItem[] = sessionPlan.map(
    (session) => {
      const event = events.find(
        (candidate) =>
          candidate.sequenceNumber === session.sequenceNumber ||
          candidate.stage === session.label ||
          (session.sessionType !== "practice" &&
            candidate.sessionType === session.sessionType)
      );

      return {
        id: session.slug,
        label: session.label,
        eventDate: event?.eventDate ?? session.eventDate,
        status: event?.status,
        confirmedBroadcastCount:
          event?.broadcasts.filter(
            (broadcast) => broadcast.coverageStatus === "confirmed"
          ).length ?? 0,
      };
    }
  );

  const favorite = {
    kind: "group" as const,
    entityId: first.eventGroupId ?? `f1-${grandPrix}`,
    label: first.eventGroupName ?? weekend.name,
    href: canonicalPath,
  };

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "SportsEvent",
    name: first.eventGroupName,
    startDate: events[0]?.eventDate,
    endDate: race?.eventDate ?? events.at(-1)?.eventDate,
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
    <main
      id="main-content"
      className={`v2-calendar ${heroStyles.page}`}
    >
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
          { label: "Formula 1", href: "/formula-1" },
          { label: first.eventGroupName ?? weekend.name },
        ]}
      />

      <section
        className="v2-calendar-hero wts-f1-hero wts-f1-grand-prix-hero"
        aria-labelledby="gp-title"
      >
        <img
          className="wts-f1-hero-image"
          src="/formula-1-hero-bg.webp"
          alt=""
          aria-hidden="true"
        />
        <div className="wts-f1-hero-shade" aria-hidden="true" />
        <div className="wts-f1-hero-content">
          <div className="wts-event-hero-top">
            <div>
              <p className="v2-eyebrow">Formula 1 Grand Prix</p>
              <h1 id="gp-title">{first.eventGroupName ?? weekend.name}</h1>
            </div>
            <div className="wts-event-hero-actions">
              <FavoriteButton favorite={favorite} />
            </div>
          </div>

          <div className="wts-event-hero-meta">
            <span>{editionLabel}</span>
            <span>{first.country ?? weekend.country}</span>
            <span>{first.venue ?? weekend.venue}</span>
          </div>

          <p className="v2-hero-copy">
            The whole race weekend is grouped on this page: practice,
            qualifying, sprint sessions when applicable, and the race. Broadcast
            availability can differ by session.
          </p>

          {race ? (
            <p className="v2-signature">
              Race start: <LocalTime date={race.eventDate} showTimeZone />
            </p>
          ) : null}

          {editionYear !== currentYear ? (
            <Link
              className="wts-event-hero-secondary"
              href={`/formula-1/grand-prix/${grandPrix}/${editionYear}`}
            >
              Open {editionYear} edition →
            </Link>
          ) : null}
        </div>
      </section>

      <EventSessionSchedule
        eyebrow="Weekend schedule"
        title="Practice, qualifying & race"
        sessions={scheduleSessions}
      />

      <BroadcastOffers
        events={events}
        selectedCountry={resolved.country}
        selectedAccess={resolved.access}
        competitionRights={competitionRights}
        title="Where to watch this Grand Prix"
      />
    </main>
  );
}
