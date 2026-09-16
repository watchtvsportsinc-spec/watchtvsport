import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import PermanentFixturePage from "@/components/PermanentFixturePage";
import UniversalEventPage from "@/components/UniversalEventPage";
import { getPublicFixturePage, fixtureWindowLabel, type PublicFixture } from "@/lib/public-fixtures";
import { getPublicEventsSnapshot } from "@/lib/public-events";
import { evaluateSeoEligibility, indexableRobots } from "@/lib/seo-indexability";

type PageProps = { params: Promise<{ slug: string }> };

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

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const fixture = await getPublicFixturePage(slug);
  if (fixture) {
    const schedule = fixture.scheduleStatus === "schedule_confirmed" && fixture.exactDate
      ? "Exact kick-off confirmed"
      : fixtureWindowLabel(fixture) ?? "Schedule pending";
    const description = `${fixture.title} ${fixture.seasonLabel ?? ""} TV guide and official broadcaster information. ${fixture.matchweek ? `Matchweek ${fixture.matchweek}. ` : ""}${schedule}.`;
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

  const snapshot = await getPublicEventsSnapshot({ slug, limit: 1 });
  const event = snapshot.events.find((item) => item.slug === slug);
  if (!event) return { title: "Event not found", robots: { index: false, follow: false } };
  const verifiedBroadcastCount = event.broadcasts.filter((broadcast) => broadcast.coverageStatus === "confirmed").length;
  const usefulContentCount = [event.eventDate, event.competition, event.participant1?.name, event.participant2?.name, event.stage].filter(Boolean).length;
  const eligibility = evaluateSeoEligibility({
    kind: "event",
    canonicalPath: event.detailPath || `/event/${slug}`,
    usefulContentCount,
    verifiedBroadcastCount,
  });
  return {
    title: `${event.title} – where to watch`,
    description: `Find official TV channels and streaming platforms for ${event.title} by country.`,
    alternates: { canonical: event.detailPath || `/event/${slug}` },
    robots: indexableRobots(eligibility.indexable),
  };
}

export default async function EventPage({ params }: PageProps) {
  const { slug } = await params;
  const fixture = await getPublicFixturePage(slug);
  if (fixture) return <PermanentFixturePage fixture={fixture} />;

  const snapshot = await getPublicEventsSnapshot({ slug, limit: 1 });
  const event = snapshot.events.find((item) => item.slug === slug);
  if (!event) notFound();

  const genericPath = `/event/${slug}`;
  if (event.detailPath && event.detailPath !== genericPath) permanentRedirect(event.detailPath);
  return <UniversalEventPage slug={slug} />;
}
