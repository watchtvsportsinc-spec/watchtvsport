import type { Metadata } from "next";
import Link from "next/link";
import Breadcrumbs from "@/components/Breadcrumbs";
import LocalTime from "@/components/LocalTime";
import SportHero from "@/components/SportHero";
import styles from "@/components/sport-hub.module.css";
import { getPublicEventsSnapshot } from "@/lib/public-events";

export const metadata: Metadata = {
  title: "Formula 1 race calendar & TV schedule | WatchTVSport",
  description: "Browse current Formula 1 Grand Prix weekends, sessions and confirmed official TV or streaming options by country.",
  alternates: { canonical: "/formula-1" },
  openGraph: { title: "Formula 1 race calendar & TV schedule | WatchTVSport", description: "Formula 1 race weekends with official viewing information by country.", url: "/formula-1", type: "website" },
};

function eventWeekendSlug(detailPath: string, fallback?: string): string | undefined {
  if (fallback) return fallback;
  return detailPath.match(/^\/formula-1\/grand-prix\/([^#?]+)/)?.[1];
}

function grandPrixFlagCode(slug: string, country?: string): string | null {
  const bySlug: Record<string, string> = {
    australia: "au",
    china: "cn",
    japan: "jp",
    miami: "us",
    canada: "ca",
    monaco: "mc",
    "barcelona-catalunya": "es",
    austria: "at",
    "great-britain": "gb",
    belgium: "be",
    hungary: "hu",
    netherlands: "nl",
    italy: "it",
    spain: "es",
    azerbaijan: "az",
    bahrain: "bh",
    singapore: "sg",
    "united-states": "us",
    mexico: "mx",
    brazil: "br",
    "las-vegas": "us",
    qatar: "qa",
    "abu-dhabi": "ae",
  };

  if (bySlug[slug]) return bySlug[slug];

  const byCountry: Record<string, string> = {
    Australia: "au",
    China: "cn",
    Japan: "jp",
    "United States": "us",
    Canada: "ca",
    Monaco: "mc",
    Spain: "es",
    Austria: "at",
    "Great Britain": "gb",
    Belgium: "be",
    Hungary: "hu",
    Netherlands: "nl",
    Italy: "it",
    Azerbaijan: "az",
    Bahrain: "bh",
    Singapore: "sg",
    Mexico: "mx",
    Brazil: "br",
    Qatar: "qa",
    "United Arab Emirates": "ae",
  };

  return country ? byCountry[country] ?? null : null;
}

export default async function Formula1Page() {
  const now = Date.now();
  const snapshot = await getPublicEventsSnapshot({ sport: "formula-1", limit: 500 });
  const events = snapshot.events
    .filter((event) => event.status === "live" || (event.status !== "finished" && Date.parse(event.eventDate) >= now))
    .sort((a, b) => Date.parse(a.eventDate) - Date.parse(b.eventDate));

  const sessionsByWeekend = new Map<string, typeof events>();
  for (const event of events) {
    const slug = eventWeekendSlug(event.detailPath, event.eventGroupSlug);
    if (!slug) continue;
    const list = sessionsByWeekend.get(slug) ?? [];
    list.push(event);
    sessionsByWeekend.set(slug, list);
  }

  const weekends = Array.from(sessionsByWeekend.entries())
    .map(([slug, sessions]) => {
      const ordered = [...sessions].sort((a, b) => Date.parse(a.eventDate) - Date.parse(b.eventDate));
      const first = ordered[0];
      const nextSession = ordered.find((event) => event.status === "live" || Date.parse(event.eventDate) >= now) ?? first;
      const offers = ordered.flatMap((event) => event.broadcasts.filter((broadcast) => broadcast.coverageStatus === "confirmed"));
      return {
        id: first.eventGroupId ?? `f1-${slug}`,
        name: first.eventGroupName ?? first.title,
        slug,
        country: first.country,
        venue: first.venue,
        season: first.eventEditionLabel ?? first.eventEditionKey,
        firstSession: first.eventDate,
        nextSession: nextSession.eventDate,
        sessionCount: ordered.length,
        isLive: ordered.some((event) => event.status === "live"),
        confirmed: offers.length,
        freeCountries: new Set(offers.filter((broadcast) => broadcast.access === "Free").map((broadcast) => broadcast.countryCode)).size,
        paidCountries: new Set(offers.filter((broadcast) => broadcast.access === "Paid").map((broadcast) => broadcast.countryCode)).size,
      };
    })
    .sort((a, b) => Date.parse(a.nextSession) - Date.parse(b.nextSession));

  const seasonLabels = Array.from(new Set(weekends.map((weekend) => weekend.season).filter(Boolean)));
  const seasonLabel = seasonLabels.length === 1 ? seasonLabels[0] : "Current season";
  const liveWeekends = weekends.filter((weekend) => weekend.isLive).length;
  const nextWeekend = weekends.find((weekend) => !weekend.isLive) ?? weekends[0];
  const heroStats = [
    { icon: "competition" as const, value: weekends.length, label: "REMAINING GP" },
    { icon: "calendar" as const, value: events.length, label: "SESSIONS" },
    ...(liveWeekends > 0
      ? [{ icon: "live" as const, value: liveWeekends, label: "LIVE NOW", tone: "live" as const }]
      : nextWeekend
        ? [{
            icon: "next" as const,
            value: "NEXT",
            label: "UP NEXT",
            detail: nextWeekend.name,
            date: nextWeekend.nextSession ?? nextWeekend.firstSession,
            tone: "next" as const,
          }]
        : []),
  ];

  return <main id="main-content" className={styles.page}>
    {snapshot.warning ? <p className="v2-data-warning" role="status">{snapshot.warning}</p> : null}
    <Breadcrumbs items={[{label:"Home",href:"/"},{label:"Sports",href:"/sports"},{label:"Motorsports",href:"/motorsports"},{label:"Formula 1"}]}/>
    <SportHero
      eyebrow="Motorsports · Championship"
      title="Formula 1"
      description="Current Grand Prix weekends from verified event data. Open a Grand Prix for its published sessions and exact broadcaster information."
      backdrop="/formula-1-hero-bg.webp"
      titleId="f1-title"
      backgroundPosition="72% 100%"
      stats={heroStats}
    />
    <section className="v2-results wts-f1-results" aria-labelledby="grand-prix-title">
      <div className="v2-results-heading">
        <div>
          <p className="v2-eyebrow">{seasonLabel}</p>
          <h2 id="grand-prix-title">Remaining races</h2>
        </div>
        <p>{weekends.length} weekends</p>
      </div>

      {weekends.length === 0 ? (
        <div className="v2-empty-state">
          <h3>No remaining Grand Prix currently published</h3>
          <p>
            The next verified Formula 1 season will appear here automatically
            when its event data is imported.
          </p>
        </div>
      ) : (
        <div className="wts-f1-race-list">
          {weekends.map((weekend, index) => (
            <article className="wts-f1-race-card" key={weekend.id}>
              <div className="wts-f1-race-copy">
                <div className="wts-f1-race-topline">
                  <span>{[weekend.country, weekend.venue].filter(Boolean).join(" · ")}</span>
                </div>

                <h3>
                  {grandPrixFlagCode(weekend.slug, weekend.country) ? (
                    <img
                      className="wts-f1-country-flag"
                      src={`/flags/${grandPrixFlagCode(weekend.slug, weekend.country)}.png`}
                      alt=""
                      aria-hidden="true"
                    />
                  ) : null}
                  <Link href={`/formula-1/grand-prix/${weekend.slug}`}>
                    {weekend.name}
                  </Link>
                </h3>

                <div className="wts-f1-race-meta">
                  <span>
                    <b>Next session</b>
                    <LocalTime date={weekend.nextSession ?? weekend.firstSession} />
                  </span>
                  <span>
                    <b>Weekend</b>
                    {weekend.sessionCount} published sessions
                  </span>
                  <span>
                    <b>TV coverage</b>
                    {weekend.confirmed > 0
                      ? `${weekend.confirmed} confirmed listings`
                      : "Pending"}
                  </span>
                </div>
              </div>

              <div className="wts-f1-race-side">
                <div className="wts-f1-race-access">
                  {weekend.freeCountries > 0 ? (
                    <span className="is-free">Free · {weekend.freeCountries}</span>
                  ) : null}
                  {weekend.paidCountries > 0 ? (
                    <span className="is-paid">Paid · {weekend.paidCountries}</span>
                  ) : null}
                </div>
                <Link
                  className="wts-f1-race-link"
                  href={`/formula-1/grand-prix/${weekend.slug}`}
                >
                  View Grand Prix <b>→</b>
                </Link>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
    <div hidden data-monetization-slot="formula-1-series" />
  </main>;
}
