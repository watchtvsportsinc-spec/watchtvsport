import type { Metadata } from "next";
import Link from "next/link";
import Breadcrumbs from "@/components/Breadcrumbs";
import EntityVisual from "@/components/EntityVisual";
import LocalTime from "@/components/LocalTime";
import { clubSlug } from "@/lib/club-aliases";
import { getPublicCompetitionDirectories } from "@/lib/competition-directory";
import { getPreviewFootballFixtures, isPreviewFixtureMode } from "@/lib/dev-preview-fixtures";
import { entitySlug, getFootballNations } from "@/lib/entity-pages";
import { getPrimaryMediaAsset } from "@/lib/public-media";
import { getPublicEventsSnapshot } from "@/lib/public-events";

export const metadata: Metadata = {
  title: "Football TV schedule & official broadcasters | WatchTVSport",
  description: "Browse football competitions, clubs, national teams and upcoming matches with verified official broadcasters.",
  alternates: { canonical: "/football" },
};

export default async function FootballPage() {
  const previewMode = isPreviewFixtureMode();
  const [snapshot, directories, previewFixtures] = await Promise.all([
    getPublicEventsSnapshot(),
    getPublicCompetitionDirectories(),
    previewMode ? getPreviewFootballFixtures() : Promise.resolve([]),
  ]);
  const events = snapshot.events.filter((event) => event.sport === "football");
  const footballDirectories = directories.filter((competition) => competition.sport === "football");
  const now = Date.now();
  const upcoming = events
    .filter((event) => event.status === "live" || (event.status !== "finished" && Date.parse(event.eventDate) >= now))
    .sort((a, b) => Date.parse(a.eventDate) - Date.parse(b.eventDate))
    .slice(0, 18);

  const previewDated = previewFixtures
    .filter((fixture) => fixture.eventDate && Date.parse(fixture.eventDate) >= now)
    .sort((a, b) => Date.parse(a.eventDate!) - Date.parse(b.eventDate!));
  const previewTbcCount = previewFixtures.filter((fixture) => !fixture.eventDate).length;
  const previewNext = previewDated.slice(0, 24);

  const eventCompetitionBySlug = new Map(events.map((event) => [event.competitionSlug, { slug: event.competitionSlug, name: event.competition, logoUrl: event.competitionLogoUrl }]));
  const competitionRows = await Promise.all(
    Array.from(new Map([
      ...footballDirectories.map((competition) => [competition.slug, { slug: competition.slug, name: competition.name, logoUrl: eventCompetitionBySlug.get(competition.slug)?.logoUrl }] as const),
      ...Array.from(eventCompetitionBySlug.entries()).map(([slug, competition]) => [slug, competition] as const),
    ]).values()).map(async (competition) => {
      if (competition.logoUrl) return competition;
      const logo = await getPrimaryMediaAsset("competition", competition.slug, "competition_logo");
      return { ...competition, logoUrl: logo?.url };
    })
  );
  const competitions = competitionRows.sort((a, b) => a.name.localeCompare(b.name));

  const directoryClubs = footballDirectories.flatMap((competition) => competition.members);
  const eventClubs = events.flatMap((event) => [event.participant1, event.participant2].filter((participant) => participant?.type === "club"));
  const clubs = Array.from(new Map([...directoryClubs, ...eventClubs]
    .filter((participant): participant is NonNullable<typeof participant> => Boolean(participant))
    .map((participant) => [clubSlug(participant.name), participant] as const)).values())
    .sort((a, b) => a.name.localeCompare(b.name));
  const nations = getFootballNations(events);

  return <main id="main-content" className="v2-calendar">
    <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Football" }]} />

    <section className="v2-calendar-hero" aria-labelledby="football-title">
      <p className="v2-eyebrow">Sport</p>
      <h1 id="football-title">Football</h1>
      <p className="v2-hero-copy">Explore football competitions, clubs, national teams and upcoming events with official broadcast information.</p>
      {previewMode && previewFixtures.length ? <p style={{ marginTop: "1rem", fontWeight: 700 }}>Local V2 preview · {previewFixtures.length} verified unpublished fixtures · {previewDated.length} dated · {previewTbcCount} kickoff TBC</p> : null}
    </section>

    <section className="v2-results" aria-labelledby="competitions-title">
      <div className="v2-results-heading"><div><p className="v2-eyebrow">Browse</p><h2 id="competitions-title">Competitions</h2></div><p>{competitions.length}</p></div>
      <div className="v2-entity-grid">{competitions.map((competition) => <Link key={competition.slug} href={`/football/competition/${competition.slug}`}>
        <span style={{ display: "flex", alignItems: "center", gap: 10 }}><EntityVisual entityId={`competition:football:${competition.slug}`} label={competition.name} size="sm" imageUrl={competition.logoUrl} imageAlt={`${competition.name} logo`} /><strong>{competition.name}</strong></span><span>Competition</span>
      </Link>)}</div>
    </section>

    {previewMode && previewFixtures.length ? <section className="v2-results" aria-labelledby="preview-title">
      <div className="v2-results-heading"><div><p className="v2-eyebrow">Local development preview</p><h2 id="preview-title">Next verified league fixtures</h2></div><p>{previewFixtures.length} stored</p></div>
      {previewNext.length ? <div className="v2-event-list">{previewNext.map((fixture) => <article className="v2-event-card" key={fixture.id}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }} aria-hidden="true"><EntityVisual entityId={fixture.home.id} label={fixture.home.name} size="sm" imageUrl={fixture.home.logoUrl} imageAlt="" /><EntityVisual entityId={fixture.away.id} label={fixture.away.name} size="sm" imageUrl={fixture.away.logoUrl} imageAlt="" /></div>
        <div className="v2-event-main"><p className="v2-event-competition">{fixture.competitionName}</p><h3><Link href={`/football/club/${fixture.home.slug}`}>{fixture.home.name}</Link><span aria-hidden="true"> vs </span><Link href={`/football/club/${fixture.away.slug}`}>{fixture.away.name}</Link></h3><p className="v2-event-stage"><LocalTime date={fixture.eventDate!} /></p></div>
        <Link className="v2-broadcast-link" href={`/football/competition/${fixture.competitionSlug}`}><span>Unpublished preview</span><strong>Competition →</strong></Link>
      </article>)}</div> : <div className="v2-empty-state"><h3>Fixtures loaded, kickoff times still TBC</h3><p>Open a competition or club page to browse the full verified season fixture list.</p></div>}
      {previewTbcCount ? <p style={{ marginTop: "1rem", opacity: .72 }}>{previewTbcCount} additional verified fixtures are stored with kickoff/date still TBC and are available on their competition and club pages.</p> : null}
    </section> : null}

    {clubs.length > 0 ? <section className="v2-results" aria-labelledby="clubs-title">
      <div className="v2-results-heading"><div><p className="v2-eyebrow">Teams</p><h2 id="clubs-title">Clubs</h2></div><p>{clubs.length}</p></div>
      <div className="v2-entity-grid">{clubs.map((club) => <Link key={club.id} href={`/football/club/${clubSlug(club.name)}`}><span style={{ display: "flex", alignItems: "center", gap: 10 }}><EntityVisual entityId={club.id} label={club.name} size="sm" imageUrl={club.logoUrl} imageAlt={`${club.name} logo`} /><strong>{club.name}</strong></span><span>Club</span></Link>)}</div>
    </section> : null}

    {nations.length > 0 ? <section className="v2-results" aria-labelledby="nations-title">
      <div className="v2-results-heading"><div><p className="v2-eyebrow">Teams</p><h2 id="nations-title">National teams</h2></div><p>{nations.length}</p></div>
      <div className="v2-entity-grid">{nations.map((nation) => <Link key={nation.id} href={`/football/nation/${entitySlug(nation.name)}`}><span style={{ display: "flex", alignItems: "center", gap: 10 }}><EntityVisual entityId={nation.id} label={nation.name} size="sm" imageUrl={nation.logoUrl} imageAlt={`${nation.name} logo`} /><strong>{nation.name}</strong></span><span>Nation</span></Link>)}</div>
    </section> : null}

    <section className="v2-results" aria-labelledby="upcoming-title">
      <div className="v2-results-heading"><div><p className="v2-eyebrow">Published schedule</p><h2 id="upcoming-title">Upcoming football events</h2></div></div>
      {upcoming.length ? <div className="v2-event-list">{upcoming.map((event) => <article className="v2-event-card" key={event.id}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }} aria-hidden="true">{event.participant1 ? <EntityVisual entityId={event.participant1.id} label={event.participant1.name} size="sm" imageUrl={event.participant1.logoUrl} imageAlt="" /> : null}{event.participant2 ? <EntityVisual entityId={event.participant2.id} label={event.participant2.name} size="sm" imageUrl={event.participant2.logoUrl} imageAlt="" /> : null}</div>
        <div className="v2-event-main"><p className="v2-event-competition">{event.competition}</p><h3>{event.title}</h3><p className="v2-event-stage"><LocalTime date={event.eventDate} /></p></div>
        <Link className="v2-broadcast-link" href={event.detailPath}><span>Event details</span><strong>View broadcasters →</strong></Link>
      </article>)}</div> : <div className="v2-empty-state"><h3>No public football event currently scheduled</h3><p>Local preview fixtures remain separate until explicit publication approval.</p></div>}
    </section>
  </main>;
}
