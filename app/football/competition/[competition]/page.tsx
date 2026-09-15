import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import Breadcrumbs from "@/components/Breadcrumbs";
import EntityVisual from "@/components/EntityVisual";
import FavoriteButton from "@/components/FavoriteButton";
import LocalTime from "@/components/LocalTime";
import { clubSlug } from "@/lib/club-aliases";
import { getPublicCompetitionDirectories, getPublicCompetitionDirectory } from "@/lib/competition-directory";
import { getPreviewCompetitionFixtures, isPreviewFixtureMode } from "@/lib/dev-preview-fixtures";
import { getAllEvents, type EventData } from "@/lib/events";
import type { FavoriteCandidate } from "@/lib/favorites";
import { getPrimaryMediaAsset } from "@/lib/public-media";
import { getPublicEventsSnapshot } from "@/lib/public-events";

type PageProps = { params: Promise<{ competition: string }> };

function footballCompetitionEvents(events: EventData[], slug: string): EventData[] {
  return events
    .filter((event) => event.sport === "football" && event.competitionSlug === slug)
    .sort((a, b) => new Date(a.eventDate).getTime() - new Date(b.eventDate).getTime());
}

function competitionFavorite(slug: string, label: string): FavoriteCandidate {
  return { kind: "competition", entityId: `football:${slug}`, label: `${label} (Football)` };
}

function participantLink(name?: string) {
  return name ? `/football/club/${clubSlug(name)}` : null;
}

