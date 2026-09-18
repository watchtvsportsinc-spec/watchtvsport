import Link from "next/link";
import type { Metadata } from "next";
import Breadcrumbs from "@/components/Breadcrumbs";
import styles from "./country-page.module.css";
import { getCurrentCountrySummaries } from "@/lib/country-tv";
import { getAllMatches } from "@/lib/matches";

export const metadata: Metadata = {
  title: "Sports TV by country – official channels & streaming | WatchTVSport",
  description:
    "Browse current sports TV coverage by country and find verified official broadcasters, free viewing options and paid streaming services.",
  alternates: { canonical: "/country" },
  openGraph: {
    title: "Sports TV by country | WatchTVSport",
    description: "Current verified official sports broadcasters by territory, with the FIFA World Cup 2026 archive preserved separately.",
    url: "/country",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Sports TV by country | WatchTVSport",
    description: "Current verified official sports broadcasters by territory.",
  },
  robots: { index: true, follow: true },
};

type ArchiveCountry = {
  countryCode: string;
  countryName: string;
  matchCount: number;
  broadcasters: string[];
};

function archiveCountries(): ArchiveCountry[] {
  const rows = new Map<string, { countryName: string; matches: Set<string>; broadcasters: Set<string> }>();
  for (const match of getAllMatches()) {
    for (const broadcast of match.broadcasts) {
      if (broadcast.coverageStatus !== "confirmed" || !broadcast.countryCode || !broadcast.countryName || !broadcast.broadcaster || !broadcast.url) continue;
      const code = broadcast.countryCode.toLowerCase();
      const row = rows.get(code) ?? { countryName: broadcast.countryName, matches: new Set<string>(), broadcasters: new Set<string>() };
      row.matches.add(match.slug);
      row.broadcasters.add(broadcast.broadcaster);
      rows.set(code, row);
    }
  }
  return Array.from(rows.entries())
    .map(([countryCode, row]) => ({
      countryCode,
      countryName: row.countryName,
      matchCount: row.matches.size,
      broadcasters: Array.from(row.broadcasters).sort().slice(0, 4),
    }))
    .sort((a, b) => a.countryName.localeCompare(b.countryName));
}

function cardStyle() {
  return {
    position: "relative" as const,
    overflow: "hidden" as const,
    minHeight: 150,
    display: "grid",
    alignContent: "center",
    gap: ".45rem",
    padding: "1rem",
    borderRadius: 18,
    textDecoration: "none",
    color: "#fff",
    background: "linear-gradient(145deg,rgba(13,39,65,.96),rgba(5,19,34,.98))",
    border: "1px solid rgba(96,165,250,.28)",
  };
}

export default async function CountriesPage() {
  const current = await getCurrentCountrySummaries();
  const archived = archiveCountries();
  const currentCodes = new Set(current.countries.map((country) => country.countryCode));
  const archiveOnly = archived.filter((country) => !currentCodes.has(country.countryCode));
  const currentEventTerritoryPairs = current.countries.reduce((sum, country) => sum + country.eventCount, 0);

  const schema = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "Sports TV by country",
    url: "https://watchtvsport.com/country",
    description: "Current verified official sports broadcaster information organized by territory.",
  };

  return (
    <main id="main-content" className={styles.page}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />
      <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Countries" }]} />

      <header className={styles.hero}>
        <p>Official broadcasters by territory</p>
        <h1>Sports TV by country</h1>
        <p className={styles.heroCopy}>
          Choose a country to see current and upcoming sports events with confirmed official TV or streaming listings. Historical FIFA World Cup 2026 broadcaster records remain available separately below.
        </p>
        <div className={styles.heroMeta}>
          <span>{current.countries.length} territories with current verified listings</span>
          <span>·</span>
          <span>{currentEventTerritoryPairs} current event/territory listings</span>
        </div>
      </header>

      {current.warning ? <p className="v2-data-warning" role="status">{current.warning}</p> : null}

      <section aria-labelledby="current-country-tv">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "end", gap: "1rem", marginBottom: "1rem" }}>
          <div><p style={{ color: "#60a5fa", margin: 0, fontWeight: 800 }}>Current data</p><h2 id="current-country-tv" style={{ margin: ".3rem 0 0" }}>Live & upcoming sports by country</h2></div>
          <Link href="/methodology" style={{ color: "#60a5fa" }}>Verification methodology →</Link>
        </div>

        {current.countries.length === 0 ? (
          <div style={{ padding: "1.2rem", border: "1px solid rgba(255,255,255,.1)", borderRadius: 14, color: "#9fb0c3" }}>
            No current territory listings are published yet. Historical verified coverage remains available below.
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(190px,1fr))", gap: ".8rem" }}>
            {current.countries.map((country) => (
              <Link key={country.countryCode} href={`/country/${country.countryCode}`} style={cardStyle()}>
                <div style={{ display: "flex", alignItems: "center", gap: ".7rem" }}>
                  <img src={`/flags/${country.countryCode}.png`} alt="" width="38" height="38" style={{ width: 38, height: 38, borderRadius: "50%", objectFit: "cover" }} />
                  <div><strong style={{ display: "block", fontSize: "1rem" }}>{country.countryName}</strong><span style={{ color: "#93c5fd", fontSize: 12 }}>{country.eventCount} current event{country.eventCount === 1 ? "" : "s"}</span></div>
                </div>
                <span style={{ color: "#b8c5d3", fontSize: 12, lineHeight: 1.45 }}>{country.broadcasters.join(" · ") || `${country.broadcasterCount} verified broadcasters`}</span>
                <span style={{ color: country.freeListings > 0 ? "#4ade80" : "#fbbf24", fontSize: 12, fontWeight: 800 }}>
                  {country.freeListings > 0 ? `${country.freeListings} free listing${country.freeListings === 1 ? "" : "s"}` : "Paid official coverage"}
                </span>
              </Link>
            ))}
          </div>
        )}
      </section>

      {archiveOnly.length > 0 ? (
        <section aria-labelledby="archive-country-tv" style={{ marginTop: "2.5rem" }}>
          <p style={{ color: "#60a5fa", fontWeight: 800, margin: 0 }}>Historical archive</p>
          <h2 id="archive-country-tv" style={{ margin: ".3rem 0 .7rem" }}>FIFA World Cup 2026 broadcaster records</h2>
          <p style={{ color: "#9fb0c3", lineHeight: 1.65, maxWidth: 760 }}>
            These territories currently have no V2 event listing in the selected window, but their verified World Cup 2026 broadcaster records remain searchable as historical data.
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(190px,1fr))", gap: ".8rem" }}>
            {archiveOnly.map((country) => (
              <Link key={country.countryCode} href={`/country/${country.countryCode}`} style={cardStyle()}>
                <strong>{country.countryName}</strong>
                <span style={{ color: "#9fb0c3", fontSize: 12 }}>{country.matchCount} archived match{country.matchCount === 1 ? "" : "es"}</span>
                <span style={{ color: "#b8c5d3", fontSize: 12 }}>{country.broadcasters.join(" · ")}</span>
              </Link>
            ))}
          </div>
        </section>
      ) : null}
    </main>
  );
}
