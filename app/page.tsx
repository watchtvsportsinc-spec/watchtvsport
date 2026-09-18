import type { Metadata } from "next";
import HomeDiscovery, { type HomeDiscoveryEvent } from "@/components/HomeDiscovery";
import HomeFavoritesStrip from "@/components/HomeFavoritesStrip";
import TimezoneSync from "@/components/TimezoneSync";
import { getPublicEventsSnapshot } from "@/lib/public-events";
import { parseCalendarFilters } from "@/lib/calendar";
import type { EventData } from "@/lib/events";

type HomePageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function firstValue(value: string | string[] | undefined): string {
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

function accessLabel(event: EventData): "Free" | "Paid" | "Access TBC" {
  const confirmed = event.broadcasts.filter((broadcast) => broadcast.coverageStatus === "confirmed");
  if (confirmed.some((broadcast) => broadcast.access === "Free")) return "Free";
  if (confirmed.some((broadcast) => broadcast.access === "Paid")) return "Paid";
  return "Access TBC";
}

function toDiscoveryEvent(event: EventData): HomeDiscoveryEvent {
  return {
    id: event.id,
    detailPath: event.detailPath,
    sport: event.sport,
    competition: event.competition,
    competitionSlug: event.competitionSlug,
    title: event.title,
    stage: event.stage,
    eventDate: event.eventDate,
    status: event.status,
    participant1: event.participant1
      ? {
          id: event.participant1.id,
          name: event.participant1.name,
          shortName: event.participant1.shortName,
          type: event.participant1.type,
        }
      : undefined,
    participant2: event.participant2
      ? {
          id: event.participant2.id,
          name: event.participant2.name,
          shortName: event.participant2.shortName,
          type: event.participant2.type,
        }
      : undefined,
    eventGroupId: event.eventGroupId,
    eventGroupName: event.eventGroupName,
    eventGroupSlug: event.eventGroupSlug,
    sessionType: event.sessionType,
    venue: event.venue,
    country: event.country,
    access: accessLabel(event),
  };
}

export async function generateMetadata({ searchParams }: HomePageProps): Promise<Metadata> {
  const params = (await searchParams) ?? {};
  const hasViewState = Object.values(params).some((value) =>
    Array.isArray(value) ? value.some(Boolean) : Boolean(value)
  );

  return {
    title: "Where to watch sports – live & upcoming TV guide",
    description:
      "Find live and upcoming sports, filter by date, sport, competition and team, then open the event to see official TV and streaming options.",
    alternates: { canonical: "/" },
    robots: hasViewState ? { index: false, follow: true } : { index: true, follow: true },
  };
}

export default async function HomePage({ searchParams }: HomePageProps) {
  const params = (await searchParams) ?? {};
  const calendarFilters = parseCalendarFilters(params);
  const now = new Date();

  const snapshot = await getPublicEventsSnapshot({
    from: new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString(),
    limit: 500,
  });

  const events = snapshot.events.map(toDiscoveryEvent);

  const organizationSchema = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "WatchTVSport",
    url: "https://watchtvsport.com",
    logo: "https://watchtvsport.com/logo-watchtvsport-v3.png",
    description: "Independent guide to official sports broadcasters and streaming platforms worldwide.",
  };

  const websiteSchema = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "WatchTVSport",
    url: "https://watchtvsport.com",
  };

  return (
    <main id="main-content" className="wts-home-v4">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteSchema) }}
      />

      <TimezoneSync />

      {snapshot.warning ? (
        <p className="v2-data-warning" role="status">
          {snapshot.warning}
        </p>
      ) : null}

      <HomeDiscovery
        events={events}
        timeZone={calendarFilters.timeZone}
        initial={{
          when: firstValue(params.when),
          date: firstValue(params.date),
          sport: firstValue(params.sport),
          competition: firstValue(params.competition),
          team: firstValue(params.team),
        }}
      />

      <HomeFavoritesStrip />
    </main>
  );
}
