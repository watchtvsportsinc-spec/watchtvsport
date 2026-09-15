import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import Breadcrumbs from "@/components/Breadcrumbs";
import FavoriteButton from "@/components/FavoriteButton";
import LocalTime from "@/components/LocalTime";
import {
  clubSlug,
  getAllClubNames,
  getClubAliases,
  getClubNameBySlug,
} from "@/lib/club-aliases";
import type { EventData, Participant } from "@/lib/events";
import type { FavoriteCandidate } from "@/lib/favorites";
import { getPublicEventsSnapshot } from "@/lib/public-events";
import styles from "./club-page.module.css";

type PageProps = { params: Promise<{ club: string }> };

function resolveClubName(events: EventData[], slug: string): string | null {
  for (const event of events) {
    if (event.sport !== "football") continue;
    for (const participant of [event.participant1, event.participant2]) {
      if (participant?.type === "club" && clubSlug(participant.name) === slug) return participant.name;
    }
  }
  return getClubNameBySlug(slug);
}

function clubEvents(events: EventData[], clubName: string): EventData[] {
  const target = clubSlug(clubName);
  return events
    .filter((event) => event.sport === "football" && [event.participant1, event.participant2].some((participant) => participant?.type === "club" && clubSlug(participant.name) === target))
    .sort((a, b) => new Date(a.eventDate).getTime() - new Date(b.eventDate).getTime());
}

function favoriteForClub(clubName: string): FavoriteCandidate {
  return { kind: "participant", entityId: `club:football:${clubSlug(clubName)}`, label: `${clubName} (Football)` };
}

function competitionHref(event: EventData): string {
  return `/football/competition/${event.competitionSlug}`;
}

function initials(name: string): string {
  const words = name.split(/\s+/).filter(Boolean);
  if (words.length === 1) return words[0].slice(0, 3).toUpperCase();
  return words.slice(0, 3).map((word) => word[0]).join("").toUpperCase();
}

function opponent(event: EventData, clubName: string): Participant | undefined {
  const target = clubSlug(clubName);
  return [event.participant1, event.participant2].find((participant) => participant && clubSlug(participant.name) !== target);
}

function isHome(event: EventData, clubName: string): boolean {
  return Boolean(event.participant1 && clubSlug(event.participant1.name) === clubSlug(clubName));
}

