import TeamFlagUnderName from "@/components/TeamFlagUnderName";
import { SectionTitle, AccessBadge } from "@/components/ui";
import Image from "next/image";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ensureMatch,
  formatDate,
  formatStage,
  getCountryDisplayName,
  getMatchBySlug,
  getOtherCountryOptions,
  getOtherMatches,
  getSafeBroadcasts,
  getTeamName,
  normalizeSlug,
} from "@/lib/utils";
import { fifaCodeToIso2 } from "@/lib/flags";
import LocalTime from "@/components/LocalTime";

type PageProps = {
  params: Promise<{
    slug: string;
    country: string;
  }>;
  searchParams?: Promise<{
    access?: string;
    language?: string;
    languages?: string;
    country?: string;
    countries?: string;
  }>;
};

function getWatchButtonLabel(countryCode: string, broadcaster: string) {
  const code = countryCode.toLowerCase();

  if (["fr", "be", "ch"].includes(code)) {
    return `Regarder sur ${broadcaster}`;
  }

  if (["de", "at"].includes(code)) {
    return `Ansehen auf ${broadcaster}`;
  }

  if (["es"].includes(code)) {
    return `Ver en ${broadcaster}`;
  }

  if (["pt", "br"].includes(code)) {
    return `Assistir na ${broadcaster}`;
  }

  if (code === "ja") {
    return `${broadcaster}で視聴`;
  }

  if (code === "ko") {
    return `${broadcaster}에서 시청`;
  }

  if (code === "zh") {
    return `在${broadcaster}观看`;
  }

  if (code === "ar") {
    return `شاهد على ${broadcaster}`;
  }

  return `Watch on ${broadcaster}`;
}

function parseMultiFilter(value?: string): string[] {
  if (!value || value === "all") {
    return [];
  }

  return value
    .split(",")
    .map((item) => decodeURIComponent(item).trim())
    .filter(Boolean);
}

function buildFilterHref({
  slug,
  country,
  access,
  countries,
  languages,
}: {
  slug: string;
  country: string;
  access: string[];
  countries: string[];
  languages: string[];
}) {
  const params = new URLSearchParams();

  if (access.length > 0) {
    params.set("access", access.join(","));
  }

  if (countries.length > 0) {
    params.set("countries", countries.join(","));
  }

  if (languages.length > 0) {
    params.set("languages", languages.join(","));
  }

  const query = params.toString();

  return query ? `/watch/${slug}/${country}?${query}` : `/watch/${slug}/${country}`;
}

function toggleFilterValue(values: string[], value: string): string[] {
  return values.includes(value)
    ? values.filter((item) => item !== value)
    : [...values, value];
}

function normalizeCountryCode(country: string): string {
  return country.trim().toLowerCase();
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug, country } = await params;
  const normalizedSlug = normalizeSlug(slug);
  const countryCode = normalizeCountryCode(country);
  const match = getMatchBySlug(normalizedSlug);

  if (!match) {
    return {
      title: "Match not found | WatchTVSport",
      description: "The requested match page could not be found.",
    };
  }

  const safeMatch = ensureMatch(match);
  const broadcasts = getSafeBroadcasts(safeMatch);
  const homeTeam = getTeamName(safeMatch.homeTeam);
  const awayTeam = getTeamName(safeMatch.awayTeam);
  const countryName = getCountryDisplayName(broadcasts, countryCode);

  const localBroadcasts = broadcasts.filter(
    (item) => item.countryCode.toLowerCase() === countryCode
  );
  const title = `Watch ${homeTeam} vs ${awayTeam} in ${countryName} – Official TV Channels`;
  const description =
    localBroadcasts.length > 0
      ? `Find where to watch ${homeTeam} vs ${awayTeam} legally in ${countryName}. Compare official broadcasters, free and paid viewing options.`
      : `Find official legal viewing information for ${homeTeam} vs ${awayTeam} in ${countryName} and compare broadcaster options by country.`;

  return {
    title,
    description,
    alternates: {
      canonical: `/watch/${safeMatch.slug}/${countryCode}`,
    },
    openGraph: {
      title,
      description,
      url: `/watch/${safeMatch.slug}/${countryCode}`,
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  };
}

