import type { Metadata } from "next";
import Link from "next/link";
import Breadcrumbs from "@/components/Breadcrumbs";
import UfcEventGrid, { type UfcHubCard } from "@/components/UfcEventGrid";
import { getPublicEventsSnapshot } from "@/lib/public-events";
import styles from "@/components/sport-hub.module.css";

export const metadata: Metadata = {
  title: "UFC schedule & official broadcasters | WatchTVSport",
  description:
    "Find upcoming UFC fight nights and numbered events, with card times and verified official broadcasters by country.",
  alternates: { canonical: "/ufc" },
};

function sessionLabel(event: Awaited<ReturnType<typeof getPublicEventsSnapshot>>["events"][number]): string {
  if (event.stage) return event.stage;
  if (event.sessionType === "early_prelims") return "Early Prelims";
  if (event.sessionType === "prelims") return "Prelims";
  if (event.sessionType === "main_card") return "Main Card";
  return event.sessionType?.replaceAll("_", " ") || "Card session";
}

export default async function UfcPage() {
  const now = Date.now();
  const snapshot = await getPublicEventsSnapshot({
    sport: "ufc",
    from: new Date(now - 24 * 60 * 60 * 1000).toISOString(),
    limit: 500,
  });

  const events = snapshot.events
    .filter(
      (event) =>
        event.status === "live" ||
        (event.status !== "finished" && Date.parse(event.eventDate) >= now),
    )
    .sort((a, b) => Date.parse(a.eventDate) - Date.parse(b.eventDate));

  const groups = new Map<string, typeof events>();

  for (const event of events) {
    const key = event.eventGroupId ?? event.eventGroupSlug;
    if (!key || !event.eventGroupSlug) continue;
    const list = groups.get(key) ?? [];
    list.push(event);
    groups.set(key, list);
  }

  const cards: UfcHubCard[] = Array.from(groups.entries())
    .map(([id, sessions]) => {
      const ordered = [...sessions].sort(
        (a, b) => Date.parse(a.eventDate) - Date.parse(b.eventDate),
      );
      const first = ordered[0];
      const main =
        ordered.find((event) => event.sessionType === "main_card") ??
        ordered.at(-1) ??
        first;
      const confirmed = ordered.flatMap((event) =>
        event.broadcasts.filter(
          (broadcast) => broadcast.coverageStatus === "confirmed",
        ),
      );
      const confirmedListings = new Set(
        confirmed.map(
          (broadcast) =>
            broadcast.countryCode + ":" + broadcast.broadcaster,
        ),
      ).size;
      const freeCountries = new Set(
        confirmed
          .filter((broadcast) => broadcast.access === "Free")
          .map((broadcast) => broadcast.countryCode),
      ).size;
      const paidCountries = new Set(
        confirmed
          .filter((broadcast) => broadcast.access === "Paid")
          .map((broadcast) => broadcast.countryCode),
      ).size;

      return {
        id,
        slug: first.eventGroupSlug!,
        name: first.eventGroupName ?? first.title,
        mainDate: main.eventDate,
        country: first.country,
        venue: first.venue,
        sessionCount: ordered.length,
        sessionLabels: Array.from(new Set(ordered.map(sessionLabel))),
        confirmedListings,
        freeCountries,
        paidCountries,
        live: ordered.some((event) => event.status === "live"),
      };
    })
    .sort(
      (a, b) =>
        Number(b.live) - Number(a.live) ||
        Date.parse(a.mainDate) - Date.parse(b.mainDate),
    );

  return (
    <main id="main-content" className={styles.page}>
      {snapshot.warning ? (
        <p className="v2-data-warning" role="status">
          {snapshot.warning}
        </p>
      ) : null}

      <Breadcrumbs
        items={[
          { label: "Home", href: "/" },
          { label: "Sports", href: "/sports" },
          { label: "Combat sports", href: "/sports" },
          { label: "UFC" },
        ]}
      />

      <section
        className={styles.hero}
        aria-labelledby="ufc-title"
        style={{
          backgroundImage:
            "linear-gradient(90deg,rgba(3,10,18,.97),rgba(3,12,22,.70)),url('/sports/ufc.webp')",
        }}
      >
        <p>Combat sports · Organization</p>
        <h1 id="ufc-title">UFC</h1>
        <span>
          Upcoming numbered events and Fight Nights, grouped as complete cards
          with their published sessions and verified official viewing options.
        </span>
        <div className={styles.heroActions}>
          <a href="#upcoming-ufc">Upcoming events</a>
          <Link href="/?sport=combat&competition=combat%3A%3Aufc">
            UFC on the TV guide
          </Link>
        </div>
      </section>

      <section
        id="upcoming-ufc"
        className={styles.section}
        aria-labelledby="ufc-events-title"
      >
        <div className={styles.heading}>
          <div>
            <p>Schedule</p>
            <h2 id="ufc-events-title">Upcoming UFC events</h2>
          </div>
          <span>{cards.length} events</span>
        </div>

        {cards.length > 0 ? (
          <UfcEventGrid items={cards} />
        ) : (
          <div className={styles.empty}>
            <strong>No upcoming UFC event currently published</strong>
            <span>
              Verified fight cards will appear automatically when imported.
            </span>
          </div>
        )}
      </section>

      <section className={styles.about}>
        <p>About UFC on WatchTVSport</p>
        <h2>One fight card, one event page</h2>
        <span>
          Early Prelims, Prelims and Main Card remain separate behind the
          scenes because broadcasters can differ between sessions. For
          navigation, they are grouped under a single UFC event so the schedule
          stays easy to scan.
        </span>
        <div>
          <Link href="/?sport=combat">Browse combat sports →</Link>
          <Link href="/sports">Explore other sports →</Link>
        </div>
      </section>
    </main>
  );
}
