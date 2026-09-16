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

const SITE_URL = "https://watchtvsport.com";

function normalizedSlug(value: string): string {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/&/g, " and ").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function participantMatches(participant: Participant | undefined, participantId: string, slug: string): boolean {
  if (!participant) return false;
  return participant.id === participantId || participant.slug === slug || normalizedSlug(participant.name) === slug;
}

function opponent(event: EventData, participantId: string, slug: string): Participant | undefined {
  return [event.participant1, event.participant2].find((participant) => participant && !participantMatches(participant, participantId, slug));
}

function isHome(event: EventData, participantId: string, slug: string): boolean {
  return participantMatches(event.participant1, participantId, slug);
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

function sportHubHref(sport: string): string {
  if (sport === "football") return "/football";
  if (sport === "formula-1") return "/formula-1";
  if (sport === "ufc") return "/ufc";
  return `/sports/${sport}`;
}

function competitionHref(sport: string, competitionSlug: string): string {
  if (sport === "football") return `/football/competition/${competitionSlug}`;
  return `/sports/${sport}/competition/${competitionSlug}`;
}

function sportBackdrop(sport: string): string {
  if (["football", "basketball", "hockey", "formula-1", "motogp", "tennis", "ufc"].includes(sport)) {
    return `/sports/${sport}.webp`;
  }
  return "/sports/all-sports.webp";
}

function foundedLabel(sport: string): string {
  return sport === "basketball" || sport === "hockey" || sport === "american-football" ? "Franchise founded" : "Founded";
}

function canonicalClubPath(sport: string, club: string): string {
  return `/sports/${sport}/club/${club}`;
}

function absoluteUrl(path: string): string {
  return `${SITE_URL}${path}`;
}

export async function buildUniversalClubMetadata(sport: string, club: string): Promise<Metadata> {
  const sportEntry = getSportBySlug(sport);
  if (!sportEntry || !sportEntry.enabled || !sportAllowsParticipantPages(sport)) {
    return { title: "Team not found | WatchTVSport", robots: { index: false, follow: false } };
  }

  const verified = await getPublicParticipantProfile(club, sport);
  if (!verified) return { title: "Team not found | WatchTVSport", robots: { index: false, follow: false } };

  const events = await getPublicParticipantEvents(verified.participantId);
  const now = Date.now();
  const nextMatch = events.find((event) => event.status === "live" || (event.status !== "finished" && new Date(event.eventDate).getTime() >= now));
  const nextOpponent = nextMatch ? opponent(nextMatch, verified.participantId, club) : undefined;
  const sportLabel = verified.sportName || getSportLabel(sport);
  const canonicalPath = canonicalClubPath(sport, club);
  const image = verified.profile?.heroImageUrl || sportBackdrop(sport);
  const nextMatchText = nextOpponent ? ` Next match: ${verified.name} vs ${nextOpponent.name}.` : "";
  const description = `See ${verified.name}'s upcoming ${sportLabel} schedule and official TV and streaming broadcasters by country.${nextMatchText} Team information and competitions.`;

  return {
    title: `${verified.name} TV Schedule & Next Match | WatchTVSport`,
    description,
    alternates: { canonical: canonicalPath },
    robots: { index: true, follow: true },
    openGraph: {
      title: `${verified.name} TV Schedule, Next Match & Where to Watch`,
      description,
      url: canonicalPath,
      type: "website",
      images: [image],
    },
    twitter: {
      card: "summary_large_image",
      title: `${verified.name} TV Schedule & Next Match`,
      description,
      images: [image],
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
  const fallbackBackdrop = sportBackdrop(sport);
  const heroImage = profile?.heroImageUrl || fallbackBackdrop;
  const nextOpponent = nextMatch ? opponent(nextMatch, verified.participantId, club) : undefined;
  const teamIsHome = nextMatch ? isHome(nextMatch, verified.participantId, club) : false;
  const canonicalPath = canonicalClubPath(sport, club);
  const canonicalUrl = absoluteUrl(canonicalPath);

  const teamJsonLd = {
    "@context": "https://schema.org",
    "@type": "SportsTeam",
    "@id": `${canonicalUrl}#team`,
    name: clubName,
    description: profile?.summary ?? `${clubName} ${sportLabel} team profile, schedule and official broadcaster guide.`,
    sport: sportLabel,
    url: canonicalUrl,
    foundingDate: profile?.foundedYear ? String(profile.foundedYear) : undefined,
    location: profile?.city ? {
      "@type": "Place",
      name: profile.venueName || profile.city,
      address: {
        "@type": "PostalAddress",
        addressLocality: profile.city,
        addressCountry: profile.countryCode || undefined,
      },
    } : undefined,
    memberOf: competitions.map((competition) => ({
      "@type": "SportsOrganization",
      name: competition.name,
      url: absoluteUrl(competitionHref(sport, competition.slug)),
    })),
    sameAs: links.map(([, url]) => url),
  };

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
      { "@type": "ListItem", position: 2, name: sportLabel, item: absoluteUrl(sportHubHref(sport)) },
      { "@type": "ListItem", position: 3, name: clubName, item: canonicalUrl },
    ],
  };

  return (
    <main id="main-content" className={`v2-calendar ${styles.page}`}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(teamJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />
      <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: sportLabel, href: sportHubHref(sport) }, { label: clubName }]} />

      <section
        className={styles.hero}
        aria-labelledby="club-title"
        style={{ backgroundImage: `linear-gradient(90deg,rgba(2,9,17,.98) 0%,rgba(3,12,22,.89) 46%,rgba(3,13,23,.48) 100%),url('${heroImage}')` }}
      >
        <div className={styles.heroGlow} aria-hidden="true" />
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
              {profile?.foundedYear ? <span>{foundedLabel(sport)} {profile.foundedYear}</span> : null}
              {profile?.profileStatus ? <span className={styles.verifiedMark}>{profile.profileStatus === "verified" ? "Verified profile" : "Sourced profile"}</span> : null}
            </div>
            <p className={styles.tagline}>{profile?.summary ?? `Upcoming games, team information and verified broadcaster listings for ${clubName}.`}</p>
            <div className={styles.heroActions}>
              <FavoriteButton favorite={favorite} />
              {profile?.officialWebsiteUrl ? <a className={styles.ghostButton} href={profile.officialWebsiteUrl} target="_blank" rel="noopener noreferrer">Official site ↗</a> : null}
            </div>
          </div>

          {nextMatch ? (
            <aside className={styles.heroNext} aria-label={`${clubName} next game`}>
              <div className={styles.heroNextTop}><span>Next game</span><small>{teamIsHome ? "HOME" : "AWAY"}</small></div>
              <strong>{nextOpponent?.name ?? nextMatch.title}</strong>
              <span className={styles.heroNextCompetition}>{nextMatch.competition}</span>
              <div className={styles.heroNextTime}><LocalTime date={nextMatch.eventDate} /></div>
              <Link href={nextMatch.detailPath}>Open match page →</Link>
            </aside>
          ) : null}
        </div>

        <nav className={styles.tabs} aria-label={`${clubName} page sections`}>
          <a href="#matches" className={styles.activeTab}>Matches</a>
          <a href="#team-info">Team info</a>
          <a href="#competitions">Competitions</a>
          {recent.length > 0 ? <a href="#recent">Recent</a> : null}
        </nav>
      </section>

      <section className={styles.quickFacts} aria-label={`${clubName} summary`}>
        <div><strong>{upcoming.length}</strong><span>Upcoming</span></div>
        <div><strong>{competitions.length}</strong><span>Competitions</span></div>
        <div><strong>{confirmedListings}</strong><span>TV listings</span></div>
        <div><strong>{profile?.venueName ?? "TBC"}</strong><span>Home venue</span></div>
      </section>

      <div className={styles.topGrid}>
        {nextMatch ? (
          <section className={`${styles.section} ${styles.featureSection}`} aria-labelledby="next-match-title">
            <div className={styles.sectionHeader}>
              <div><p className="v2-eyebrow">Next game</p><h2 id="next-match-title">{nextMatch.title}</h2></div>
              <Link href={nextMatch.detailPath}>Match page →</Link>
            </div>
            <article className={styles.nextMatchCompact} style={{ backgroundImage: `linear-gradient(90deg,rgba(3,11,19,.94),rgba(3,11,19,.72)),url('${fallbackBackdrop}')` }}>
              <div className={styles.compactTeam}>
                {nextMatch.participant1 ? <ParticipantSportVisual sport={sport} label={nextMatch.participant1.name} countryCode={nextMatch.participant1.countryCode} visual={nextMatch.participant1.visualProfile} size="md" /> : <span className={styles.tbcVisual}>TBC</span>}
                <strong>{nextMatch.participant1?.name ?? "TBC"}</strong>
              </div>

              <div className={styles.compactKickoff}>
                <span>{nextMatch.competition}</span>
                <strong><LocalTime date={nextMatch.eventDate} /></strong>
                <small>{nextMatch.stage ?? "Scheduled"}</small>
              </div>

              <div className={styles.compactTeam}>
                {nextMatch.participant2 ? <ParticipantSportVisual sport={sport} label={nextMatch.participant2.name} countryCode={nextMatch.participant2.countryCode} visual={nextMatch.participant2.visualProfile} size="md" /> : <span className={styles.tbcVisual}>TBC</span>}
                <strong>{nextMatch.participant2?.name ?? "TBC"}</strong>
              </div>

              <div className={styles.compactAction}>
                <span>{nextMatch.broadcasts.filter((b) => b.coverageStatus === "confirmed").length > 0 ? `${nextMatch.broadcasts.filter((b) => b.coverageStatus === "confirmed").length} confirmed listings` : "Broadcasters by country on match page"}</span>
                <Link className={styles.primaryButton} href={nextMatch.detailPath}>Broadcasters & details →</Link>
              </div>
            </article>
          </section>
        ) : (
          <section className={`${styles.section} ${styles.featureSection}`}>
            <div className={styles.sectionHeader}><div><p className="v2-eyebrow">Next game</p><h2>Schedule pending</h2></div></div>
            <div className={styles.noNextMatch}>No upcoming game is currently confirmed. New fixtures will appear automatically when imported.</div>
          </section>
        )}

        <aside className={styles.infoStack} aria-label={`${clubName} team information`}>
          <section className={`${styles.sideCard} ${styles.teamInfoCard}`} id="team-info">
            <div className={styles.sideTitle}><h2>Team info</h2><span>{profile?.profileStatus === "verified" ? "Verified" : "Sourced"}</span></div>
            <dl className={styles.factList}>
              {profile?.city ? <div><dt>City</dt><dd>{profile.city}</dd></div> : null}
              {profile?.countryCode ? <div><dt>Country</dt><dd>{flagSrc ? <img src={flagSrc} alt="" width="20" height="13" loading="lazy" /> : null}{profile.countryCode}</dd></div> : null}
              {profile?.foundedYear ? <div><dt>{foundedLabel(sport)}</dt><dd>{profile.foundedYear}</dd></div> : null}
              {profile?.venueName ? <div><dt>Venue</dt><dd>{profile.venueName}</dd></div> : null}
              {profile?.venueCapacity ? <div><dt>Capacity</dt><dd>{profile.venueCapacity.toLocaleString("en")}</dd></div> : null}
            </dl>
            {links.length > 0 ? <div className={styles.linkList}>{links.map(([label, url]) => <a key={label} href={url} target="_blank" rel="noopener noreferrer">{label} ↗</a>)}</div> : null}
          </section>

          <section className={`${styles.sideCard} ${styles.competitionCard}`} id="competitions">
            <div className={styles.sideTitle}><h2>Competitions</h2><span>{competitions.length}</span></div>
            {competitions.length > 0 ? (
              <div className={styles.competitionList}>
                {competitions.map((competition) => <Link key={competition.slug} href={competitionHref(sport, competition.slug)}><span className={styles.flagMark}>◆</span><strong>{competition.name}</strong><span>Open →</span></Link>)}
              </div>
            ) : <p>No current competition has been imported yet.</p>}
          </section>

          <section className={`${styles.sideCard} ${styles.guideCard}`}>
            <div className={styles.sideTitle}><h2>TV guide</h2><span>Official only</span></div>
            <p>Official broadcasters are listed by country on each match page.</p>
            {nextMatch ? <Link href={nextMatch.detailPath}>Open next match →</Link> : <Link href="/events">Browse events →</Link>}
          </section>
        </aside>
      </div>

      <section id="matches" className={`${styles.section} ${styles.scheduleSection}`} aria-labelledby="matches-title">
        <div className={styles.sectionHeader}>
          <div><p className="v2-eyebrow">Schedule</p><h2 id="matches-title">Upcoming games</h2></div>
          <span>{upcoming.length} scheduled</span>
        </div>
        {upcoming.length === 0 ? (
          <div className="v2-empty-state" role="status"><h3>No upcoming game currently confirmed</h3><p>New fixtures will appear here automatically as soon as a confirmed schedule is imported.</p></div>
        ) : (
          <div className={styles.matchList}>
            {upcoming.map((event) => {
              const home = isHome(event, verified.participantId, club);
              const other = opponent(event, verified.participantId, club);
              const confirmed = event.broadcasts.filter((b) => b.coverageStatus === "confirmed").length;
              return (
                <article className={styles.matchRow} key={event.id}>
                  <div className={styles.dateCell}><LocalTime date={event.eventDate} /></div>
                  <div className={styles.opponentVisual}>
                    {other ? <ParticipantSportVisual sport={sport} label={other.name} countryCode={other.countryCode} visual={other.visualProfile} size="sm" /> : <span>TBC</span>}
                  </div>
                  <div className={styles.fixtureCell}>
                    <small>{home ? "HOME" : "AWAY"} · {event.competition}</small>
                    <strong>{home ? `${clubName} vs ${other?.name ?? "TBC"}` : `${other?.name ?? "TBC"} vs ${clubName}`}</strong>
                    <span>{event.stage ?? "Event"}</span>
                  </div>
                  <div className={styles.broadcastCell}>
                    <span>{confirmed > 0 ? `${confirmed} confirmed` : "Listings pending"}</span>
                    <Link href={event.detailPath}>Match page →</Link>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      {recent.length > 0 ? (
        <section id="recent" className={`${styles.section} ${styles.recentSection}`} aria-labelledby="recent-title">
          <div className={styles.sectionHeader}><div><p className="v2-eyebrow">Archive</p><h2 id="recent-title">Recent games</h2></div></div>
          <div className={styles.archiveGrid}>{recent.map((event) => <Link href={event.detailPath} key={event.id}><strong>{event.title}</strong><span><LocalTime date={event.eventDate} /></span><small>{event.competition}</small></Link>)}</div>
        </section>
      ) : null}
    </main>
  );
}
