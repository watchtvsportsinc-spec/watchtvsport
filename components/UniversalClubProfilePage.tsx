import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import Breadcrumbs from "@/components/Breadcrumbs";
import FavoriteButton from "@/components/FavoriteButton";
import FavoriteAwareClubMatch from "@/components/FavoriteAwareClubMatch";
import LocalTime from "@/components/LocalTime";
import ParticipantLogo from "@/components/ParticipantLogo";
import { resolveClubSlug } from "@/lib/club-aliases";
import type { EventData, Participant } from "@/lib/events";
import type { FavoriteCandidate } from "@/lib/favorites";
import { getPublicParticipantEvents } from "@/lib/public-participant-events";
import { getApprovedMediaAssets } from "@/lib/public-media-assets";
import { getPublicParticipantProfile } from "@/lib/participant-profiles";
import { evaluateSeoEligibility, indexableRobots } from "@/lib/seo-indexability";
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

function participantSlug(participant?: Participant): string | null {
  if (!participant || participant.type !== "club") return null;
  return participant.slug || resolveClubSlug(participant.name);
}

function participantLogoKey(participant?: Participant): string | null {
  if (!participant) return null;
  if (participant.slug) return participant.slug;
  if (participant.id.includes(":")) {
    const value = participant.id.split(":").at(-1);
    if (value) return value;
  }
  return normalizedSlug(participant.name);
}

function favoriteParticipantId(sport: string, participant?: Participant): string | null {
  if (!participant) return null;
  if (participant.type !== "club") return participant.id;
  const slug = sport === "football"
    ? resolveClubSlug(participant.name)
    : participant.slug || normalizedSlug(participant.name);
  return `club:${sport}:${slug}`;
}

function confirmedAccess(event: EventData): { free: boolean; paid: boolean; count: number } {
  const broadcasts = event.broadcasts.filter((broadcast) => broadcast.coverageStatus === "confirmed");
  return {
    free: broadcasts.some((broadcast) => broadcast.access === "Free"),
    paid: broadcasts.some((broadcast) => broadcast.access === "Paid"),
    count: broadcasts.length,
  };
}

function opponent(event: EventData, participantId: string, slug: string): Participant | undefined {
  return [event.participant1, event.participant2].find((participant) => participant && !participantMatches(participant, participantId, slug));
}

