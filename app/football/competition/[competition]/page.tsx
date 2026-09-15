import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import Breadcrumbs from "@/components/Breadcrumbs";
import EntityVisual from "@/components/EntityVisual";
import FavoriteButton from "@/components/FavoriteButton";
import LocalTime from "@/components/LocalTime";
import { clubSlug } from "@/lib/club-aliases";
import { getPublicCompetitionDirectories, getPublicCompetitionDirectory } from "@/lib/competition-directory";
import { getPreviewCompetitionFixtures, isPreviewFixtureMode, type PreviewFixture } from "@/lib/dev-preview-fixtures";
import { getAllEvents, type EventData } from "@/lib/events";
import type { FavoriteCandidate } from "@/lib/favorites";
import { getPrimaryMediaAsset } from "@/lib/public-media";
import { getPublicEventsSnapshot } from "@/lib/public-events";

type PageProps = { params: Promise<{ competition: string }> };

function competitionEvents(events: EventData[], slug: string) {
  return events.filter((event) => event.sport === "football" && event.competitionSlug === slug)
    .sort((a, b) => Date.parse(a.eventDate) - Date.parse(b.eventDate));
}

function favorite(slug: string, label: string): FavoriteCandidate {
  return { kind: "competition", entityId: `football:${slug}`, label: `${label} (Football)` };
}

function groupFixtures(fixtures: PreviewFixture[]) {
  const groups = new Map<string, PreviewFixture[]>();
  for (const fixture of fixtures) {
    const label = fixture.phase?.trim() || (fixture.eventDate ? "Scheduled fixtures" : "Date / kickoff TBC");
    groups.set(label, [...(groups.get(label) ?? []), fixture]);
  }
  return Array.from(groups, ([label, rows]) => ({ label, rows }));
}

