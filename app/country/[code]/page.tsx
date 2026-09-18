import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import Breadcrumbs from "@/components/Breadcrumbs";
import LocalTime from "@/components/LocalTime";
import { getCurrentCountryGuide } from "@/lib/country-tv";
import { getAllMatches } from "@/lib/matches";
import { evaluateSeoEligibility, indexableRobots } from "@/lib/seo-indexability";
import { getSportLabel } from "@/lib/sports-registry";
import styles from "../country-page.module.css";

type PageProps = { params: Promise<{ code: string }> };

type ArchivedItem = {
  slug: string;
  matchDate: string;
  home: string;
  away: string;
  broadcasters: Array<{ broadcaster: string; access: "Free" | "Paid"; countryName: string }>;
};

function countryArchive(code: string): ArchivedItem[] {
  return getAllMatches()
    .flatMap((match) => {
      const broadcasters = match.broadcasts
        .filter((item) => item.countryCode.toLowerCase() === code && item.coverageStatus === "confirmed" && item.broadcaster && item.url)
        .map((item) => ({ broadcaster: item.broadcaster, access: item.access, countryName: item.countryName }));
      if (!broadcasters.length) return [];
      return [{ slug: match.slug, matchDate: match.matchDate, home: match.homeTeam.name, away: match.awayTeam.name, broadcasters }];
    })
    .sort((a, b) => Date.parse(b.matchDate) - Date.parse(a.matchDate));
}

function resolvedCountryName(
  current: Awaited<ReturnType<typeof getCurrentCountryGuide>>,
  archive: ArchivedItem[],
  code: string,
): string {
  return current.events[0]?.broadcasts[0]?.countryName ?? archive[0]?.broadcasters[0]?.countryName ?? code.toUpperCase();
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { code } = await params;
  const normalizedCode = code.toLowerCase();
  if (!/^[a-z]{2}$/.test(normalizedCode)) return { title: "Country not found | WatchTVSport", robots: { index: false, follow: false } };

  const [current, archive] = await Promise.all([
    getCurrentCountryGuide(normalizedCode),
    Promise.resolve(countryArchive(normalizedCode)),
  ]);
  const verifiedBroadcastCount = current.events.reduce((sum, item) => sum + item.broadcasts.length, 0);
  const eligibility = evaluateSeoEligibility({
    kind: "country",
    canonicalPath: `/country/${normalizedCode}`,
    eventCount: current.events.length,
    verifiedBroadcastCount,
    historicalRecordCount: archive.length,
  });
  if (!eligibility.indexable) return { title: "Country not found | WatchTVSport", robots: { index: false, follow: false } };

  const name = resolvedCountryName(current, archive, normalizedCode);
  const hasCurrent = current.events.length > 0;
  const title = hasCurrent
    ? `Sports on TV in ${name} – official channels & streaming | WatchTVSport`
    : `${name} sports TV archive – World Cup 2026 broadcasters | WatchTVSport`;
  const description = hasCurrent
    ? `Find current and upcoming sports on TV in ${name}, with verified official broadcasters, free options and paid streaming services by event.`
    : `Browse preserved verified broadcaster records for ${name} from the FIFA World Cup 2026 archive.`;

  return {
    title,
    description,
    alternates: { canonical: `/country/${normalizedCode}` },
    robots: indexableRobots(eligibility.indexable),
    openGraph: { title, description, url: `/country/${normalizedCode}`, type: "website" },
    twitter: { card: "summary_large_image", title, description },
  };
}

