import type { Metadata } from "next";
import Link from "next/link";
import Breadcrumbs from "@/components/Breadcrumbs";
import LocalTime from "@/components/LocalTime";
import { getPublicEventsSnapshot } from "@/lib/public-events";

export const metadata: Metadata = {
  title: "UFC schedule & official broadcasters | WatchTVSport",
  description: "Find upcoming UFC events, card start times and verified official broadcasters by country.",
  alternates: { canonical: "/ufc" },
};

export default async function UfcPage() {
  const snapshot = await getPublicEventsSnapshot();
  const events = snapshot.events.filter((event) => event.sport === "ufc");
  const cards = new Map<string, typeof events>();

  for (const event of events) {
    if (!event.eventGroupSlug) continue;
    const bucket = cards.get(event.eventGroupSlug) ?? [];
    bucket.push(event);
    cards.set(event.eventGroupSlug, bucket);
  }

  const ordered = Array.from(cards.entries())
    .map(([slug, cardEvents]) => ({
      slug,
      events: cardEvents.sort(
        (a, b) => new Date(a.eventDate).getTime() - new Date(b.eventDate).getTime()
      ),
    }))
    .sort(
      (a, b) =>
        new Date(a.events[0]?.eventDate ?? 0).getTime() -
        new Date(b.events[0]?.eventDate ?? 0).getTime()
    );

  return (
    <main id="main-content" className="v2-calendar">
      <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "UFC" }]} />

      <section className="v2-calendar-hero" aria-labelledby="ufc-title">
        <p className="v2-eyebrow">Mixed martial arts</p>
        <h1 id="ufc-title">UFC</h1>
        <p className="v2-signature">Events, cards and official broadcasters</p>
        <p className="v2-hero-copy">
          WatchTVSport models UFC cards as separate Early Prelims, Prelims and Main Card sessions so broadcaster differences are not hidden.
        </p>
      </section>

      <section className="v2-results" aria-labelledby="ufc-events-title">
        <div className="v2-results-heading">
          <div>
            <p className="v2-eyebrow">Schedule</p>
            <h2 id="ufc-events-title">Upcoming UFC events</h2>
          </div>
          <p>{ordered.length}</p>
        </div>

        <div className="v2-event-list">
          {ordered.map(({ slug, events: cardEvents }) => {
            const first = cardEvents[0];
            const main = cardEvents.find((event) => event.sessionType === "main_card") ?? first;
            const confirmed = new Set(
              cardEvents.flatMap((event) =>
                event.broadcasts
                  .filter((broadcast) => broadcast.coverageStatus === "confirmed")
                  .map((broadcast) => `${broadcast.countryCode}:${broadcast.broadcaster}`)
              )
            ).size;

            return (
              <article className="v2-event-card" key={slug}>
                <div className="v2-event-main">
                  <p className="v2-event-competition">UFC · {first.country}</p>
                  <h3>
                    <Link href={`/ufc/event/${slug}`}>{first.eventGroupName}</Link>
                  </h3>
                  <p className="v2-event-stage">
                    Main Card: <LocalTime date={main.eventDate} />
                  </p>
                  <p className="v2-event-stage">{first.venue}</p>
                </div>
                <Link className="v2-broadcast-link" href={`/ufc/event/${slug}`}>
                  <span>{confirmed} confirmed country/broadcaster listings</span>
                  <strong>View event →</strong>
                </Link>
              </article>
            );
          })}
        </div>
      </section>
    </main>
  );
}