export async function generateStaticParams() {
  const directories = await getPublicCompetitionDirectories();
  return Array.from(new Set([
    ...getAllEvents().filter((event) => event.sport === "football").map((event) => event.competitionSlug),
    ...directories.filter((item) => item.sport === "football").map((item) => item.slug),
  ])).map((competition) => ({ competition }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { competition } = await params;
  const [snapshot, directory, logo] = await Promise.all([
    getPublicEventsSnapshot(),
    getPublicCompetitionDirectory("football", competition),
    getPrimaryMediaAsset("competition", competition, "competition_logo"),
  ]);
  const events = competitionEvents(snapshot.events, competition);
  const name = events[0]?.competition ?? directory?.name;
  if (!name) return { title: "Competition not found | WatchTVSport", robots: { index: false, follow: false } };
  return {
    title: `${name} ${directory?.seasonLabel ?? ""} TV schedule & official broadcasters | WatchTVSport`.replace(/\s+/g, " ").trim(),
    description: `Find ${name} teams, fixtures and verified official TV and streaming broadcasters.`,
    alternates: { canonical: `/football/competition/${competition}` },
    openGraph: { title: `${name} TV schedule & official broadcasters`, url: `/football/competition/${competition}`, type: "website", images: logo?.url ? [logo.url] : undefined },
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
  const events = competitionEvents(snapshot.events, competition);
  const name = events[0]?.competition ?? directory?.name ?? previewFixtures[0]?.competitionName;
  if (!name) notFound();

  const now = Date.now();
  const upcoming = events.filter((event) => event.status === "live" || (event.status !== "finished" && Date.parse(event.eventDate) >= now));
  const eventClubs = new Map(events.flatMap((event) => [event.participant1, event.participant2]
    .filter((item) => item?.type === "club")
    .map((item) => [clubSlug(item!.name), item!] as const)));
  const clubs = directory?.members.length ? directory.members.map((member) => ({
    id: member.id,
    slug: member.slug,
    name: member.name,
    logoUrl: member.logoUrl ?? eventClubs.get(member.slug)?.logoUrl,
  })) : Array.from(eventClubs, ([slug, item]) => ({ id: item.id, slug, name: item.name, logoUrl: item.logoUrl }));

  const dated = previewFixtures.filter((fixture) => fixture.eventDate).length;
  const tbc = previewFixtures.length - dated;
  const groups = groupFixtures(previewFixtures);
  const fav = favorite(competition, name);

  return <main id="main-content" className="v2-calendar">
    <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Football", href: "/football" }, { label: name }]} />

    <section className="v2-calendar-hero" aria-labelledby="competition-title">
      <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
        {logo?.url ? <img src={logo.url} alt={logo.alt ?? `${name} logo`} width={80} height={80} style={{ objectFit: "contain" }} /> : null}
        <div><p className="v2-eyebrow">Football competition{directory?.seasonLabel ? ` · ${directory.seasonLabel}` : ""}</p><h1 id="competition-title">{name}</h1></div>
      </div>
      <p className="v2-hero-copy">Verified teams, fixtures and official broadcasters. Unknown dates or coverage stay explicitly TBC.</p>
      <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap", marginTop: 14 }}>
        <FavoriteButton favorite={fav} />
        {previewMode && previewFixtures.length ? <><strong>{previewFixtures.length} verified fixtures</strong><span style={{ opacity: .72 }}>{dated} dated · {tbc} TBC</span></> : null}
      </div>
    </section>

    {clubs.length ? <section className="v2-results" aria-labelledby="teams-title">
      <div className="v2-results-heading"><div><p className="v2-eyebrow">Participants</p><h2 id="teams-title">Teams</h2></div><p>{clubs.length} clubs</p></div>
      <div className="v2-entity-grid">{clubs.map((club) => <Link key={club.slug} href={`/football/club/${club.slug}`}>
        <span style={{ display: "flex", alignItems: "center", gap: 10 }}><EntityVisual entityId={club.id} label={club.name} size="sm" imageUrl={club.logoUrl} imageAlt={`${club.name} logo`} /><strong>{club.name}</strong></span><span>Club</span>
      </Link>)}</div>
    </section> : null}

    {previewMode && groups.length ? <section className="v2-results" aria-labelledby="fixtures-title">
      <div className="v2-results-heading"><div><p className="v2-eyebrow">Local development preview</p><h2 id="fixtures-title">Season fixtures</h2></div><p>{groups.length} schedule groups</p></div>
      <div style={{ display: "grid", gap: 12 }}>{groups.map((group, index) => {
        const visible = group.rows.slice(0, group.label === "Date / kickoff TBC" ? 20 : 24);
        return <details key={group.label} open={index < 2} style={{ border: "1px solid rgba(104,171,239,.18)", borderRadius: 14, background: "#07131f", padding: 12 }}>
          <summary style={{ cursor: "pointer", display: "flex", justifyContent: "space-between", gap: 12, fontWeight: 850 }}><span>{group.label}</span><span style={{ color: "#5db7ff" }}>{group.rows.length} matches</span></summary>
          <div className="v2-event-list" style={{ marginTop: 10 }}>{visible.map((fixture) => <article className="v2-event-card" key={fixture.id}>
            <div style={{ display: "flex", justifyContent: "center", gap: 6 }}><EntityVisual entityId={fixture.home.id} label={fixture.home.name} size="sm" imageUrl={fixture.home.logoUrl} imageAlt="" /><EntityVisual entityId={fixture.away.id} label={fixture.away.name} size="sm" imageUrl={fixture.away.logoUrl} imageAlt="" /></div>
            <div className="v2-event-main"><p className="v2-event-competition">{fixture.phase ?? name}</p><h3><Link href={`/football/club/${fixture.home.slug}`}>{fixture.home.name}</Link> vs <Link href={`/football/club/${fixture.away.slug}`}>{fixture.away.name}</Link></h3><p className="v2-event-stage">{fixture.eventDate ? <LocalTime date={fixture.eventDate} /> : "Kickoff TBC"}</p></div>
            <div className="v2-broadcast-link"><span>Unpublished</span><strong>Preview only</strong></div>
          </article>)}</div>
          {group.rows.length > visible.length ? <p style={{ opacity: .7, fontSize: ".82rem" }}>Showing {visible.length} of {group.rows.length}; the rest remain stored in Supabase.</p> : null}
        </details>;
      })}</div>
    </section> : null}

    <section className="v2-results" aria-labelledby="public-title">
      <div className="v2-results-heading"><div><p className="v2-eyebrow">Published schedule</p><h2 id="public-title">Upcoming events</h2></div><p>{upcoming.length} scheduled</p></div>
      {upcoming.length ? <div className="v2-event-list">{upcoming.map((event) => <article className="v2-event-card" key={event.id}>
        <div style={{ display: "flex", justifyContent: "center", gap: 6 }}>{event.participant1 ? <EntityVisual entityId={event.participant1.id} label={event.participant1.name} size="sm" imageUrl={event.participant1.logoUrl} imageAlt="" /> : null}{event.participant2 ? <EntityVisual entityId={event.participant2.id} label={event.participant2.name} size="sm" imageUrl={event.participant2.logoUrl} imageAlt="" /> : null}</div>
        <div className="v2-event-main"><p className="v2-event-competition">{event.stage ?? name}</p><h3>{event.title}</h3><p className="v2-event-stage"><LocalTime date={event.eventDate} /></p></div><Link className="v2-broadcast-link" href={event.detailPath}><span>Event details</span><strong>View broadcasters →</strong></Link>
      </article>)}</div> : <div className="v2-empty-state"><h3>No public fixture is published yet</h3><p>Verified preview fixtures stay private until explicit publication approval.</p></div>}
    </section>
  </main>;
}
