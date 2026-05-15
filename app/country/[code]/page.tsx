import { SectionTitle, AccessBadge } from "@/components/ui";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { matches, type MatchData, type BroadcastInfo } from "@/lib/matches";

type PageProps = {
  params: Promise<{
    code: string;
  }>;
};

type SafeBroadcastInfo = {
  countryCode: string;
  countryName: string;
  broadcaster: string;
  access: "Free" | "Paid";
  url: string;
  affiliateUrl?: string;
  commentaryLanguages?: string[];
};

type SafeMatchData = MatchData & {
  slug: string;
  group: string;
  matchDate: string;
  competition?: string;
};

type CountryMatchItem = {
  match: SafeMatchData;
  broadcasts: SafeBroadcastInfo[];
};

const matchesList: MatchData[] = Array.isArray(matches) ? matches : [];

function getTeamName(team: MatchData["homeTeam"]): string {
  if (typeof team === "string") return team;

  if (team && typeof team === "object") {
    if ("name" in team && team.name) return String(team.name);
    if ("shortName" in team && team.shortName) return String(team.shortName);
    if ("code" in team && team.code) return String(team.code);
  }

  return "TBD";
}

function ensureMatch(match: MatchData): SafeMatchData {
  return {
    ...match,
    slug: typeof match.slug === "string" && match.slug.trim() ? match.slug : "",
    group: typeof match.group === "string" && match.group.trim() ? match.group : "TBD",
    matchDate:
      typeof match.matchDate === "string" && match.matchDate.trim()
        ? match.matchDate
        : new Date().toISOString(),
    competition:
      typeof match.competition === "string" && match.competition.trim()
        ? match.competition
        : "FIFA World Cup 2026",
  };
}

function normalizeBroadcast(item: BroadcastInfo): SafeBroadcastInfo | null {
  const countryCode =
    typeof item.countryCode === "string" && item.countryCode.trim()
      ? item.countryCode.toLowerCase()
      : "";

  const countryName =
    typeof item.countryName === "string" && item.countryName.trim()
      ? item.countryName
      : "";

  const broadcaster =
    typeof item.broadcaster === "string" && item.broadcaster.trim()
      ? item.broadcaster
      : "";

  const url = typeof item.url === "string" && item.url.trim() ? item.url : "";
  const access = item.access === "Free" || item.access === "Paid" ? item.access : null;

  if (!countryCode || !countryName || !broadcaster || !url || !access) {
    return null;
  }

  return {
    countryCode,
    countryName,
    broadcaster,
    access,
    url,
    affiliateUrl:
      typeof item.affiliateUrl === "string" && item.affiliateUrl.trim()
        ? item.affiliateUrl
        : undefined,
    commentaryLanguages: Array.isArray(item.commentaryLanguages)
      ? item.commentaryLanguages.filter(
          (language): language is string =>
            typeof language === "string" && language.trim().length > 0
        )
      : [],
  };
}

function getSafeBroadcasts(match: MatchData): SafeBroadcastInfo[] {
  const broadcasts = Array.isArray(match.broadcasts) ? match.broadcasts : [];

  return broadcasts
    .map((item) => normalizeBroadcast(item))
    .filter((item): item is SafeBroadcastInfo => item !== null);
}

function formatStage(group: string): string {
  switch (group) {
    case "R32":
      return "Round of 32";
    case "R16":
      return "Round of 16";
    case "QF":
      return "Quarter-finals";
    case "SF":
      return "Semi-finals";
    case "3P":
      return "Third-place match";
    case "F":
      return "Final";
    default:
      return `Group ${group}`;
  }
}

function formatDate(dateString: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Toronto",
  }).format(new Date(dateString));
}

function getCountryMatches(countryCode: string): CountryMatchItem[] {
  return matchesList
    .map((match) => ensureMatch(match))
    .map((match) => {
      const broadcasts = getSafeBroadcasts(match).filter(
        (item) => item.countryCode === countryCode
      );

      return {
        match,
        broadcasts,
      };
    })
    .filter((item) => item.match.slug && item.broadcasts.length > 0)
    .sort(
      (a, b) =>
        new Date(a.match.matchDate).getTime() - new Date(b.match.matchDate).getTime()
    );
}

function getCountryNameFromMatches(
  countryMatches: CountryMatchItem[],
  fallbackCode: string
): string {
  const firstBroadcast = countryMatches[0]?.broadcasts[0];
  return firstBroadcast?.countryName ?? fallbackCode.toUpperCase();
}

function getFeaturedBroadcast(
  broadcasts: SafeBroadcastInfo[]
): SafeBroadcastInfo | null {
  if (!broadcasts.length) return null;
  const freeOption = broadcasts.find((item) => item.access === "Free");
  return freeOption ?? broadcasts[0];
}

