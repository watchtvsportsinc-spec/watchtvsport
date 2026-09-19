import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import PermanentFixturePage from "@/components/PermanentFixturePage";
import UniversalEventPage from "@/components/UniversalEventPage";
import type { EventData } from "@/lib/events";
import { getPublicFixturePage, getPublicMatchupPage, fixtureWindowLabel, type PublicFixture } from "@/lib/public-fixtures";
import { getPublicEventsSnapshot } from "@/lib/public-events";
import { evaluateSeoEligibility, indexableRobots } from "@/lib/seo-indexability";

type PageProps = {
  params: Promise<{ slug: string }>;
  searchParams?: Promise<{ event?: string; country?: string; access?: string }>;
};

function fixtureEligibility(fixture: PublicFixture) {
  const hasScheduleWindow = Boolean(fixture.exactDate || fixture.windowStart || fixture.windowEnd);
  const usefulContentCount = [
    fixture.participant1?.name,
    fixture.participant2?.name,
    fixture.seasonLabel,
    fixture.matchweek,
    fixture.exactDate || fixture.windowStart || fixture.windowEnd,
  ].filter(Boolean).length;
  return evaluateSeoEligibility({
    kind: "fixture",
    canonicalPath: fixture.detailPath,
    usefulContentCount,
    hasOfficialScheduleWindow: hasScheduleWindow,
  });
}

function fixtureMetadata(fixture: PublicFixture): Metadata {
  const schedule = fixture.scheduleStatus === "schedule_confirmed" && fixture.exactDate
    ? "Exact kick-off confirmed"
    : fixtureWindowLabel(fixture) ?? "Schedule pending";
  const competition = fixture.competition ? `${fixture.competition}. ` : "";
  const description = `${fixture.title} ${fixture.seasonLabel ?? ""} TV guide and official broadcaster information. ${competition}${fixture.matchweek ? `Matchweek ${fixture.matchweek}. ` : ""}${schedule}.`;
  const eligibility = fixtureEligibility(fixture);
  return {
    title: `${fixture.title} TV schedule & where to watch | WatchTVSport`,
    description,
    alternates: { canonical: fixture.detailPath },
    robots: indexableRobots(eligibility.indexable),
    openGraph: { title: `${fixture.title} – where to watch`, description, url: fixture.detailPath, type: "website" },
    twitter: { card: "summary_large_image", title: `${fixture.title} – where to watch`, description },
  };
}

function eventMetadata(event: EventData, canonicalPath: string): Metadata {
  const verifiedBroadcastCount = event.broadcasts.filter((broadcast) => broadcast.coverageStatus === "confirmed").length;
  const usefulContentCount = [event.eventDate, event.competition, event.participant1?.name, event.participant2?.name, event.stage].filter(Boolean).length;
  const eligibility = evaluateSeoEligibility({
    kind: "event",
    canonicalPath,
    usefulContentCount,
    verifiedBroadcastCount,
  });
  return {
    title: `${event.title} – where to watch`,
    description: `Find official TV channels and streaming platforms for ${event.title} by country.`,
    alternates: { canonical: canonicalPath },
    robots: indexableRobots(eligibility.indexable),
  };
}

async function findEventById(eventId: string, slug?: string): Promise<EventData | null> {
  if (slug) {
    const targeted = await getPublicEventsSnapshot({ slug, limit: 100 });
    const exact = targeted.events.find((item) => item.id === eventId);
    if (exact) return exact;
  }
  const snapshot = await getPublicEventsSnapshot({ limit: 500 });
  return snapshot.events.find((item) => item.id === eventId) ?? null;
}

export async function generateMetadata({ params, searchParams }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const { event: eventId } = (await searchParams) ?? {};

  const matchup = await getPublicMatchupPage(slug, eventId);
  if (matchup) return fixtureMetadata(matchup);

  if (eventId) {
    const exactEvent = await findEventById(eventId, slug);
    if (exactEvent) return eventMetadata(exactEvent, `/event/${slug}?event=${encodeURIComponent(eventId)}`);
    return { title: "Event not found", robots: { index: false, follow: false } };
  }

  const fixture = await getPublicFixturePage(slug);
  if (fixture) return fixtureMetadata(fixture);

  const snapshot = await getPublicEventsSnapshot({ slug, limit: 1 });
  const event = snapshot.events.find((item) => item.slug === slug);
  if (!event) return { title: "Event not found", robots: { index: false, follow: false } };
  return eventMetadata(event, `/event/${slug}`);
}

export default async function EventPage({ params, searchParams }: PageProps) {
  const { slug } = await params;
  const { event: eventId, country, access } = (await searchParams) ?? {};

  const matchup = await getPublicMatchupPage(slug, eventId);
  if (matchup) return <PermanentFixturePage fixture={matchup} />;

  if (eventId) {
    const exactEvent = await findEventById(eventId, slug);
    if (exactEvent) return <UniversalEventPage slug={exactEvent.slug} selectedCountry={country} selectedAccess={access} />;
    notFound();
  }

  const fixture = await getPublicFixturePage(slug);
  if (fixture) return <PermanentFixturePage fixture={fixture} />;

  const snapshot = await getPublicEventsSnapshot({ slug, limit: 1 });
  const event = snapshot.events.find((item) => item.slug === slug);
  if (!event) notFound();

  const genericPath = `/event/${slug}`;
  if (event.detailPath && event.detailPath !== genericPath) permanentRedirect(event.detailPath);
  return <UniversalEventPage slug={slug} selectedCountry={country} selectedAccess={access} />;
}
