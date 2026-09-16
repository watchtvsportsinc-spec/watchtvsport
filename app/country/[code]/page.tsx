import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import Breadcrumbs from "@/components/Breadcrumbs";
import { getAllMatches } from "@/lib/matches";

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
      return [{
        slug: match.slug,
        matchDate: match.matchDate,
        home: match.homeTeam.name,
        away: match.awayTeam.name,
        broadcasters,
      }];
    })
    .sort((a, b) => Date.parse(b.matchDate) - Date.parse(a.matchDate));
}

function countryName(items: ArchivedItem[], code: string) {
  return items[0]?.broadcasters[0]?.countryName ?? code.toUpperCase();
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { code } = await params;
  const normalizedCode = code.toLowerCase();
  const archive = countryArchive(normalizedCode);
  if (!archive.length) return { title: "Country not found | WatchTVSport", robots: { index: false, follow: false } };
  const name = countryName(archive, normalizedCode);
  const title = `Sports on TV in ${name} – Official channels & streaming`;
  const description = `Find official sports TV and streaming information for ${name}. Browse current WatchTVSport events and preserved broadcaster records from the FIFA World Cup 2026 archive.`;
  return {
    title,
    description,
    alternates: { canonical: `/country/${normalizedCode}` },
    openGraph: { title, description, url: `/country/${normalizedCode}`, type: "website" },
    twitter: { card: "summary_large_image", title, description },
  };
}

export default async function CountryPage({ params }: PageProps) {
  const { code } = await params;
  const normalizedCode = code.toLowerCase();
  if (!/^[a-z]{2}$/.test(normalizedCode)) notFound();
  const archive = countryArchive(normalizedCode);
  if (!archive.length) notFound();
  const name = countryName(archive, normalizedCode);
  const broadcasters = Array.from(new Map(archive.flatMap((item) => item.broadcasters).map((item) => [item.broadcaster, item] as const)).values()).sort((a, b) => a.broadcaster.localeCompare(b.broadcaster));
  const free = broadcasters.filter((item) => item.access === "Free").length;
  const paid = broadcasters.filter((item) => item.access === "Paid").length;

  const schema = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: `Sports on TV in ${name}`,
    url: `https://watchtvsport.com/country/${normalizedCode}`,
    description: `Official sports broadcaster guide and historical verified viewing records for ${name}.`,
    about: { "@type": "Thing", name: `Sports broadcasting in ${name}` },
  };

  return (
    <main id="main-content" style={{ maxWidth: 1100, margin: "0 auto", padding: "1.5rem 1rem 4rem" }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />
      <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Countries", href: "/country" }, { label: name }]} />

      <header style={{ margin: "1.5rem 0 2rem", maxWidth: 850 }}>
        <p style={{ color: "#60a5fa", textTransform: "uppercase", letterSpacing: ".1em", fontWeight: 800 }}>Country TV guide</p>
        <h1 style={{ fontSize: "clamp(2rem,6vw,3.7rem)", lineHeight: 1.05, margin: ".5rem 0 1rem" }}>Sports on TV in {name}</h1>
        <p style={{ color: "#b8c5d3", lineHeight: 1.75 }}>
          WatchTVSport organizes official sports viewing information by event and territory. Use the current event guide for live and upcoming sports; the historical section below preserves verified broadcaster data from the FIFA World Cup 2026.
        </p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: ".75rem" }}>
          <Link href="/events" style={{ color: "#fff", background: "#1d4ed8", padding: ".7rem 1rem", borderRadius: 10, textDecoration: "none", fontWeight: 700 }}>Current sports events</Link>
          <Link href="/sports" style={{ color: "#60a5fa", padding: ".7rem 0" }}>Browse sports →</Link>
        </div>
      </header>

      <section aria-labelledby="country-sports-navigation" style={{ marginBottom: "2rem" }}>
        <h2 id="country-sports-navigation">Explore by sport</h2>
        <div style={{ display: "flex", flexWrap: "wrap", gap: ".7rem" }}>
          <Link href="/football" style={{ color: "#60a5fa" }}>Football</Link>
          <Link href="/formula-1" style={{ color: "#60a5fa" }}>Formula 1</Link>
          <Link href="/sports/motogp" style={{ color: "#60a5fa" }}>MotoGP</Link>
          <Link href="/sports/basketball" style={{ color: "#60a5fa" }}>Basketball</Link>
          <Link href="/sports/hockey" style={{ color: "#60a5fa" }}>Hockey</Link>
        </div>
      </section>

      <section aria-labelledby="country-world-cup-archive">
        <p style={{ color: "#60a5fa", fontWeight: 700 }}>Historical data</p>
        <h2 id="country-world-cup-archive">FIFA World Cup 2026 broadcaster archive in {name}</h2>
        <p style={{ color: "#b8c5d3", lineHeight: 1.7 }}>
          {archive.length} archived matches contain confirmed broadcaster records for this territory. Across the archive, {broadcasters.length} broadcaster{broadcasters.length === 1 ? "" : "s"} are referenced ({free} free, {paid} paid).
        </p>
        <div style={{ display: "grid", gap: ".75rem", marginTop: "1rem" }}>
          {archive.map((item) => (
            <article key={item.slug} style={{ border: "1px solid rgba(255,255,255,.1)", borderRadius: 14, padding: "1rem", background: "rgba(255,255,255,.025)" }}>
              <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", gap: ".75rem 1rem" }}>
                <div>
                  <strong>{item.home} vs {item.away}</strong>
                  <div style={{ color: "#9fb0c3", marginTop: ".3rem" }}>{item.broadcasters.map((b) => `${b.broadcaster} (${b.access})`).join(" · ")}</div>
                </div>
                <Link href={`/watch/${item.slug}/${normalizedCode}`} style={{ color: "#60a5fa" }}>Archived listings →</Link>
              </div>
            </article>
          ))}
        </div>
      </section>

      <p style={{ marginTop: "2rem", color: "#8ea0b5", lineHeight: 1.7 }}>
        Current broadcaster listings are published on individual event pages when they are verified. WatchTVSport does not infer coverage solely from historical rights.
      </p>
    </main>
  );
}
