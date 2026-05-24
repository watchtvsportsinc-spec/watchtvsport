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
  access,
  countries,
  languages,
}: {
  slug: string;
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

  return query ? `/match/${slug}?${query}` : `/match/${slug}`;
}

function toggleFilterValue(values: string[], value: string): string[] {
  return values.includes(value)
    ? values.filter((item) => item !== value)
    : [...values, value];
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const normalizedSlug = normalizeSlug(slug);
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

  const freeCount = broadcasts.filter((item) => item.access === "Free").length;
  const countryCount = new Set(broadcasts.map((item) => item.countryCode)).size;

  const title = `Watch ${homeTeam} vs ${awayTeam} Live on TV | Official Broadcasters`;
  const description =
    freeCount > 0
      ? `Find where to watch ${homeTeam} vs ${awayTeam} legally worldwide. Compare official broadcasters, free and paid TV channels by country, including ${freeCount} free option${freeCount > 1 ? "s" : ""} currently listed across ${countryCount} countr${countryCount > 1 ? "ies" : "y"}.`
      : `Find where to watch ${homeTeam} vs ${awayTeam} legally worldwide. Compare official broadcasters and paid TV channels by country.`;

  return {
    title,
    description,
    alternates: {
      canonical: `/match/${safeMatch.slug}`,
    },
    openGraph: {
      title,
      description,
      url: `/match/${safeMatch.slug}`,
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  };
}

export default async function MatchPage({ params, searchParams }: PageProps) {
  const resolvedSearchParams = (await searchParams) || {};
  const selectedAccess = parseMultiFilter(resolvedSearchParams.access).filter(
    (item) => ["free", "paid"].includes(item.toLowerCase())
  );
  const selectedCountries = parseMultiFilter(
    resolvedSearchParams.countries ?? resolvedSearchParams.country
  ).map((item) => item.toLowerCase());
  const selectedLanguages = parseMultiFilter(
    resolvedSearchParams.languages ?? resolvedSearchParams.language
  );

  const { slug } = await params;
  const normalizedSlug = normalizeSlug(slug);

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

  const faqItems = [
    {
      question: `Where can I watch ${homeTeam} vs ${awayTeam}?`,
      answer: `You can compare official broadcasters for ${homeTeam} vs ${awayTeam} by country on WatchTVSport and open a dedicated local viewing page for each market.`,
    },
    {
      question: `Is ${homeTeam} vs ${awayTeam} free to watch?`,
      answer:
        freeBroadcasts.length > 0
          ? `${freeBroadcasts.length} official free option${freeBroadcasts.length > 1 ? "s are" : " is"} currently listed for this match. Availability depends on the country and broadcaster.`
          : `No official free option is currently listed for ${homeTeam} vs ${awayTeam}. Paid official broadcasters may still be available by country.`,
    },
    {
      question: `What time does ${homeTeam} vs ${awayTeam} start?`,
      answer: `${homeTeam} vs ${awayTeam} starts on ${formatDate(safeMatch.matchDate)}. Local time may vary depending on the viewer's country.`,
    },
    {
      question: `Which TV channels broadcast ${homeTeam} vs ${awayTeam}?`,
      answer: `TV channels and streaming platforms vary by country. WatchTVSport lists official broadcasters only and separates free and paid viewing options.`,
    },
    {
      question: `Does WatchTVSport list illegal streams?`,
      answer: `No. WatchTVSport only lists official broadcasters and legal viewing options by country.`,
    },
  ];

  const sportsEventSchema = {
    "@context": "https://schema.org",
    "@type": "SportsEvent",
    name: `${homeTeam} vs ${awayTeam}`,
    description: `Find where to watch ${homeTeam} vs ${awayTeam} legally worldwide. Compare official broadcasters, free and paid TV channels by country.`,
    startDate: safeMatch.matchDate,
    sport: "Soccer",
    eventStatus: "https://schema.org/EventScheduled",
    eventAttendanceMode: "https://schema.org/OnlineEventAttendanceMode",
    url: `https://watchtvsport.com/match/${safeMatch.slug}`,
location: {
  "@type": "Place",
  name:
    safeMatch.hostCity && safeMatch.hostCountry
      ? `${safeMatch.hostCity}, ${safeMatch.hostCountry}`
      : safeMatch.competition ?? "FIFA World Cup 2026",
  address: {
    "@type": "PostalAddress",
    addressLocality: safeMatch.hostCity ?? undefined,
    addressCountry: safeMatch.hostCountry ?? undefined,
  },
},
    competitor: [
      {
        "@type": "SportsTeam",
        name: homeTeam,
      },
      {
        "@type": "SportsTeam",
        name: awayTeam,
      },
    ],
    offers: broadcasts.map((item) => ({
      "@type": "Offer",
      name: `${item.broadcaster} in ${item.countryName}`,
      url: item.affiliateUrl || item.url,
      category: item.access,
      areaServed: item.countryName,
      availability: "https://schema.org/InStock",
    })),
  };

  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqItems.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.answer,
      },
    })),
  };

  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Home",
        item: "https://watchtvsport.com",
      },
      {
        "@type": "ListItem",
        position: 2,
        name: "Matches",
        item: "https://watchtvsport.com",
      },
      {
        "@type": "ListItem",
        position: 3,
        name: `${homeTeam} vs ${awayTeam}`,
        item: `https://watchtvsport.com/match/${safeMatch.slug}`,
      },
    ],
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
        dangerouslySetInnerHTML={{ __html: JSON.stringify(sportsEventSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />

      <style
        dangerouslySetInnerHTML={{
          __html: `
            @media (max-width: 767px) {
  .matchHeroCard {
    --hero-card-padding: 0.5rem 0.45rem 0.55rem;
    --hero-grid-gap: 0px;
    --hero-grid-max-width: 100%;
    --hero-team-min-width: 96px;
    --hero-flag-size: 46px;
    --hero-team-font-size: 0.78rem;
    --hero-team-margin-bottom: 0.28rem;
    --hero-center-min-width: 86px;
    --hero-pill-padding: 0.22rem 0.42rem;
    --hero-pill-font-size: 0.62rem;
    --hero-pill-gap: 0.28rem;
    --hero-stage-gap: 0.42rem;
    --hero-vs-font-size: 13px;
    --hero-vs-gap: 0.25rem;
    --hero-meta-font-size: 0.65rem;
    --hero-stats-gap: 0.34rem;
    --hero-stats-font-size: 0.64rem;
    --hero-stats-margin-bottom: 0.35rem;
  }

  .matchHeroGrid {
    align-items: start !important;
  }

  .matchHeroStats {
    line-height: 1.15 !important;
  }

  .broadcasterCard {
    --broadcaster-card-columns: minmax(0, 1fr);
    --broadcaster-card-padding: 0.65rem;
    --broadcaster-card-gap: 0.5rem;
  }

  .broadcasterCard .broadcasterInfo {
    font-size: 0.82rem !important;
    gap: 0.38rem !important;
    line-height: 1.2 !important;
    justify-content: center !important;
    text-align: center !important;
  }

  .broadcasterActions {
    width: 100% !important;
    justify-content: center !important;
    flex-wrap: nowrap !important;
    gap: 0.45rem !important;
  }

  .broadcasterActions a {
    max-width: none !important;
    overflow: visible !important;
  }

  .broadcasterActions a span:last-child {
    overflow: visible !important;
    text-overflow: clip !important;
    white-space: nowrap !important;
  }

  .broadcasterCountryLink {
    width: auto !important;
    justify-content: center !important;
    margin-top: 0 !important;
    white-space: nowrap !important;
  }

  .broadcasterCountryLink img {
    display: none !important;
  }
}
  
`,
        }}
      />

      <div
        style={{
          maxWidth: "1100px",
          margin: "0 auto",
        }}
      >
        <div
          className="matchHeroCard"
          style={{
            background: "#071632",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: "18px",
padding: "var(--hero-card-padding, 0.7rem 0.7rem 0.8rem)",
marginBottom: "0.9rem",
          }}
        >
          <div
            className="matchHeroGrid"
            style={{
              display: "grid",
              gridTemplateColumns: "1fr auto 1fr",
alignItems: "center",
gap: "var(--hero-grid-gap, 4px)",
marginBottom: "0.2rem",
maxWidth: "var(--hero-grid-max-width, 520px)",
              marginLeft: "auto",
              marginRight: "auto",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                paddingTop: "4px",
              }}
            >
              <TeamFlagUnderName
                teamName={homeTeam}
                countryCode={fifaCodeToIso2(safeMatch.homeTeam.code)}
                size={62}
                teamNameStyle={{
                  fontSize: "var(--hero-team-font-size, 1.05rem)",
                  fontWeight: 800,
                  lineHeight: 1.15,
                  textAlign: "center",
                  color: "#FFFFFF",
                  marginBottom: "var(--hero-team-margin-bottom, 0.75rem)",
                }}
                wrapperStyle={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  minWidth: "var(--hero-team-min-width, 160px)",
                }}
                flagStyle={{
                  width: "var(--hero-flag-size, 62px)",
                  height: "var(--hero-flag-size, 62px)",
                  minWidth: "var(--hero-flag-size, 62px)",
                  minHeight: "var(--hero-flag-size, 62px)",
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
                minWidth: "var(--hero-center-min-width, 120px)",
                textAlign: "center",
              }}
            >
              <span
                style={{
                  padding: "var(--hero-pill-padding, 0.28rem 0.55rem)",
                  borderRadius: "999px",
                  background: "rgba(59,130,246,0.15)",
                  color: "#BFDBFE",
                  fontSize: "var(--hero-pill-font-size, 0.74rem)",
                  fontWeight: 700,
                  lineHeight: 1,
                  marginBottom: "var(--hero-pill-gap, 0.45rem)",
                }}
              >
                {safeMatch.competition ?? "FIFA World Cup 2026"}
              </span>

              <span
                style={{
                  padding: "var(--hero-pill-padding, 0.28rem 0.55rem)",
                  borderRadius: "999px",
                  background: "rgba(255,255,255,0.06)",
                  color: "#CBD5E1",
                  fontSize: "var(--hero-pill-font-size, 0.74rem)",
                  fontWeight: 700,
                  lineHeight: 1,
                  marginBottom: "var(--hero-stage-gap, 0.8rem)",
                }}
              >
                {stageLabel}
              </span>

              <div
                style={{
                  fontSize: "var(--hero-vs-font-size, 16px)",
                  fontWeight: 800,
                  color: "#94A3B8",
                  letterSpacing: "0.08em",
                  textAlign: "center",
                  marginBottom: "var(--hero-vs-gap, 0.45rem)",
                }}
              >
                VS
              </div>

              <div
                style={{
                  color: "#94A3B8",
                  fontSize: "var(--hero-meta-font-size, 0.76rem)",
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
                paddingTop: "4px",
              }}
            >
              <TeamFlagUnderName
                teamName={awayTeam}
                countryCode={fifaCodeToIso2(safeMatch.awayTeam.code)}
                size={62}
                teamNameStyle={{
                  fontSize: "var(--hero-team-font-size, 0.88rem)",
                  fontWeight: 800,
                  lineHeight: 1.15,
                  textAlign: "center",
                  color: "#FFFFFF",
                  marginBottom: "var(--hero-team-margin-bottom, 0.35rem)",
                }}
                wrapperStyle={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  minWidth: "var(--hero-team-min-width, 160px)",
                }}
                flagStyle={{
                  width: "var(--hero-flag-size, 62px)",
                  height: "var(--hero-flag-size, 62px)",
                  minWidth: "var(--hero-flag-size, 62px)",
                  minHeight: "var(--hero-flag-size, 62px)",
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
            className="matchHeroStats"
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "var(--hero-stats-gap, 0.55rem)",
              flexWrap: "wrap",
              marginTop: "0.2rem",
              marginBottom: "var(--hero-stats-margin-bottom, 0.75rem)",
              color: "#CBD5E1",
              fontSize: "var(--hero-stats-font-size, 0.74rem)",
              fontWeight: 700,
              lineHeight: 1,
            }}
          >
            <div style={{ display: "inline-flex", alignItems: "center", gap: "0.25rem" }}>
              <span style={{ color: "#94A3B8", fontSize: "0.82rem" }}>⊚</span>
              <span>{countryCount} Countries</span>
            </div>

            <span style={{ color: "rgba(255,255,255,0.16)" }}>|</span>

            <div style={{ display: "inline-flex", alignItems: "center", gap: "0.25rem" }}>
              <span style={{ color: "#94A3B8", fontSize: "0.82rem" }}>✦</span>
              <span>{freeBroadcasts.length} Free</span>
            </div>

            <span style={{ color: "rgba(255,255,255,0.16)" }}>|</span>

            <div style={{ display: "inline-flex", alignItems: "center", gap: "0.25rem" }}>
              <span style={{ color: "#94A3B8", fontSize: "0.82rem" }}>◼</span>
              <span>{paidBroadcasts.length} Paid</span>
            </div>

            <span style={{ color: "rgba(255,255,255,0.16)" }}>|</span>

            <Link
  href={`#watch-by-country`}
  style={{
    display: "inline-flex",
    alignItems: "center",
    gap: "0.25rem",
    color: "#60A5FA",
    textDecoration: "none",
    fontWeight: 800,
    whiteSpace: "nowrap",
  }}
>
  View all countries
  <span style={{ fontSize: "0.9rem" }}>→</span>
</Link>
          </div>
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
              padding: "0.5rem",
              display: "grid",
              gap: "0.5rem",
            }}
          >
            <div
              style={{
                display: "flex",
              justifyContent: "flex-start",
                alignItems: "center",
                gap: "0.45rem",
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
                  href={`/match/${safeMatch.slug}`}
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

<SectionTitle>All viewing options</SectionTitle>

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
        className="broadcasterCard"
        style={{
          background: "#111827",
          border: "1px solid rgba(255,255,255,0.08)",
          borderRadius: "12px",
          padding: "var(--broadcaster-card-padding, 0.28rem 0.45rem)",
          display: "grid",
          gridTemplateColumns: "var(--broadcaster-card-columns, minmax(0, 1fr) auto auto)",
          alignItems: "center",
          gap: "var(--broadcaster-card-gap, 0.75rem)",
        }}
      >
        <div
          className="broadcasterInfo"
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
          <Image
            src={`/flags/${item.countryCode}.png`}
            alt={getCountryDisplayName(broadcasts, item.countryCode)}
            width={20}
            height={14}
            style={{ objectFit: "contain", flexShrink: 0 }}
          />

          <span style={{ color: "#64748B" }}>•</span>

          <span style={{ fontWeight: 700, whiteSpace: "nowrap" }}>
            {item.broadcaster}
          </span>

          {item.commentaryLanguages?.length ? (
            <>
              <span style={{ color: "#64748B" }}>•</span>
              <span style={{ color: "#CBD5E1" }}>
                {item.commentaryLanguages.join(", ")}
              </span>
            </>
          ) : null}
        </div>

        <div
          className="broadcasterActions"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "var(--broadcaster-actions-justify, flex-end)",
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

<span className="watchButtonText">
  Watch
</span>
          </a>

          <AccessBadge access={item.access} />

          <Link
            href={`/watch/${safeMatch.slug}/${item.countryCode.toLowerCase()}`}
            className="broadcasterCountryLink"
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "flex-end",
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

      <div id="watch-by-country">
  <SectionTitle>Watch this match by country</SectionTitle>
</div>

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

        <SectionTitle>Match FAQ</SectionTitle>

        <div
          style={{
            display: "grid",
            gap: "0.75rem",
          }}
        >
          {faqItems.map((item) => (
            <div
              key={item.question}
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
                {item.question}
              </h3>
              <p
                style={{
                  color: "#CBD5E1",
                  marginBottom: 0,
                  lineHeight: 1.6,
                  fontSize: "0.92rem",
                }}
              >
                {item.answer}
              </p>
            </div>
          ))}
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
          Find where to watch {homeTeam} vs {awayTeam} legally by country.
          Compare official broadcasters worldwide, check whether coverage is free
          or paid, and open dedicated local viewing pages.
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