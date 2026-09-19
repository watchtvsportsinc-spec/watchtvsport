import Link from "next/link";
import Breadcrumbs from "@/components/Breadcrumbs";
import LocalTime from "@/components/LocalTime";
import FavoriteButton from "@/components/FavoriteButton";
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
  const { weekend, exactNext, confirmed, freeCountries, paidCountries } = item;
  const href = `/sports/motogp/grand-prix/${weekend.slug}`;
  const favorite = {
    kind: "group" as const,
    entityId: `motogp-${weekend.slug}`,
    label: weekend.name,
    href,
  };
  const accessOptions = [
    freeCountries > 0 ? "Free" : null,
    paidCountries > 0 ? "Paid" : null,
  ].filter(Boolean) as Array<"Free" | "Paid">;

  return (
    <article className="wts-ufc-event-row wts-motorsport-event-row">
      <Link className="wts-ufc-event-main" href={href}>
        <div className="wts-discovery-card-time wts-motorsport-event-time">
          <strong>
            {completed ? "—" : exactNext ? <LocalTime date={exactNext} display="time" /> : "TBC"}
          </strong>
          <small>
            {completed ? (
              formatDate(weekend.raceDate)
            ) : exactNext ? (
              <LocalTime date={exactNext} display="date" />
            ) : (
              formatWeekend(weekend.weekendStart, weekend.weekendEnd)
            )}
          </small>
        </div>

        <div className="wts-motorsport-flag-cell">
          <img
            className="wts-motorsport-inline-flag"
            src={`/flags/${weekend.flagCode}.png`}
            alt=""
            aria-hidden="true"
          />
        </div>

        <div className="wts-discovery-card-main">
          <h3 className="wts-motorsport-event-title">{weekend.name}</h3>
          <span>
            {[weekend.venue, formatWeekend(weekend.weekendStart, weekend.weekendEnd), confirmed > 0 ? `${confirmed} confirmed TV options` : null]
              .filter(Boolean)
              .join(" · ")}
          </span>
        </div>

        <span className="wts-result-access-stack">
          {accessOptions.length > 0 ? (
            accessOptions.map((access) => (
              <span
                className={"wts-result-access " + (access === "Free" ? "is-free" : "is-paid")}
                key={access}
              >
                {access}
              </span>
            ))
          ) : (
            <span className="wts-result-access is-tbc">TV TBC</span>
          )}
        </span>
      </Link>

      <div className="wts-ufc-event-actions">
        <FavoriteButton compact favorite={favorite} />
        <Link
          className="wts-ufc-event-open"
          href={href}
          aria-label={`View ${weekend.name}`}
        >
          <span>View event</span>
          <b aria-hidden="true">›</b>
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

      <section className={styles.section} aria-labelledby="motogp-remaining-title">
        <div className="wts-discovery-results">
          <div className="wts-discovery-results-heading">
            <div>
              <p>2026 season</p>
              <h2 id="motogp-remaining-title">Remaining races</h2>
            </div>
            <span>{remaining.length} events</span>
          </div>
          <div className="wts-discovery-list">
            {remaining.map((item) => <RaceCard item={item} key={item.weekend.slug} />)}
          </div>
        </div>
      </section>

      {completed.length > 0 ? (
        <section className={styles.section} aria-labelledby="motogp-completed-title">
          <div className="wts-discovery-results">
            <div className="wts-discovery-results-heading">
              <div>
                <p>2026 archive</p>
                <h2 id="motogp-completed-title">Completed races</h2>
              </div>
              <span>{completed.length} events</span>
            </div>
            <div className="wts-discovery-list">
              {completed.map((item) => <RaceCard completed item={item} key={item.weekend.slug} />)}
            </div>
          </div>
        </section>
      ) : null}
    </main>
  );
}