function getCountrySummary(countryMatches: CountryMatchItem[]) {
  const freeCount = countryMatches.filter((item) =>
    item.broadcasts.some((broadcast) => broadcast.access === "Free")
  ).length;

  const paidCount = countryMatches.filter((item) =>
    item.broadcasts.some((broadcast) => broadcast.access === "Paid")
  ).length;

  const broadcasterMap = new Map<string, SafeBroadcastInfo>();

  for (const item of countryMatches) {
    for (const broadcast of item.broadcasts) {
      const key = `${broadcast.countryCode}-${broadcast.broadcaster}`;
      if (!broadcasterMap.has(key)) {
        broadcasterMap.set(key, broadcast);
      }
    }
  }

  const broadcasters = Array.from(broadcasterMap.values()).sort((a, b) =>
    a.broadcaster.localeCompare(b.broadcaster)
  );

  return {
    freeCount,
    paidCount,
    broadcasters,
  };
}

function getOtherCountryCodes(currentCode: string): { code: string; name: string }[] {
  const map = new Map<string, string>();

  for (const match of matchesList) {
    const broadcasts = getSafeBroadcasts(match);

    for (const item of broadcasts) {
      if (item.countryCode === currentCode) continue;
      if (!map.has(item.countryCode)) {
        map.set(item.countryCode, item.countryName);
      }
    }
  }

  return Array.from(map.entries())
    .map(([code, name]) => ({ code, name }))
    .sort((a, b) => a.name.localeCompare(b.name))
    .slice(0, 12);
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { code } = await params;
  const normalizedCode = code.toLowerCase();

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

  if (!code) {
    notFound();
  }

  const normalizedCode = code.toLowerCase();
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
        padding: "2rem 1rem 4rem",
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
            borderRadius: "20px",
            padding: "1.5rem",
            marginBottom: "2rem",
          }}
        >
          <div
            style={{
              display: "flex",
              gap: "0.75rem",
              flexWrap: "wrap",
              marginBottom: "1rem",
              alignItems: "center",
            }}
          >
            <span
              style={{
                padding: "0.35rem 0.65rem",
                borderRadius: "999px",
                background: "rgba(59,130,246,0.15)",
                color: "#BFDBFE",
                fontSize: "0.8rem",
                fontWeight: 600,
              }}
            >
              Country guide
            </span>

            <span
              style={{
                padding: "0.35rem 0.65rem",
                borderRadius: "999px",
                background: "rgba(255,255,255,0.06)",
                color: "#CBD5E1",
                fontSize: "0.8rem",
                fontWeight: 600,
              }}
            >
              Official broadcasters only
            </span>
          </div>

          <h1
            style={{
              fontSize: "2.2rem",
              lineHeight: 1.1,
              margin: 0,
              marginBottom: "0.85rem",
            }}
          >
            Where to watch football in {countryName}
          </h1>

          <p
            style={{
              color: "#CBD5E1",
              fontSize: "1.05rem",
              lineHeight: 1.6,
              maxWidth: "820px",
              marginTop: 0,
              marginBottom: "1rem",
            }}
          >
            Browse official football broadcasters and legal TV channels in {countryName}.
            Compare free and paid viewing options for current and upcoming matches,
            then open the dedicated country viewing page for each event.
          </p>

          <div
            style={{
              display: "flex",
              gap: "1rem",
              flexWrap: "wrap",
              color: "#94A3B8",
              fontSize: "0.95rem",
            }}
          >
            <div>{countryMatches.length} match{countryMatches.length > 1 ? "es" : ""}</div>
            <div>{summary.freeCount} with a free option</div>
            <div>{summary.paidCount} with a paid option</div>
            <div>{summary.broadcasters.length} broadcaster{summary.broadcasters.length > 1 ? "s" : ""}</div>
          </div>
        </div>

        <SectionTitle>Available matches in {countryName}</SectionTitle>

        <div
          style={{
            display: "grid",
            gap: "1rem",
          }}
        >
          {countryMatches.map((item) => {
            const homeTeam = getTeamName(item.match.homeTeam);
            const awayTeam = getTeamName(item.match.awayTeam);
            const featuredBroadcast = getFeaturedBroadcast(item.broadcasts);

            return (
              <div
                key={item.match.slug}
                style={{
                  background: "#111827",
                  border: "1px solid rgba(255,255,255,0.08)",
                  borderRadius: "18px",
                  padding: "1.25rem",
                  display: "grid",
                  gap: "1rem",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    gap: "1rem",
                    alignItems: "flex-start",
                    flexWrap: "wrap",
                  }}
                >
                  <div>
                    <div
                      style={{
                        color: "#94A3B8",
                        fontSize: "0.92rem",
                        marginBottom: "0.3rem",
                      }}
                    >
                      {item.match.competition ?? "FIFA World Cup 2026"} • {formatStage(item.match.group)}
                    </div>

                    <div
                      style={{
                        fontSize: "1.25rem",
                        fontWeight: 700,
                        marginBottom: "0.35rem",
                      }}
                    >
                      {homeTeam} vs {awayTeam}
                    </div>

                    <div
                      style={{
                        color: "#CBD5E1",
                        fontSize: "0.96rem",
                      }}
                    >
                      {formatDate(item.match.matchDate)}
                    </div>

                    {item.match.hostCity && item.match.hostCountry ? (
                      <div
                        style={{
                          color: "#94A3B8",
                          fontSize: "0.92rem",
                          marginTop: "0.35rem",
                        }}
                      >
                        {item.match.hostCity}, {item.match.hostCountry}
                      </div>
                    ) : null}
                  </div>

                  <div
                    style={{
                      display: "flex",
                      gap: "0.5rem",
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
                      borderRadius: "14px",
                      padding: "0.9rem 1rem",
                    }}
                  >
                    <div
                      style={{
                        color: "#94A3B8",
                        fontSize: "0.88rem",
                        marginBottom: "0.3rem",
                      }}
                    >
                      Featured local option
                    </div>
                    <div
                      style={{
                        fontWeight: 700,
                        marginBottom: "0.35rem",
                      }}
                    >
                      {featuredBroadcast.broadcaster}
                    </div>
                    <div
                      style={{
                        display: "flex",
                        gap: "0.5rem",
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
                            fontSize: "0.88rem",
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
                    gap: "0.75rem",
                    flexWrap: "wrap",
                  }}
                >
                  <Link
                    href={`/watch/${item.match.slug}/${normalizedCode}`}
                    style={{
                      background: "#3B82F6",
                      color: "#FFFFFF",
                      textDecoration: "none",
                      padding: "0.8rem 1rem",
                      borderRadius: "10px",
                      fontWeight: 700,
                    }}
                  >
                    View country page
                  </Link>

                  <Link
                    href={`/match/${item.match.slug}`}
                    style={{
                      border: "1px solid rgba(255,255,255,0.12)",
                      color: "#FFFFFF",
                      textDecoration: "none",
                      padding: "0.8rem 1rem",
                      borderRadius: "10px",
                      fontWeight: 700,
                    }}
                  >
                    View match page
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
            gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))",
            gap: "1rem",
          }}
        >
          {summary.broadcasters.map((item) => (
            <div
              key={`${item.countryCode}-${item.broadcaster}`}
              style={{
                background: "#111827",
                border: "1px solid rgba(255,255,255,0.08)",
                borderRadius: "16px",
                padding: "1rem",
                display: "grid",
                gap: "0.75rem",
              }}
            >
              <div>
                <div
                  style={{
                    color: "#94A3B8",
                    fontSize: "0.9rem",
                    marginBottom: "0.25rem",
                  }}
                >
                  {countryName}
                </div>
                <div
                  style={{
                    fontWeight: 700,
                    fontSize: "1.05rem",
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
                    fontSize: "0.9rem",
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
            gap: "0.75rem",
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
                padding: "0.75rem 1rem",
                borderRadius: "999px",
                background: "#111827",
                border: "1px solid rgba(255,255,255,0.08)",
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
            gap: "1rem",
          }}
        >
          <div
            style={{
              background: "#111827",
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: "16px",
              padding: "1rem",
            }}
          >
            <h3 style={{ marginTop: 0 }}>
              Where can I watch football in {countryName}?
            </h3>
            <p style={{ color: "#CBD5E1", marginBottom: 0 }}>
              You can browse official broadcasters and legal football TV channels in{" "}
              {countryName} on this page, then open each dedicated event page for more
              details.
            </p>
          </div>

          <div
            style={{
              background: "#111827",
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: "16px",
              padding: "1rem",
            }}
          >
            <h3 style={{ marginTop: 0 }}>
              Are free football viewing options available in {countryName}?
            </h3>
            <p style={{ color: "#CBD5E1", marginBottom: 0 }}>
              {summary.freeCount > 0
                ? `Yes. ${summary.freeCount} match${summary.freeCount > 1 ? "es" : ""} currently listed on this page include at least one official free viewing option in ${countryName}.`
                : `No official free viewing option is currently listed on this page for ${countryName}.`}
            </p>
          </div>

          <div
            style={{
              background: "#111827",
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: "16px",
              padding: "1rem",
            }}
          >
            <h3 style={{ marginTop: 0 }}>
              Does WatchTVSport list illegal streams?
            </h3>
            <p style={{ color: "#CBD5E1", marginBottom: 0 }}>
              No. WatchTVSport only lists official broadcasters and legal viewing
              options by country.
            </p>
          </div>
        </div>

        <div
          style={{
            marginTop: "2.5rem",
            background: "#111827",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: "16px",
            padding: "1rem",
            color: "#CBD5E1",
            lineHeight: 1.6,
          }}
        >
          WatchTVSport only lists official broadcasters. No illegal streams. No VPN
          recommendations. Information is provided for legal viewing options only.
        </div>
      </div>
    </main>
  );
}