export async function generateStaticParams() {
  return getAllClubNames().map((name) => ({ club: clubSlug(name) }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { club } = await params;
  const snapshot = await getPublicEventsSnapshot();
  const clubName = resolveClubName(snapshot.events, club);
  if (!clubName) return { title: "Club not found | WatchTVSport", robots: { index: false, follow: false } };
  const aliases = getClubAliases(clubName);
  const aliasText = aliases.slice(0, 5).join(", ");
  return {
    title: `${clubName} TV schedule & official broadcasters | WatchTVSport`,
    description: `Find upcoming ${clubName} matches, official TV channels and streaming options${aliasText ? ` for searches including ${aliasText}` : ""}.`,
    keywords: [clubName, ...aliases, `${clubName} TV`, `${clubName} live stream`, `${clubName} schedule`],
    alternates: { canonical: `/football/club/${club}` },
    openGraph: {
      title: `${clubName} – TV schedule & where to watch`,
      description: `Upcoming ${clubName} matches and verified official broadcasters by country.`,
      url: `/football/club/${club}`,
      type: "website",
    },
  };
}

export default async function ClubPage({ params }: PageProps) {
  const { club } = await params;
  const snapshot = await getPublicEventsSnapshot();
  const clubName = resolveClubName(snapshot.events, club);
  if (!clubName) notFound();

  const aliases = getClubAliases(clubName);
  const events = clubEvents(snapshot.events, clubName);
  const now = Date.now();
  const upcoming = events.filter((event) => event.status === "live" || (event.status !== "finished" && new Date(event.eventDate).getTime() >= now));
  const recent = events.filter((event) => event.status === "finished" || new Date(event.eventDate).getTime() < now).reverse().slice(0, 6);
  const nextMatch = upcoming[0];
  const competitions = Array.from(new Map(events.map((event) => [event.competitionSlug, event])).values());
  const confirmedListings = upcoming.reduce((sum, event) => sum + event.broadcasts.filter((broadcast) => broadcast.coverageStatus === "confirmed").length, 0);
  const favorite = favoriteForClub(clubName);

  const teamJsonLd = {
    "@context": "https://schema.org",
    "@type": "SportsTeam",
    name: clubName,
    alternateName: aliases,
    sport: "Football",
    url: `https://watchtvsport.com/football/club/${club}`,
  };

  return (
    <main id="main-content" className={`v2-calendar ${styles.page}`}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(teamJsonLd) }} />
      <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Football", href: "/football" }, { label: clubName }]} />

      <section className={styles.hero} aria-labelledby="club-title">
        <div className={styles.heroShade} />
        <div className={styles.heroContent}>
          <div className={styles.crest} aria-label={`${clubName} club mark`}>
            <span>{initials(clubName)}</span>
            <small>Football</small>
          </div>
          <div className={styles.identity}>
            <p className="v2-eyebrow">Football club</p>
            <h1 id="club-title">{clubName}</h1>
            <p className={styles.tagline}>Official fixtures and verified TV and streaming options by country.</p>
            <div className={styles.heroActions}>
              <FavoriteButton favorite={favorite} />
              {aliases.length > 0 ? <span className={styles.aliases}>Also known as {aliases.slice(0, 4).join(" · ")}</span> : null}
            </div>
          </div>
        </div>

        <nav className={styles.tabs} aria-label={`${clubName} page sections`}>
          <a href="#overview" className={styles.activeTab}>Overview</a>
          <a href="#matches">Matches</a>
          <a href="#where-to-watch">Where to watch</a>
          <a href="#competitions">Competitions</a>
        </nav>
      </section>

      <section id="overview" className={styles.stats} aria-label={`${clubName} summary`}>
        <div><strong>{upcoming.length}</strong><span>Upcoming matches</span></div>
        <div><strong>{competitions.length}</strong><span>Competitions</span></div>
        <div><strong>{confirmedListings}</strong><span>Confirmed listings</span></div>
      </section>

      <div className={styles.layout}>
        <div className={styles.mainColumn}>
          {nextMatch ? (
            <section className={styles.section} aria-labelledby="next-match-title">
              <div className={styles.sectionHeader}>
                <div><p className="v2-eyebrow">Next match</p><h2 id="next-match-title">Coming up</h2></div>
                <Link href={nextMatch.detailPath}>Match details →</Link>
              </div>
              <article className={styles.nextMatch}>
                <div className={styles.nextMatchBackdrop} />
                <div className={styles.nextMatchInner}>
                  <p>{nextMatch.competition}{nextMatch.stage ? ` · ${nextMatch.stage}` : ""}</p>
                  <div className={styles.versusRow}>
                    <div><span className={styles.teamBadge}>{initials(nextMatch.participant1?.name ?? "TBC")}</span><strong>{nextMatch.participant1?.name ?? "TBC"}</strong></div>
                    <span className={styles.vs}>VS</span>
                    <div><span className={styles.teamBadge}>{initials(nextMatch.participant2?.name ?? "TBC")}</span><strong>{nextMatch.participant2?.name ?? "TBC"}</strong></div>
                  </div>
                  <div className={styles.matchMeta}><LocalTime date={nextMatch.eventDate} /><span>•</span><span>{nextMatch.broadcasts.filter((b) => b.coverageStatus === "confirmed").length} confirmed listings</span></div>
                  <div className={styles.matchActions}><Link className={styles.primaryButton} href={nextMatch.detailPath}>Where to watch →</Link><Link className={styles.secondaryButton} href={competitionHref(nextMatch)}>Competition</Link></div>
                </div>
              </article>
            </section>
          ) : null}

          <section id="matches" className={styles.section} aria-labelledby="matches-title">
            <div className={styles.sectionHeader}><div><p className="v2-eyebrow">Schedule</p><h2 id="matches-title">Upcoming matches</h2></div><span>{upcoming.length} scheduled</span></div>
            {upcoming.length === 0 ? (
              <div className="v2-empty-state" role="status"><h3>No upcoming match currently confirmed</h3><p>New fixtures will appear here as soon as they are confirmed.</p></div>
            ) : (
              <div className={styles.matchList}>
                {upcoming.map((event) => {
                  const other = opponent(event, clubName);
                  const confirmed = event.broadcasts.filter((b) => b.coverageStatus === "confirmed").length;
                  return (
                    <article className={styles.matchRow} key={event.id}>
                      <div className={styles.dateCell}><LocalTime date={event.eventDate} /></div>
                      <div className={styles.fixtureCell}><small>{isHome(event, clubName) ? "Home" : "Away"}</small><strong>{isHome(event, clubName) ? `${clubName} vs ${other?.name ?? "TBC"}` : `${other?.name ?? "TBC"} vs ${clubName}`}</strong><span>{event.competition}{event.stage ? ` · ${event.stage}` : ""}</span></div>
                      <div className={styles.broadcastCell}><span>{confirmed} confirmed</span><Link href={event.detailPath}>Where to watch →</Link></div>
                    </article>
                  );
                })}
              </div>
            )}
          </section>

          {recent.length > 0 ? (
            <section className={styles.section} aria-labelledby="recent-title">
              <div className={styles.sectionHeader}><div><p className="v2-eyebrow">Archive</p><h2 id="recent-title">Recent matches</h2></div></div>
              <div className={styles.archiveGrid}>
                {recent.map((event) => <Link href={event.detailPath} key={event.id}><strong>{event.title}</strong><span><LocalTime date={event.eventDate} /></span></Link>)}
              </div>
            </section>
          ) : null}
        </div>

        <aside className={styles.sidebar}>
          <section className={styles.sideCard} id="where-to-watch">
            <div className={styles.sideTitle}><h2>Where to watch</h2><span>Official only</span></div>
            <p>WatchTVSport lists confirmed legal broadcasters for each match and territory. We never guess missing coverage.</p>
            {nextMatch ? <Link href={nextMatch.detailPath}>See next match broadcasters →</Link> : null}
          </section>

          <section className={styles.sideCard} id="competitions">
            <div className={styles.sideTitle}><h2>Competitions</h2><span>{competitions.length}</span></div>
            <div className={styles.competitionList}>
              {competitions.map((event) => <Link href={competitionHref(event)} key={event.competitionSlug}><span className={styles.flagMark}>🏆</span><strong>{event.competition}</strong><span>View →</span></Link>)}
            </div>
          </section>

          <section className={styles.sideCard}>
            <div className={styles.sideTitle}><h2>Club identity</h2></div>
            <div className={styles.identityRow}><div className={styles.miniCrest}>{initials(clubName)}</div><div><strong>{clubName}</strong><span>Football club</span></div></div>
            {aliases.length > 0 ? <p className={styles.smallText}>Search aliases: {aliases.slice(0, 6).join(" · ")}</p> : null}
          </section>
        </aside>
      </div>
    </main>
  );
}
