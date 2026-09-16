import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import Breadcrumbs from "@/components/Breadcrumbs";
import FavoriteButton from "@/components/FavoriteButton";
import LocalTime from "@/components/LocalTime";
import ParticipantSportVisual from "@/components/ParticipantSportVisual";
import type { EventData, Participant } from "@/lib/events";
import type { FavoriteCandidate } from "@/lib/favorites";
import { getPublicParticipantEvents } from "@/lib/public-participant-events";
import { getPublicParticipantProfile } from "@/lib/participant-profiles";
import { getSportBySlug, getSportLabel, sportAllowsParticipantPages } from "@/lib/sports-registry";
import styles from "@/app/football/club/[club]/club-page.module.css";

function normalizedSlug(value: string): string {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/&/g, " and ").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function initials(name: string): string {
  const words = name.split(/\s+/).filter(Boolean);
  if (words.length === 1) return words[0].slice(0, 3).toUpperCase();
  return words.slice(0, 3).map((word) => word[0]).join("").toUpperCase();
}

function participantMatches(participant: Participant | undefined, slug: string): boolean {
  return Boolean(participant && normalizedSlug(participant.name) === slug);
}

function opponent(event: EventData, slug: string): Participant | undefined {
  return [event.participant1, event.participant2].find((participant) => participant && !participantMatches(participant, slug));
}

function isHome(event: EventData, slug: string): boolean {
  return participantMatches(event.participant1, slug);
}

function favoriteForParticipant(sport: string, participantId: string, label: string): FavoriteCandidate {
  return { kind: "participant", entityId: participantId, label: `${label} (${getSportLabel(sport)})` };
}

function socialLinks(profile: NonNullable<Awaited<ReturnType<typeof getPublicParticipantProfile>>>["profile"]) {
  if (!profile) return [];
  return [
    ["Official website", profile.officialWebsiteUrl],
    ["Instagram", profile.instagramUrl],
    ["X", profile.xUrl],
    ["Facebook", profile.facebookUrl],
    ["YouTube", profile.youtubeUrl],
    ["TikTok", profile.tiktokUrl],
  ].filter((entry): entry is [string, string] => Boolean(entry[1]));
}

export async function buildUniversalClubMetadata(sport: string, club: string): Promise<Metadata> {
  const sportEntry = getSportBySlug(sport);
  if (!sportEntry || !sportEntry.enabled || !sportAllowsParticipantPages(sport)) {
    return { title: "Team not found | WatchTVSport", robots: { index: false, follow: false } };
  }
  const verified = await getPublicParticipantProfile(club, sport);
  if (!verified) return { title: "Team not found | WatchTVSport", robots: { index: false, follow: false } };
  const sportLabel = verified.sportName || getSportLabel(sport);
  const place = verified.profile?.city ? ` in ${verified.profile.city}` : "";
  return {
    title: `${verified.name} ${sportLabel} schedule & official broadcasters | WatchTVSport`,
    description: `Find ${verified.name}${place}, team information, upcoming games and verified official TV and streaming options.`,
    alternates: { canonical: `/sports/${sport}/club/${club}` },
    openGraph: {
      title: `${verified.name} – ${sportLabel} schedule & where to watch`,
      description: `Team profile, upcoming games and verified official broadcasters by country.`,
      url: `/sports/${sport}/club/${club}`,
      type: "website",
      images: verified.profile?.heroImageUrl ? [verified.profile.heroImageUrl] : undefined,
    },
  };
}

