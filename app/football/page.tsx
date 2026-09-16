import type { Metadata } from "next";
import Link from "next/link";
import Breadcrumbs from "@/components/Breadcrumbs";
import { getPublicEventsSnapshot } from "@/lib/public-events";

type Competition = { slug: string; name: string; eventCount: number; nextEvent: string | null };

type CompetitionGroup = {
  key: string;
  eyebrow: string;
  title: string;
  description: string;
  slugs: string[];
};

const GROUPS: CompetitionGroup[] = [
  {
    key: "europe",
    eyebrow: "European club football",
    title: "European competitions",
    description: "Continental competitions featuring clubs from across Europe.",
    slugs: ["champions-league", "europa-league", "conference-league"],
  },
  {
    key: "domestic-leagues",
    eyebrow: "League football",
    title: "Domestic leagues",
    description: "Major domestic and cross-border top-flight leagues, including MLS in North America.",
    slugs: [
      "premier-league",
      "ligue-1",
      "laliga",
      "bundesliga",
      "serie-a",
      "eredivisie",
      "primeira-liga",
      "mls",
      "major-league-soccer",
    ],
  },
  {
    key: "domestic-cups",
    eyebrow: "Knockout football",
    title: "Domestic cups",
    description: "National knockout competitions and cup tournaments.",
    slugs: ["fa-cup", "copa-del-rey", "coupe-de-france", "dfb-pokal", "coppa-italia"],
  },
  {
    key: "international",
    eyebrow: "National teams",
    title: "International competitions",
    description: "Major competitions played by national teams.",
    slugs: ["world-cup", "fifa-world-cup", "euro", "uefa-euro", "copa-america", "nations-league"],
  },
];

export const metadata: Metadata = {
  title: "Football competitions & TV schedules | WatchTVSport",
  description:
    "Browse major football competitions including European club competitions, domestic leagues and international tournaments, then open each competition schedule and match page.",
  alternates: { canonical: "/football" },
  openGraph: {
    title: "Football competitions | WatchTVSport",
    description: "Choose a football competition, then browse its schedule and match viewing pages.",
    url: "/football",
    type: "website",
  },
};

function competitionHref(slug: string) {
  return `/football/competition/${slug}`;
}

function CompetitionCard({ competition }: { competition: Competition }) {
  return (
    <Link className="v2-entity-tile" href={competitionHref(competition.slug)}>
      <span className="v2-entity-icon" aria-hidden="true">⚽</span>
      <strong>{competition.name}</strong>
      <small>
        {competition.nextEvent
          ? `Next match ${new Intl.DateTimeFormat("en", { month: "short", day: "numeric" }).format(new Date(competition.nextEvent))}`
          : `${competition.eventCount} referenced events`}
      </small>
      <b>Open competition →</b>
    </Link>
  );
}

export default async function FootballPage() {
  const snapshot = await getPublicEventsSnapshot();
  const events = snapshot.events.filter((event) => event.sport === "football");
  const now = Date.now();

  const competitions = Array.from(
    new Map(
      events.map((event) => [
        event.competitionSlug,
        {
          slug: event.competitionSlug,
          name: event.competition,
          eventCount: 0,
          nextEvent: null as string | null,
        },
      ])
    ).values()
  );

  for (const competition of competitions) {
    const competitionEvents = events.filter((event) => event.competitionSlug === competition.slug);
    competition.eventCount = competitionEvents.length;
    competition.nextEvent =
      competitionEvents
        .filter((event) => event.status !== "finished" && Date.parse(event.eventDate) >= now)
        .sort((a, b) => Date.parse(a.eventDate) - Date.parse(b.eventDate))[0]?.eventDate ?? null;
  }

  const assigned = new Set(GROUPS.flatMap((group) => group.slugs));
  const ungrouped = competitions.filter((competition) => !assigned.has(competition.slug));

  return (
    <main id="main-content" className="v2-calendar">
      <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Sports", href: "/sports" }, { label: "Football" }]} />

      <section className="v2-calendar-hero" aria-labelledby="football-title">
        <p className="v2-eyebrow">Sport</p>
        <h1 id="football-title">Football</h1>
        <p className="v2-hero-copy">
          Choose a competition first. Each competition page contains its own schedule, teams and match pages with official viewing information.
        </p>
        <div className="v2-sport-pills">
          <a href="#europe">European competitions</a>
          <a href="#domestic-leagues">Domestic leagues</a>
          <a href="#international">International</a>
        </div>
      </section>

      {GROUPS.map((group) => {
        const groupCompetitions = group.slugs
          .map((slug) => competitions.find((competition) => competition.slug === slug))
          .filter((competition): competition is Competition => Boolean(competition));
        if (groupCompetitions.length === 0) return null;

        return (
          <section id={group.key} className="v2-visual-section" key={group.key}>
            <div className="v2-section-heading">
              <div>
                <p className="v2-eyebrow">{group.eyebrow}</p>
                <h2>{group.title}</h2>
                <p>{group.description}</p>
              </div>
              <span>{groupCompetitions.length}</span>
            </div>
            <div className="v2-entity-grid">
              {groupCompetitions.map((competition) => (
                <CompetitionCard competition={competition} key={competition.slug} />
              ))}
            </div>
          </section>
        );
      })}

      {ungrouped.length > 0 ? (
        <section className="v2-visual-section">
          <div className="v2-section-heading">
            <div>
              <p className="v2-eyebrow">More football</p>
              <h2>Other competitions</h2>
            </div>
            <span>{ungrouped.length}</span>
          </div>
          <div className="v2-entity-grid">
            {ungrouped.map((competition) => (
              <CompetitionCard competition={competition} key={competition.slug} />
            ))}
          </div>
        </section>
      ) : null}
    </main>
  );
}