function favoriteForParticipant(sport: string, club: string, label: string): FavoriteCandidate {
  const slug = sport === "football" ? resolveClubSlug(club) : normalizedSlug(club || label);
  return {
    kind: "participant",
    entityId: `club:${sport}:${slug}`,
    label: `${label} (${getSportLabel(sport)})`,
    href: `/sports/${sport}/club/${slug}`,
  };
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
  const verifiedBroadcastCount = events.reduce(
    (sum, event) => sum + event.broadcasts.filter((broadcast) => broadcast.coverageStatus === "confirmed").length,
    0,
  );
  const usefulContentCount = [
    verified.profile?.summary,
    verified.profile?.city,
    verified.profile?.foundedYear,
    verified.profile?.venueName,
    verified.profile?.officialWebsiteUrl,
    verified.competitions.length > 0 ? verified.competitions.length : undefined,
  ].filter(Boolean).length;
  const eligibility = evaluateSeoEligibility({
    kind: "participant",
    canonicalPath,
    eventCount: events.length,
    verifiedBroadcastCount,
    usefulContentCount,
    hasVerifiedProfile: Boolean(verified.profile),
  });

  return {
    title: `${verified.name} TV Schedule & Next Match | WatchTVSport`,
    description,
    alternates: { canonical: canonicalPath },
    robots: indexableRobots(eligibility.indexable),
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
  const favorite = favoriteForParticipant(sport, club, clubName);
  const links = socialLinks(profile);
  const flagSrc = profile?.countryCode ? `/flags/${profile.countryCode.toLowerCase()}.png` : null;
  const heroImage = profile?.heroImageUrl || sportBackdrop(sport);
  const canonicalPath = canonicalClubPath(sport, club);
  const canonicalUrl = absoluteUrl(canonicalPath);
  const verifiedParticipantId = verified.participantId;
  const verifiedVisual = verified.visual;

  const clubSlugs = Array.from(new Set(
    [...upcoming, ...recent].flatMap((event) => [participantSlug(event.participant1), participantSlug(event.participant2)]
      .filter((slug): slug is string => Boolean(slug))),
  ));
  const participantLogoKeys = Array.from(new Set([club, ...clubSlugs]));
  const [profileEntries, participantLogos] = await Promise.all([
    Promise.all(clubSlugs.map(async (slug) => [slug, await getPublicParticipantProfile(slug, sport)] as const)),
    getApprovedMediaAssets("participant", "team_logo", participantLogoKeys),
  ]);
  const participantProfiles = new Map(profileEntries);
  const clubLogoUrl = participantLogos[club]?.url;

  function visualForParticipant(participant?: Participant) {
    if (!participant) return null;
    if (participant.visualProfile) return participant.visualProfile;
    if (participantMatches(participant, verifiedParticipantId, club)) return verifiedVisual;
    const slug = participantSlug(participant);
    return slug ? participantProfiles.get(slug)?.visual ?? null : null;
  }

  function logoForParticipant(participant?: Participant) {
    const key = participantLogoKey(participant);
    return key ? participantLogos[key]?.url : undefined;
  }

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

  return (
    <main id="main-content" className={`v2-calendar ${styles.page}`}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(teamJsonLd) }} />
      <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: sportLabel, href: sportHubHref(sport) }, { label: clubName }]} />

      <section
        className={styles.hero}
        aria-labelledby="club-title"
        style={{ backgroundImage: `linear-gradient(90deg,rgba(2,9,17,.96) 0%,rgba(3,12,22,.84) 48%,rgba(3,13,23,.48) 100%),url('${heroImage}')` }}
      >
        <div className={styles.heroGlow} aria-hidden="true" />
        <div className={styles.heroFavorite}>
          <FavoriteButton favorite={favorite} compact />
        </div>

        <div className={styles.heroMain}>
          <div className={styles.crest} aria-label={`${clubName} team visual`}>
            <ParticipantLogo sport={sport} label={clubName} logoUrl={clubLogoUrl} countryCode={profile?.countryCode} visual={verified.visual} size="hero" />
          </div>

          <div className={styles.identity}>
            <p className="v2-eyebrow">{sportLabel} team</p>
            <h1 id="club-title">{clubName}</h1>
            <div className={styles.identityMeta}>
              {flagSrc ? <img src={flagSrc} alt="" width="24" height="16" loading="eager" /> : null}
              {profile?.city ? <span>{profile.city}</span> : null}
              {profile?.foundedYear ? <span>{foundedLabel(sport)} {profile.foundedYear}</span> : null}
              {profile?.profileStatus ? <span className={styles.verifiedMark}>{profile.profileStatus === "verified" ? "Verified profile" : "Sourced profile"}</span> : null}
              {profile?.officialWebsiteUrl ? <a className={styles.officialLink} href={profile.officialWebsiteUrl} target="_blank" rel="noopener noreferrer">Official site ↗</a> : null}
            </div>

            <div className={styles.heroStats} aria-label={`${clubName} quick facts`}>
              <div><span className={styles.statIcon} aria-hidden="true">▦</span><strong>{upcoming.length}</strong><small>Upcoming</small></div>
              <div className={styles.competitionStat}>
                <span className={styles.statIcon} aria-hidden="true">◆</span>
                <div className={styles.competitionTop}>
                  <strong>{competitions.length}</strong>
                  <small>Competition{competitions.length === 1 ? "" : "s"}</small>
                </div>
                <div className={styles.competitionSummary}>
                  {competitions.length > 0 ? (
                    <>
                      {competitions.slice(0, 2).map((competition) => (
                        <Link key={competition.slug} href={competitionHref(sport, competition.slug)}>{competition.name}</Link>
                      ))}
                      {competitions.length > 2 ? <span>+{competitions.length - 2}</span> : null}
                    </>
                  ) : <span>TBC</span>}
                </div>
              </div>
              <div><span className={styles.statIcon} aria-hidden="true">▣</span><strong>{confirmedListings}</strong><small>TV listings</small></div>
              <div className={styles.venueStat}><span className={styles.statIcon} aria-hidden="true">⌂</span><strong>{profile?.venueName ?? "TBC"}</strong><small>Home venue</small></div>
            </div>

            {nextMatch ? (
              <Link href={nextMatch.detailPath} className={styles.heroNextBar}>
                <span className={styles.nextLabel}>Next:</span>
                <strong>{nextMatch.title}</strong>
                <span className={styles.nextDot}>·</span>
                <span><LocalTime date={nextMatch.eventDate} /></span>
                <span className={styles.nextArrow} aria-hidden="true">›</span>
              </Link>
            ) : null}
          </div>
        </div>
      </section>

      <section id="matches" className={`${styles.section} ${styles.scheduleSection}`} aria-labelledby="matches-title">
        <div className={styles.sectionHeader}>
          <div><p className="v2-eyebrow">Schedule</p><h2 id="matches-title">Upcoming matches</h2></div>
          <span>{upcoming.length} scheduled</span>
        </div>
        {upcoming.length === 0 ? (
          <div className="v2-empty-state" role="status"><h3>No upcoming game currently confirmed</h3><p>New fixtures will appear here automatically as soon as a confirmed schedule is imported.</p></div>
        ) : (
          <div className={styles.matchList}>
            {upcoming.map((event, index) => {
              const access = confirmedAccess(event);
              const favoriteTeams = [event.participant1, event.participant2]
                .map((participant) => {
                  const id = favoriteParticipantId(sport, participant);
                  return id && participant ? { id, label: participant.name } : null;
                })
                .filter((item): item is { id: string; label: string } => Boolean(item));

              return (
                <FavoriteAwareClubMatch key={event.id} teams={favoriteTeams} isNext={index === 0}>
                  <Link href={event.detailPath} className={styles.matchRow}>
                    <span className={`${styles.matchTeam} ${styles.matchTeamLeft}`}>
                      {event.participant1 ? <ParticipantLogo sport={sport} label={event.participant1.name} logoUrl={logoForParticipant(event.participant1)} countryCode={event.participant1.countryCode} visual={visualForParticipant(event.participant1)} size="sm" /> : <span className={styles.matchTbc}>?</span>}
                      <strong>{event.participant1?.name ?? "TBC"}</strong>
                    </span>

                    <span className={styles.matchMeta}>
                      <span className={styles.matchMetaTop}>
                        {index === 0 ? <b className={styles.nextPill}>Next</b> : null}
                        <span>{event.competition}</span>
                      </span>
                      <span className={styles.matchTime}><LocalTime date={event.eventDate} /></span>
                      <small>{event.stage ?? "Fixture"}</small>
                    </span>

                    <span className={`${styles.matchTeam} ${styles.matchTeamRight}`}>
                      <strong>{event.participant2?.name ?? "TBC"}</strong>
                      {event.participant2 ? <ParticipantLogo sport={sport} label={event.participant2.name} logoUrl={logoForParticipant(event.participant2)} countryCode={event.participant2.countryCode} visual={visualForParticipant(event.participant2)} size="sm" /> : <span className={styles.matchTbc}>?</span>}
                    </span>

                    <span className={styles.matchAccess} aria-label={access.count ? `${access.count} confirmed broadcaster${access.count === 1 ? "" : "s"}` : "Broadcasters to be confirmed"}>
                      {access.paid ? <span className="v2-chip is-paid">Paid</span> : null}
                      {access.free ? <span className="v2-chip is-free">Free</span> : null}
                      {!access.paid && !access.free ? <span className={styles.tvTbc}>TV TBC</span> : null}
                    </span>

                    <span className={styles.matchArrow} aria-hidden="true">›</span>
                  </Link>
                </FavoriteAwareClubMatch>
              );
            })}
          </div>
        )}
      </section>

      {recent.length > 0 ? (
        <section id="recent" className={`${styles.section} ${styles.recentSection}`} aria-labelledby="recent-title">
          <div className={styles.sectionHeader}><div><p className="v2-eyebrow">Archive</p><h2 id="recent-title">Recent games</h2></div><span>{recent.length} recent</span></div>
          <div className={styles.recentList}>
            {recent.map((event) => (
              <Link href={event.detailPath} key={event.id} className={styles.recentRow}>
                <span className={`${styles.recentTeam} ${styles.recentTeamLeft}`}>
                  {event.participant1 ? <ParticipantLogo sport={sport} label={event.participant1.name} logoUrl={logoForParticipant(event.participant1)} countryCode={event.participant1.countryCode} visual={visualForParticipant(event.participant1)} size="sm" /> : null}
                  <strong>{event.participant1?.name ?? "TBC"}</strong>
                </span>
                <span className={styles.recentMeta}>
                  <span>{event.competition}</span>
                  <small><LocalTime date={event.eventDate} /></small>
                </span>
                <span className={`${styles.recentTeam} ${styles.recentTeamRight}`}>
                  <strong>{event.participant2?.name ?? "TBC"}</strong>
                  {event.participant2 ? <ParticipantLogo sport={sport} label={event.participant2.name} logoUrl={logoForParticipant(event.participant2)} countryCode={event.participant2.countryCode} visual={visualForParticipant(event.participant2)} size="sm" /> : null}
                </span>
                <span className={styles.matchArrow} aria-hidden="true">›</span>
              </Link>
            ))}
          </div>
        </section>
      ) : null}
    </main>
  );
}
