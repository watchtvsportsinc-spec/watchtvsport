import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Breadcrumbs from "@/components/Breadcrumbs";
import BroadcastOffers from "@/components/BroadcastOffers";
import EventSessionSchedule, { type EventSessionScheduleItem } from "@/components/EventSessionSchedule";
import FavoriteButton from "@/components/FavoriteButton";
import LocalTime from "@/components/LocalTime";
import { getPublicCompetitionBroadcastRights } from "@/lib/public-broadcast-rights";
import { getPublicEventsSnapshot } from "@/lib/public-events";
import {
  getMotoGpSessionPlan2026,
  getMotoGpWeekend2026,
  motogpSeason2026Weekends,
} from "@/source/motogp-2026-season";

type PageProps = {
  params: Promise<{ grandPrix: string }>;
  searchParams?: Promise<{ country?: string; access?: string }>;
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(value + "T12:00:00Z"));
}

export function generateStaticParams() {
  return motogpSeason2026Weekends.map((weekend) => ({ grandPrix: weekend.slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { grandPrix } = await params;
  const weekend = getMotoGpWeekend2026(grandPrix);
  if (!weekend) {
    return { title: "MotoGP Grand Prix not found | WatchTVSport", robots: { index: false, follow: false } };
  }

  return {
    title: `${weekend.name} 2026 MotoGP schedule & official broadcasters`,
    description: `MotoGP weekend schedule for ${weekend.name}, including practice, qualifying, Sprint, race times and verified official viewing options by country.`,
    alternates: { canonical: `/sports/motogp/grand-prix/${weekend.slug}` },
    openGraph: {
      title: `${weekend.name} 2026 – MotoGP TV guide`,
      description: `Practice, qualifying, Sprint, race times and official broadcaster information for ${weekend.name}.`,
      url: `/sports/motogp/grand-prix/${weekend.slug}`,
      type: "website",
    },
  };
}

export default async function MotoGpGrandPrixPage({ params, searchParams }: PageProps) {
  const { grandPrix } = await params;
  const selected = (await searchParams) ?? {};
  const weekend = getMotoGpWeekend2026(grandPrix);
  if (!weekend) notFound();

  const snapshot = await getPublicEventsSnapshot({ sport: "motogp", limit: 500 });
  const events = snapshot.events
    .filter((event) => event.eventGroupSlug === grandPrix)
    .sort((a, b) => Date.parse(a.eventDate) - Date.parse(b.eventDate));

  const plan = getMotoGpSessionPlan2026(weekend);
  const now = Date.now();

  const scheduleSessions: EventSessionScheduleItem[] = plan.map((session) => {
    const event = events.find(
      (candidate) =>
        candidate.sequenceNumber === session.sequenceNumber ||
        candidate.stage === session.label
    );
    const eventDate = event?.eventDate ?? session.eventDate;
    const status =
      eventDate && Date.parse(eventDate) < now
        ? "finished"
        : event?.status === "live"
          ? "live"
          : weekend.status === "finished"
            ? "finished"
            : "scheduled";

    return {
      id: session.slug,
      label: session.label,
      eventDate,
      status,
      confirmedBroadcastCount:
        event?.broadcasts.filter((broadcast) => broadcast.coverageStatus === "confirmed").length ?? 0,
    };
  });

  const nextSession = scheduleSessions.find(
    (session) => session.eventDate && Date.parse(session.eventDate) >= now
  );
  const raceEvent = events.find((event) => event.sessionType === "race");
  const canonicalPath = `/sports/motogp/grand-prix/${weekend.slug}`;

  const competitionRights = await getPublicCompetitionBroadcastRights({
    sport: "motogp",
    competition: "motogp",
    eventDate: raceEvent?.eventDate ?? `${weekend.raceDate}T12:00:00Z`,
  });

  const favorite = {
    kind: "group" as const,
    entityId: `motogp-${weekend.slug}`,
    label: weekend.name,
    href: canonicalPath,
  };

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "SportsEvent",
    name: `${weekend.name} 2026`,
    startDate: weekend.weekendStart,
    endDate: weekend.weekendEnd,
    sport: "MotoGP",
    location: {
      "@type": "Place",
      name: weekend.venue,
      address: weekend.country,
    },
    url: `https://watchtvsport.com${canonicalPath}`,
  };

  return (
    <main id="main-content" className="v2-calendar">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <Breadcrumbs
        items={[
          { label: "Home", href: "/" },
          { label: "MotoGP", href: "/sports/motogp" },
          { label: weekend.name },
        ]}
      />

      <section
        className="v2-calendar-hero wts-f1-hero wts-f1-grand-prix-hero wts-sport-hero-frame"
        aria-labelledby="motogp-gp-title"
        style={{
          backgroundImage:
            "linear-gradient(90deg,rgba(3,10,18,.97),rgba(3,12,22,.72)),url('/motogp-race-hero.webp')",
        }}
      >
        <div className="wts-f1-hero-content">
          <div className="wts-event-hero-top">
            <div>
              <p className="v2-eyebrow">MotoGP Grand Prix</p>
              <h1 id="motogp-gp-title">{weekend.name}</h1>
            </div>
            <div className="wts-event-hero-actions">
              <FavoriteButton favorite={favorite} />
            </div>
          </div>

          <div className="wts-event-hero-meta">
            <span>2026</span>
            <span>{weekend.country}</span>
            <span>{weekend.venue}</span>
          </div>

          <p className="v2-hero-copy">
            The full MotoGP weekend is grouped here: Free Practice, Practice,
            qualifying, Sprint, Warm Up and the Grand Prix. Exact session times
            are shown only after official confirmation.
          </p>

          <p className="v2-signature">
            {nextSession?.eventDate ? (
              <>Next session: <LocalTime date={nextSession.eventDate} showTimeZone /></>
            ) : (
              <>Race weekend: {formatDate(weekend.raceDate)} · exact session times TBC</>
            )}
          </p>
        </div>
      </section>

      <EventSessionSchedule
        eyebrow="Weekend schedule"
        title="Practice, qualifying, Sprint & race"
        sessions={scheduleSessions}
        showStatus={false}
      />

      <BroadcastOffers
        events={events}
        selectedCountry={selected.country}
        selectedAccess={selected.access}
        competitionRights={competitionRights}
        title={`Where to watch ${weekend.name}`}
      />
    </main>
  );
}
