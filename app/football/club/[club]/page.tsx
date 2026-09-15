import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import Breadcrumbs from "@/components/Breadcrumbs";
import EntityVisual from "@/components/EntityVisual";
import FavoriteButton from "@/components/FavoriteButton";
import LocalTime from "@/components/LocalTime";
import SocialIconLinks, { type SocialLink } from "@/components/SocialIconLinks";
import { clubSlug, getClubAliases, getClubNameBySlug } from "@/lib/club-aliases";
import { getPublicCompetitionDirectories } from "@/lib/competition-directory";
import { getPreviewClubFixtures, isPreviewFixtureMode, type PreviewFixture } from "@/lib/dev-preview-fixtures";
import type { EventData } from "@/lib/events";
import type { FavoriteCandidate } from "@/lib/favorites";
import { getPrimaryMediaAsset } from "@/lib/public-media";
import { getPublicEventsSnapshot } from "@/lib/public-events";
import { getPublicParticipantProfile } from "@/lib/participant-profiles";
import styles from "./club-page.module.css";

type PageProps = { params: Promise<{ club: string }> };

function publicClubEvents(events: EventData[], slug: string): EventData[] {
  return events
    .filter((event) => event.sport === "football" && [event.participant1, event.participant2].some((participant) => participant?.type === "club" && clubSlug(participant.name) === slug))
    .sort((a, b) => Date.parse(a.eventDate) - Date.parse(b.eventDate));
}

function favoriteForClub(slug: string, name: string): FavoriteCandidate {
  return { kind: "participant", entityId: `club:football:${slug}`, label: `${name} (Football)` };
}

function socialLinks(profile: Awaited<ReturnType<typeof getPublicParticipantProfile>> extends infer R ? R extends { profile: infer P } ? P : never : never): SocialLink[] {
  if (!profile) return [];
  return [
    { kind: "website", href: profile.officialWebsiteUrl },
    { kind: "instagram", href: profile.instagramUrl },
    { kind: "x", href: profile.xUrl },
    { kind: "facebook", href: profile.facebookUrl },
    { kind: "youtube", href: profile.youtubeUrl },
    { kind: "tiktok", href: profile.tiktokUrl },
  ].filter((entry): entry is SocialLink => Boolean(entry.href));
}

function previewOpponent(fixture: PreviewFixture, slug: string) {
  return fixture.home.slug === slug ? fixture.away : fixture.home;
}

