import { SectionTitle, AccessBadge } from "@/components/ui";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { matches, type MatchData, type BroadcastInfo } from "@/lib/matches";
import MatchStatusBadge from "@/components/MatchStatusBadge";
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

function getFlagEmoji(countryCode: string): string {
  if (!countryCode || countryCode.length !== 2) return "🏳️";

  return countryCode
    .toUpperCase()
    .replace(/./g, (char) =>
      String.fromCodePoint(127397 + char.charCodeAt(0))
    );
}

function getTeamName(team: MatchData["homeTeam"]): string {
  if (typeof team === "string") return team;

  if (team && typeof team === "object") {
    if ("name" in team && team.name) return String(team.name);
    if ("shortName" in team && team.shortName) return String(team.shortName);
    if ("code" in team && team.code) return String(team.code);
  }

  return "TBD";
}


function getTeamFlagEmoji(team: MatchData["homeTeam"]): string {
  const teamName = getTeamName(team);

  const flagsByTeamName: Record<string, string> = {
    Algeria: "🇩🇿",
    Argentina: "🇦🇷",
    Australia: "🇦🇺",
    Austria: "🇦🇹",
    Belgium: "🇧🇪",
    "Bosnia and Herzegovina": "🇧🇦",
    Brazil: "🇧🇷",
    Canada: "🇨🇦",
    "Cabo Verde": "🇨🇻",
    Colombia: "🇨🇴",
    "Congo DR": "🇨🇩",
    Croatia: "🇭🇷",
    Curaçao: "🇨🇼",
    Czechia: "🇨🇿",
    Ecuador: "🇪🇨",
    Egypt: "🇪🇬",
    England: "🏴",
    France: "🇫🇷",
    Germany: "🇩🇪",
    Ghana: "🇬🇭",
    Haiti: "🇭🇹",
    "IR Iran": "🇮🇷",
    Iraq: "🇮🇶",
    Japan: "🇯🇵",
    Jordan: "🇯🇴",
    "Korea Republic": "🇰🇷",
    Mexico: "🇲🇽",
    Morocco: "🇲🇦",
    Netherlands: "🇳🇱",
    "New Zealand": "🇳🇿",
    Norway: "🇳🇴",
    Panama: "🇵🇦",
    Paraguay: "🇵🇾",
    Portugal: "🇵🇹",
    Qatar: "🇶🇦",
    "Saudi Arabia": "🇸🇦",
    Scotland: "🏴",
    Senegal: "🇸🇳",
    "South Africa": "🇿🇦",
    Spain: "🇪🇸",
    Sweden: "🇸🇪",
    Switzerland: "🇨🇭",
    Tunisia: "🇹🇳",
    Türkiye: "🇹🇷",
    Uruguay: "🇺🇾",
    USA: "🇺🇸",
    Uzbekistan: "🇺🇿",
    "Côte d'Ivoire": "🇨🇮",
  };

  return flagsByTeamName[teamName] ?? "🏳️";
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
    .sort((a, b) => a.name.localeCompare(b.name));
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
  const countryFlag = getFlagEmoji(normalizedCode);
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
  description: `Find where to watch ${getTeamName(item.match.homeTeam)} vs ${getTeamName(item.match.awayTeam)} legally in ${countryName}.`,
  image: ["https://watchtvsport.com/og-image.jpg"],
  organizer: {
    "@type": "SportsOrganization",
    name: "FIFA",
  },
  performer: [
    {
      "@type": "SportsTeam",
      name: getTeamName(item.match.homeTeam),
    },
    {
      "@type": "SportsTeam",
      name: getTeamName(item.match.awayTeam),
    },
  ],
  startDate: item.match.matchDate,
  endDate: item.match.matchDate,
  eventStatus: "https://schema.org/EventScheduled",
  url: `https://watchtvsport.com/watch/${item.match.slug}/${normalizedCode}`,
  location: {
    "@type": "Place",
    name:
      item.match.hostCity && item.match.hostCountry
        ? `${item.match.hostCity}, ${item.match.hostCountry}`
        : item.match.competition ?? "FIFA World Cup 2026",
    address: {
      "@type": "PostalAddress",
      addressLocality: item.match.hostCity ?? undefined,
      addressCountry: item.match.hostCountry ?? undefined,
    },
  },
  offers: item.broadcasts.map((broadcast) => ({
    "@type": "Offer",
    name: `${broadcast.broadcaster} in ${broadcast.countryName}`,
    url: broadcast.affiliateUrl || broadcast.url,
    category: broadcast.access,
    areaServed: broadcast.countryName,
    availability: "https://schema.org/InStock",
    price: "0",
    priceCurrency: "USD",
    validFrom: item.match.matchDate,
  })),
})),
  };

  return (
    <main
      style={{
        background: "#0B1220",
        color: "#FFFFFF",
        minHeight: "100vh",
        padding: "1.25rem 1rem 4rem",
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
            background: "#0B1A33",
            border: "1px solid rgba(59,130,246,0.22)",
            borderRadius: "20px",
            padding: "1.25rem",
            marginBottom: "1rem",
            textAlign: "center",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              gap: "0.5rem",
              flexWrap: "wrap",
              marginBottom: "0.85rem",
            }}
          >
            <span
              style={{
                padding: "0.3rem 0.65rem",
                borderRadius: "999px",
                background: "rgba(59,130,246,0.18)",
                color: "#BFDBFE",
                fontSize: "0.8rem",
                fontWeight: 800,
              }}
            >
              FIFA World Cup 2026
            </span>

            <span
              style={{
                padding: "0.3rem 0.65rem",
                borderRadius: "999px",
                background: "rgba(255,255,255,0.06)",
                color: "#CBD5E1",
                fontSize: "0.8rem",
                fontWeight: 800,
              }}
            >
              Official broadcasters only
            </span>
          </div>

          <h1
            style={{
              fontSize: "clamp(1.65rem, 5vw, 2.25rem)",
              lineHeight: 1.1,
              margin: 0,
              marginBottom: "0.55rem",
            }}
          >
            Where to watch FIFA World Cup in {countryName}{" "}
            <span aria-hidden="true">{countryFlag}</span>
          </h1>

          <p
            style={{
              color: "#CBD5E1",
              fontSize: "0.98rem",
              lineHeight: 1.55,
              maxWidth: "760px",
              margin: "0 auto 1rem",
            }}
          >
            Find official TV channels and legal viewing options for FIFA World Cup
            matches in {countryName}.
          </p>

          <div
            style={{
              display: "flex",
              gap: "0.5rem",
              justifyContent: "center",
              flexWrap: "wrap",
              color: "#94A3B8",
              fontSize: "0.86rem",
            }}
          >
            <span
              style={{
                padding: "0.35rem 0.65rem",
                borderRadius: "999px",
                background: "rgba(255,255,255,0.05)",
                border: "1px solid rgba(255,255,255,0.08)",
              }}
            >
              <strong style={{ color: "#FFFFFF" }}>{countryMatches.length}</strong>{" "}
              matches
            </span>

            <span
              style={{
                padding: "0.35rem 0.65rem",
                borderRadius: "999px",
                background: "rgba(34,197,94,0.12)",
                border: "1px solid rgba(34,197,94,0.18)",
              }}
            >
              <strong style={{ color: "#22C55E" }}>{summary.freeCount}</strong>{" "}
              free
            </span>

            <span
              style={{
                padding: "0.35rem 0.65rem",
                borderRadius: "999px",
                background: "rgba(245,158,11,0.12)",
                border: "1px solid rgba(245,158,11,0.18)",
              }}
            >
              <strong style={{ color: "#F59E0B" }}>{summary.paidCount}</strong>{" "}
              paid
            </span>

            <span
              style={{
                padding: "0.35rem 0.65rem",
                borderRadius: "999px",
                background: "rgba(255,255,255,0.05)",
                border: "1px solid rgba(255,255,255,0.08)",
              }}
            >
              <strong style={{ color: "#FFFFFF" }}>
                {summary.broadcasters.length}
              </strong>{" "}
              broadcasters
            </span>
          </div>
        </div>

        <SectionTitle>Watch in other countries</SectionTitle>

        <div
          style={{
            background: "#111827",
            border: "1px solid rgba(59,130,246,0.22)",
            borderRadius: "16px",
            padding: "0.45rem 0.55rem",
            display: "flex",
            gap: "0.45rem",
            flexWrap: "wrap",
            marginBottom: "1.5rem",
          }}
        >
          {otherCountries.map((item) => (
            <Link
              key={item.code}
              href={`/country/${item.code}`}
              style={{
                textDecoration: "none",
                color: "#FFFFFF",
                padding: "0.22rem 0.5rem",
                borderRadius: "999px",
                background: "rgba(59,130,246,0.12)",
                border: "1px solid rgba(59,130,246,0.28)",
                fontWeight: 800,
                fontSize: "0.74rem",
              }}
            >
              <span aria-hidden="true">{getFlagEmoji(item.code)}</span> {item.name}
            </Link>
          ))}
        </div>


<h2
  style={{
    fontSize: "1.15rem",
    margin: "1.25rem 0 0.75rem",
    lineHeight: 1.25,
  }}
>
  Official TV channels in {countryName} {countryFlag}
</h2>

        <div
          style={{
            display: "grid",
            gap: "0.45rem",
            marginBottom: "1.5rem",
          }}
        >
          {summary.broadcasters.map((item) => (
            <div
              key={`${item.countryCode}-${item.broadcaster}`}
              style={{
                background: "#111827",
                border: "1px solid rgba(255,255,255,0.08)",
                borderRadius: "14px",
                padding: "0.55rem 0.65rem",
                display: "grid",
                gridTemplateColumns: "minmax(0, 1fr) auto",
                gap: "0.65rem",
                alignItems: "center",
              }}
            >
              <div
                style={{
                  minWidth: 0,
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                  flexWrap: "wrap",
                }}
              >
                <span aria-hidden="true">{countryFlag}</span>
                <strong>{item.broadcaster}</strong>

                {item.commentaryLanguages && item.commentaryLanguages.length > 0 ? (
                  <span
                    style={{
                      color: "#94A3B8",
                      fontSize: "0.85rem",
                    }}
                  >
                    • {item.commentaryLanguages.join(", ")}
                  </span>
                ) : null}
              </div>

              <div
                style={{
                  display: "flex",
                  gap: "0.45rem",
                  alignItems: "center",
                  justifyContent: "flex-end",
                  flexWrap: "wrap",
                }}
              >
                <a
                  href={item.affiliateUrl || item.url}
                  target="_blank"
                  rel="nofollow sponsored noopener noreferrer"
                  style={{
                    background: "#3B82F6",
                    color: "#FFFFFF",
                    textDecoration: "none",
                    padding: "0.35rem 0.65rem",
                    borderRadius: "9px",
                    fontWeight: 800,
                    fontSize: "0.82rem",
                    whiteSpace: "nowrap",
                  }}
                >
                  Watch on {item.broadcaster}
                </a>

                <AccessBadge access={item.access} />
              </div>
            </div>
          ))}
        </div>

        <h2
  style={{
    fontSize: "1.15rem",
    margin: "1.25rem 0 0.75rem",
    lineHeight: 1.25,
  }}
>
  Available matches in {countryName}
</h2>

        <div
          style={{
            display: "grid",
            gap: "0.55rem",
            marginBottom: "1.5rem",
          }}
        >
          {countryMatches.map((item) => {
            const homeTeam = getTeamName(item.match.homeTeam);
            const awayTeam = getTeamName(item.match.awayTeam);
            const homeFlag = getTeamFlagEmoji(item.match.homeTeam);
            const awayFlag = getTeamFlagEmoji(item.match.awayTeam);
            const featuredBroadcast = getFeaturedBroadcast(item.broadcasts);

            return (
              <Link
                key={item.match.slug}
                href={`/watch/${item.match.slug}/${normalizedCode}`}
                style={{
                  background: "#111827",
                  border: "1px solid rgba(255,255,255,0.08)",
                  borderRadius: "12px",
                  padding: "0.42rem 0.65rem",
                  display: "grid",
                  gridTemplateColumns: "auto minmax(0, 1fr) auto",
                  gap: "0.6rem",
                  alignItems: "center",
                  color: "#FFFFFF",
                  textDecoration: "none",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    gap: "0.35rem",
                    alignItems: "center",
                    minWidth: "150px",
                    color: "#CBD5E1",
                    fontSize: "0.74rem",
                    fontWeight: 700,
                    lineHeight: 1.1,
                  }}
                >
                  <span>{formatStage(item.match.group)}</span>
                  <span style={{ color: "#64748B" }}>•</span>
                  <MatchStatusBadge matchDate={item.match.matchDate} />
                </div>

                <div
                  style={{
                    fontWeight: 800,
                    fontSize: "0.92rem",
                    lineHeight: 1.25,
                    textAlign: "center",
                    minWidth: 0,
                  }}
                >
                  <span aria-hidden="true">{homeFlag}</span> {homeTeam} vs {awayTeam}{" "}
                  <span aria-hidden="true">{awayFlag}</span>
                </div>

                <div
                  style={{
                    display: "flex",
                    gap: "0.35rem",
                    alignItems: "center",
                    justifyContent: "flex-end",
                    flexWrap: "wrap",
                    minWidth: "90px",
                  }}
                >
                  {featuredBroadcast ? (
                    <span
                      style={{
                        color: "#CBD5E1",
                        fontSize: "0.76rem",
                        fontWeight: 700,
                        whiteSpace: "nowrap",
                      }}
                    >
                      {featuredBroadcast.broadcaster}
                    </span>
                  ) : null}

                  {item.broadcasts.some((broadcast) => broadcast.access === "Free") ? (
                    <AccessBadge access="Free" />
                  ) : null}

                  {item.broadcasts.some((broadcast) => broadcast.access === "Paid") ? (
                    <AccessBadge access="Paid" />
                  ) : null}
                </div>
              </Link>
            );
          })}
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