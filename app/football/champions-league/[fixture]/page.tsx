import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import Breadcrumbs from "@/components/Breadcrumbs";
import FavoriteButton from "@/components/FavoriteButton";
import MatchHero from "@/components/MatchHero";
import MatchNextGames from "@/components/MatchNextGames";
import MatchWatchPanel from "@/components/MatchWatchPanel";
import { clubSlug, getClubAliases, getFixtureSeoAliases } from "@/lib/club-aliases";
import { getAllEvents } from "@/lib/events";
import type { FavoriteCandidate } from "@/lib/favorites";
import { getFixtureSeries } from "@/lib/fixture-series";
import { getPublicEventsSnapshot } from "@/lib/public-events";
import { getPublicParticipantProfile } from "@/lib/participant-profiles";

type PageProps = {
  params: Promise<{ fixture: string }>;
  searchParams?: Promise<{ returnTo?: string }>;
};

function safeReturnTo(value?: string) {
  if (!value || value.length > 1500 || !value.startsWith("/") || value.startsWith("//")) return "/";
  try {
    const parsed = new URL(value, "https://watchtvsport.com");
    return parsed.origin === "https://watchtvsport.com" ? `${parsed.pathname}${parsed.search}${parsed.hash}` : "/";
  } catch {
    return "/";
  }
}

function eventPath(fixture: string) {
  return `/football/champions-league/${fixture}`;
}

async function fixtureSeries(fixture: string) {
  const path = eventPath(fixture);
  const localEvents = getAllEvents().filter((event) => event.detailPath === path);
  const snapshot = await getPublicEventsSnapshot({
    sport: "football",
    competition: "champions-league",
    slug: fixture,
    limit: 50,
  });
  const liveEvents = snapshot.events.filter((event) => event.detailPath === path);
  return getFixtureSeries(liveEvents.length ? liveEvents : localEvents, path);
}

function eventFavorite(event: NonNullable<Awaited<ReturnType<typeof fixtureSeries>>>["current"]): FavoriteCandidate {
  return {
    kind: "event",
    entityId: event.id,
    label: event.title,
    href: event.detailPath,
    event: {
      detailPath: event.detailPath,
      eventDate: event.eventDate,
      sport: event.sport,
      competition: event.competition,
      participantNames: [event.participant1?.name, event.participant2?.name].filter((name): name is string => Boolean(name)),
    },
  };
}

function statusLabel(status?: "scheduled" | "live" | "finished") {
  if (status === "live") return "Live";
  if (status === "finished") return "Finished";
  return "Scheduled";
}

export async function generateStaticParams() {
  return Array.from(
    new Set(
      getAllEvents()
        .filter((event) => event.detailPath.startsWith("/football/champions-league/"))
        .map((event) => event.detailPath.split("/").at(-1) ?? "")
        .filter(Boolean)
    )
  ).map((fixture) => ({ fixture }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { fixture } = await params;
  const series = await fixtureSeries(fixture);
  const event = series?.current;
  if (!event) return { title: "Event not found | WatchTVSport", robots: { index: false, follow: false } };

  const aliases = getFixtureSeoAliases(event.participant1?.name, event.participant2?.name);
  return {
    title: `${event.title} – TV channels & official broadcasters`,
    description: `Where to watch ${event.title}: verified official TV channels and streaming platforms by country for the UEFA Champions League.`,
    keywords: aliases,
    alternates: { canonical: event.detailPath },
    openGraph: {
      title: `${event.title} – Where to watch`,
      description: `Official TV and streaming information for ${event.title}.`,
      url: event.detailPath,
      type: "website",
    },
  };
}

export default async function ChampionsLeagueEventPage({ params, searchParams }: PageProps) {
  const { fixture } = await params;
  const series = await fixtureSeries(fixture);
  if (!series) notFound();

  const event = series.current;
  if (!event.participant1 || !event.participant2) notFound();

  const resolved = (await searchParams) ?? {};
  const returnTo = safeReturnTo(resolved.returnTo);
  const competitionHref = `/football/competition/${event.competitionSlug}`;
  const homeSlug = clubSlug(event.participant1.name);
  const awaySlug = clubSlug(event.participant2.name);
  const [homeProfile, awayProfile] = await Promise.all([
    getPublicParticipantProfile(homeSlug, event.sport),
    getPublicParticipantProfile(awaySlug, event.sport),
  ]);
  const confirmedOffers = event.broadcasts.filter((broadcast) => broadcast.coverageStatus === "confirmed");
  const homeAliases = getClubAliases(event.participant1.name);
  const awayAliases = getClubAliases(event.participant2.name);
  const favorite = eventFavorite(event);
  const jsonLd = {
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
      {
        "@type": "SportsTeam",
        name: event.participant1.name,
        url: `https://watchtvsport.com/football/club/${homeSlug}`,
        ...(homeAliases.length ? { alternateName: homeAliases } : {}),
      },
      {
        "@type": "SportsTeam",
        name: event.participant2.name,
        url: `https://watchtvsport.com/football/club/${awaySlug}`,
        ...(awayAliases.length ? { alternateName: awayAliases } : {}),
      },
    ],
  };

  return (
    <main id="main-content" className="v2-calendar">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <Breadcrumbs
        items={[
          { label: "Home", href: "/" },
          { label: "Football", href: "/football" },
          { label: event.competition, href: competitionHref },
          { label: event.title },
        ]}
      />

      <MatchHero
        sport={event.sport}
        competition={event.competition}
        competitionHref={competitionHref}
        stage={event.stage}
        status={statusLabel(event.status)}
        date={event.eventDate}
        team1={{
          name: event.participant1.name,
          href: `/football/club/${homeSlug}`,
          countryCode: event.participant1.countryCode,
          visual: event.participant1.visualProfile ?? homeProfile?.visual,
        }}
        team2={{
          name: event.participant2.name,
          href: `/football/club/${awaySlug}`,
          countryCode: event.participant2.countryCode,
          visual: event.participant2.visualProfile ?? awayProfile?.visual,
        }}
        favorite={<FavoriteButton favorite={favorite} compact />}
      />

      <MatchWatchPanel
        broadcasts={confirmedOffers}
        emptyTitle="Broadcasters not confirmed yet"
        emptyCopy="Confirmed official viewing options will appear here when verified."
        showMethodologyLink
      />

      <MatchNextGames
        sport={event.sport}
        competitionSlug={event.competitionSlug}
        competitionHref={competitionHref}
        currentDate={event.eventDate}
        currentEventId={event.id}
        currentEventSlug={event.slug}
        currentParticipants={[
          { id: event.participant1.id, slug: homeSlug, name: event.participant1.name },
          { id: event.participant2.id, slug: awaySlug, name: event.participant2.name },
        ]}
      />

      <nav className="v2-related-nav" aria-label="Related pages">
        <Link href={returnTo}>← Back to calendar</Link>
        <Link href={competitionHref}>{event.competition} →</Link>
      </nav>
    </main>
  );
}
