import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import Breadcrumbs from "@/components/Breadcrumbs";
import LocalTime from "@/components/LocalTime";
import {
  ensureMatch,
  formatStage,
  getMatchBySlug,
  getSafeBroadcasts,
  getTeamName,
  normalizeSlug,
} from "@/lib/utils";

type PageProps = { params: Promise<{ slug: string }> };

function eventStatus(matchDate: string, status?: string) {
  if (status === "live") return "https://schema.org/EventInProgress";
  if (status === "finished" || Date.parse(matchDate) < Date.now()) {
    return "https://schema.org/EventCompleted";
  }
  return "https://schema.org/EventScheduled";
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const match = getMatchBySlug(normalizeSlug(slug));
  if (!match) {
    return { title: "Match archive not found | WatchTVSport", robots: { index: false, follow: false } };
  }
  const safeMatch = ensureMatch(match);
  const home = getTeamName(safeMatch.homeTeam);
  const away = getTeamName(safeMatch.awayTeam);
  const title = `${home} vs ${away} – World Cup 2026 broadcaster archive`;
  const description = `Historical FIFA World Cup 2026 page for ${home} vs ${away}, preserving the official TV and streaming broadcasters verified by WatchTVSport for the match.`;
  return {
    title,
    description,
    alternates: { canonical: `/match/${safeMatch.slug}` },
    openGraph: { title, description, url: `/match/${safeMatch.slug}`, type: "article" },
    twitter: { card: "summary_large_image", title, description },
  };
}

export default async function ArchivedWorldCupMatchPage({ params }: PageProps) {
  const { slug } = await params;
  const match = getMatchBySlug(normalizeSlug(slug));
  if (!match) notFound();

  const safeMatch = ensureMatch(match);
  const broadcasts = getSafeBroadcasts(safeMatch);
  const home = getTeamName(safeMatch.homeTeam);
  const away = getTeamName(safeMatch.awayTeam);
  const countries = new Map<string, typeof broadcasts>();
  for (const broadcast of broadcasts) {
    countries.set(broadcast.countryCode, [...(countries.get(broadcast.countryCode) ?? []), broadcast]);
  }

  const schema = {
    "@context": "https://schema.org",
    "@type": "SportsEvent",
    name: `${home} vs ${away}`,
    startDate: safeMatch.matchDate,
    eventStatus: eventStatus(safeMatch.matchDate, safeMatch.status),
    sport: "Soccer",
    url: `https://watchtvsport.com/match/${safeMatch.slug}`,
    performer: [
      { "@type": "SportsTeam", name: home },
      { "@type": "SportsTeam", name: away },
    ],
    organizer: { "@type": "Organization", name: "FIFA", url: "https://www.fifa.com" },
    ...(safeMatch.hostCity || safeMatch.stadiumName
      ? {
          location: {
            "@type": "Place",
            name: safeMatch.stadiumName || [safeMatch.hostCity, safeMatch.hostCountry].filter(Boolean).join(", "),
          },
        }
      : {}),
  };

  return (
    <main id="main-content" style={{ maxWidth: 1100, margin: "0 auto", padding: "1.5rem 1rem 4rem" }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />
      <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "World Cup 2026 archive", href: "/archive/world-cup-2026" }, { label: `${home} vs ${away}` }]} />

      <header style={{ margin: "1.5rem 0 2rem", maxWidth: 850 }}>
        <p style={{ color: "#60a5fa", fontWeight: 800, textTransform: "uppercase", letterSpacing: ".1em" }}>World Cup 2026 archive</p>
        <h1 style={{ fontSize: "clamp(2rem,6vw,3.7rem)", lineHeight: 1.05, margin: ".5rem 0 1rem" }}>{home} vs {away}</h1>
        <p style={{ color: "#b8c5d3", lineHeight: 1.75 }}>
          This match has finished. WatchTVSport preserves the official broadcaster information that was verified for this FIFA World Cup 2026 fixture as a historical reference.
        </p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: ".65rem", color: "#9fb0c3" }}>
          <span>{formatStage(safeMatch.group)}</span>
          <span>·</span>
          <LocalTime date={safeMatch.matchDate} />
          {safeMatch.hostCity ? <><span>·</span><span>{safeMatch.hostCity}</span></> : null}
        </div>
      </header>

      <section aria-labelledby="archived-broadcasters">
        <div style={{ display: "flex", justifyContent: "space-between", gap: "1rem", alignItems: "baseline", marginBottom: "1rem" }}>
          <h2 id="archived-broadcasters">Archived official broadcasters</h2>
          <span style={{ color: "#8ea0b5" }}>{broadcasts.length} confirmed listings</span>
        </div>
        {countries.size ? (
          <div style={{ display: "grid", gap: "1rem" }}>
            {Array.from(countries.entries()).sort(([a], [b]) => a.localeCompare(b)).map(([code, list]) => (
              <article key={code} style={{ border: "1px solid rgba(255,255,255,.1)", borderRadius: 14, padding: "1rem", background: "rgba(255,255,255,.025)" }}>
                <h3 style={{ marginTop: 0 }}>{list[0].countryName}</h3>
                <div style={{ display: "grid", gap: ".6rem" }}>
                  {list.map((item) => (
                    <div key={`${code}-${item.broadcaster}-${item.access}`} style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", gap: ".5rem 1rem" }}>
                      <span><strong>{item.broadcaster}</strong> · {item.access}</span>
                      <Link href={`/watch/${safeMatch.slug}/${code.toLowerCase()}`} style={{ color: "#60a5fa" }}>Country archive →</Link>
                    </div>
                  ))}
                </div>
              </article>
            ))}
          </div>
        ) : (
          <p style={{ color: "#b8c5d3" }}>No confirmed broadcaster record is stored for this archived match.</p>
        )}
      </section>

      <nav style={{ marginTop: "2rem", display: "flex", gap: "1rem", flexWrap: "wrap" }}>
        <Link href="/archive/world-cup-2026" style={{ color: "#60a5fa" }}>← World Cup 2026 archive</Link>
        <Link href="/events" style={{ color: "#60a5fa" }}>Current sports events →</Link>
      </nav>
    </main>
  );
}