export default async function WatchCountryPage({ params, searchParams }: PageProps) {
  const { slug, country } = await params;
  const normalizedSlug = normalizeSlug(slug);
  const countryCode = normalizeCountryCode(country);
  const resolvedSearchParams = (await searchParams) || {};
  const selectedAccess = parseMultiFilter(resolvedSearchParams.access).filter(
    (item) => ["free", "paid"].includes(item.toLowerCase())
  );
  const selectedCountriesFromQuery = parseMultiFilter(
    resolvedSearchParams.countries ?? resolvedSearchParams.country
  ).map((item) => item.toLowerCase());
  const selectedCountries =
    selectedCountriesFromQuery.length > 0 ? selectedCountriesFromQuery : [countryCode];
  const selectedLanguages = parseMultiFilter(
    resolvedSearchParams.languages ?? resolvedSearchParams.language
  );

  if (!normalizedSlug) {
    notFound();
  }

  const match = getMatchBySlug(normalizedSlug);

  if (!match) {
    notFound();
  }

  const safeMatch = ensureMatch(match);
  const broadcasts = getSafeBroadcasts(safeMatch);

  if (!broadcasts.length) {
    notFound();
  }

  const homeTeam = getTeamName(safeMatch.homeTeam);
  const awayTeam = getTeamName(safeMatch.awayTeam);

  const stageLabel =
    safeMatch.group && safeMatch.group.length === 1
      ? `Group ${safeMatch.group}`
      : formatStage(safeMatch.group);

  const countryName = getCountryDisplayName(broadcasts, countryCode);
  const localBroadcasts = broadcasts.filter(
    (item) => item.countryCode.toLowerCase() === countryCode
  );
  const freeBroadcasts = broadcasts.filter((item) => item.access === "Free");
  const uniqueCountries = getOtherCountryOptions(broadcasts, "__none__");
  const otherMatches = getOtherMatches(safeMatch.slug, 6);
  const paidBroadcasts = broadcasts.filter((item) => item.access === "Paid");
  const countryCount = new Set(broadcasts.map((item) => item.countryCode)).size;
  const availableLanguages = Array.from(
    new Set(broadcasts.flatMap((item) => item.commentaryLanguages ?? []))
  ).sort((a, b) => a.localeCompare(b));

  const filteredBroadcasts = broadcasts.filter((item) => {
    const matchesAccess =
      selectedAccess.length === 0
        ? true
        : selectedAccess.includes(item.access.toLowerCase());

    const matchesCountry =
      selectedCountries.length === 0
        ? true
        : selectedCountries.includes(item.countryCode.toLowerCase());

    const matchesLanguage =
      selectedLanguages.length === 0
        ? true
        : (item.commentaryLanguages ?? []).some((language) =>
            selectedLanguages.includes(language)
          );

    return matchesAccess && matchesCountry && matchesLanguage;
  });

  const sortedBroadcasts = [...filteredBroadcasts].sort((a, b) => {
    if (a.access === "Free" && b.access !== "Free") return -1;
    if (a.access !== "Free" && b.access === "Free") return 1;
    return a.countryName.localeCompare(b.countryName);
  });

  const hasActiveFilters =
    selectedAccess.length > 0 ||
    selectedCountries.length > 0 ||
    selectedLanguages.length > 0;

  const schema = {
    "@context": "https://schema.org",
    "@type": "SportsEvent",
    name: `${homeTeam} vs ${awayTeam}`,
    startDate: safeMatch.matchDate,
    sport: "Soccer",
    eventStatus: "https://schema.org/EventScheduled",
    location: {
      "@type": "Place",
      name:
        safeMatch.hostCity && safeMatch.hostCountry
          ? `${safeMatch.hostCity}, ${safeMatch.hostCountry}`
          : safeMatch.competition ?? "FIFA World Cup 2026",
    },
    offers: broadcasts.map((item) => ({
      "@type": "Offer",
      name: `${item.broadcaster} in ${item.countryName}`,
      url: item.affiliateUrl || item.url,
      category: item.access,
      areaServed: item.countryName,
      availability: "https://schema.org/InStock",
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
            background: "#071632",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: "18px",
            padding: "1rem 1.1rem 0.95rem",
            marginBottom: "1.1rem",
          }}
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr auto 1fr",
              alignItems: "start",
              gap: "10px",
              marginBottom: "0.45rem",
              maxWidth: "620px",
              marginLeft: "auto",
              marginRight: "auto",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                paddingTop: "18px",
              }}
            >
              <TeamFlagUnderName
                teamName={homeTeam}
                countryCode={fifaCodeToIso2(safeMatch.homeTeam.code)}
                size={62}
                teamNameStyle={{
                  fontSize: "1.05rem",
                  fontWeight: 800,
                  lineHeight: 1.15,
                  textAlign: "center",
                  color: "#FFFFFF",
                  marginBottom: "0.75rem",
                }}
                wrapperStyle={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  minWidth: "160px",
                }}
                flagStyle={{
                  width: "62px",
                  height: "62px",
                  minWidth: "62px",
                  minHeight: "62px",
                  borderRadius: "999px",
                  objectFit: "cover",
                  background: "#071632",
                  border: "1px solid rgba(255,255,255,0.14)",
                  boxShadow: "0 2px 10px rgba(0,0,0,0.28)",
                }}
              />
            </div>

            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                minWidth: "120px",
                textAlign: "center",
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
                  marginBottom: "0.45rem",
                }}
              >
                {safeMatch.competition ?? "FIFA World Cup 2026"}
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
                  marginBottom: "0.8rem",
                }}
              >
                {stageLabel}
              </span>

              <div
                style={{
                  fontSize: "16px",
                  fontWeight: 800,
                  color: "#94A3B8",
                  letterSpacing: "0.08em",
                  textAlign: "center",
                  marginBottom: "0.45rem",
                }}
              >
                VS
              </div>

              <div
                style={{
                  color: "#94A3B8",
                  fontSize: "0.76rem",
                  lineHeight: 1.5,
                  textAlign: "center",
                }}
              >
                <div>
                  <LocalTime date={safeMatch.matchDate} />{" "}
                  <span style={{ color: "#64748B", fontSize: "0.75rem" }}>
                    (local time)
                  </span>
                </div>

                {safeMatch.hostCity && safeMatch.hostCountry ? (
                  <div>
                    {safeMatch.hostCity}, {safeMatch.hostCountry}
                  </div>
                ) : null}
              </div>
            </div>

            <div
              style={{
                display: "flex",
                justifyContent: "flex-start",
                paddingTop: "18px",
              }}
            >
              <TeamFlagUnderName
                teamName={awayTeam}
                countryCode={fifaCodeToIso2(safeMatch.awayTeam.code)}
                size={62}
                teamNameStyle={{
                  fontSize: "0.88rem",
                  fontWeight: 800,
                  lineHeight: 1.15,
                  textAlign: "center",
                  color: "#FFFFFF",
                  marginBottom: "0.35rem",
                }}
                wrapperStyle={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  minWidth: "110px",
                }}
                flagStyle={{
                  width: "62px",
                  height: "62px",
                  minWidth: "62px",
                  minHeight: "62px",
                  borderRadius: "999px",
                  objectFit: "cover",
                  background: "#071632",
                  border: "1px solid rgba(255,255,255,0.14)",
                  boxShadow: "0 2px 10px rgba(0,0,0,0.28)",
                }}
              />
            </div>
          </div>

          <div
            style={{
              display: "flex",
              gap: "0.5rem",
              flexWrap: "wrap",
              justifyContent: "center",
              marginBottom: "0.2rem",
            }}
          >
            {[
              { value: countryName, label: "Country" },
              { value: localBroadcasts.length, label: "Local options" },
              { value: countryCount, label: "Countries" },
            ].map((item) => (
              <div
                key={item.label}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.35rem",
                  background: "rgba(255,255,255,0.03)",
                  border: "1px solid rgba(255,255,255,0.05)",
                  borderRadius: "999px",
                  padding: "0.3rem 0.55rem",
                }}
              >
                <span style={{ fontSize: "0.85rem", fontWeight: 700 }}>
                  {item.value}
                </span>
                <span
                  style={{
                    color: "#94A3B8",
                    fontSize: "0.72rem",
                  }}
                >
                  {item.label}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div
  style={{
    marginBottom: "0.9rem",
  }}
>
  <h1
    style={{
      fontSize: "1.15rem",
      fontWeight: 800,
      lineHeight: 1.2,
      margin: 0,
      color: "#FFFFFF",
    }}
  >
    Watch {homeTeam} vs {awayTeam} in {countryName}
  </h1>

  <p
    style={{
      marginTop: "0.28rem",
      color: "#94A3B8",
      fontSize: "0.82rem",
      lineHeight: 1.45,
      marginBottom: 0,
    }}
  >
    Official broadcasters and legal viewing options.
  </p>
</div>

        <div
          style={{
            display: "grid",
            gap: "0.55rem",
            marginBottom: "1rem",
          }}
        >
          <div
            style={{
              background: "rgba(255,255,255,0.03)",
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: "14px",
              padding: "0.65rem",
              display: "grid",
              gap: "0.5rem",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: "0.6rem",
                flexWrap: "wrap",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.45rem",
                  flexWrap: "wrap",
                }}
              >
                <div
                  style={{
                    color: "#FFFFFF",
                    fontSize: "0.82rem",
                    fontWeight: 800,
                    lineHeight: 1,
                  }}
                >
                  1. Access
                </div>
                <div
                  style={{
                    color: "#94A3B8",
                    fontSize: "0.72rem",
                    lineHeight: 1,
                  }}
                >
                  Choose free, paid, or both.
                </div>
              </div>

              {hasActiveFilters ? (
                <Link
                  href={`/watch/${safeMatch.slug}/${countryCode}`}
                  style={{
                    textDecoration: "none",
                    padding: "0.28rem 0.52rem",
                    borderRadius: "999px",
                    background: "rgba(255,255,255,0.06)",
                    border: "1px solid rgba(255,255,255,0.08)",
                    color: "#CBD5E1",
                    fontSize: "0.72rem",
                    fontWeight: 700,
                    lineHeight: 1,
                  }}
                >
                  Clear filters
                </Link>
              ) : null}
            </div>

            <div
              style={{
                display: "flex",
                gap: "0.35rem",
                flexWrap: "wrap",
                alignItems: "center",
              }}
            >
              {[
                { value: "free", label: "Free" },
                { value: "paid", label: "Paid" },
              ].map((filter) => {
                const isActive = selectedAccess.includes(filter.value);
                const nextAccess = toggleFilterValue(selectedAccess, filter.value);

                return (
                  <Link
                    key={filter.value}
                    href={buildFilterHref({
                      slug: safeMatch.slug,
                      country: countryCode,
                      access: nextAccess,
                      countries: selectedCountries,
                      languages: selectedLanguages,
                    })}
                    style={{
                      textDecoration: "none",
                      padding: "0.28rem 0.52rem",
                      borderRadius: "999px",
                      background: isActive
                        ? filter.value === "free"
                          ? "rgba(34,197,94,0.16)"
                          : "rgba(245,158,11,0.16)"
                        : filter.value === "free"
                          ? "rgba(34,197,94,0.06)"
                          : "rgba(245,158,11,0.06)",
                      border: isActive
                        ? filter.value === "free"
                          ? "1px solid rgba(34,197,94,0.38)"
                          : "1px solid rgba(245,158,11,0.38)"
                        : filter.value === "free"
                          ? "1px solid rgba(34,197,94,0.16)"
                          : "1px solid rgba(245,158,11,0.16)",
                      color: isActive
                        ? filter.value === "free"
                          ? "#22C55E"
                          : "#F59E0B"
                        : "#CBD5E1",
                      fontSize: "0.74rem",
                      fontWeight: 800,
                      lineHeight: 1,
                      whiteSpace: "nowrap",
                    }}
                  >
                    {filter.label}
                  </Link>
                );
              })}
            </div>
          </div>

          <div
            style={{
              background: "rgba(59,130,246,0.055)",
              border: "1px solid rgba(59,130,246,0.16)",
              borderRadius: "14px",
              padding: "0.65rem",
              display: "grid",
              gap: "0.5rem",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.45rem",
                flexWrap: "wrap",
              }}
            >
              <div
                style={{
                  color: "#BFDBFE",
                  fontSize: "0.82rem",
                  fontWeight: 800,
                  lineHeight: 1,
                }}
              >
                2. Countries
              </div>
              <div
                style={{
                  color: "#94A3B8",
                  fontSize: "0.72rem",
                  lineHeight: 1,
                }}
              >
                Select one or several countries.
              </div>
            </div>

            <div
              style={{
                display: "flex",
                gap: "0.35rem",
                flexWrap: "wrap",
                alignItems: "center",
              }}
            >
              {uniqueCountries.map((country) => {
                const isActive = selectedCountries.includes(country.countryCode);
                const nextCountries = toggleFilterValue(
                  selectedCountries,
                  country.countryCode
                );

                return (
                  <Link
                    key={`country-filter-${country.countryCode}`}
                    href={buildFilterHref({
                      slug: safeMatch.slug,
                      country: countryCode,
                      access: selectedAccess,
                      countries: nextCountries,
                      languages: selectedLanguages,
                    })}
                    style={{
                      textDecoration: "none",
                      padding: "0.28rem 0.5rem",
                      borderRadius: "999px",
                      background: isActive
                        ? "rgba(59,130,246,0.18)"
                        : "rgba(59,130,246,0.06)",
                      border: isActive
                        ? "1px solid rgba(59,130,246,0.42)"
                        : "1px solid rgba(59,130,246,0.14)",
                      color: isActive ? "#BFDBFE" : "#CBD5E1",
                      fontSize: "0.72rem",
                      fontWeight: 700,
                      lineHeight: 1,
                      whiteSpace: "nowrap",
                    }}
                  >
                    {country.countryName}
                  </Link>
                );
              })}
            </div>
          </div>

          {availableLanguages.length > 0 ? (
            <div
              style={{
                background: "rgba(168,85,247,0.055)",
                border: "1px solid rgba(168,85,247,0.16)",
                borderRadius: "14px",
                padding: "0.65rem",
                display: "grid",
                gap: "0.5rem",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.45rem",
                  flexWrap: "wrap",
                }}
              >
                <div
                  style={{
                    color: "#E9D5FF",
                    fontSize: "0.82rem",
                    fontWeight: 800,
                    lineHeight: 1,
                  }}
                >
                  3. Commentary languages
                </div>
                <div
                  style={{
                    color: "#94A3B8",
                    fontSize: "0.72rem",
                    lineHeight: 1,
                  }}
                >
                  Select one or several languages.
                </div>
              </div>

              <div
                style={{
                  display: "flex",
                  gap: "0.35rem",
                  flexWrap: "wrap",
                  alignItems: "center",
                }}
              >
                {availableLanguages.map((lang) => {
                  const isActive = selectedLanguages.includes(lang);
                  const nextLanguages = toggleFilterValue(selectedLanguages, lang);

                  return (
                    <Link
                      key={`language-filter-${lang}`}
                      href={buildFilterHref({
                        slug: safeMatch.slug,
                        country: countryCode,
                        access: selectedAccess,
                        countries: selectedCountries,
                        languages: nextLanguages,
                      })}
                      style={{
                        textDecoration: "none",
                        padding: "0.28rem 0.5rem",
                        borderRadius: "999px",
                        background: isActive
                          ? "rgba(168,85,247,0.18)"
                          : "rgba(168,85,247,0.06)",
                        border: isActive
                          ? "1px solid rgba(168,85,247,0.42)"
                          : "1px solid rgba(168,85,247,0.14)",
                        color: isActive ? "#E9D5FF" : "#CBD5E1",
                        fontSize: "0.72rem",
                        fontWeight: 700,
                        lineHeight: 1,
                        whiteSpace: "nowrap",
                      }}
                    >
                      {lang}
                    </Link>
                  );
                })}
              </div>
            </div>
          ) : null}
        </div>

        <SectionTitle>Viewing options</SectionTitle>

        <div
          style={{
            display: "grid",
            gap: "0.5rem",
          }}
        >
          {sortedBroadcasts.length > 0 ? (
            sortedBroadcasts.map((item) => (
              <div
                key={`${item.countryCode}-${item.broadcaster}-${item.access}`}
                style={{
                  background: "#111827",
                  border: "1px solid rgba(255,255,255,0.08)",
                  borderRadius: "12px",
                  padding: "0.28rem 0.45rem",
                  display: "grid",
                  gridTemplateColumns: "minmax(0, 1fr) auto auto",
                  alignItems: "center",
                  gap: "0.75rem",
                }}
              >
                <div
                  style={{
                    minWidth: 0,
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                    flexWrap: "wrap",
                    fontSize: "0.8rem",
                    lineHeight: 1.1,
                  }}
                >
                  <span
                    style={{
                      width: "20px",
                      height: "14px",
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    <Image
                      src={`/flags/${item.countryCode}.png`}
                      alt={getCountryDisplayName(broadcasts, item.countryCode)}
                      width={20}
                      height={14}
                      style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "contain",
                      }}
                    />
                  </span>

                  <span style={{ color: "#64748B" }}>•</span>

                  <span
                    style={{
                      fontWeight: 700,
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {item.broadcaster}
                  </span>

                  {item.commentaryLanguages && item.commentaryLanguages.length > 0 ? (
                    <>
                      <span style={{ color: "#64748B" }}>•</span>
                      <span style={{ color: "#CBD5E1" }}>
                        {item.commentaryLanguages.join(", ")}
                      </span>
                    </>
                  ) : null}
                </div>

                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "flex-end",
                    gap: "0.35rem",
                    minWidth: "fit-content",
                  }}
                >
                  <a
                    href={item.affiliateUrl || item.url}
                    target="_blank"
                    rel="nofollow sponsored noopener noreferrer"
                    aria-label={getWatchButtonLabel(item.countryCode, item.broadcaster)}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "0.48rem",
                      background: "linear-gradient(180deg, #02091a 0%, #0f245e 100%)",
                      color: "#FFFFFF",
                      textDecoration: "none",
                      padding: "0.18rem 0.45rem",
                      fontWeight: 700,
                      fontSize: "0.8rem",
                      lineHeight: 1,
                      whiteSpace: "nowrap",
                      boxShadow:
                        "inset 0 1px 0 rgba(255,255,255,0.14), 0 4px 10px rgba(29,78,216,0.22)",
                      border: "1px solid rgba(255,255,255,0.08)",
                    }}
                  >
                    <span
                      aria-hidden="true"
                      style={{
                        width: "14px",
                        height: "14px",
                        borderRadius: "999px",
                        background: "rgba(255,255,255,0.14)",
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                      }}
                    >
                      <span
                        style={{
                          width: 0,
                          height: 0,
                          borderTop: "4px solid transparent",
                          borderBottom: "4px solid transparent",
                          borderLeft: "6px solid #FFFFFF",
                          marginLeft: "1px",
                        }}
                      />
                    </span>

                    <span>{getWatchButtonLabel(item.countryCode, item.broadcaster)}</span>
                  </a>

                  <AccessBadge access={item.access} />
                </div>

                <div
                  style={{
                    display: "flex",
                    justifyContent: "flex-end",
                    minWidth: "50px",
                  }}
                >
                  <Link
                    href={`/watch/${safeMatch.slug}/${item.countryCode.toLowerCase()}`}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "0.42rem",
                      color: "#BFDBFE",
                      textDecoration: "none",
                      fontSize: "0.78rem",
                      fontWeight: 700,
                      whiteSpace: "nowrap",
                    }}
                  >
                    <Image
                      src={`/flags/${item.countryCode}.png`}
                      alt={getCountryDisplayName(broadcasts, item.countryCode)}
                      width={16}
                      height={16}
                      style={{
                        width: "16px",
                        height: "16px",
                        borderRadius: "3px",
                        objectFit: "contain",
                        flexShrink: 0,
                      }}
                    />

                    <span>All TV</span>
                  </Link>
                </div>
              </div>
            ))
          ) : (
            <div
              style={{
                background: "#111827",
                border: "1px solid rgba(255,255,255,0.08)",
                borderRadius: "12px",
                padding: "0.9rem",
                color: "#CBD5E1",
                fontSize: "0.9rem",
                lineHeight: 1.55,
              }}
            >
              No official viewing option matches the selected filters.
            </div>
          )}
        </div>

        <SectionTitle>Watch this match in other countries</SectionTitle>

        <div
          style={{
            display: "flex",
            gap: "0.55rem",
            flexWrap: "wrap",
          }}
        >
          {uniqueCountries.map((item) => (
            <Link
              key={item.countryCode}
              href={`/watch/${safeMatch.slug}/${item.countryCode.toLowerCase()}`}
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
              {item.countryName}
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
            <h3
              style={{
                marginTop: 0,
                marginBottom: "0.45rem",
                fontSize: "1rem",
              }}
            >
              Where can I watch {homeTeam} vs {awayTeam} in {countryName}?
            </h3>
            <p
              style={{
                color: "#CBD5E1",
                marginBottom: 0,
                lineHeight: 1.6,
                fontSize: "0.92rem",
              }}
            >
              You can compare official broadcasters for {countryName} on this page and use the filters above to view other legal options by country.
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
            <h3
              style={{
                marginTop: 0,
                marginBottom: "0.45rem",
                fontSize: "1rem",
              }}
            >
              Is {homeTeam} vs {awayTeam} free in {countryName}?
            </h3>
            <p
              style={{
                color: "#CBD5E1",
                marginBottom: 0,
                lineHeight: 1.6,
                fontSize: "0.92rem",
              }}
            >
              {localBroadcasts.filter((item) => item.access === "Free").length > 0
                ? `Yes. ${localBroadcasts.filter((item) => item.access === "Free").length} official free option${
                    localBroadcasts.filter((item) => item.access === "Free").length > 1 ? "s are" : " is"
                  } currently listed in ${countryName}.`
                : `No official free option is currently listed in ${countryName} for this match.`}
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
            <h3
              style={{
                marginTop: 0,
                marginBottom: "0.45rem",
                fontSize: "1rem",
              }}
            >
              Does WatchTVSport list illegal streams?
            </h3>
            <p
              style={{
                color: "#CBD5E1",
                marginBottom: 0,
                lineHeight: 1.6,
                fontSize: "0.92rem",
              }}
            >
              No. WatchTVSport only lists official broadcasters and legal viewing
              options by country.
            </p>
          </div>
        </div>

        <SectionTitle>Other matches</SectionTitle>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: "0.8rem",
          }}
        >
          {otherMatches.map((item) => (
            <Link
              key={item.slug}
              href={`/match/${item.slug}`}
              style={{
                textDecoration: "none",
                color: "#FFFFFF",
                background: "#111827",
                border: "1px solid rgba(255,255,255,0.08)",
                borderRadius: "14px",
                padding: "0.9rem",
              }}
            >
              <div
                style={{
                  color: "#94A3B8",
                  fontSize: "0.82rem",
                  marginBottom: "0.25rem",
                }}
              >
                {formatStage(item.group)}
              </div>
              <div
                style={{
                  fontWeight: 700,
                  marginBottom: "0.25rem",
                  lineHeight: 1.3,
                }}
              >
                {getTeamName(item.homeTeam)} vs {getTeamName(item.awayTeam)}
              </div>
              <div
                style={{
                  color: "#CBD5E1",
                  fontSize: "0.88rem",
                }}
              >
                {formatDate(item.matchDate)}
              </div>
            </Link>
          ))}
        </div>

        <p
          style={{
            color: "#CBD5E1",
            fontSize: "0.9rem",
            lineHeight: 1.6,
            maxWidth: "900px",
            margin: "1.6rem auto 0",
            textAlign: "center",
          }}
        >
          Find where to watch {homeTeam} vs {awayTeam} legally in {countryName}. Compare official broadcasters, check whether coverage is free or paid, and explore other legal viewing options by country.
        </p>

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
          WatchTVSport only lists official broadcasters. No illegal streams. No
          VPN recommendations. Information is provided for legal viewing options
          only.
        </div>
      </div>
    </main>
  );
}