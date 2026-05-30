import Link from "next/link";
import type { Metadata } from "next";
import { matches } from "@/lib/matches";

export const metadata: Metadata = {
  title: "Browse Countries | WatchTVSport",
  description:
    "Browse countries on WatchTVSport and find official broadcasters for upcoming football matches by country.",
  alternates: {
    canonical: "/country",
  },
  openGraph: {
    title: "Browse Countries | WatchTVSport",
    description:
      "Browse countries and compare official broadcasters for upcoming football matches worldwide.",
    url: "/country",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Browse Countries | WatchTVSport",
    description:
      "Browse countries and compare official broadcasters for upcoming football matches worldwide.",
  },
};

type CountrySummary = {
  countryCode: string;
  countryName: string;
  matchCount: number;
  freeCount: number;
  paidCount: number;
  broadcasters: string[];
};

function getCountrySummaries(): CountrySummary[] {
  const countries = new Map<
    string,
    {
      countryCode: string;
      countryName: string;
      matchSlugs: Set<string>;
      freeCount: number;
      paidCount: number;
      broadcasters: Set<string>;
    }
  >();

  matches.forEach((match) => {
    match.broadcasts?.forEach((broadcast) => {
      const countryCode = broadcast.countryCode?.toLowerCase();

      if (!countryCode || !broadcast.countryName) {
        return;
      }

      const existing = countries.get(countryCode) || {
        countryCode,
        countryName: broadcast.countryName,
        matchSlugs: new Set<string>(),
        freeCount: 0,
        paidCount: 0,
        broadcasters: new Set<string>(),
      };

      existing.matchSlugs.add(match.slug);

      if (broadcast.access === "Free") {
        existing.freeCount += 1;
      }

      if (broadcast.access === "Paid") {
        existing.paidCount += 1;
      }

      if (broadcast.broadcaster) {
        existing.broadcasters.add(broadcast.broadcaster);
      }

      countries.set(countryCode, existing);
    });
  });

  return Array.from(countries.values())
    .map((country) => ({
      countryCode: country.countryCode,
      countryName: country.countryName,
      matchCount: country.matchSlugs.size,
      freeCount: country.freeCount,
      paidCount: country.paidCount,
      broadcasters: Array.from(country.broadcasters).slice(0, 3),
    }))
    .sort((a, b) => a.countryName.localeCompare(b.countryName));
}

