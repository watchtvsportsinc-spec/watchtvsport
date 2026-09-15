import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import Breadcrumbs from "@/components/Breadcrumbs";
import FavoriteButton from "@/components/FavoriteButton";
import LocalTime from "@/components/LocalTime";
import { clubSlug } from "@/lib/club-aliases";
import { getPublicCompetitionDirectories, getPublicCompetitionDirectory } from "@/lib/competition-directory";
import { getAllEvents, type EventData } from "@/lib/events";
import type { FavoriteCandidate } from "@/lib/favorites";
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
  const [snapshot, directory] = await Promise.all([getPublicEventsSnapshot(), getPublicCompetitionDirectory("football", competition)]);
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
    },
  };
}

export default async function CompetitionPage({ params }: PageProps) {
  const { competition } = await params;
  const [snapshot, directory] = await Promise.all([getPublicEventsSnapshot(), getPublicCompetitionDirectory("football", competition)]);
  const events = footballCompetitionEvents(snapshot.events, competition);
  const name = events[0]?.competition ?? directory?.name;
  if (!name) notFound();

  const now = Date.now();
  const upcoming = events.filter((event) => event.status === "live" || (event.status !== "finished" && new Date(event.eventDate).getTime() >= now));
  const recent = events.filter((event) => event.status === "finished" || new Date(event.eventDate).getTime() < now).reverse().slice(0, 12);

  const eventClubs = Array.from(new Map(events.flatMap((event) => [event.participant1, event.participant2]
    .filter((participant) => participant?.type === "club")
    .map((participant) => [clubSlug(participant!.name), participant!] as const))).values());

  const clubs = directory?.members.length
    ? directory.members.map((member) => ({ name: member.name, slug: member.slug }))
    : eventClubs.map((club) => ({ name: club.name, slug: clubSlug(club.name) }));

  const favorite = competitionFavorite(competition, name);
  const calendarHref = `/?view=all&sport=football&competition=${encodeURIComponent(competition)}`;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "SportsOrganization",
    name,
    sport: "Football",
    url: `https://watchtvsport.com/football/competition/${competition}`,
    member: clubs.map((club) => ({ "@type": "SportsTeam", name: club.name, url: `https://watchtvsport.com/football/club/${club.slug}` })),
  };

  return <main id="main-content" className="v2-calendar">
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
    <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Football", href: "/football" }, { label: name }]} />

    <section className="v2-calendar-hero" aria-labelledby="competition-title">
      <p className="v2-eyebrow">Football competition{directory?.seasonLabel ? ` · ${directory.seasonLabel}` : ""}</p>
      <h1 id="competition-title">{name}</h1>
      <p className="v2-hero-copy">Verified teams, upcoming fixtures and official broadcasters for {name}. Missing fixture or broadcaster data remains unpublished rather than guessed.</p>
      <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", marginTop: "1rem" }}>
        <FavoriteButton favorite={favorite} />
        {events.length ? <Link href={calendarHref}>Open full calendar</Link> : null}
      </div>
    </section>

    {clubs.length > 0 ? <section className="v2-results" aria-labelledby="participants-title">
      <div className="v2-results-heading"><div><p className="v2-eyebrow">Participants</p><h2 id="participants-title">Teams</h2></div><p>{clubs.length} clubs</p></div>
      <div className="v2-entity-grid">
        {clubs.map((club) => <Link key={club.slug} href={`/football/club/${club.slug}`}><strong>{club.name}</strong><span>Club</span></Link>)}
      </div>
    </section> : null}

    <section className="v2-results" aria-labelledby="upcoming-title">
      <div className="v2-results-heading"><div><p className="v2-eyebrow">Schedule</p><h2 id="upcoming-title">Upcoming events</h2></div><p>{upcoming.length} scheduled</p></div>
      {upcoming.length === 0 ? <div className="v2-empty-state" role="status"><h3>Fixture ingestion is not complete yet</h3><p>The {name} membership directory is verified. Match pages will appear only after authoritative fixture data has passed validation.</p></div> :
      <div className="v2-event-list">{upcoming.map((event) => {
        const homeHref = participantLink(event.participant1?.name); const awayHref = participantLink(event.participant2?.name);
        return <article className="v2-event-card" key={event.id}><div className="v2-event-main"><p className="v2-event-competition">{event.stage ?? name}</p><h3>{homeHref && event.participant1 ? <Link href={homeHref}>{event.participant1.name}</Link> : event.participant1?.name ?? event.title}{event.participant2 ? <><span aria-hidden="true"> vs </span>{awayHref ? <Link href={awayHref}>{event.participant2.name}</Link> : event.participant2.name}</> : null}</h3><p className="v2-event-stage"><LocalTime date={event.eventDate} /></p></div><Link className="v2-broadcast-link" href={event.detailPath}><span>Event details</span><strong>View broadcasters →</strong></Link></article>;
      })}</div>}
    </section>

    {recent.length > 0 ? <section className="v2-results" aria-labelledby="recent-title"><div className="v2-results-heading"><div><p className="v2-eyebrow">Archive</p><h2 id="recent-title">Recent events</h2></div></div><div className="v2-event-list">{recent.map((event) => <article className="v2-event-card" key={event.id}><div className="v2-event-main"><p className="v2-event-competition">{event.stage ?? name}</p><h3>{event.title}</h3><p className="v2-event-stage"><LocalTime date={event.eventDate} /></p></div><Link className="v2-broadcast-link" href={event.detailPath}><span>Event archive</span><strong>Open event →</strong></Link></article>)}</div></section> : null}
  </main>;
}
