import type { Metadata } from "next";
import Link from "next/link";
import Breadcrumbs from "@/components/Breadcrumbs";
import LocalTime from "@/components/LocalTime";
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

  return <main id="main-content" className="v2-calendar">
    {snapshot.warning ? <p className="v2-data-warning" role="status">{snapshot.warning}</p> : null}
    <Breadcrumbs items={[{label:"Home",href:"/"},{label:"Sports",href:"/sports"},{label:"Motorsports",href:"/motorsports"},{label:"Formula 1"}]}/>
    <section
      className="v2-calendar-hero wts-f1-hero"
      aria-labelledby="f1-title"
      style={{
        background:
          "linear-gradient(90deg, rgba(2,9,17,.84) 0%, rgba(3,12,22,.66) 48%, rgba(3,13,23,.48) 100%), url('/formula-1-hero-bg.webp') center center / cover no-repeat",
      }}
    ><p className="v2-eyebrow">Motorsports · Championship</p><h1 id="f1-title">Formula 1</h1><p className="v2-hero-copy">Current Grand Prix weekends from verified event data. Open a Grand Prix for its published sessions and exact broadcaster information.</p></section>
    <section className="v2-results" aria-labelledby="grand-prix-title"><div className="v2-results-heading"><div><p className="v2-eyebrow">{seasonLabel}</p><h2 id="grand-prix-title">Remaining races</h2></div><p>{weekends.length} weekends</p></div>
      {weekends.length===0?<div className="v2-empty-state"><h3>No remaining Grand Prix currently published</h3><p>The next verified Formula 1 season will appear here automatically when its event data is imported.</p></div>:<div className="v2-event-list">{weekends.map((weekend,index)=><article className="v2-event-card" key={weekend.id}><div className="v2-event-main"><p className="v2-event-competition">{weekend.isLive?"LIVE · ":index===0?"NEXT · ":""}{[weekend.country,weekend.venue].filter(Boolean).join(" · ")}</p><h4><Link href={`/formula-1/grand-prix/${weekend.slug}`}>{weekend.name}</Link></h4><p className="v2-event-stage"><LocalTime date={weekend.nextSession??weekend.firstSession}/></p><p className="v2-event-stage">{weekend.confirmed>0?`${weekend.confirmed} confirmed listings${weekend.freeCountries?` · free in ${weekend.freeCountries}`:""}${weekend.paidCountries?` · paid in ${weekend.paidCountries}`:""}`:"Broadcaster details pending"}</p></div><Link className="v2-broadcast-link" href={`/formula-1/grand-prix/${weekend.slug}`}><span>{weekend.sessionCount} published sessions</span><strong>Where to watch →</strong></Link></article>)}</div>}
    </section>
    <div hidden data-monetization-slot="formula-1-series" />
  </main>;
}