export async function generateStaticParams() {
  const directories = await getPublicCompetitionDirectories();
  return Array.from(new Set(directories
    .filter((competition) => competition.sport === "football")
    .flatMap((competition) => competition.members.map((member) => member.slug))))
    .map((club) => ({ club }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { club } = await params;
  const verified = await getPublicParticipantProfile(club, "football");
  const clubName = verified?.name ?? getClubNameBySlug(club);
  if (!clubName) return { title: "Club not found | WatchTVSport", robots: { index: false, follow: false } };
  const aliases = getClubAliases(clubName);
  const hero = await getPrimaryMediaAsset("participant", club, "team_hero");
  return {
    title: `${clubName} TV schedule & official broadcasters | WatchTVSport`,
    description: `Find upcoming ${clubName} matches, official TV channels and streaming options.`,
    keywords: [clubName, ...aliases, `${clubName} TV`, `${clubName} live stream`, `${clubName} schedule`],
    alternates: { canonical: `/football/club/${club}` },
    openGraph: {
      title: `${clubName} – TV schedule & where to watch`,
      description: `Upcoming ${clubName} matches and verified official broadcasters by country.`,
      url: `/football/club/${club}`,
      type: "website",
      images: hero?.url ? [hero.url] : undefined,
    },
  };
}

export default async function ClubPage({ params }: PageProps) {
  const { club } = await params;
  const previewMode = isPreviewFixtureMode();
  const [snapshot, verifiedProfile, logo, hero, previewFixtures] = await Promise.all([
    getPublicEventsSnapshot(),
    getPublicParticipantProfile(club, "football"),
    getPrimaryMediaAsset("participant", club, "team_logo"),
    getPrimaryMediaAsset("participant", club, "team_hero"),
    previewMode ? getPreviewClubFixtures(club) : Promise.resolve([]),
  ]);

  const previewIdentity = previewFixtures.find((fixture) => fixture.home.slug === club)?.home
    ?? previewFixtures.find((fixture) => fixture.away.slug === club)?.away;
  const clubName = verifiedProfile?.name ?? previewIdentity?.name ?? getClubNameBySlug(club);
  if (!clubName) notFound();

  const profile = verifiedProfile?.profile ?? null;
  const aliases = getClubAliases(clubName);
  const publishedEvents = publicClubEvents(snapshot.events, club);
  const now = Date.now();
  const upcoming = publishedEvents.filter((event) => event.status === "live" || (event.status !== "finished" && Date.parse(event.eventDate) >= now));
  const recent = publishedEvents.filter((event) => event.status === "finished" || Date.parse(event.eventDate) < now).reverse().slice(0, 6);
  const previewDated = previewFixtures.filter((fixture) => fixture.eventDate).sort((a, b) => Date.parse(a.eventDate!) - Date.parse(b.eventDate!));
  const previewTbc = previewFixtures.filter((fixture) => !fixture.eventDate);
  const previewDisplay = [...previewDated, ...previewTbc];
  const previewHomeCount = previewFixtures.filter((fixture) => fixture.home.slug === club).length;
  const previewAwayCount = previewFixtures.filter((fixture) => fixture.away.slug === club).length;
  const competitionMap = new Map<string, string>();
  for (const event of publishedEvents) competitionMap.set(event.competitionSlug, event.competition);
  for (const fixture of previewFixtures) competitionMap.set(fixture.competitionSlug, fixture.competitionName);
  const confirmedListings = upcoming.reduce((sum, event) => sum + event.broadcasts.filter((broadcast) => broadcast.coverageStatus === "confirmed").length, 0);
  const links = socialLinks(profile);
  const flagSrc = profile?.countryCode ? `/flags/${profile.countryCode.toLowerCase()}.png` : null;
  const favorite = favoriteForClub(club, clubName);

  const teamJsonLd = {
    "@context": "https://schema.org",
    "@type": "SportsTeam",
    name: clubName,
    alternateName: aliases,
    sport: "Football",
    url: `https://watchtvsport.com/football/club/${club}`,
    foundingDate: profile?.foundedYear ? String(profile.foundedYear) : undefined,
    location: profile?.city ? { "@type": "Place", name: profile.city } : undefined,
    logo: logo?.url,
    image: hero?.url,
    sameAs: links.map((link) => link.href),
  };

  return <main id="main-content" className={`v2-calendar ${styles.page}`}>
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(teamJsonLd) }} />
    <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Football", href: "/football" }, { label: clubName }]} />

    <section className={styles.hero} aria-labelledby="club-title" style={hero?.url ? { backgroundImage: `linear-gradient(180deg,rgba(5,15,26,.12),rgba(4,13,23,.82)),url('${hero.url}')` } : undefined}>
      <div className={styles.heroShade} />
      <div className={styles.heroContent}>
        <div className={styles.crest}>{logo?.url ? <img src={logo.url} alt={logo.alt ?? `${clubName} logo`} loading="eager" /> : <EntityVisual entityId={previewIdentity?.id ?? `club:football:${club}`} label={clubName} size="lg" />}</div>
        <div className={styles.identity}>
          <p className="v2-eyebrow">Football club</p>
          <h1 id="club-title">{clubName}</h1>
          <div className={styles.identityMeta}>
            {profile?.city ? <span>{profile.city}</span> : null}
            {profile?.foundedYear ? <span>Founded {profile.foundedYear}</span> : null}
            {profile?.profileStatus ? <span className={styles.verifiedMark}>{profile.profileStatus === "verified" ? "Verified profile" : "Verified data"}</span> : null}
            {previewMode && previewFixtures.length ? <span className={styles.verifiedMark}>Local fixture preview</span> : null}
          </div>
          <p className={styles.tagline}>{profile?.summary ?? `Official fixtures and verified TV and streaming options by country for ${clubName}.`}</p>
          <div className={styles.heroActions}><FavoriteButton favorite={favorite} />{aliases.length ? <span className={styles.aliases}>Also known as {aliases.slice(0, 4).join(" · ")}</span> : null}</div>
        </div>
      </div>
      <nav className={styles.tabs} aria-label={`${clubName} page sections`}><a href="#overview" className={styles.activeTab}>Overview</a><a href="#matches">Matches</a><a href="#where-to-watch">Where to watch</a><a href="#club-info">Club info</a><a href="#competitions">Competitions</a></nav>
    </section>

    <section id="overview" className={styles.stats} aria-label={`${clubName} summary`}>
      <div><strong>{previewMode ? previewFixtures.length : upcoming.length}</strong><span>{previewMode ? "Verified season fixtures" : "Upcoming matches"}</span></div>
      <div><strong>{competitionMap.size}</strong><span>Competitions</span></div>
      <div><strong>{previewMode ? `${previewHomeCount}/${previewAwayCount}` : confirmedListings}</strong><span>{previewMode ? "Home / away" : "Confirmed listings"}</span></div>
      {profile?.foundedYear ? <div><strong>{profile.foundedYear}</strong><span>Founded</span></div> : null}
    </section>

    <div className={styles.layout}>
      <div className={styles.mainColumn}>
        {previewMode && previewFixtures.length ? <section id="matches" className={styles.section} aria-labelledby="preview-matches-title">
          <div className={styles.sectionHeader}><div><p className="v2-eyebrow">Local development preview</p><h2 id="preview-matches-title">2026/27 verified fixtures</h2></div><span>{previewDated.length} dated · {previewTbc.length} TBC</span></div>
          <div className={styles.matchList}>{previewDisplay.map((fixture) => {
            const home = fixture.home.slug === club;
            const other = previewOpponent(fixture, club);
            return <article className={styles.matchRow} key={fixture.id}>
              <div className={styles.dateCell}>{fixture.eventDate ? <LocalTime date={fixture.eventDate} /> : <span>Kickoff TBC</span>}</div>
              <div className={styles.fixtureIdentity}>
                <EntityVisual entityId={other.id} label={other.name} size="sm" imageUrl={other.logoUrl} imageAlt={`${other.name} logo`} />
                <div className={styles.fixtureCell}><small>{home ? "Home" : "Away"}</small><strong>{home ? `${clubName} vs ${other.name}` : `${other.name} vs ${clubName}`}</strong><span>{fixture.competitionName}{fixture.phase ? ` · ${fixture.phase}` : ""}</span></div>
              </div>
              <div className={styles.broadcastCell}><span>Unpublished</span><Link href={`/football/competition/${fixture.competitionSlug}`}>Competition →</Link></div>
            </article>;
          })}</div>
        </section> : null}

        <section className={styles.section} aria-labelledby="published-matches-title">
          <div className={styles.sectionHeader}><div><p className="v2-eyebrow">Published schedule</p><h2 id="published-matches-title">Upcoming matches</h2></div><span>{upcoming.length} scheduled</span></div>
          {upcoming.length === 0 ? <div className="v2-empty-state" role="status"><h3>No public fixture is published yet</h3><p>{previewMode && previewFixtures.length ? "Verified fixtures are visible above in local preview only." : "New fixtures will appear here as soon as they are approved for public display."}</p></div> : <div className={styles.matchList}>{upcoming.map((event) => {
            const home = event.participant1 && clubSlug(event.participant1.name) === club;
            const other = home ? event.participant2 : event.participant1;
            const confirmed = event.broadcasts.filter((broadcast) => broadcast.coverageStatus === "confirmed").length;
            return <article className={styles.matchRow} key={event.id}><div className={styles.dateCell}><LocalTime date={event.eventDate} /></div><div className={styles.fixtureIdentity}>{other ? <EntityVisual entityId={other.id} label={other.name} size="sm" imageUrl={other.logoUrl} imageAlt={`${other.name} logo`} /> : null}<div className={styles.fixtureCell}><small>{home ? "Home" : "Away"}</small><strong>{home ? `${clubName} vs ${other?.name ?? "TBC"}` : `${other?.name ?? "TBC"} vs ${clubName}`}</strong><span>{event.competition}{event.stage ? ` · ${event.stage}` : ""}</span></div></div><div className={styles.broadcastCell}><span>{confirmed} confirmed</span><Link href={event.detailPath}>Where to watch →</Link></div></article>;
          })}</div>}
        </section>

        {recent.length ? <section className={styles.section} aria-labelledby="recent-title"><div className={styles.sectionHeader}><div><p className="v2-eyebrow">Archive</p><h2 id="recent-title">Recent matches</h2></div></div><div className={styles.archiveGrid}>{recent.map((event) => <Link href={event.detailPath} key={event.id}><strong>{event.title}</strong><span><LocalTime date={event.eventDate} /></span></Link>)}</div></section> : null}
      </div>

      <aside className={styles.sidebar}>
        <section className={styles.sideCard} id="where-to-watch"><div className={styles.sideTitle}><h2>Where to watch</h2><span>Official only</span></div><p>Broadcast information appears only after territorial rights or match coverage has been verified.</p></section>
        <section className={styles.sideCard} id="club-info"><div className={styles.sideTitle}><h2>Club info</h2><span>{profile?.profileStatus === "verified" ? "Verified" : "Sourced"}</span></div><dl className={styles.factList}>{profile?.city ? <div><dt>City</dt><dd>{profile.city}</dd></div> : null}{profile?.countryCode ? <div><dt>Country</dt><dd>{flagSrc ? <img src={flagSrc} alt="" width="20" height="13" loading="lazy" /> : null}{profile.countryCode}</dd></div> : null}{profile?.foundedYear ? <div><dt>Founded</dt><dd>{profile.foundedYear}</dd></div> : null}{profile?.venueName ? <div><dt>Stadium</dt><dd>{profile.venueName}</dd></div> : null}{profile?.venueCapacity ? <div><dt>Capacity</dt><dd>{profile.venueCapacity.toLocaleString("en")}</dd></div> : null}</dl><SocialIconLinks links={links} className={styles.socialIcons} /></section>
        <section className={styles.sideCard} id="competitions"><div className={styles.sideTitle}><h2>Competitions</h2><span>{competitionMap.size}</span></div><div className={styles.competitionList}>{Array.from(competitionMap.entries()).map(([slug, name]) => <Link href={`/football/competition/${slug}`} key={slug}><span className={styles.flagMark}>🏆</span><strong>{name}</strong><span>View →</span></Link>)}</div></section>
        <section className={styles.sideCard}><div className={styles.sideTitle}><h2>Club identity</h2></div><div className={styles.identityRow}><EntityVisual entityId={previewIdentity?.id ?? `club:football:${club}`} label={clubName} size="md" imageUrl={logo?.url} imageAlt={`${clubName} logo`} /><div><strong>{clubName}</strong><span>Football club</span></div></div>{verifiedProfile?.sources.length ? <p className={styles.sourceNote}>Profile data backed by {verifiedProfile.sources.length} verified source{verifiedProfile.sources.length === 1 ? "" : "s"}.</p> : null}</section>
      </aside>
    </div>
  </main>;
}
