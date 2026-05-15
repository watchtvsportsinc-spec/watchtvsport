import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  formatDate,
  formatStage,
  getCountryMatches,
  getCountryNameFromMatches,
  getCountrySummary,
  getFeaturedBroadcast,
  getOtherCountryCodes,
  getTeamName,
  normalizeCountryCode,
} from "@/lib/utils";

type PageProps = {
  params: Promise<{
    code: string;
  }>;
};

function SectionTitle({ children }: { children: ReactNode }) {
  return (
    <h2
      style={{
        fontSize: "1.3rem",
        fontWeight: 700,
        marginTop: "1.4rem",
        marginBottom: "0.75rem",
      }}
    >
      {children}
    </h2>
  );
}

function AccessBadge({ access }: { access: "Free" | "Paid" }) {
  const isFree = access === "Free";

  return (
    <span
      style={{
        padding: "0.28rem 0.55rem",
        borderRadius: "999px",
        background: isFree ? "rgba(34,197,94,0.15)" : "rgba(245,158,11,0.15)",
        color: isFree ? "#22C55E" : "#F59E0B",
        fontSize: "0.74rem",
        fontWeight: 700,
        lineHeight: 1,
      }}
    >
      {access}
    </span>
  );
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { code } = await params;
  const normalizedCode = normalizeCountryCode(code);

  if (!normalizedCode) {
    return {
      title: "Country not found | WatchTVSport",
      description: "The requested country page could not be found.",
    };
  }

  const countryMatches = getCountryMatches(normalizedCode);

  if (!countryMatches.length) {
    return {
      title: "Country not found | WatchTVSport",
      description: "The requested country page could not be found.",
    };
  }

  const countryName = getCountryNameFromMatches(countryMatches, normalizedCode);
  const summary = getCountrySummary(countryMatches);

  const title = `Where to Watch Football in ${countryName} – Official TV Channels`;
  const description =
    summary.freeCount > 0
      ? `Find where to watch football legally in ${countryName}. Browse official TV channels and viewing options for upcoming matches, including ${summary.freeCount} match${summary.freeCount > 1 ? "es" : ""} with a free option currently listed.`
      : `Find where to watch football legally in ${countryName}. Browse official TV channels and paid viewing options for upcoming matches and competitions.`;

  return {
    title,
    description,
    alternates: {
      canonical: `/country/${normalizedCode}`,
    },
    openGraph: {
      title,
      description,
      url: `/country/${normalizedCode}`,
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  };
}

export default async function CountryPage({ params }: PageProps) {
  const { code } = await params;
  const normalizedCode = normalizeCountryCode(code);

  if (!normalizedCode) {
    notFound();
  }

  const countryMatches = getCountryMatches(normalizedCode);

  if (!countryMatches.length) {
    notFound();
  }

  const countryName = getCountryNameFromMatches(countryMatches, normalizedCode);
  const summary = getCountrySummary(countryMatches);
  const otherCountries = getOtherCountryCodes(normalizedCode);

  const schema = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: `Where to watch football in ${countryName}`,
    url: `/country/${normalizedCode}`,
    description: `Official football broadcasters and legal viewing options in ${countryName}.`,
    about: {
      "@type": "Thing",
      name: `Football on TV in ${countryName}`,
    },
    mainEntity: countryMatches.slice(0, 20).map((item) => ({
      "@type": "SportsEvent",
      name: `${getTeamName(item.match.homeTeam)} vs ${getTeamName(item.match.awayTeam)}`,
      startDate: item.match.matchDate,
      url: `/watch/${item.match.slug}/${normalizedCode}`,
    })),
  };

  return (
    <main
      style={{
        background: "#0B1220",
        color: "#FFFFFF",
        minHeight: "100vh",
        padding: "1.25rem 1rem 2.5rem",
      }}
    >
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
      />

      <div
        style={{
          maxWidth: "1100px",
          margin: "0 auto",
        }}
      >
        <div
          style={{
            background: "#111827",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: "18px",
            padding: "1.1rem",
            marginBottom: "1.1rem",
          }}
        >
          <div
            style={{
              display: "flex",
              gap: "0.5rem",
              flexWrap: "wrap",
              marginBottom: "0.8rem",
              alignItems: "center",
            }}
          >
            <span
              style={{
                padding: "0.28rem 0.55rem",
                borderRadius: "999px",
                background: "rgba(59,130,246,0.15)",
                color: "#BFDBFE",
                fontSize: "0.74rem",
                fontWeight: 700,
                lineHeight: 1,
              }}
            >
              Country guide
            </span>

            <span
              style={{
                padding: "0.28rem 0.55rem",
                borderRadius: "999px",
                background: "rgba(255,255,255,0.06)",
                color: "#CBD5E1",
                fontSize: "0.74rem",
                fontWeight: 700,
                lineHeight: 1,
              }}
            >
              Official broadcasters only
            </span>
          </div>

          <h1
            style={{
              fontSize: "2rem",
              lineHeight: 1.05,
              margin: 0,
              marginBottom: "0.55rem",
            }}
          >
            Where to watch football in {countryName}
          </h1>

          <p
            style={{
              color: "#CBD5E1",
              fontSize: "0.97rem",
              lineHeight: 1.55,
              maxWidth: "820px",
              marginTop: 0,
              marginBottom: "0.8rem",
            }}
          >
            Browse official football broadcasters and legal TV channels in {countryName}.
            Compare free and paid viewing options for current and upcoming matches,
            then open the dedicated country viewing page for each event.
          </p>

          <div
            style={{
              display: "flex",
              gap: "0.75rem 1rem",
              flexWrap: "wrap",
              color: "#94A3B8",
              fontSize: "0.88rem",
            }}
          >
            <div>
              {countryMatches.length} match{countryMatches.length > 1 ? "es" : ""}
            </div>
            <div>{summary.freeCount} with a free option</div>
            <div>{summary.paidCount} with a paid option</div>
            <div>
              {summary.broadcasters.length} broadcaster
              {summary.broadcasters.length > 1 ? "s" : ""}
            </div>
          </div>
        </div>

        <SectionTitle>Available matches in {countryName}</SectionTitle>

        <div
          style={{
            display: "grid",
            gap: "0.8rem",
          }}
        >
          {countryMatches.map((item) => {
            const homeTeam = getTeamName(item.match.homeTeam);
            const awayTeam = getTeamName(item.match.awayTeam);
            const featuredBroadcast = getFeaturedBroadcast(item.match);

            return (
              <div
                key={item.match.slug}
                style={{
                  background: "#111827",
                  border: "1px solid rgba(255,255,255,0.08)",
                  borderRadius: "14px",
                  padding: "0.9rem",
                  display: "grid",
                  gap: "0.7rem",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    gap: "0.75rem",
                    alignItems: "flex-start",
                    flexWrap: "wrap",
                  }}
                >
                  <div>
                    <div
                      style={{
                        color: "#94A3B8",
                        fontSize: "0.82rem",
                        marginBottom: "0.2rem",
                      }}
                    >
                      {item.match.competition ?? "FIFA World Cup 2026"} •{" "}
                      {formatStage(item.match.group)}
                    </div>

                    <div
                      style={{
                        fontSize: "1rem",
                        fontWeight: 700,
                        marginBottom: "0.25rem",
                        lineHeight: 1.3,
                      }}
                    >
                      {homeTeam} vs {awayTeam}
                    </div>

                    <div
                      style={{
                        color: "#CBD5E1",
                        fontSize: "0.88rem",
                      }}
                    >
                      {formatDate(item.match.matchDate)}
                    </div>

                    {item.match.hostCity && item.match.hostCountry ? (
                      <div
                        style={{
                          color: "#94A3B8",
                          fontSize: "0.82rem",
                          marginTop: "0.25rem",
                        }}
                      >
                        {item.match.hostCity}, {item.match.hostCountry}
                      </div>
                    ) : null}
                  </div>

                  <div
                    style={{
                      display: "flex",
                      gap: "0.4rem",
                      flexWrap: "wrap",
                    }}
                  >
                    {item.broadcasts.some((broadcast) => broadcast.access === "Free") ? (
                      <AccessBadge access="Free" />
                    ) : null}
                    {item.broadcasts.some((broadcast) => broadcast.access === "Paid") ? (
                      <AccessBadge access="Paid" />
                    ) : null}
                  </div>
                </div>

                {featuredBroadcast ? (
                  <div
                    style={{
                      background: "rgba(255,255,255,0.04)",
                      border: "1px solid rgba(255,255,255,0.06)",
                      borderRadius: "12px",
                      padding: "0.75rem 0.85rem",
                    }}
                  >
                    <div
                      style={{
                        color: "#94A3B8",
                        fontSize: "0.8rem",
                        marginBottom: "0.2rem",
                      }}
                    >
                      Featured local option
                    </div>
                    <div
                      style={{
                        fontWeight: 700,
                        marginBottom: "0.3rem",
                        fontSize: "0.95rem",
                      }}
                    >
                      {featuredBroadcast.broadcaster}
                    </div>
                    <div
                      style={{
                        display: "flex",
                        gap: "0.4rem",
                        flexWrap: "wrap",
                        alignItems: "center",
                      }}
                    >
                      <AccessBadge access={featuredBroadcast.access} />
                      {featuredBroadcast.commentaryLanguages &&
                      featuredBroadcast.commentaryLanguages.length > 0 ? (
                        <span
                          style={{
                            color: "#CBD5E1",
                            fontSize: "0.82rem",
                          }}
                        >
                          Commentary: {featuredBroadcast.commentaryLanguages.join(", ")}
                        </span>
                      ) : null}
                    </div>
                  </div>
                ) : null}

                <div
                  style={{
                    display: "flex",
                    gap: "0.6rem",
                    flexWrap: "wrap",
                  }}
                >
                  <Link
                    href={`/watch/${item.match.slug}/${normalizedCode}`}
                    style={{
                      background: "#3B82F6",
                      color: "#FFFFFF",
                      textDecoration: "none",
                      padding: "0.65rem 0.85rem",
                      borderRadius: "9px",
                      fontWeight: 700,
                      fontSize: "0.88rem",
                      lineHeight: 1.1,
                    }}
                  >
                    Country page
                  </Link>

                  <Link
                    href={`/match/${item.match.slug}`}
                    style={{
                      border: "1px solid rgba(255,255,255,0.12)",
                      color: "#FFFFFF",
                      textDecoration: "none",
                      padding: "0.65rem 0.85rem",
                      borderRadius: "9px",
                      fontWeight: 700,
                      fontSize: "0.88rem",
                      lineHeight: 1.1,
                    }}
                  >
                    Match page
                  </Link>
                </div>
              </div>
            );
          })}
        </div>

        <SectionTitle>Main broadcasters in {countryName}</SectionTitle>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))",
            gap: "0.8rem",
          }}
        >
          {summary.broadcasters.map((item) => (
            <div
              key={`${item.countryCode}-${item.broadcaster}`}
              style={{
                background: "#111827",
                border: "1px solid rgba(255,255,255,0.08)",
                borderRadius: "14px",
                padding: "0.9rem",
                display: "grid",
                gap: "0.55rem",
              }}
            >
              <div>
                <div
                  style={{
                    color: "#94A3B8",
                    fontSize: "0.82rem",
                    marginBottom: "0.15rem",
                  }}
                >
                  {countryName}
                </div>
                <div
                  style={{
                    fontWeight: 700,
                    fontSize: "0.98rem",
                    lineHeight: 1.3,
                  }}
                >
                  {item.broadcaster}
                </div>
              </div>

              <div>
                <AccessBadge access={item.access} />
              </div>

              {item.commentaryLanguages && item.commentaryLanguages.length > 0 ? (
                <div
                  style={{
                    color: "#CBD5E1",
                    fontSize: "0.84rem",
                    lineHeight: 1.45,
                  }}
                >
                  {item.commentaryLanguages.join(", ")}
                </div>
              ) : null}
            </div>
          ))}
        </div>

        <SectionTitle>Explore other countries</SectionTitle>

        <div
          style={{
            display: "flex",
            gap: "0.55rem",
            flexWrap: "wrap",
          }}
        >
          {otherCountries.map((item) => (
            <Link
              key={item.code}
              href={`/country/${item.code}`}
              style={{
                textDecoration: "none",
                color: "#FFFFFF",
                padding: "0.58rem 0.82rem",
                borderRadius: "999px",
                background: "#111827",
                border: "1px solid rgba(255,255,255,0.08)",
                fontSize: "0.86rem",
                lineHeight: 1.1,
              }}
            >
              {item.name}
            </Link>
          ))}
        </div>

        <SectionTitle>FAQ</SectionTitle>

        <div
          style={{
            display: "grid",
            gap: "0.75rem",
          }}
        >
          <div
            style={{
              background: "#111827",
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: "14px",
              padding: "0.9rem",
            }}
          >
            <h3 style={{ marginTop: 0, marginBottom: "0.45rem", fontSize: "1rem" }}>
              Where can I watch football in {countryName}?
            </h3>
            <p style={{ color: "#CBD5E1", marginBottom: 0, lineHeight: 1.6, fontSize: "0.92rem" }}>
              You can browse official broadcasters and legal football TV channels in{" "}
              {countryName} on this page, then open each dedicated event page for more
              details.
            </p>
          </div>

          <div
            style={{
              background: "#111827",
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: "14px",
              padding: "0.9rem",
            }}
          >
            <h3 style={{ marginTop: 0, marginBottom: "0.45rem", fontSize: "1rem" }}>
              Are free football viewing options available in {countryName}?
            </h3>
            <p style={{ color: "#CBD5E1", marginBottom: 0, lineHeight: 1.6, fontSize: "0.92rem" }}>
              {summary.freeCount > 0
                ? `Yes. ${summary.freeCount} match${summary.freeCount > 1 ? "es" : ""} currently listed on this page include at least one official free viewing option in ${countryName}.`
                : `No official free viewing option is currently listed on this page for ${countryName}.`}
            </p>
          </div>

          <div
            style={{
              background: "#111827",
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: "14px",
              padding: "0.9rem",
            }}
          >
            <h3 style={{ marginTop: 0, marginBottom: "0.45rem", fontSize: "1rem" }}>
              Does WatchTVSport list illegal streams?
            </h3>
            <p style={{ color: "#CBD5E1", marginBottom: 0, lineHeight: 1.6, fontSize: "0.92rem" }}>
              No. WatchTVSport only lists official broadcasters and legal viewing
              options by country.
            </p>
          </div>
        </div>

        <div
          style={{
            marginTop: "1.6rem",
            background: "#111827",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: "14px",
            padding: "0.9rem",
            color: "#CBD5E1",
            lineHeight: 1.55,
            fontSize: "0.9rem",
          }}
        >
          WatchTVSport only lists official broadcasters. No illegal streams. No VPN
          recommendations. Information is provided for legal viewing options only.
        </div>
      </div>
    </main>
  );
}