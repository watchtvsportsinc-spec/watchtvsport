import type { Metadata } from "next";
import Link from "next/link";
import Breadcrumbs from "@/components/Breadcrumbs";
import LocalTime from "@/components/LocalTime";
import { getPublicEventsSnapshot } from "@/lib/public-events";

export const metadata: Metadata = {
  title: "Formula 1 remaining races & TV schedule | WatchTVSport",
  description:
    "Browse the remaining Formula 1 Grand Prix weekends of the current season, then open each race weekend for sessions and official viewing information.",
  alternates: { canonical: "/formula-1" },
  openGraph: {
    title: "Formula 1 remaining races | WatchTVSport",
    description: "See the remaining Formula 1 race weekends in chronological order.",
    url: "/formula-1",
    type: "website",
  },
};

export default async function Formula1Page() {
  const snapshot = await getPublicEventsSnapshot();
  const now = Date.now();
  const events = snapshot.events
    .filter((event) => event.sport === "formula-1")
    .sort((a, b) => Date.parse(a.eventDate) - Date.parse(b.eventDate));

  const grouped = new Map<string, typeof events>();
  for (const event of events) {
    if (!event.eventGroupId || !event.eventGroupName || !event.eventGroupSlug) continue;
    const list = grouped.get(event.eventGroupId) ?? [];
    list.push(event);
    grouped.set(event.eventGroupId, list);
  }

  const weekends = Array.from(grouped.entries())
    .map(([id, sessions]) => {
      const ordered = [...sessions].sort((a, b) => Date.parse(a.eventDate) - Date.parse(b.eventDate));
      const first = ordered[0];
      const last = ordered[ordered.length - 1];
      const nextSession = ordered.find((event) => event.status === "live" || Date.parse(event.eventDate) >= now) ?? null;
      return {
        id,
        name: first.eventGroupName!,
        slug: first.eventGroupSlug!,
        country: first.country,
        venue: first.venue,
        firstSession: first.eventDate,
        lastSession: last.eventDate,
        nextSession: nextSession?.eventDate ?? null,
        sessionCount: ordered.length,
        isLive: ordered.some((event) => event.status === "live"),
      };
    })
    .filter((weekend) => weekend.isLive || Date.parse(weekend.lastSession) >= now)
    .sort((a, b) => Date.parse(a.nextSession ?? a.firstSession) - Date.parse(b.nextSession ?? b.firstSession));

  return (
    <main id="main-content" className="v2-calendar">
      <Breadcrumbs
        items={[
          { label: "Home", href: "/" },
          { label: "Sports", href: "/sports" },
          { label: "Motorsports", href: "/motorsports" },
          { label: "Formula 1" },
        ]}
      />

      <section className="v2-calendar-hero" aria-labelledby="f1-title">
        <p className="v2-eyebrow">Motorsports · Championship</p>
        <h1 id="f1-title">Formula 1</h1>
        <p className="v2-hero-copy">
          Remaining Grand Prix weekends for the current season, in chronological order. Open a Grand Prix to see practice, sprint, qualifying and race sessions.
        </p>
      </section>

      <section className="v2-results" aria-labelledby="grand-prix-title">
        <div className="v2-results-heading">
          <div>
            <p className="v2-eyebrow">Current season</p>
            <h2 id="grand-prix-title">Remaining races</h2>
          </div>
          <p>{weekends.length} weekends</p>
        </div>

        {weekends.length === 0 ? (
          <div className="v2-empty-state">
            <h3>No remaining Grand Prix currently published</h3>
            <p>The next verified Formula 1 season will appear here when its schedule is imported.</p>
          </div>
        ) : (
          <div className="v2-event-list">
            {weekends.map((weekend, index) => (
              <article className="v2-event-card" key={weekend.id}>
                <div className="v2-event-main">
                  <p className="v2-event-competition">
                    {index === 0 ? "NEXT · " : ""}
                    {[weekend.country, weekend.venue].filter(Boolean).join(" · ")}
                  </p>
                  <h3>{weekend.name}</h3>
                  <p className="v2-event-stage">
                    <LocalTime date={weekend.nextSession ?? weekend.firstSession} />
                  </p>
                </div>
                <Link
                  className="v2-broadcast-link"
                  href={`/formula-1/grand-prix/${weekend.slug}`}
                >
                  <span>{weekend.sessionCount} sessions</span>
                  <strong>Open Grand Prix →</strong>
                </Link>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