export default async function UniversalClubProfilePage({ sport, club }: { sport: string; club: string }) {
  const sportEntry = getSportBySlug(sport);
  if (!sportEntry || !sportEntry.enabled || !sportAllowsParticipantPages(sport)) notFound();

  const verified = await getPublicParticipantProfile(club, sport);
  if (!verified) notFound();

  const events = await getPublicParticipantEvents(verified.participantId);
  const profile = verified.profile;
  const clubName = verified.name;
  const sportLabel = verified.sportName || getSportLabel(sport);
  const now = Date.now();
  const upcoming = events.filter((event) => event.status === "live" || (event.status !== "finished" && new Date(event.eventDate).getTime() >= now));
  const recent = events.filter((event) => event.status === "finished" || new Date(event.eventDate).getTime() < now).reverse().slice(0, 6);
  const nextMatch = upcoming[0];
  const competitions = verified.competitions.length > 0
    ? verified.competitions
    : Array.from(new Map(events.map((event) => [event.competitionSlug, { id: event.competitionSlug, slug: event.competitionSlug, name: event.competition }])).values());
  const confirmedListings = upcoming.reduce((sum, event) => sum + event.broadcasts.filter((broadcast) => broadcast.coverageStatus === "confirmed").length, 0);
  const favorite = favoriteForParticipant(sport, verified.participantId, clubName);
  const links = socialLinks(profile);
  const flagSrc = profile?.countryCode ? `/flags/${profile.countryCode.toLowerCase()}.png` : null;

  const teamJsonLd = {
    "@context": "https://schema.org",
    "@type": "SportsTeam",
    name: clubName,
    sport: sportLabel,
    url: `https://watchtvsport.com/sports/${sport}/club/${club}`,
    foundingDate: profile?.foundedYear ? String(profile.foundedYear) : undefined,
    location: profile?.city ? { "@type": "Place", name: profile.city } : undefined,
    sameAs: links.map(([, url]) => url),
  };

  return (
    <main id="main-content" className={`v2-calendar ${styles.page}`}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(teamJsonLd) }} />
      <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: sportLabel, href: `/sports/${sport}` }, { label: clubName }]} />

      <section className={styles.hero} aria-labelledby="club-title" style={profile?.heroImageUrl ? { backgroundImage: `linear-gradient(180deg,rgba(5,15,26,.12),rgba(4,13,23,.82)),url('${profile.heroImageUrl}')` } : undefined}>
        <div className={styles.heroShade} />
        <div className={styles.heroContent}>
          <div className={styles.crest} aria-label={`${clubName} team visual`}>
            <ParticipantSportVisual sport={sport} label={clubName} countryCode={profile?.countryCode} visual={verified.visual} size="hero" />
          </div>
          <div className={styles.identity}>
            <p className="v2-eyebrow">{sportLabel} team</p>
            <h1 id="club-title">{clubName}</h1>
            <div className={styles.identityMeta}>
              {flagSrc ? <img src={flagSrc} alt="" width="24" height="16" loading="eager" /> : null}
              {profile?.city ? <span>{profile.city}</span> : null}
              {profile?.foundedYear ? <span>Founded {profile.foundedYear}</span> : null}
              {profile?.profileStatus ? <span className={styles.verifiedMark}>{profile.profileStatus === "verified" ? "Verified profile" : "Verified data"}</span> : null}
            </div>
            <p className={styles.tagline}>{profile?.summary ?? `Team information, upcoming games and verified TV and streaming options for ${clubName}.`}</p>
            <div className={styles.heroActions}><FavoriteButton favorite={favorite} /></div>
          </div>
        </div>
        <nav className={styles.tabs} aria-label={`${clubName} page sections`}>
          <a href="#overview" className={styles.activeTab}>Overview</a><a href="#matches">Matches</a><a href="#where-to-watch">Where to watch</a><a href="#club-info">Team info</a><a href="#competitions">Competitions</a>
        </nav>
      </section>

      <section id="overview" className={styles.stats} aria-label={`${clubName} summary`}>
        <div><strong>{upcoming.length}</strong><span>Upcoming games</span></div>
        <div><strong>{competitions.length}</strong><span>Competitions</span></div>
        <div><strong>{confirmedListings}</strong><span>Confirmed listings</span></div>
        {profile?.foundedYear ? <div><strong>{profile.foundedYear}</strong><span>Founded</span></div> : null}
      </section>

      <div className={styles.layout}>
        <div className={styles.mainColumn}>
          {nextMatch ? <section className={styles.section} aria-labelledby="next-match-title"><div className={styles.sectionHeader}><div><p className="v2-eyebrow">Next game</p><h2 id="next-match-title">Coming up</h2></div><Link href={nextMatch.detailPath}>Game details →</Link></div><article className={styles.nextMatch}><div className={styles.nextMatchBackdrop} /><div className={styles.nextMatchInner}><p>{nextMatch.competition}{nextMatch.stage ? ` · ${nextMatch.stage}` : ""}</p><div className={styles.versusRow}><div><span className={styles.teamBadge}>{initials(nextMatch.participant1?.name ?? "TBC")}</span><strong>{nextMatch.participant1?.name ?? "TBC"}</strong></div><span className={styles.vs}>VS</span><div><span className={styles.teamBadge}>{initials(nextMatch.participant2?.name ?? "TBC")}</span><strong>{nextMatch.participant2?.name ?? "TBC"}</strong></div></div><div className={styles.matchMeta}><LocalTime date={nextMatch.eventDate} /><span>•</span><span>{nextMatch.broadcasts.filter((b) => b.coverageStatus === "confirmed").length} confirmed listings</span></div><div className={styles.matchActions}><Link className={styles.primaryButton} href={nextMatch.detailPath}>Where to watch →</Link></div></div></article></section> : null}

          <section id="matches" className={styles.section} aria-labelledby="matches-title">
            <div className={styles.sectionHeader}><div><p className="v2-eyebrow">Schedule</p><h2 id="matches-title">Upcoming games</h2></div><span>{upcoming.length} scheduled</span></div>
            {upcoming.length === 0 ? <div className="v2-empty-state" role="status"><h3>No upcoming game currently confirmed</h3><p>The team profile remains available. New fixtures will appear here automatically as soon as a confirmed schedule is imported.</p></div> : <div className={styles.matchList}>{upcoming.map((event) => { const other = opponent(event, club); const confirmed = event.broadcasts.filter((b) => b.coverageStatus === "confirmed").length; return <article className={styles.matchRow} key={event.id}><div className={styles.dateCell}><LocalTime date={event.eventDate} /></div><div className={styles.fixtureCell}><small>{isHome(event, club) ? "Home" : "Away"}</small><strong>{isHome(event, club) ? `${clubName} vs ${other?.name ?? "TBC"}` : `${other?.name ?? "TBC"} vs ${clubName}`}</strong><span>{event.competition}{event.stage ? ` · ${event.stage}` : ""}</span></div><div className={styles.broadcastCell}><span>{confirmed} confirmed</span><Link href={event.detailPath}>Where to watch →</Link></div></article>; })}</div>}
          </section>

          {recent.length > 0 ? <section className={styles.section} aria-labelledby="recent-title"><div className={styles.sectionHeader}><div><p className="v2-eyebrow">Archive</p><h2 id="recent-title">Recent games</h2></div></div><div className={styles.archiveGrid}>{recent.map((event) => <Link href={event.detailPath} key={event.id}><strong>{event.title}</strong><span><LocalTime date={event.eventDate} /></span></Link>)}</div></section> : null}
        </div>

        <aside className={styles.sidebar}>
          <section className={styles.sideCard} id="where-to-watch"><div className={styles.sideTitle}><h2>Where to watch</h2><span>Official only</span></div><p>WatchTVSport lists confirmed legal broadcasters for each game and territory. Missing coverage is never guessed.</p>{nextMatch ? <Link href={nextMatch.detailPath}>See next game broadcasters →</Link> : <p>Broadcast links will appear when a game is confirmed.</p>}</section>
          <section className={styles.sideCard} id="club-info"><div className={styles.sideTitle}><h2>Team info</h2><span>{profile?.profileStatus === "verified" ? "Verified" : "Sourced"}</span></div><dl className={styles.factList}>{profile?.city ? <div><dt>City</dt><dd>{profile.city}</dd></div> : null}{profile?.countryCode ? <div><dt>Country</dt><dd>{flagSrc ? <img src={flagSrc} alt="" width="20" height="13" loading="lazy" /> : null}{profile.countryCode}</dd></div> : null}{profile?.foundedYear ? <div><dt>Founded</dt><dd>{profile.foundedYear}</dd></div> : null}{profile?.venueName ? <div><dt>Venue</dt><dd>{profile.venueName}</dd></div> : null}{profile?.venueCapacity ? <div><dt>Capacity</dt><dd>{profile.venueCapacity.toLocaleString("en")}</dd></div> : null}</dl>{links.length > 0 ? <div className={styles.linkList}>{links.map(([label, url]) => <a key={label} href={url} target="_blank" rel="noopener noreferrer">{label} →</a>)}</div> : null}</section>
          <section className={styles.sideCard} id="competitions"><div className={styles.sideTitle}><h2>Competitions</h2><span>{competitions.length}</span></div>{competitions.length > 0 ? <div className={styles.competitionList}>{competitions.map((competition) => <span key={competition.slug}><span className={styles.flagMark}>🏆</span><strong>{competition.name}</strong></span>)}</div> : <p>No current competition schedule has been imported yet.</p>}</section>
        </aside>
      </div>
    </main>
  );
}
