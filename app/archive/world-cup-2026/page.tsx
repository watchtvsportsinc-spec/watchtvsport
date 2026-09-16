import type { Metadata } from "next";
import Link from "next/link";
import { getAllMatches } from "@/lib/matches";

export const metadata: Metadata = {
  title: "FIFA World Cup 2026 broadcaster archive",
  description:
    "Historical WatchTVSport archive for the FIFA World Cup 2026: match pages, official broadcaster listings by country and the tournament calendar.",
  alternates: { canonical: "/archive/world-cup-2026" },
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "UTC",
  }).format(new Date(value));
}

export default function WorldCup2026ArchivePage() {
  const matches = getAllMatches().sort(
    (a, b) => Date.parse(a.matchDate) - Date.parse(b.matchDate),
  );

  return (
    <main style={{ maxWidth: 1100, margin: "0 auto", padding: "2rem 1rem 4rem" }}>
      <nav aria-label="Breadcrumb" style={{ marginBottom: "1.5rem", color: "#9fb0c3" }}>
        <Link href="/" style={{ color: "#60a5fa" }}>Home</Link> / World Cup 2026 archive
      </nav>

      <header style={{ maxWidth: 820, marginBottom: "2rem" }}>
        <p style={{ textTransform: "uppercase", letterSpacing: ".12em", color: "#60a5fa", fontWeight: 700 }}>
          Historical archive
        </p>
        <h1 style={{ fontSize: "clamp(2rem,6vw,3.8rem)", lineHeight: 1.05, margin: ".5rem 0 1rem" }}>
          FIFA World Cup 2026 broadcaster archive
        </h1>
        <p style={{ color: "#b8c5d3", lineHeight: 1.75, fontSize: "1.05rem" }}>
          The 2026 World Cup has finished. These pages are preserved as a historical record of the tournament schedule and the official TV and streaming broadcasters WatchTVSport had verified for each match and country.
        </p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: ".75rem", marginTop: "1.25rem" }}>
          <a href="/world-cup-2026-calendar.ics" style={{ color: "#fff", background: "#1d4ed8", padding: ".75rem 1rem", borderRadius: 10, textDecoration: "none" }}>
            Download 2026 calendar (.ics)
          </a>
          <Link href="/events" style={{ color: "#60a5fa", padding: ".75rem 0" }}>
            Browse current sports events →
          </Link>
        </div>
      </header>

      <section aria-labelledby="archive-matches-title">
        <div style={{ display: "flex", justifyContent: "space-between", gap: "1rem", alignItems: "baseline", marginBottom: "1rem" }}>
          <h2 id="archive-matches-title" style={{ margin: 0 }}>Tournament matches</h2>
          <span style={{ color: "#8ea0b5" }}>{matches.length} archived matches</span>
        </div>
        <div style={{ display: "grid", gap: ".7rem" }}>
          {matches.map((match) => {
            const confirmed = match.broadcasts.filter(
              (broadcast) => broadcast.coverageStatus === "confirmed",
            ).length;
            return (
              <article
                key={match.slug}
                style={{ border: "1px solid rgba(255,255,255,.1)", borderRadius: 14, padding: "1rem", background: "rgba(255,255,255,.025)" }}
              >
                <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", gap: ".5rem 1rem" }}>
                  <div>
                    <small style={{ color: "#8ea0b5" }}>{match.stage} · {formatDate(match.matchDate)} UTC</small>
                    <h3 style={{ margin: ".35rem 0" }}>{match.homeTeam.name} vs {match.awayTeam.name}</h3>
                    <span style={{ color: "#9fb0c3" }}>
                      {confirmed ? `${confirmed} verified broadcaster listings archived` : "Historical match page"}
                    </span>
                  </div>
                  <Link href={`/match/${match.slug}`} style={{ alignSelf: "center", color: "#60a5fa", fontWeight: 700 }}>
                    Open archive →
                  </Link>
                </div>
              </article>
            );
          })}
        </div>
      </section>
    </main>
  );
}
