import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import Breadcrumbs from "@/components/Breadcrumbs";
import EntityVisual from "@/components/EntityVisual";
import FavoriteButton from "@/components/FavoriteButton";
import LocalTime from "@/components/LocalTime";
import MatchBroadcastOffers from "@/components/MatchBroadcastOffers";
import { clubSlug, getClubAliases, getFixtureSeoAliases } from "@/lib/club-aliases";
import { getAllEvents, participantEntityId, type Participant } from "@/lib/events";
import type { FavoriteCandidate } from "@/lib/favorites";
import { getFixtureSeries } from "@/lib/fixture-series";
import { getPublicEventsSnapshot } from "@/lib/public-events";
import styles from "./MatchPage.module.css";

type PageProps = {
  params: Promise<{ fixture: string }>;
  searchParams?: Promise<{ returnTo?: string; country?: string; access?: string }>;
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

function favorite(participant?: Participant): FavoriteCandidate | null {
  return participant
    ? {
        kind: "participant",
        entityId: participantEntityId(participant, "football"),
        label: `${participant.name} (Football)`,
      }
    : null;
}

function eventPath(fixture: string) {
  return `/football/champions-league/${fixture}`;
}

function eventFavorite(event: Awaited<ReturnType<typeof getPublicEventsSnapshot>>["events"][number]): FavoriteCandidate {
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
  const snapshot = await getPublicEventsSnapshot();
  const event = getFixtureSeries(snapshot.events, eventPath(fixture))?.current;
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
  const snapshot = await getPublicEventsSnapshot();
  const series = getFixtureSeries(snapshot.events, eventPath(fixture));
  if (!series) notFound();

  const event = series.current;
  const resolved = (await searchParams) ?? {};
  const returnTo = safeReturnTo(resolved.returnTo);
  const competitionHref = `/football/competition/${event.competitionSlug}`;
  const homeFavorite = favorite(event.participant1);
  const awayFavorite = favorite(event.participant2);
  const competitionFavorite: FavoriteCandidate = {
    kind: "competition",
    entityId: `${event.sport}:${event.competitionSlug}`,
    label: `${event.competition} (Football)`,
  };
  const matchFavorite = eventFavorite(event);
  const homeAliases = event.participant1 ? getClubAliases(event.participant1.name) : [];
  const awayAliases = event.participant2 ? getClubAliases(event.participant2.name) : [];
  const confirmedOffers = event.broadcasts.filter((broadcast) => broadcast.coverageStatus === "confirmed");
  const freeOffers = confirmedOffers.filter((broadcast) => broadcast.access === "Free").length;
  const countryCount = new Set(confirmedOffers.map((broadcast) => broadcast.countryCode)).size;
  const currentStatus = event.status ?? "scheduled";
  const statusClass = currentStatus === "live"
    ? `${styles.status} ${styles.statusLive}`
    : currentStatus === "finished"
      ? `${styles.status} ${styles.statusFinished}`
      : styles.status;
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
    <main id="main-content" className={`v2-calendar ${styles.page}`}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <Breadcrumbs
        items={[
          { label: "Home", href: "/" },
          { label: "Football", href: "/football" },
          { label: event.competition, href: competitionHref },
          { label: event.title },
        ]}
      />

      <section id="match-overview" className={styles.hero} aria-labelledby="event-title">
        <div className={styles.heroTop}>
          <div className={styles.heroCopy}>
            <p className={styles.competitionLine}>
              Football · <Link href={competitionHref}>{event.competition}</Link>
            </p>
            <h1 id="event-title">{event.title}</h1>
            <div className={styles.meta}>
              <span className={statusClass}>{statusLabel(event.status)}</span>
              <LocalTime date={event.eventDate} />
              {event.stage ? <span>{event.stage}</span> : null}
            </div>
          </div>
          <div className={styles.heroAction}>
            <FavoriteButton favorite={matchFavorite} />
          </div>
        </div>

        <div id="teams" className={styles.matchup}>
          {event.participant1 ? (
            <Link className={styles.teamCard} href={`/football/club/${clubSlug(event.participant1.name)}`}>
              <EntityVisual entityId={participantEntityId(event.participant1, "football")} label={event.participant1.name} size="lg" />
              <span className={styles.teamText}>
                <span className={styles.teamName}>{event.participant1.name}</span>
                <span className={styles.teamLink}>Team profile →</span>
              </span>
            </Link>
          ) : <span />}

          <span className={styles.vs} aria-hidden="true">VS</span>

          {event.participant2 ? (
            <Link className={`${styles.teamCard} ${styles.teamCardAway}`} href={`/football/club/${clubSlug(event.participant2.name)}`}>
              <EntityVisual entityId={participantEntityId(event.participant2, "football")} label={event.participant2.name} size="lg" />
              <span className={styles.teamText}>
                <span className={styles.teamName}>{event.participant2.name}</span>
                <span className={styles.teamLink}>Team profile →</span>
              </span>
            </Link>
          ) : <span />}
        </div>

        <div className={styles.stats} aria-label="Match viewing summary">
          <div className={styles.stat}>
            <strong>{confirmedOffers.length}</strong>
            <span>Confirmed listings</span>
          </div>
          <div className={styles.stat}>
            <strong>{freeOffers}</strong>
            <span>Free options</span>
          </div>
          <div className={styles.stat}>
            <strong>{countryCount}</strong>
            <span>Countries</span>
          </div>
          <div className={`${styles.stat} ${styles.statStage}`}>
            <strong>{event.stage || "Match"}</strong>
            <span>Stage</span>
          </div>
        </div>

        <div className={styles.followRow} aria-label="Follow teams and competition">
          {homeFavorite ? <FavoriteButton favorite={homeFavorite} /> : null}
          {awayFavorite ? <FavoriteButton favorite={awayFavorite} /> : null}
          <FavoriteButton favorite={competitionFavorite} />
        </div>
      </section>

      <nav className={styles.tabs} aria-label="Match page sections">
        <a href="#match-overview" aria-current="page">Overview</a>
        <a href="#where-to-watch">Watch by country</a>
        <a href="#teams">Teams</a>
      </nav>

      <MatchBroadcastOffers
        event={event}
        selectedCountry={resolved.country}
        selectedAccess={resolved.access}
        returnTo={returnTo}
      />

      {series.reverseMeetings.length ? (
        <section className={styles.secondarySection} aria-labelledby="other-meetings-title">
          <div className={styles.secondaryHeading}>
            <div>
              <p>Fixture history</p>
              <h2 id="other-meetings-title">Other meetings</h2>
            </div>
          </div>
          <div className={styles.reverseList}>
            {series.reverseMeetings.map((meeting) => (
              <article className={styles.reverseCard} key={meeting.id}>
                <h3><Link href={meeting.detailPath}>{meeting.title}</Link></h3>
                <p><LocalTime date={meeting.eventDate} /></p>
              </article>
            ))}
          </div>
        </section>
      ) : null}

      <p className="v2-back-link"><Link href={returnTo}>← Back to calendar</Link></p>
    </main>
  );
}
