import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import Breadcrumbs from "@/components/Breadcrumbs";
import LocalTime from "@/components/LocalTime";
import {
  ensureMatch,
  getCountryDisplayName,
  getMatchBySlug,
  getSafeBroadcasts,
  getTeamName,
  normalizeSlug,
} from "@/lib/utils";

type PageProps = { params: Promise<{ slug: string; country: string }> };

function normalizeCountryCode(value: string) {
  return value.trim().toLowerCase();
}

function eventStatus(matchDate: string, status?: string) {
  if (status === "live") return "https://schema.org/EventInProgress";
  if (status === "finished" || Date.parse(matchDate) < Date.now()) return "https://schema.org/EventCompleted";
  return "https://schema.org/EventScheduled";
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug, country } = await params;
  const match = getMatchBySlug(normalizeSlug(slug));
  if (!match) return { title: "Match archive not found | WatchTVSport", robots: { index: false, follow: false } };
  const safeMatch = ensureMatch(match);
  const broadcasts = getSafeBroadcasts(safeMatch);
  const countryCode = normalizeCountryCode(country);
  const countryName = getCountryDisplayName(broadcasts, countryCode);
  const home = getTeamName(safeMatch.homeTeam);
  const away = getTeamName(safeMatch.awayTeam);
  const local = broadcasts.filter((item) => item.countryCode.toLowerCase() === countryCode && item.coverageStatus === "confirmed");
  if (!local.length) return { title: `${home} vs ${away} broadcaster archive`, robots: { index: false, follow: true } };
  const title = `${home} vs ${away} in ${countryName} – World Cup 2026 TV archive`;
  const description = `Historical FIFA World Cup 2026 broadcaster record for ${home} vs ${away} in ${countryName}, including official TV and streaming options verified for the match.`;
  return {
    title,
    description,
    alternates: { canonical: `/watch/${safeMatch.slug}/${countryCode}` },
    openGraph: { title, description, url: `/watch/${safeMatch.slug}/${countryCode}`, type: "article" },
    twitter: { card: "summary_large_image", title, description },
  };
}

export default async function ArchivedCountryBroadcastPage({ params }: PageProps) {
  const { slug, country } = await params;
  const match = getMatchBySlug(normalizeSlug(slug));
  if (!match) notFound();
  const safeMatch = ensureMatch(match);
  const broadcasts = getSafeBroadcasts(safeMatch);
  const countryCode = normalizeCountryCode(country);
  const local = broadcasts.filter((item) => item.countryCode.toLowerCase() === countryCode && item.coverageStatus === "confirmed");
  if (!local.length) notFound();

  const home = getTeamName(safeMatch.homeTeam);
  const away = getTeamName(safeMatch.awayTeam);
  const countryName = getCountryDisplayName(broadcasts, countryCode);
  const lastChecked = local
    .map((item) => item.lastChecked)
    .filter((value): value is string => Boolean(value))
    .sort()
    .at(-1);

  const schema = {
    "@context": "https://schema.org",
    "@type": "SportsEvent",
    name: `${home} vs ${away}`,
    startDate: safeMatch.matchDate,
    eventStatus: eventStatus(safeMatch.matchDate, safeMatch.status),
    sport: "Soccer",
    url: `https://watchtvsport.com/watch/${safeMatch.slug}/${countryCode}`,
    performer: [
      { "@type": "SportsTeam", name: home },
      { "@type": "SportsTeam", name: away },
    ],
    organizer: { "@type": "Organization", name: "FIFA", url: "https://www.fifa.com" },
    ...(safeMatch.hostCity || safeMatch.stadiumName
      ? { location: { "@type": "Place", name: safeMatch.stadiumName || [safeMatch.hostCity, safeMatch.hostCountry].filter(Boolean).join(", ") } }
      : {}),
  };

  return (
    <main id="main-content" style={{ maxWidth: 900, margin: "0 auto", padding: "1.5rem 1rem 4rem" }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />
      <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "World Cup 2026 archive", href: "/archive/world-cup-2026" }, { label: `${home} vs ${away}`, href: `/match/${safeMatch.slug}` }, { label: countryName }]} />

      <header style={{ margin: "1.5rem 0 2rem" }}>
        <p style={{ color: "#60a5fa", textTransform: "uppercase", letterSpacing: ".1em", fontWeight: 800 }}>Historical broadcaster record</p>
        <h1 style={{ fontSize: "clamp(2rem,6vw,3.4rem)", lineHeight: 1.05, margin: ".5rem 0 1rem" }}>{home} vs {away} in {countryName}</h1>
        <p style={{ color: "#b8c5d3", lineHeight: 1.75 }}>
          This FIFA World Cup 2026 match has finished. The services below are preserved as the official viewing options WatchTVSport had verified for {countryName} at the time of the match.
        </p>
        <p style={{ color: "#9fb0c3" }}><LocalTime date={safeMatch.matchDate} />{lastChecked ? ` · Broadcaster data last checked ${lastChecked}` : ""}</p>
      </header>

      <section aria-labelledby="country-archive-listings">
        <h2 id="country-archive-listings">Archived official TV & streaming options</h2>
        <div style={{ display: "grid", gap: ".8rem", marginTop: "1rem" }}>
          {local.map((item) => (
            <article key={`${item.broadcaster}-${item.access}`} style={{ border: "1px solid rgba(255,255,255,.1)", borderRadius: 14, padding: "1rem", background: "rgba(255,255,255,.025)" }}>
              <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: ".75rem" }}>
                <div>
                  <strong style={{ fontSize: "1.05rem" }}>{item.broadcaster}</strong>
                  <div style={{ color: "#9fb0c3", marginTop: ".3rem" }}>{item.access}{item.broadcastType ? ` · ${item.broadcastType}` : ""}{item.commentaryLanguages?.length ? ` · ${item.commentaryLanguages.join(", ")}` : ""}</div>
                </div>
                <a href={item.url} target="_blank" rel="nofollow noopener noreferrer" style={{ color: "#60a5fa" }}>Official service ↗</a>
              </div>
              {item.sourceUrl ? <p style={{ marginBottom: 0, fontSize: ".85rem" }}><a href={item.sourceUrl} target="_blank" rel="noopener noreferrer" style={{ color: "#8fb8ff" }}>Verification source ↗</a></p> : null}
            </article>
          ))}
        </div>
      </section>

      <nav style={{ display: "flex", flexWrap: "wrap", gap: "1rem", marginTop: "2rem" }}>
        <Link href={`/match/${safeMatch.slug}`} style={{ color: "#60a5fa" }}>← Match archive</Link>
        <Link href={`/country/${countryCode}`} style={{ color: "#60a5fa" }}>Sports on TV in {countryName} →</Link>
        <Link href="/events" style={{ color: "#60a5fa" }}>Current events →</Link>
      </nav>
    </main>
  );
}
