import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import Breadcrumbs from "@/components/Breadcrumbs";
import ParticipantSportVisual from "@/components/ParticipantSportVisual";
import { getPublicCompetition } from "@/lib/public-competition";
import { getPublicEventsSnapshot } from "@/lib/public-events";
import type { ParticipantVisualProfile } from "@/lib/participant-visuals";

type PageProps = { params: Promise<{ sport: string; competition: string }> };

type TeamLink = { name: string; slug: string; visual?: ParticipantVisualProfile; countryCode?: string };

function slugify(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function sportLabel(value: string) {
  return value === "basketball"
    ? "Basketball"
    : value === "hockey"
      ? "Ice hockey"
      : value === "american-football"
        ? "American football"
        : value === "formula-1"
          ? "Formula 1"
          : value === "motogp"
            ? "MotoGP"
            : value === "ufc"
              ? "UFC"
              : value.charAt(0).toUpperCase() + value.slice(1);
}

function canonicalCompetitionPath(sport: string, competition: string) {
  if (sport === "football") return `/football/competition/${competition}`;
  if (sport === "formula-1") return "/formula-1";
  if (sport === "ufc") return "/ufc";
  return `/sports/${sport}/competition/${competition}`;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { sport, competition } = await params;
  const [permanentCompetition, snapshot] = await Promise.all([
    getPublicCompetition(sport, competition),
    getPublicEventsSnapshot(),
  ]);
  const event = snapshot.events.find((item) => item.sport === sport && item.competitionSlug === competition);
  const name = permanentCompetition?.name ?? event?.competition;
  if (!name) return { title: "Competition not found", robots: { index: false, follow: false } };

  return {
    title: `${name} schedule & official broadcasters`,
    description: `Upcoming ${name} events, participating teams and official TV and streaming options by country.`,
    alternates: { canonical: canonicalCompetitionPath(sport, competition) },
  };
}

export default async function CompetitionPage({ params }: PageProps) {
  const { sport, competition } = await params;
  if (sport === "football") redirect(`/football/competition/${competition}`);
  if (sport === "formula-1") redirect("/formula-1");
  if (sport === "ufc") redirect("/ufc");

  const [permanentCompetition, snapshot] = await Promise.all([
    getPublicCompetition(sport, competition),
    getPublicEventsSnapshot(),
  ]);
  const events = snapshot.events
    .filter((event) => event.sport === sport && event.competitionSlug === competition)
    .sort((a, b) => Date.parse(a.eventDate) - Date.parse(b.eventDate));

  if (!permanentCompetition && !events.length) notFound();

  const name = permanentCompetition?.name ?? events[0].competition;
  const now = Date.now();
  const upcoming = events.filter((event) => Date.parse(event.eventDate) >= now && event.status !== "finished");
  const recent = events.filter((event) => Date.parse(event.eventDate) < now || event.status === "finished").slice(-12).reverse();

  const participants = new Map<string, TeamLink>();
  for (const team of permanentCompetition?.teams ?? []) {
    participants.set(team.slug, { name: team.name, slug: team.slug, visual: team.visual });
  }
  for (const event of events) {
    for (const participant of [event.participant1, event.participant2]) {
      if (!participant || (participant.type !== "club" && participant.type !== "national_team")) continue;
      const eventSlug = participant.slug || (participant.id.startsWith("club:") ? participant.id.split(":").slice(2).join(":") : slugify(participant.name));
      const existing = participants.get(eventSlug);
      participants.set(eventSlug, {
        name: participant.name,
        slug: eventSlug,
        visual: participant.visualProfile ?? existing?.visual,
        countryCode: participant.countryCode ?? existing?.countryCode,
      });
    }
  }
  const teams = Array.from(participants.values()).sort((a, b) => a.name.localeCompare(b.name));
  const confirmedListings = events.reduce(
    (count, event) => count + event.broadcasts.filter((broadcast) => broadcast.coverageStatus === "confirmed").length,
    0
  );

  return (
    <main id="main-content" className="v2-calendar">
      <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: sportLabel(sport), href: `/sports/${sport}` }, { label: name }]} />

      <section className="v2-calendar-hero">
        <p className="v2-eyebrow">Competition</p>
        <h1>{name}</h1>
        <p className="v2-hero-copy">Schedule, participating teams and verified official broadcast information in one permanent competition page.</p>
        <div className="v2-sport-pills">
          <a href="#schedule">Schedule</a>
          {teams.length ? <a href="#teams">Teams</a> : null}
          <Link href={`/?view=all&sport=${encodeURIComponent(sport)}&competition=${encodeURIComponent(competition)}#calendar-results`}>Full calendar</Link>
        </div>
      </section>

      <section className="v2-stats-row">
        <div><strong>{upcoming.length}</strong><span>Upcoming</span></div>
        <div><strong>{teams.length}</strong><span>Teams</span></div>
        <div><strong>{events.length}</strong><span>Events loaded</span></div>
        <div><strong>{confirmedListings}</strong><span>Confirmed listings</span></div>
      </section>

      <section id="schedule" className="v2-results">
        <div className="v2-results-heading"><div><p className="v2-eyebrow">Schedule</p><h2>Next events</h2></div><p>{upcoming.length}</p></div>
        {upcoming.length ? (
          <div className="v2-event-list">
            {upcoming.slice(0, 50).map((event) => (
              <article className="v2-event-card" key={event.id}>
                <div className="v2-event-main"><p className="v2-event-competition">{name}{event.stage ? ` · ${event.stage}` : ""}</p><h3><Link href={event.detailPath}>{event.title}</Link></h3><p className="v2-event-stage">{new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short" }).format(new Date(event.eventDate))}</p></div>
                <Link className="v2-broadcast-link" href={event.detailPath}><span>{event.broadcasts.filter((broadcast) => broadcast.coverageStatus === "confirmed").length} confirmed</span><strong>Where to watch →</strong></Link>
              </article>
            ))}
          </div>
        ) : (
          <div className="v2-empty-state" role="status"><h3>Schedule import in progress</h3><p>The competition page and team directory are already available. Confirmed fixtures will appear here as soon as the schedule import is published.</p></div>
        )}
      </section>

      {teams.length ? (
        <section id="teams" className="v2-visual-section">
          <div className="v2-section-heading"><div><p className="v2-eyebrow">Participants</p><h2>Teams</h2></div></div>
          <div className="v2-team-link-grid">
            {teams.map((team) => (
              <Link key={`${team.name}-${team.slug}`} href={`/sports/${sport}/club/${team.slug}`}>
                <ParticipantSportVisual sport={sport} label={team.name} countryCode={team.countryCode} visual={team.visual} size="sm" />
                <strong>{team.name}</strong>
                <small>Team profile →</small>
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      {recent.length ? (
        <section className="v2-results">
          <div className="v2-results-heading"><div><p className="v2-eyebrow">Archive</p><h2>Recent events</h2></div></div>
          <div className="v2-event-list">
            {recent.map((event) => (
              <article className="v2-event-card" key={event.id}><div className="v2-event-main"><h3><Link href={event.detailPath}>{event.title}</Link></h3><p className="v2-event-stage">{new Intl.DateTimeFormat("en", { dateStyle: "medium" }).format(new Date(event.eventDate))}</p></div></article>
            ))}
          </div>
        </section>
      ) : null}
    </main>
  );
}
