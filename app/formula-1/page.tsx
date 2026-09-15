import type { Metadata } from "next";
import Link from "next/link";
import Breadcrumbs from "@/components/Breadcrumbs";
import LocalTime from "@/components/LocalTime";
import { getPublicEventsSnapshot } from "@/lib/public-events";

export const metadata: Metadata = {
  title: "Formula 1 TV schedule & official broadcasters | WatchTVSport",
  description:
    "Browse Formula 1 Grand Prix weekends and session schedules with official broadcast information.",
  alternates: { canonical: "/formula-1" },
};

export default async function Formula1Page() {
  const snapshot = await getPublicEventsSnapshot();
  const events = snapshot.events
    .filter((event) => event.sport === "formula-1")
    .sort((a, b) => new Date(a.eventDate).getTime() - new Date(b.eventDate).getTime());

  const weekends = Array.from(
    new Map(
      events
        .filter(
          (event) => event.eventGroupId && event.eventGroupName && event.eventGroupSlug
        )
        .map((event) => [
          event.eventGroupId!,
          {
            id: event.eventGroupId!,
            name: event.eventGroupName!,
            slug: event.eventGroupSlug!,
            country: event.country,
            venue: event.venue,
            firstSession:
              events.find(
                (candidate) => candidate.eventGroupId === event.eventGroupId
              )?.eventDate ?? event.eventDate,
            sessionCount: events.filter(
              (candidate) => candidate.eventGroupId === event.eventGroupId
            ).length,
          },
        ])
    ).values()
  );

  return (
    <main id="main-content" className="v2-calendar">
      <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Formula 1" }]} />

      <section className="v2-calendar-hero" aria-labelledby="f1-title">
        <p className="v2-eyebrow">Motorsport</p>
        <h1 id="f1-title">Formula 1</h1>
        <p className="v2-hero-copy">
          Formula 1 is organised around Grand Prix weekends. Each weekend can contain
          practice, sprint qualifying, sprint, qualifying and race sessions.
        </p>
      </section>

      <section className="v2-results" aria-labelledby="grand-prix-title">
        <div className="v2-results-heading">
          <div>
            <p className="v2-eyebrow">Race weekends</p>
            <h2 id="grand-prix-title">Grand Prix</h2>
          </div>
          <p>{weekends.length}</p>
        </div>

        <div className="v2-event-list">
          {weekends.map((weekend) => (
            <article className="v2-event-card" key={weekend.id}>
              <div className="v2-event-main">
                <p className="v2-event-competition">
                  {[weekend.country, weekend.venue].filter(Boolean).join(" · ")}
                </p>
                <h3>{weekend.name}</h3>
                <p className="v2-event-stage">
                  <LocalTime date={weekend.firstSession} />
                </p>
              </div>
              <Link
                className="v2-broadcast-link"
                href={`/formula-1/grand-prix/${weekend.slug}`}
              >
                <span>{weekend.sessionCount} timed sessions</span>
                <strong>Open Grand Prix →</strong>
              </Link>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
