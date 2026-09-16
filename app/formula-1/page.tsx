import type { Metadata } from "next";
import Link from "next/link";
import Breadcrumbs from "@/components/Breadcrumbs";
import LocalTime from "@/components/LocalTime";
import { getPublicEventsSnapshot } from "@/lib/public-events";
import { formula1Season2026Weekends } from "@/source/formula-1-2026-season";

export const metadata: Metadata = {
  title: "Formula 1 remaining races & TV schedule | WatchTVSport",
  description: "Browse the remaining Formula 1 Grand Prix weekends, sessions and confirmed official TV or streaming options by country.",
  alternates: { canonical: "/formula-1" },
  openGraph: { title: "Formula 1 remaining races & TV schedule | WatchTVSport", description: "Remaining Formula 1 race weekends with official viewing information.", url: "/formula-1", type: "website" },
};

function eventWeekendSlug(detailPath: string, fallback?: string): string | undefined {
  if (fallback) return fallback;
  return detailPath.match(/^\/formula-1\/grand-prix\/([^#?]+)/)?.[1];
}

export default async function Formula1Page() {
  const snapshot = await getPublicEventsSnapshot();
  const now = Date.now();
  const events = snapshot.events
    .filter((event) => event.sport === "formula-1")
    .sort((a, b) => Date.parse(a.eventDate) - Date.parse(b.eventDate));

  const sessionsByWeekend = new Map<string, typeof events>();
  for (const event of events) {
    const slug = eventWeekendSlug(event.detailPath, event.eventGroupSlug);
    if (!slug) continue;
    const list = sessionsByWeekend.get(slug) ?? [];
    list.push(event);
    sessionsByWeekend.set(slug, list);
  }

  const weekends = formula1Season2026Weekends
    .filter((weekend) => weekend.status !== "finished" && Date.parse(weekend.raceDate) >= now)
    .map((weekend) => {
      const sessions = [...(sessionsByWeekend.get(weekend.slug) ?? [])].sort((a, b) => Date.parse(a.eventDate) - Date.parse(b.eventDate));
      const nextSession = sessions.find((event) => event.status === "live" || Date.parse(event.eventDate) >= now) ?? null;
      const offers = sessions.flatMap((event) => event.broadcasts.filter((broadcast) => broadcast.coverageStatus === "confirmed"));
      return {
        id: `f1-${weekend.slug}`,
        name: sessions[0]?.eventGroupName ?? weekend.name,
        slug: weekend.slug,
        country: sessions[0]?.country ?? weekend.country,
        venue: sessions[0]?.venue ?? weekend.venue,
        firstSession: sessions[0]?.eventDate ?? weekend.qualifyingDate,
        nextSession: nextSession?.eventDate ?? weekend.qualifyingDate,
        sessionCount: sessions.length || 2,
        isLive: sessions.some((event) => event.status === "live"),
        confirmed: offers.length,
        freeCountries: new Set(offers.filter((broadcast) => broadcast.access === "Free").map((broadcast) => broadcast.countryCode)).size,
        paidCountries: new Set(offers.filter((broadcast) => broadcast.access === "Paid").map((broadcast) => broadcast.countryCode)).size,
      };
    })
    .sort((a, b) => Date.parse(a.nextSession) - Date.parse(b.nextSession));

  return <main id="main-content" className="v2-calendar">
    <Breadcrumbs items={[{label:"Home",href:"/"},{label:"Sports",href:"/sports"},{label:"Motorsports",href:"/motorsports"},{label:"Formula 1"}]}/>
    <section className="v2-calendar-hero" aria-labelledby="f1-title"><p className="v2-eyebrow">Motorsports · Championship</p><h1 id="f1-title">Formula 1</h1><p className="v2-hero-copy">Remaining Grand Prix weekends for the current season. Open a Grand Prix for qualifying, race sessions and exact broadcaster information.</p></section>
    <section className="v2-results" aria-labelledby="grand-prix-title"><div className="v2-results-heading"><div><p className="v2-eyebrow">Current season</p><h2 id="grand-prix-title">Remaining races</h2></div><p>{weekends.length} weekends</p></div>
      {weekends.length===0?<div className="v2-empty-state"><h3>No remaining Grand Prix currently published</h3><p>The next verified Formula 1 season will appear here when its schedule is imported.</p></div>:<div className="v2-event-list">{weekends.map((weekend,index)=><article className="v2-event-card" key={weekend.id}><div className="v2-event-main"><p className="v2-event-competition">{weekend.isLive?"LIVE · ":index===0?"NEXT · ":""}{[weekend.country,weekend.venue].filter(Boolean).join(" · ")}</p><h4><Link href={`/formula-1/grand-prix/${weekend.slug}`}>{weekend.name}</Link></h4><p className="v2-event-stage"><LocalTime date={weekend.nextSession??weekend.firstSession}/></p><p className="v2-event-stage">{weekend.confirmed>0?`${weekend.confirmed} confirmed listings${weekend.freeCountries?` · free in ${weekend.freeCountries}`:""}${weekend.paidCountries?` · paid in ${weekend.paidCountries}`:""}`:"Broadcaster details pending"}</p></div><Link className="v2-broadcast-link" href={`/formula-1/grand-prix/${weekend.slug}`}><span>{weekend.sessionCount} published sessions</span><strong>Where to watch →</strong></Link></article>)}</div>}
    </section>
    <div hidden data-monetization-slot="formula-1-series" />
  </main>;
}