export default function CountriesPage() {
  const countries = getCountrySummaries();

  return (
    <main
      style={{
        minHeight: "100vh",
        background:
          "radial-gradient(circle at top left, rgba(59,130,246,0.16), transparent 34%), radial-gradient(circle at top right, rgba(34,197,94,0.10), transparent 30%), #0B1220",
        color: "#FFFFFF",
        padding: "1.15rem 1rem 2.2rem",
      }}
    >
      <style>{`
        .countriesGrid {
          display: grid;
          grid-template-columns: repeat(6, minmax(0, 1fr));
          gap: 0.85rem;
        }

   @media (max-width: 768px) {
  .countriesGrid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 0.65rem;
  }
}
      `}</style>

      <section
        style={{
          maxWidth: "1160px",
          margin: "0 auto",
        }}
      >
        <div
          style={{
            marginBottom: "1rem",
            border: "1px solid rgba(96,165,250,0.20)",
            borderRadius: "22px",
            padding: "1.05rem",
            background:
              "linear-gradient(180deg, rgba(15,23,42,0.94), rgba(2,6,23,0.82))",
            boxShadow:
              "0 24px 70px rgba(0,0,0,0.34), inset 0 1px 0 rgba(255,255,255,0.06)",
          }}
        >
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "0.42rem",
              marginBottom: "0.55rem",
              borderRadius: "999px",
              padding: "0.34rem 0.62rem",
              background: "rgba(59,130,246,0.13)",
              border: "1px solid rgba(96,165,250,0.22)",
              color: "#BFDBFE",
              fontSize: "0.76rem",
              fontWeight: 900,
              lineHeight: 1,
            }}
          >
            Official broadcasters by country
          </div>

          <h1
            style={{
              margin: 0,
              fontSize: "clamp(2rem, 5vw, 3.8rem)",
              lineHeight: 0.95,
              letterSpacing: "-0.06em",
              fontWeight: 1000,
            }}
          >
            Browse countries
          </h1>

          <p
            style={{
              maxWidth: "680px",
              margin: "0.7rem 0 0",
              color: "#CBD5E1",
              fontSize: "0.96rem",
              lineHeight: 1.55,
              fontWeight: 650,
            }}
          >
            Select a country to see official TV broadcasters, free and paid
            viewing options, and available matches.
          </p>
        </div>

        <div className="countriesGrid">
          {countries.map((country) => {
            const hasFree = country.freeCount > 0;
            const accessLabel =
              hasFree && country.paidCount > 0
                ? "Free + Paid"
                : hasFree
                  ? "Free"
                  : "Paid";
            const visibleBroadcasters = country.broadcasters.join(" / ");

            return (
              <Link
                key={country.countryCode}
                href={`/country/${country.countryCode}`}
                style={{
                  position: "relative",
                  overflow: "hidden",
                  minHeight: "146px",
                  display: "grid",
                  alignContent: "center",
                  justifyItems: "center",
                  gap: "0.45rem",
                  padding: "0.78rem 0.72rem",
                  borderRadius: "18px",
                  textDecoration: "none",
                  color: "#FFFFFF",
                  background:
                    "radial-gradient(circle at 50% 0%, rgba(59,130,246,0.26), transparent 44%), linear-gradient(180deg, #10203A 0%, #0B1628 100%)",
                  border: "1px solid rgba(96,165,250,0.36)",
                  boxShadow:
                    "0 18px 42px rgba(0,0,0,0.22), inset 0 1px 0 rgba(255,255,255,0.06)",
                }}
              >
                <img
                  aria-hidden="true"
                  src={`/flags/${country.countryCode}.png`}
                  alt=""
                  draggable={false}
                  style={{
                    position: "absolute",
                    right: "-52px",
                    top: "-52px",
                    width: "290px",
                    height: "220px",
                    borderRadius: "999px",
                    objectFit: "cover",
                    opacity: 0.08,
                    filter: "saturate(1.15)",
                    transform: "rotate(10deg)",
                    pointerEvents: "none",
                  }}
                />

                <div
                  aria-hidden="true"
                  style={{
                    position: "absolute",
                    inset: 0,
                    background:
                      "linear-gradient(135deg, rgba(59,130,246,0.12), transparent 40%, rgba(34,197,94,0.05))",
                    pointerEvents: "none",
                  }}
                />

                <img
                  src={`/flags/${country.countryCode}.png`}
                  alt=""
                  draggable={false}
                  style={{
                    position: "relative",
                    width: "46px",
                    height: "46px",
                    borderRadius: "999px",
                    objectFit: "cover",
                    boxShadow:
                      "0 0 0 2px rgba(255,255,255,0.72), 0 0 0 4px rgba(59,130,246,0.16), 0 12px 24px rgba(0,0,0,0.26)",
                  }}
                />

                <div
                  style={{
                    position: "relative",
                    minWidth: 0,
                    width: "100%",
                    textAlign: "center",
                  }}
                >
                  <div
                    style={{
                      fontSize: "0.94rem",
                      fontWeight: 950,
                      lineHeight: 1.08,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {country.countryName}
                  </div>

                  <div
                    style={{
                      color: "#93C5FD",
                      fontSize: "0.76rem",
                      fontWeight: 850,
                      lineHeight: 1.1,
                      marginTop: "0.28rem",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {country.matchCount} match{country.matchCount > 1 ? "es" : ""}
                  </div>

                  <div
                    style={{
                      color: "#CBD5E1",
                      fontSize: "0.7rem",
                      fontWeight: 800,
                      lineHeight: 1.15,
                      marginTop: "0.26rem",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {visibleBroadcasters || "Official broadcasters"}
                  </div>

                  <div
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      borderRadius: "999px",
                      padding: "0.32rem 0.68rem",
                      marginTop: "0.46rem",
                      lineHeight: 1,
                      background: hasFree
                        ? "linear-gradient(180deg, rgba(34,197,94,0.24), rgba(21,128,61,0.15))"
                        : "linear-gradient(180deg, rgba(245,158,11,0.24), rgba(146,64,14,0.15))",
                      border: hasFree
                        ? "1px solid rgba(34,197,94,0.36)"
                        : "1px solid rgba(245,158,11,0.36)",
                      color: hasFree ? "#4ADE80" : "#FBBF24",
                      fontSize: "0.74rem",
                      fontWeight: 1000,
                      whiteSpace: "nowrap",
                      boxShadow: hasFree
                        ? "0 0 18px rgba(34,197,94,0.14)"
                        : "0 0 18px rgba(245,158,11,0.12)",
                    }}
                  >
                    {accessLabel}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </section>
    </main>
  );
}