export async function generateStaticParams() {
  const directories = await getPublicCompetitionDirectories();
  return Array.from(new Set([
    ...getAllEvents().filter((event) => event.sport === "football").map((event) => event.competitionSlug),
    ...directories.filter((competition) => competition.sport === "football").map((competition) => competition.slug),
  ])).map((competition) => ({ competition }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { competition } = await params;
  const [snapshot, directory, logo] = await Promise.all([
    getPublicEventsSnapshot(),
    getPublicCompetitionDirectory("football", competition),
    getPrimaryMediaAsset("competition", competition, "competition_logo"),
  ]);
  const events = footballCompetitionEvents(snapshot.events, competition);
  const name = events[0]?.competition ?? directory?.name;
  if (!name) return { title: "Competition not found | WatchTVSport", robots: { index: false, follow: false } };
  const teamCount = directory?.members.length ?? 0;
  return {
    title: `${name} ${directory?.seasonLabel ?? ""} TV schedule & official broadcasters | WatchTVSport`.replace(/\s+/g, " ").trim(),
    description: `Find the ${name} schedule, ${teamCount ? `${teamCount} participating teams, ` : ""}upcoming fixtures and verified official TV and streaming broadcasters.`,
    alternates: { canonical: `/football/competition/${competition}` },
    robots: { index: true, follow: true },
    openGraph: {
      title: `${name} TV schedule & official broadcasters`,
      description: `${name} teams, fixtures and official broadcast information.`,
      url: `/football/competition/${competition}`,
      type: "website",
      images: logo?.url ? [logo.url] : undefined,
    },
  };
}

export default async function CompetitionPage({ params }: PageProps) {
  const { competition } = await params;
  const previewMode = isPreviewFixtureMode();
  const [snapshot, directory, logo, previewFixtures] = await Promise.all([
    getPublicEventsSnapshot(),
    getPublicCompetitionDirectory("football", competition),
    getPrimaryMediaAsset("competition", competition, "competition_logo"),
    previewMode ? getPreviewCompetitionFixtures(competition) : Promise.resolve([]),
  ]);
  const events = footballCompetitionEvents(snapshot.events, competition);
  const name = events[0]?.competition ?? directory?.name ?? previewFixtures[0]?.competitionName;
  if (!name) notFound();

  const now = Date.now();
  const upcoming = events.filter((event) => event.status === "live" || (event.status !== "finished" && new Date(event.eventDate).getTime() >= now));
  const recent = events.filter((event) => event.status === "finished" || new Date(event.eventDate).getTime() < now).reverse().slice(0, 12);

  const eventClubs = Array.from(new Map(events.flatMap((event) => [event.participant1, event.participant2]
    .filter((participant) => participant?.type === "club")
    .map((participant) => [clubSlug(participant!.name), participant!] as const))).values());
  const eventClubBySlug = new Map(eventClubs.map((club) => [clubSlug(club.name), club]));

  const clubs = directory?.members.length
    ? directory.members.map((member) => ({ name: member.name, slug: member.slug, participant: eventClubBySlug.get(member.slug) }))
    : eventClubs.map((club) => ({ name: club.name, slug: clubSlug(club.name), participant: club }));

  const favorite = competitionFavorite(competition, name);
  const calendarHref = `/?view=all&sport=football&competition=${encodeURIComponent(competition)}`;
  const previewDated = previewFixtures.filter((fixture) => fixture.eventDate).sort((a, b) => Date.parse(a.eventDate!) - Date.parse(b.eventDate!));
  const previewTbc = previewFixtures.filter((fixture) => !fixture.eventDate);
  const previewDisplay = [...previewDated, ...previewTbc].slice(0, 60);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "SportsOrganization",
    name,
    sport: "Football",
    url: `https://watchtvsport.com/football/competition/${competition}`,
    logo: logo?.url,
    member: clubs.map((club) => ({ "@type": "SportsTeam", name: club.name, url: `https://watchtvsport.com/football/club/${club.slug}` })),
  };

  return <main id="main-content" className="v2-calendar">
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
    <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Football", href: "/football" }, { label: name }]} />

    <section className="v2-calendar-hero" aria-labelledby="competition-title">
      <div style={{ display: "flex", gap: "1rem", alignItems: "center", flexWrap: "wrap" }}>
        {logo?.url ? <img src={logo.url} alt={logo.alt ?? `${name} logo`} width={logo.width ?? 96} height={logo.height ?? 96} loading="eager" style={{ width: 80, height: 80, objectFit: "contain" }} /> : null}
        <div>
          <p className="v2-eyebrow">Football competition{directory?.seasonLabel ? ` · ${directory.seasonLabel}` : ""}</p>
          <h1 id="competition-title">{name}</h1>
        </div>
      </div>
      <p className="v2-hero-copy">Verified teams, upcoming fixtures and official broadcasters for {name}. Missing fixture or broadcaster data remains unpublished rather than guessed.</p>
      <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", marginTop: "1rem" }}>
        <FavoriteButton favorite={favorite} />
        {events.length ? <Link href={calendarHref}>Open full calendar</Link> : null}
        {previewMode && previewFixtures.length ? <span style={{ alignSelf: "center", fontSize: ".85rem", fontWeight: 700 }}>Local preview · {previewFixtures.length} verified fixtures</span> : null}
      </div>
    </section>

    {clubs.length > 0 ? <section className="v2-results" aria-labelledby="participants-title">
      <div className="v2-results-heading"><div><p className="v2-eyebrow">Participants</p><h2 id="participants-title">Teams</h2></div><p>{clubs.length} clubs</p></div>
      <div className="v2-entity-grid">
        {clubs.map((club) => <Link key={club.slug} href={`/football/club/${club.slug}`}>
          <span style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <EntityVisual entityId={club.participant?.id ?? `club:football:${club.slug}`} label={club.name} size="sm" imageUrl={club.participant?.logoUrl} imageAlt={`${club.name} logo`} />
            <strong>{club.name}</strong>
          </span>
          <span>Club</span>
        </Link>)}
      </div>
    </section> : null}

    {previewMode && previewFixtures.length > 0 ? <section className="v2-results" aria-labelledby="preview-fixtures-title">
      <div className="v2-results-heading">
        <div><p className="v2-eyebrow">Local development preview</p><h2 id="preview-fixtures-title">Verified season fixtures</h2></div>
        <p>{previewFixtures.length} fixtures · {previewDated.length} dated · {previewTbc.length} TBC</p>
      </div>
      <div className="v2-event-list">{previewDisplay.map((fixture) => <article className="v2-event-card" key={fixture.id}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }} aria-hidden="true">
          <EntityVisual entityId={fixture.home.id} label={fixture.home.name} size="sm" imageUrl={fixture.home.logoUrl} imageAlt="" />
          <EntityVisual entityId={fixture.away.id} label={fixture.away.name} size="sm" imageUrl={fixture.away.logoUrl} imageAlt="" />
        </div>
        <div className="v2-event-main">
          <p className="v2-event-competition">{fixture.phase ?? name}</p>
          <h3><Link href={`/football/club/${fixture.home.slug}`}>{fixture.home.name}</Link><span aria-hidden="true"> vs </span><Link href={`/football/club/${fixture.away.slug}`}>{fixture.away.name}</Link></h3>
          <p className="v2-event-stage">{fixture.eventDate ? <LocalTime date={fixture.eventDate} /> : "Kickoff TBC"}</p>
        </div>
        <div className="v2-broadcast-link"><span>Unpublished</span><strong>Preview only</strong></div>
      </article>)}</div>
      {previewFixtures.length > previewDisplay.length ? <p style={{ marginTop: "1rem", opacity: .72 }}>Showing the first {previewDisplay.length} fixtures in local preview. The full set remains stored and unpublished in Supabase.</p> : null}
    </section> : null}

    <section className="v2-results" aria-labelledby="upcoming-title">
      <div className="v2-results-heading"><div><p className="v2-eyebrow">Published schedule</p><h2 id="upcoming-title">Upcoming events</h2></div><p>{upcoming.length} scheduled</p></div>
      {upcoming.length === 0 ? <div className="v2-empty-state" role="status"><h3>No public fixture is published yet</h3><p>The {name} membership directory is verified. Public match pages remain hidden until publication is explicitly approved.</p></div> :
      <div className="v2-event-list">{upcoming.map((event) => {
        const homeHref = participantLink(event.participant1?.name); const awayHref = participantLink(event.participant2?.name);
        return <article className="v2-event-card" key={event.id}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }} aria-hidden="true">
            {event.participant1 ? <EntityVisual entityId={event.participant1.id} label={event.participant1.name} size="sm" imageUrl={event.participant1.logoUrl} imageAlt="" /> : null}
            {event.participant2 ? <EntityVisual entityId={event.participant2.id} label={event.participant2.name} size="sm" imageUrl={event.participant2.logoUrl} imageAlt="" /> : null}
          </div>
          <div className="v2-event-main"><p className="v2-event-competition">{event.stage ?? name}</p><h3>{homeHref && event.participant1 ? <Link href={homeHref}>{event.participant1.name}</Link> : event.participant1?.name ?? event.title}{event.participant2 ? <><span aria-hidden="true"> vs </span>{awayHref ? <Link href={awayHref}>{event.participant2.name}</Link> : event.participant2.name}</> : null}</h3><p className="v2-event-stage"><LocalTime date={event.eventDate} /></p></div><Link className="v2-broadcast-link" href={event.detailPath}><span>Event details</span><strong>View broadcasters →</strong></Link></article>;
      })}</div>}
    </section>

    {recent.length > 0 ? <section className="v2-results" aria-labelledby="recent-title"><div className="v2-results-heading"><div><p className="v2-eyebrow">Archive</p><h2 id="recent-title">Recent events</h2></div></div><div className="v2-event-list">{recent.map((event) => <article className="v2-event-card" key={event.id}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }} aria-hidden="true">
        {event.participant1 ? <EntityVisual entityId={event.participant1.id} label={event.participant1.name} size="sm" imageUrl={event.participant1.logoUrl} imageAlt="" /> : null}
        {event.participant2 ? <EntityVisual entityId={event.participant2.id} label={event.participant2.name} size="sm" imageUrl={event.participant2.logoUrl} imageAlt="" /> : null}
      </div>
      <div className="v2-event-main"><p className="v2-event-competition">{event.stage ?? name}</p><h3>{event.title}</h3><p className="v2-event-stage"><LocalTime date={event.eventDate} /></p></div><Link className="v2-broadcast-link" href={event.detailPath}><span>Event archive</span><strong>Open event →</strong></Link></article>)}</div></section> : null}
  </main>;
}