export default async function CountryPage({ params }: PageProps) {
  const { code } = await params;
  const normalizedCode = code.toLowerCase();
  if (!/^[a-z]{2}$/.test(normalizedCode)) notFound();

  const [current, archive] = await Promise.all([
    getCurrentCountryGuide(normalizedCode),
    Promise.resolve(countryArchive(normalizedCode)),
  ]);
  if (!current.events.length && !archive.length) notFound();

  const name = resolvedCountryName(current, archive, normalizedCode);
  const currentBroadcasters = Array.from(
    new Map(current.events.flatMap((item) => item.broadcasts).map((item) => [item.broadcaster, item] as const)).values(),
  ).sort((a, b) => a.broadcaster.localeCompare(b.broadcaster));
  const currentFree = current.events.flatMap((item) => item.broadcasts).filter((item) => item.access === "Free").length;
  const currentPaid = current.events.flatMap((item) => item.broadcasts).filter((item) => item.access === "Paid").length;
  const archiveBroadcasters = Array.from(new Map(archive.flatMap((item) => item.broadcasters).map((item) => [item.broadcaster, item] as const)).values()).sort((a, b) => a.broadcaster.localeCompare(b.broadcaster));

  const schema = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: `Sports on TV in ${name}`,
    url: `https://watchtvsport.com/country/${normalizedCode}`,
    description: current.events.length
      ? `Current verified official sports broadcaster guide for ${name}.`
      : `Historical verified sports broadcaster archive for ${name}.`,
    about: { "@type": "Thing", name: `Sports broadcasting in ${name}` },
  };

  return (
    <main id="main-content" className={styles.page}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />
      <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Countries", href: "/country" }, { label: name }]} />

      <header className={styles.hero}>
        <p>Country TV guide</p>
        <h1>Sports on TV in {name}</h1>
        <p className={styles.heroCopy}>
          Current listings below are tied to individual verified events and official broadcaster records for this territory. Historical rights are kept separate and are never used to infer current coverage.
        </p>
        <div className={styles.heroActions}>
          <Link href="/events">All current sports events</Link>
          <Link href="/methodology">How listings are verified →</Link>
        </div>
      </header>

      {current.warning ? <p className="v2-data-warning" role="status">{current.warning}</p> : null}

      <section aria-labelledby="country-current-listings" style={{ marginBottom: "2.5rem" }}>
        <p style={{ color: "#60a5fa", fontWeight: 800, margin: 0 }}>Current data</p>
        <h2 id="country-current-listings" style={{ margin: ".35rem 0 .6rem" }}>Live & upcoming events in {name}</h2>
        <p style={{ color: "#9fb0c3", lineHeight: 1.65 }}>
          {current.events.length > 0
            ? `${current.events.length} event${current.events.length === 1 ? "" : "s"} currently have confirmed official coverage in this territory across ${currentBroadcasters.length} broadcaster${currentBroadcasters.length === 1 ? "" : "s"}. ${currentFree} free and ${currentPaid} paid listing${currentFree + currentPaid === 1 ? "" : "s"} are published.`
            : "No current V2 event has a confirmed broadcaster listing for this territory yet."}
        </p>

        {current.events.length > 0 ? (
          <div style={{ display: "grid", gap: ".8rem", marginTop: "1rem" }}>
            {current.events.slice(0, 40).map(({ event, broadcasts }) => (
              <article key={event.id} style={{ border: "1px solid rgba(255,255,255,.1)", borderRadius: 14, padding: "1rem", background: "rgba(255,255,255,.025)" }}>
                <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) auto", gap: "1rem", alignItems: "center" }}>
                  <div>
                    <small style={{ color: "#60a5fa", fontWeight: 800 }}>{getSportLabel(event.sport)} · {event.competition}</small>
                    <h3 style={{ margin: ".35rem 0", fontSize: "1rem" }}>{event.title}</h3>
                    <div style={{ color: "#9fb0c3", fontSize: 13 }}><LocalTime date={event.eventDate} />{event.stage ? ` · ${event.stage}` : ""}</div>
                    <div style={{ color: "#cbd5e1", marginTop: ".45rem", fontSize: 13 }}>{broadcasts.map((broadcast) => `${broadcast.broadcaster} (${broadcast.access})`).join(" · ")}</div>
                  </div>
                  <Link href={event.detailPath} style={{ color: "#60a5fa", whiteSpace: "nowrap" }}>Event page →</Link>
                </div>
              </article>
            ))}
          </div>
        ) : null}
      </section>

      {archive.length > 0 ? (
        <section aria-labelledby="country-world-cup-archive">
          <p style={{ color: "#60a5fa", fontWeight: 800, margin: 0 }}>Historical data</p>
          <h2 id="country-world-cup-archive" style={{ margin: ".35rem 0 .6rem" }}>FIFA World Cup 2026 broadcaster archive in {name}</h2>
          <p style={{ color: "#b8c5d3", lineHeight: 1.7 }}>
            {archive.length} archived match{archive.length === 1 ? "" : "es"} contain confirmed broadcaster records for this territory. {archiveBroadcasters.length} broadcaster{archiveBroadcasters.length === 1 ? "" : "s"} are referenced in the archive.
          </p>
          <div style={{ display: "grid", gap: ".75rem", marginTop: "1rem" }}>
            {archive.map((item) => (
              <article key={item.slug} style={{ border: "1px solid rgba(255,255,255,.1)", borderRadius: 14, padding: "1rem", background: "rgba(255,255,255,.025)" }}>
                <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", gap: ".75rem 1rem" }}>
                  <div>
                    <strong>{item.home} vs {item.away}</strong>
                    <div style={{ color: "#9fb0c3", marginTop: ".3rem" }}>{item.broadcasters.map((broadcast) => `${broadcast.broadcaster} (${broadcast.access})`).join(" · ")}</div>
                  </div>
                  <Link href={`/watch/${item.slug}/${normalizedCode}`} style={{ color: "#60a5fa" }}>Archived listings →</Link>
                </div>
              </article>
            ))}
          </div>
        </section>
      ) : null}

      <p style={{ marginTop: "2rem", color: "#8ea0b5", lineHeight: 1.7 }}>
        Current broadcaster listings are published only when verified for the individual event and territory. WatchTVSport does not infer present-day coverage from historical rights.
      </p>
    </main>
  );
}
