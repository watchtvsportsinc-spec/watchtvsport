import type { Metadata } from "next";
import Link from "next/link";
import Breadcrumbs from "@/components/Breadcrumbs";
import FavoriteButton from "@/components/FavoriteButton";
import LocalTime from "@/components/LocalTime";
import { getPublicEventsSnapshot } from "@/lib/public-events";
import styles from "./ufc-page.module.css";

export const metadata: Metadata = {
  title: "UFC schedule & official broadcasters | WatchTVSport",
  description:
    "Find upcoming UFC events, card start times and verified official broadcasters by country.",
  alternates: { canonical: "/ufc" },
};

type UfcCard = {
  slug: string;
  name: string;
  events: Awaited<ReturnType<typeof getPublicEventsSnapshot>>["events"];
  mainDate: string;
  country?: string;
  venue?: string;
  confirmed: number;
  countries: number;
  free: boolean;
  paid: boolean;
  sessionLabels: string[];
  live: boolean;
};

function sessionLabel(event: UfcCard["events"][number]): string {
  if (event.stage) return event.stage;
  if (event.sessionType === "early_prelims") return "Early Prelims";
  if (event.sessionType === "prelims") return "Prelims";
  if (event.sessionType === "main_card") return "Main Card";
  return event.sessionType?.replaceAll("_", " ") || "Card session";
}

function buildCard(
  slug: string,
  cardEvents: UfcCard["events"],
): UfcCard {
  const sorted = [...cardEvents].sort(
    (a, b) => Date.parse(a.eventDate) - Date.parse(b.eventDate),
  );
  const first = sorted[0];
  const main =
    sorted.find((event) => event.sessionType === "main_card") ??
    sorted.at(-1) ??
    first;

  const confirmedRows = sorted.flatMap((event) =>
    event.broadcasts.filter(
      (broadcast) => broadcast.coverageStatus === "confirmed",
    ),
  );

  const uniqueBroadcasters = new Set(
    confirmedRows.map(
      (broadcast) =>
        broadcast.countryCode + ":" + broadcast.broadcaster,
    ),
  );
  const uniqueCountries = new Set(
    confirmedRows.map((broadcast) => broadcast.countryCode),
  );

  return {
    slug,
    name: first.eventGroupName ?? first.title,
    events: sorted,
    mainDate: main.eventDate,
    country: first.country,
    venue: first.venue,
    confirmed: uniqueBroadcasters.size,
    countries: uniqueCountries.size,
    free: confirmedRows.some((broadcast) => broadcast.access === "Free"),
    paid: confirmedRows.some((broadcast) => broadcast.access === "Paid"),
    sessionLabels: Array.from(new Set(sorted.map(sessionLabel))),
    live: sorted.some((event) => event.status === "live"),
  };
}

function EventAccess({ card }: { card: UfcCard }) {
  return (
    <span className={styles.accessStack}>
      {card.free ? <span className={styles.free}>Free</span> : null}
      {card.paid ? <span className={styles.paid}>Paid</span> : null}
      {!card.free && !card.paid ? (
        <span className={styles.pending}>TV TBC</span>
      ) : null}
    </span>
  );
}

