import Link from "next/link";
import Breadcrumbs from "@/components/Breadcrumbs";
import LocalTime from "@/components/LocalTime";
import SportHero from "@/components/SportHero";
import { getPublicEventsSnapshot } from "@/lib/public-events";
import {
  getMotoGpSessionPlan2026,
  motogpSeason2026Weekends,
  type MotoGpWeekend2026,
} from "@/source/motogp-2026-season";
import styles from "@/components/sport-hub.module.css";

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  }).format(new Date(value + "T12:00:00Z"));
}

function formatWeekend(start: string, end: string) {
  const startDate = new Date(start + "T12:00:00Z");
  const endDate = new Date(end + "T12:00:00Z");
  const startMonth = new Intl.DateTimeFormat("en", { month: "short", timeZone: "UTC" }).format(startDate);
  const endMonth = new Intl.DateTimeFormat("en", { month: "short", timeZone: "UTC" }).format(endDate);
  const startDay = startDate.getUTCDate();
  const endDay = endDate.getUTCDate();
  return startMonth === endMonth
    ? `${startMonth} ${startDay}–${endDay}`
    : `${startMonth} ${startDay} – ${endMonth} ${endDay}`;
}

type WeekendView = {
  weekend: MotoGpWeekend2026;
  events: Awaited<ReturnType<typeof getPublicEventsSnapshot>>["events"];
  exactNext?: string;
  confirmed: number;
  freeCountries: number;
  paidCountries: number;
  live: boolean;
};

function RaceCard({ item, completed = false }: { item: WeekendView; completed?: boolean }) {
  const { weekend, exactNext, confirmed, freeCountries, paidCountries, live } = item;
  const status = completed ? "Finished" : live ? "Live weekend" : "Upcoming";

  return (
    <article className="wts-f1-race-card">
      <div className="wts-f1-race-copy">
        <div className="wts-f1-race-topline">
          <span className={live ? "is-live" : !completed ? "is-next" : undefined}>{status}</span>
          <span>{weekend.country} · {weekend.venue}</span>
        </div>

        <h3>
          <img
            className="wts-f1-country-flag"
            src={`/flags/${weekend.flagCode}.png`}
            alt=""
            aria-hidden="true"
          />
          <Link href={`/sports/motogp/grand-prix/${weekend.slug}`}>
            {weekend.name}
          </Link>
        </h3>

        <div className="wts-f1-race-meta">
          <span>
            <b>{completed ? "Race" : "Next session"}</b>
            {completed ? (
              formatDate(weekend.raceDate)
            ) : exactNext ? (
              <LocalTime date={exactNext} />
            ) : (
              "Schedule TBC"
            )}
          </span>
          <span>
            <b>Weekend</b>
            {formatWeekend(weekend.weekendStart, weekend.weekendEnd)}
          </span>
          <span>
            <b>TV coverage</b>
            {confirmed > 0 ? `${confirmed} confirmed listings` : "Pending"}
          </span>
        </div>
      </div>

      <div className="wts-f1-race-side">
        <div className="wts-f1-race-access">
          {freeCountries > 0 ? <span className="is-free">Free · {freeCountries}</span> : null}
          {paidCountries > 0 ? <span className="is-paid">Paid · {paidCountries}</span> : null}
        </div>
        <Link
          className="wts-f1-race-link"
          href={`/sports/motogp/grand-prix/${weekend.slug}`}
        >
          View Grand Prix <b>→</b>
        </Link>
      </div>
    </article>
  );
}

export default async function MotoGpPage() {
  const snapshot = await getPublicEventsSnapshot({ sport: "motogp", limit: 500 });
  const now = Date.now();
  const today = new Date(now).toISOString().slice(0, 10);

  const views: WeekendView[] = motogpSeason2026Weekends.map((weekend) => {
    const events = snapshot.events.filter((event) => event.eventGroupSlug === weekend.slug);
    const confirmedBroadcasts = events.flatMap((event) =>
      event.broadcasts.filter((broadcast) => broadcast.coverageStatus === "confirmed")
    );
    const exactNext = getMotoGpSessionPlan2026(weekend)
      .find((session) => session.eventDate && Date.parse(session.eventDate) >= now)
      ?.eventDate;

    return {
      weekend,
      events,
      exactNext,
      confirmed: confirmedBroadcasts.length,
      freeCountries: new Set(
        confirmedBroadcasts
          .filter((broadcast) => broadcast.access === "Free")
          .map((broadcast) => broadcast.countryCode)
      ).size,
      paidCountries: new Set(
        confirmedBroadcasts
          .filter((broadcast) => broadcast.access === "Paid")
          .map((broadcast) => broadcast.countryCode)
      ).size,
      live: today >= weekend.weekendStart && today <= weekend.weekendEnd,
    };
  });

  const remaining = views.filter(({ weekend }) => weekend.raceDate >= today);
  const completed = views.filter(({ weekend }) => weekend.raceDate < today);
  const nextWeekend = remaining[0];
  const heroStats = [
    { icon: "competition" as const, value: motogpSeason2026Weekends.length, label: "GRAND PRIX" },
    { icon: "calendar" as const, value: remaining.length, label: "REMAINING" },
    ...(nextWeekend
      ? [{
          icon: "next" as const,
          value: "NEXT",
          label: "UP NEXT",
          detail: nextWeekend.weekend.name,
          ...(nextWeekend.exactNext ? { date: nextWeekend.exactNext } : {}),
          tone: "next" as const,
        }]
      : []),
  ];

  return (
    <main id="main-content" className={styles.page}>
      <Breadcrumbs
        items={[
          { label: "Home", href: "/" },
          { label: "Sports", href: "/sports" },
          { label: "Motorsports", href: "/motorsports" },
          { label: "MotoGP" },
        ]}
      />

      <SportHero
        eyebrow="Motorsport championship"
        title="MotoGP"
        description="The official 2026 MotoGP calendar, with permanent Grand Prix pages, weekend sessions and verified viewing information as it becomes available."
        backdrop="/motogp-race-hero.webp"
        stats={heroStats}
      />

      <section className="v2-results wts-f1-results" aria-labelledby="motogp-remaining-title">
        <div className="v2-results-heading">
          <div>
            <p className="v2-eyebrow">2026 season</p>
            <h2 id="motogp-remaining-title">Remaining races</h2>
          </div>
          <p>{remaining.length} weekends</p>
        </div>
        <div className="wts-f1-race-list">
          {remaining.map((item) => <RaceCard item={item} key={item.weekend.slug} />)}
        </div>
      </section>

      {completed.length > 0 ? (
        <section className="v2-results wts-f1-results" aria-labelledby="motogp-completed-title">
          <div className="v2-results-heading">
            <div>
              <p className="v2-eyebrow">2026 archive</p>
              <h2 id="motogp-completed-title">Completed races</h2>
            </div>
            <p>{completed.length} weekends</p>
          </div>
          <div className="wts-f1-race-list">
            {completed.map((item) => <RaceCard completed item={item} key={item.weekend.slug} />)}
          </div>
        </section>
      ) : null}
    </main>
  );
}