export default async function UfcPage() {
  const now = Date.now();
  const snapshot = await getPublicEventsSnapshot({
    sport: "ufc",
    from: new Date(now - 24 * 60 * 60 * 1000).toISOString(),
    limit: 500,
  });

  const upcomingSessions = snapshot.events.filter(
    (event) =>
      event.status === "live" ||
      (event.status !== "finished" && Date.parse(event.eventDate) >= now),
  );

  const grouped = new Map<string, typeof upcomingSessions>();
  for (const event of upcomingSessions) {
    if (!event.eventGroupSlug) continue;
    const bucket = grouped.get(event.eventGroupSlug) ?? [];
    bucket.push(event);
    grouped.set(event.eventGroupSlug, bucket);
  }

  const cards = Array.from(grouped.entries())
    .map(([slug, events]) => buildCard(slug, events))
    .sort(
      (a, b) =>
        Number(b.live) - Number(a.live) ||
        Date.parse(a.events[0]?.eventDate ?? a.mainDate) -
          Date.parse(b.events[0]?.eventDate ?? b.mainDate),
    );

  const featured = cards[0];
  const following = cards.slice(1);

  return (
    <main id="main-content" className={styles.page}>
      {snapshot.warning ? (
        <p className="v2-data-warning" role="status">
          {snapshot.warning}
        </p>
      ) : null}

      <Breadcrumbs
        items={[{ label: "Home", href: "/" }, { label: "UFC" }]}
      />

      <section className={styles.hero} aria-labelledby="ufc-title">
        <div className={styles.heroContent}>
          <p>Combat sports · UFC</p>
          <h1 id="ufc-title">UFC</h1>
          <strong>Fight nights, full cards and where to watch</strong>
          <span>
            One event, one page. Open a UFC card to see Early Prelims,
            Prelims, Main Card and verified official viewing options together.
          </span>

          <div className={styles.heroActions}>
            <a href="#upcoming">Upcoming events</a>
            <Link href="/events?sport=combat&competition=combat%3A%3Aufc">
              All combat events
            </Link>
          </div>
        </div>

        <div className={styles.heroMark} aria-hidden="true">
          <span>UFC</span>
          <small>Official TV guide</small>
        </div>
      </section>

      {featured ? (
        <section
          id="upcoming"
          className={styles.featuredSection}
          aria-labelledby="next-ufc-title"
        >
          <div className={styles.heading}>
            <div>
              <p>{featured.live ? "Live now" : "Next event"}</p>
              <h2 id="next-ufc-title">
                {featured.live ? "UFC live" : "Next UFC event"}
              </h2>
            </div>
            <span>{cards.length} upcoming</span>
          </div>

          <article className={styles.featuredCard}>
            <Link
              className={styles.featuredMain}
              href={"/ufc/event/" + featured.slug}
            >
              <span
                className={
                  featured.live ? styles.liveBadge : styles.nextBadge
                }
              >
                {featured.live ? "LIVE" : "NEXT"}
              </span>

              <div className={styles.featuredCopy}>
                <p>UFC</p>
                <h3>{featured.name}</h3>
                <div className={styles.meta}>
                  <span>
                    Main Card · <LocalTime date={featured.mainDate} />
                  </span>
                  {featured.venue ? <span>{featured.venue}</span> : null}
                  {featured.country ? <span>{featured.country}</span> : null}
                </div>
                <div className={styles.sessions}>
                  {featured.sessionLabels.map((label) => (
                    <span key={label}>{label}</span>
                  ))}
                </div>
              </div>

              <div className={styles.featuredTv}>
                <EventAccess card={featured} />
                <strong>
                  {featured.confirmed > 0
                    ? featured.confirmed +
                      " confirmed broadcaster" +
                      (featured.confirmed === 1 ? "" : "s")
                    : "Broadcast data pending"}
                </strong>
                {featured.countries > 0 ? (
                  <small>
                    {featured.countries} countr
                    {featured.countries === 1 ? "y" : "ies"}
                  </small>
                ) : null}
                <b>View event →</b>
              </div>
            </Link>

            <div className={styles.favorite}>
              <FavoriteButton
                favorite={{
                  kind: "group",
                  entityId:
                    featured.events[0]?.eventGroupId ??
                    "ufc-card:" + featured.slug,
                  label: featured.name,
                  href: "/ufc/event/" + featured.slug,
                }}
              />
            </div>
          </article>
        </section>
      ) : null}

      <section className={styles.section} aria-labelledby="ufc-events-title">
        <div className={styles.heading}>
          <div>
            <p>Schedule</p>
            <h2 id="ufc-events-title">
              {featured ? "Following UFC events" : "Upcoming UFC events"}
            </h2>
          </div>
          <span>{following.length}</span>
        </div>

        {!featured ? (
          <div className={styles.empty}>
            <strong>No upcoming UFC event currently published</strong>
            <span>
              Verified cards will appear automatically when imported.
            </span>
          </div>
        ) : following.length === 0 ? (
          <div className={styles.empty}>
            <strong>No additional UFC event currently published</strong>
            <span>The next verified cards will appear automatically.</span>
          </div>
        ) : (
          <div className={styles.grid}>
            {following.map((card) => (
              <article className={styles.card} key={card.slug}>
                <Link
                  className={styles.cardLink}
                  href={"/ufc/event/" + card.slug}
                >
                  <div className={styles.cardTop}>
                    <span className={card.live ? styles.liveBadge : styles.statusBadge}>
                      {card.live ? "LIVE" : "UFC EVENT"}
                    </span>
                    <EventAccess card={card} />
                  </div>

                  <div className={styles.cardCopy}>
                    <p>UFC</p>
                    <h3>{card.name}</h3>
                    <span>
                      Main Card · <LocalTime date={card.mainDate} />
                    </span>
                    <small>
                      {[card.venue, card.country].filter(Boolean).join(" · ")}
                    </small>
                  </div>

                  <div className={styles.cardSessions}>
                    {card.sessionLabels.map((label) => (
                      <span key={label}>{label}</span>
                    ))}
                  </div>

                  <div className={styles.cardFooter}>
                    <span>
                      {card.confirmed > 0
                        ? card.confirmed +
                          " confirmed TV option" +
                          (card.confirmed === 1 ? "" : "s")
                        : "TV confirmation pending"}
                    </span>
                    <strong>View event →</strong>
                  </div>
                </Link>

                <div className={styles.cardFavorite}>
                  <FavoriteButton
                    favorite={{
                      kind: "group",
                      entityId:
                        card.events[0]?.eventGroupId ??
                        "ufc-card:" + card.slug,
                      label: card.name,
                      href: "/ufc/event/" + card.slug,
                    }}
                  />
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className={styles.about}>
        <p>How WatchTVSport handles UFC</p>
        <h2>One event instead of three duplicate listings</h2>
        <span>
          Early Prelims, Prelims and Main Card remain separate in the data
          because official broadcasters can differ, but they are grouped under
          a single UFC event for navigation.
        </span>
      </section>
    </main>
  );
}
