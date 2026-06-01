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
    search?: string;
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
  search,
}: {
  slug: string;
  access: string[];
  countries: string[];
  languages: string[];
  search?: string;
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

  if (search && search.trim().length > 0) {
    params.set("search", search.trim());
  }

  const query = params.toString();

  return query ? `/match/${slug}?${query}` : `/match/${slug}`;
}

function toggleFilterValue(values: string[], value: string): string[] {
  return values.includes(value)
    ? values.filter((item) => item !== value)
    : [...values, value];
}

function getBroadcasterShortName(broadcaster: string) {
  return broadcaster
    .split(/\s+|\//)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "TV";
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
  const selectedSearch = (resolvedSearchParams.search || "").trim();

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
  const paidBroadcasts = broadcasts.filter((item) => item.access === "Paid");
  const uniqueCountries = getOtherCountryOptions(broadcasts, "__none__");
  const otherMatches = getOtherMatches(safeMatch.slug, 6);
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

    const normalizedSearch = selectedSearch.toLowerCase();
    const matchesSearch =
      normalizedSearch.length === 0
        ? true
        : [
            item.countryName,
            item.countryCode,
            item.broadcaster,
            item.access,
            ...(item.commentaryLanguages ?? []),
          ]
            .join(" ")
            .toLowerCase()
            .includes(normalizedSearch);

    return matchesAccess && matchesCountry && matchesLanguage && matchesSearch;
  });

  const sortedBroadcasts = [...filteredBroadcasts].sort((a, b) => {
    if (a.access === "Free" && b.access !== "Free") return -1;
    if (a.access !== "Free" && b.access === "Free") return 1;
    return a.countryName.localeCompare(b.countryName);
  });

  const hasActiveFilters =
    selectedAccess.length > 0 ||
    selectedCountries.length > 0 ||
    selectedLanguages.length > 0 ||
    selectedSearch.length > 0;

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


 const renderPremiumBroadcasterCard = (
  item: (typeof broadcasts)[number],
  options?: {
    featured?: boolean;
    compact?: boolean;
  }
) => {
  const broadcasterLabel = getWatchButtonLabel(item.countryCode, item.broadcaster);
  const languages = item.commentaryLanguages?.length
    ? item.commentaryLanguages.join(", ")
    : "Official coverage";

  return (
    <div
      key={`${item.countryCode}-${item.broadcaster}-${item.access}-${options?.featured ? "featured" : "card"}`}
      className={options?.featured ? "premiumBroadcastCard featured" : "premiumBroadcastCard"}
      style={{
        position: "relative",
        overflow: "hidden",
minHeight: "unset",
        background: options?.featured
          ? "radial-gradient(circle at 0% 0%, rgba(59,130,246,0.26), transparent 44%), linear-gradient(180deg, rgba(15,32,62,0.98), rgba(8,17,34,0.98))"
          : "linear-gradient(180deg, rgba(17,30,52,0.96), rgba(12,22,39,0.98))",
        border: options?.featured
          ? "1px solid rgba(59,130,246,0.72)"
          : item.access === "Free"
            ? "1px solid rgba(34,197,94,0.18)"
            : "1px solid rgba(245,158,11,0.20)",
        borderRadius: "16px",
padding: "0.34rem 0.56rem",
        boxShadow: options?.featured
          ? "0 24px 56px rgba(0,0,0,0.34), 0 0 34px rgba(59,130,246,0.14), inset 0 1px 0 rgba(255,255,255,0.08)"
          : "0 18px 38px rgba(0,0,0,0.24), inset 0 1px 0 rgba(255,255,255,0.05)",
      }}
    >

      <div
        className="premiumBroadcastCardInner"
        style={{
          position: "relative",
          zIndex: 1,
          display: "grid",
          gap: "0.18rem",
        }}
      >
        <div
          className="premiumBroadcastTopRow"
          style={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            gap: "0.55rem",
          }}
        >
          <div className="premiumBroadcastMain" style={{ minWidth: 0, flex: "1 1 auto" }}>
            <div
              className="premiumBroadcastCountryLine"
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.35rem",
                color: "#94A3B8",
                fontSize: "0.72rem",
                fontWeight: 800,
                marginBottom: "0.12rem",
              }}
            >
              <Image
                src={`/flags/${item.countryCode}.png`}
                alt={getCountryDisplayName(broadcasts, item.countryCode)}
                width={18}
                height={13}
                style={{ objectFit: "contain", borderRadius: "2px" }}
              />
              <span>{item.countryName}</span>
            </div>

            <div
              style={{
                fontSize: options?.featured ? "1.08rem" : "0.96rem",
                fontWeight: 950,
                color: "#FFFFFF",
                lineHeight: 1.15,
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
                maxWidth: "100%",
              }}
            >
              {item.broadcaster}
            </div>

            <div
              className="premiumBroadcastLanguage"
              style={{
                color: "#CBD5E1",
                fontSize: "0.76rem",
                marginTop: "0.08rem",
                lineHeight: 1.25,
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {languages}
            </div>
          </div>

          <div
            className="premiumBroadcastActions"
            style={{
              display: "grid",
              justifyItems: "end",
         gap: "0.14rem",
              flexShrink: 0,
            }}
          >
            <AccessBadge access={item.access} />

            <a
              href={item.affiliateUrl || item.url}
              target="_blank"
              rel="nofollow sponsored noopener noreferrer"
aria-label="Watch"
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "0.36rem",
height: "20px",
padding: "0 0.58rem",
                borderRadius: "10px",
                background: options?.featured
                  ? "linear-gradient(180deg, #3B82F6 0%, #1D4ED8 100%)"
                  : "linear-gradient(180deg, rgba(30,41,59,0.96), rgba(15,23,42,0.98))",
                border: options?.featured
                  ? "1px solid rgba(147,197,253,0.32)"
                  : "1px solid rgba(255,255,255,0.08)",
                color: "#FFFFFF",
                textDecoration: "none",
       fontSize: "0.70rem",
                fontWeight: 900,
                whiteSpace: "nowrap",
                boxShadow: options?.featured
                  ? "0 14px 26px rgba(29,78,216,0.32), inset 0 1px 0 rgba(255,255,255,0.18)"
                  : "inset 0 1px 0 rgba(255,255,255,0.08)",
              }}
            >
              Watch
              <span aria-hidden="true">→</span>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

const sportsEventSchema = {
  "@context": "https://schema.org",
  "@type": "SportsEvent",
  name: `${homeTeam} vs ${awayTeam}`,
  description: `Find where to watch ${homeTeam} vs ${awayTeam} legally worldwide. Compare official broadcasters, free and paid TV channels by country.`,

  image: [
    "https://watchtvsport.com/og-image.jpg",
  ],

  organizer: {
    "@type": "SportsOrganization",
    name: "FIFA",
  },

  performer: [
    {
      "@type": "SportsTeam",
      name: homeTeam,
    },
    {
      "@type": "SportsTeam",
      name: awayTeam,
    },
  ],

  startDate: safeMatch.matchDate,
  endDate: safeMatch.matchDate,
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
    price: "0",
    priceCurrency: "USD",
    validFrom: safeMatch.matchDate,
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
@media (min-width: 768px) {
  .premiumOptionsGrid {
    grid-template-columns: minmax(300px, 0.95fr) minmax(0, 1.65fr);
  }

  .premiumOtherFreeGrid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }

  .premiumPaidGrid {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }

  .premiumBroadcasterGrid {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }
}

@media (max-width: 767px) {

.heroBackgroundFlag {
  display: none !important;
}
  .matchHeroCard {
    --hero-card-padding: 0.82rem 0.62rem 0.75rem;
    --hero-grid-gap: 0px;
    --hero-grid-max-width: 100%;
    --hero-team-min-width: 86px;
    --hero-flag-size: 42px;
    --hero-team-font-size: 0.78rem;
    --hero-team-margin-bottom: 0.28rem;
    --hero-center-min-width: 78px;
    --hero-pill-padding: 0.22rem 0.42rem;
    --hero-pill-font-size: 0.62rem;
    --hero-pill-gap: 0.26rem;
    --hero-stage-gap: 0.42rem;
    --hero-vs-font-size: 13px;
    --hero-vs-gap: 0.25rem;
    --hero-meta-font-size: 0.65rem;
    --hero-stats-gap: 0.34rem;
    --hero-stats-font-size: 0.64rem;
    --hero-stats-margin-bottom: 0.1rem;
  }

  .matchHeroGrid {
    align-items: center !important;
  }

  .matchHeroStats {
    line-height: 1.15 !important;
    padding: 0.55rem 0.45rem !important;
  }

.premiumFiltersGrid,
.premiumOptionsGrid,
.premiumOtherFreeGrid,
.premiumPaidGrid {
  grid-template-columns: minmax(0, 1fr) !important;
  width: 100% !important;
  max-width: 100% !important;
  box-sizing: border-box !important;
}
  .premiumFiltersGrid input,
.premiumFiltersGrid select {
  width: 100% !important;
  max-width: 100% !important;
  box-sizing: border-box !important;
  min-width: 0 !important;
}

  .premiumBroadcasterGrid {
    grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
    gap: 0.55rem !important;
  }

  .premiumSectionHeader {
    align-items: flex-start !important;
    flex-direction: column !important;
    gap: 0.35rem !important;
  }

  .premiumBroadcastCard {
    min-height: auto !important;
  }

  .premiumFilterChipWrap {
    flex-wrap: nowrap !important;
    overflow-x: auto !important;
    padding-bottom: 0.15rem !important;
    scrollbar-width: none !important;
  }

  .premiumFilterChipWrap::-webkit-scrollbar {
    display: none !important;
  }

  .premiumFiltersGrid {
    gap: 0.38rem !important;
    margin-bottom: 0.65rem !important;
    padding: 0.5rem !important;
    border-radius: 14px !important;
  }

  .premiumFiltersGrid > div,
.premiumFiltersGrid > label {
  gap: 0.18rem !important;
}

.premiumFiltersGrid a,
.premiumFiltersGrid button,
.premiumFiltersGrid input,
.premiumFiltersGrid select {
  min-height: 22px !important;
  height: 22px !important;
  padding-top: 0 !important;
  padding-bottom: 0 !important;
.premiumFiltersGrid input,
.premiumFiltersGrid select {
  font-size: 0.90rem !important;
}
  border-radius: 8px !important;
}
.premiumFiltersGrid select,
.premiumFiltersGrid select option {
  font-size: 1rem !important;
}
.premiumFilterChipWrap {
  display: flex !important;
  justify-content: space-between !important;
  gap: 0 !important;
  overflow-x: visible !important;
}

.premiumFilterChipWrap a {
  flex: 0 0 28% !important;
  max-width: 28% !important;
  min-width: 0 !important;
  height: 22px !important;
  min-height: 22px !important;
  padding-left: 0 !important;
  padding-right: 0 !important;
}

.premiumFiltersGrid a {
  display: inline-flex !important;
  align-items: center !important;
  justify-content: center !important;
}

  .premiumFiltersGrid input,
  .premiumFiltersGrid select {
    padding-left: 0.58rem !important;
    padding-right: 0.58rem !important;
  }

  .premiumFiltersGrid button {
    padding-left: 0.72rem !important;
    padding-right: 0.72rem !important;
  }

  .premiumBroadcastCard {
    padding: 0.34rem 0.46rem !important;
    border-radius: 14px !important;
    min-height: 0 !important;
  }

  .premiumBroadcastCardInner {
    gap: 0 !important;
  }

  .premiumBroadcastTopRow {
    align-items: stretch !important;
    gap: 0.38rem !important;
  }

  .premiumBroadcastCountryLine {
    margin-bottom: 0.1rem !important;
    font-size: 0.66rem !important;
    line-height: 1 !important;
  }

  .premiumBroadcastLanguage {
    margin-top: 0.05rem !important;
    font-size: 0.7rem !important;
    line-height: 1.05 !important;
  }

  .premiumBroadcastActions {
    align-self: stretch !important;
    display: flex !important;
    flex-direction: column !important;
    justify-content: space-between !important;
    align-items: flex-end !important;
    gap: 0.12rem !important;
  }

  .premiumBroadcastActions > span {
    transform: translateY(0) !important;
  }

.premiumBroadcastActions a {
    height: 18px !important;
    min-height: 18px !important;
    padding-left: 0.46rem !important;
    padding-right: 0.46rem !important;
    font-size: 0.68rem !important;
    border-radius: 8px !important;
  }

  #watch-by-country {
    margin-top: 0.35rem !important;
    margin-bottom: 0.32rem !important;
  }

  #watch-by-country + .watchByCountryChips {
    gap: 0.35rem !important;
    margin-bottom: 0.35rem !important;
  }

  #watch-by-country + .watchByCountryChips a {
    padding: 0.38rem 0.62rem !important;
    font-size: 0.78rem !important;
    line-height: 1 !important;
  }

  .matchUpdateNotice {
    --match-update-margin-top: 0.65rem;
    --match-update-margin-bottom: 0.95rem;
    --match-update-padding: 0.62rem 0.7rem;
    --match-update-radius: 12px;
    --match-update-gap: 0.55rem;
    --match-update-icon-size: 18px;
    --match-update-icon-font-size: 0.68rem;
    --match-update-text-size: 0.76rem;
    --match-update-subtext-size: 0.72rem;
    --match-update-line-height: 1.45;
  }
}
  
`,
        }}
      />

      <div
        style={{
          maxWidth: "1180px",
          margin: "0 auto",
        }}
      >
        <div
          className="matchHeroCard"
          style={{
            position: "relative",
            overflow: "hidden",
            background: `
              linear-gradient(180deg, rgba(4,10,24,0.20) 0%, rgba(4,10,24,0.78) 100%),
              radial-gradient(circle at 50% 15%, rgba(59,130,246,0.22), transparent 42%),
              url("/stadium-bg.jpg") center/cover no-repeat
            `,
            border: "1px solid rgba(59,130,246,0.28)",
            borderRadius: "18px",
            padding: "var(--hero-card-padding, 1rem 1rem 0.85rem)",
            marginBottom: "0.75rem",
            boxShadow:
              "0 24px 60px rgba(0,0,0,0.34), inset 0 1px 0 rgba(255,255,255,0.06)",
          }}
        >
          <div
            aria-hidden="true"
            style={{
              position: "absolute",
              inset: 0,
              background:
                "linear-gradient(90deg, rgba(11,18,32,0.76) 0%, rgba(11,18,32,0.10) 45%, rgba(11,18,32,0.76) 100%)",
              pointerEvents: "none",
            }}
          />
<Image
className="heroBackgroundFlag"
  aria-hidden="true"
  src={`/flags/${fifaCodeToIso2(safeMatch.homeTeam.code)}.png`}
  alt=""
  width={320}
  height={320}
style={{
  position: "absolute",
  left: "-35px",
  top: "-20px",
  width: "420px",
  height: "420px",
  borderRadius: "999px",
  objectFit: "cover",
  opacity: 0.10,
  filter: "blur(2px) saturate(1.18) brightness(1.05)",
  transform: "rotate(-10deg)",
  pointerEvents: "none",
  zIndex: 0,
}}
/>

<Image
className="heroBackgroundFlag"
  aria-hidden="true"
  src={`/flags/${fifaCodeToIso2(safeMatch.awayTeam.code)}.png`}
  alt=""
  width={320}
  height={320}
style={{
  position: "absolute",
  right: "-35px",
  top: "-20px",
  width: "420px",
  height: "420px",
  borderRadius: "999px",
  objectFit: "cover",
  opacity: 0.10,
  filter: "blur(2px) saturate(1.18) brightness(1.05)",
  transform: "rotate(10deg)",
  pointerEvents: "none",
  zIndex: 0,
}}
/>
          <div
            className="matchHeroGrid"
            style={{
              position: "relative",
              zIndex: 1,
              display: "grid",
              gridTemplateColumns: "1fr auto 1fr",
              alignItems: "center",
              gap: "var(--hero-grid-gap, 4px)",
              marginBottom: "0.72rem",
              maxWidth: "var(--hero-grid-max-width, 640px)",
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
                  fontWeight: 900,
                  lineHeight: 1.15,
                  textAlign: "center",
                  color: "#FFFFFF",
                  marginBottom: "var(--hero-team-margin-bottom, 0.75rem)",
                  textShadow: "0 2px 14px rgba(0,0,0,0.45)",
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
  border: "1.5px solid rgba(255,255,255,0.25)",
  boxShadow: "0 4px 12px rgba(0,0,0,0.18)",
}}
              />
            </div>

            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                minWidth: "var(--hero-center-min-width, 138px)",
                textAlign: "center",
              }}
            >
              <span
                style={{
                  padding: "var(--hero-pill-padding, 0.32rem 0.68rem)",
                  borderRadius: "999px",
                  background: "rgba(59,130,246,0.20)",
                  color: "#DBEAFE",
                  border: "1px solid rgba(147,197,253,0.16)",
                  fontSize: "var(--hero-pill-font-size, 0.74rem)",
                  fontWeight: 900,
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
                  background: "rgba(255,255,255,0.07)",
                  color: "#CBD5E1",
                  fontSize: "var(--hero-pill-font-size, 0.72rem)",
                  fontWeight: 800,
                  lineHeight: 1,
                  marginBottom: "var(--hero-stage-gap, 0.72rem)",
                }}
              >
                {stageLabel}
              </span>

              <div
                style={{
                  fontSize: "var(--hero-vs-font-size, 24px)",
                  fontWeight: 1000,
                  color: "#BFDBFE",
                  letterSpacing: "0.08em",
                  textAlign: "center",
                  marginBottom: "var(--hero-vs-gap, 0.55rem)",
                  textShadow: "0 0 26px rgba(59,130,246,0.72)",
                }}
              >
                VS
              </div>

              <div
                style={{
                  color: "#CBD5E1",
                  fontSize: "var(--hero-meta-font-size, 0.8rem)",
                  lineHeight: 1.55,
                  textAlign: "center",
                  textShadow: "0 2px 12px rgba(0,0,0,0.55)",
                }}
              >
                <div>
                  <LocalTime date={safeMatch.matchDate} />{" "}
                  <span style={{ color: "#94A3B8", fontSize: "0.75rem" }}>
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
                  fontSize: "var(--hero-team-font-size, 0.95rem)",
                  fontWeight: 900,
                  lineHeight: 1.15,
                  textAlign: "center",
                  color: "#FFFFFF",
                  marginBottom: "var(--hero-team-margin-bottom, 0.35rem)",
                  textShadow: "0 2px 14px rgba(0,0,0,0.45)",
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
  border: "1.5px solid rgba(255,255,255,0.25)",
  boxShadow: "0 4px 12px rgba(0,0,0,0.18)",
}}
              />
            </div>
          </div>

          <div
            className="matchHeroStats"
            style={{
              position: "relative",
              zIndex: 1,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "var(--hero-stats-gap, 0.85rem)",
              flexWrap: "wrap",
              maxWidth: "620px",
              margin: "0 auto var(--hero-stats-margin-bottom, 0.2rem)",
              padding: "0.65rem 0.9rem",
              borderRadius: "999px",
              background: "rgba(15,23,42,0.68)",
              border: "1px solid rgba(255,255,255,0.08)",
              color: "#CBD5E1",
              fontSize: "var(--hero-stats-font-size, 0.78rem)",
              fontWeight: 800,
              lineHeight: 1,
              backdropFilter: "blur(10px)",
            }}
          >
            <div style={{ display: "inline-flex", alignItems: "center", gap: "0.35rem" }}>
              <span style={{ color: "#93C5FD", fontSize: "0.88rem" }}>⊚</span>
              <span>{countryCount} Countries</span>
            </div>

            <div style={{ display: "inline-flex", alignItems: "center", gap: "0.35rem" }}>
              <span style={{ color: "#22C55E", fontSize: "0.88rem" }}>▣</span>
              <span>{freeBroadcasts.length} Free</span>
            </div>

            <div style={{ display: "inline-flex", alignItems: "center", gap: "0.35rem" }}>
              <span style={{ color: "#F59E0B", fontSize: "0.88rem" }}>▣</span>
              <span>{paidBroadcasts.length} Paid</span>
            </div>

            <Link
              href={`#watch-by-country`}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "0.25rem",
                color: "#60A5FA",
                textDecoration: "none",
                fontWeight: 900,
                whiteSpace: "nowrap",
              }}
            >
              View all countries
              <span style={{ fontSize: "0.9rem" }}>→</span>
            </Link>
          </div>
        </div>

        <div
          className="matchUpdateNotice"
          style={{
            marginTop: "0.65rem",
            marginBottom: "0.9rem",
            padding: "0.30rem 0.95rem",
            background: "linear-gradient(180deg, rgba(16, 248, 27, 0.69), rgba(13,25,45,0.94))",
            border: "1px solid rgba(18, 114, 23, 0.84)",
            borderRadius: "14px",
            color: "#E5E7EB",
            fontSize: "0.9rem",
            lineHeight: 1.4,
            display: "flex",
            alignItems: "center",
            gap: "0.65rem",
            boxShadow: "0 14px 34px rgba(0,0,0,0.20), inset 0 1px 0 rgba(255,255,255,0.05)",
          }}
        >

          <span>
            Official broadcaster links are verified before matchday; some match pages may appear only a few hours before kickoff.
          </span>
        </div>

        <form
          className="premiumFiltersGrid"
          action={`/match/${safeMatch.slug}`}
          style={{
            display: "grid",
            gridTemplateColumns: "0.95fr 1.25fr 1.25fr 1.45fr auto auto",
            gap: "0.75rem",
            alignItems: "end",
            marginBottom: "1rem",
            background:
              "linear-gradient(180deg, rgba(17,24,39,0.88), rgba(15,23,42,0.92))",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: "16px",
            padding: "0.75rem",
            boxShadow:
              "0 18px 42px rgba(0,0,0,0.18), inset 0 1px 0 rgba(255,255,255,0.04)",
          }}
        >
          <div style={{ display: "grid", gap: "0.48rem" }}>
            <div
              style={{
                color: "#CBD5E1",
                fontSize: "0.72rem",
                fontWeight: 900,
                textTransform: "uppercase",
                letterSpacing: "0.04em",
              }}
            >
              Access
            </div>

            <div
              style={{
               display: "flex",
gap: "0.4rem",
alignItems: "center",
              }}
            >
              {[
                { value: "all", label: "All" },
                { value: "free", label: "Free" },
                { value: "paid", label: "Paid" },
              ].map((filter) => {
                const isActive =
                  filter.value === "all"
                    ? selectedAccess.length === 0
                    : selectedAccess.includes(filter.value);

                return (
                  <Link
                    key={filter.value}
                    href={buildFilterHref({
                      slug: safeMatch.slug,
                      access: filter.value === "all" ? [] : [filter.value],
                      countries: selectedCountries,
                      languages: selectedLanguages,
                      search: selectedSearch,
                    })}
                    style={{
                      textDecoration: "none",
                      textAlign: "center",
height: "40px",
minHeight: "40px",
padding: "0 0.68rem",
display: "inline-flex",
alignItems: "center",
justifyContent: "center",
                      borderRadius: "10px",
                      background: isActive
                        ? filter.value === "free"
                          ? "rgba(34,197,94,0.18)"
                          : filter.value === "paid"
                            ? "rgba(245,158,11,0.18)"
                            : "linear-gradient(180deg, #3B82F6, #1D4ED8)"
                        : "rgba(15,23,42,0.74)",
                      border: isActive
                        ? filter.value === "free"
                          ? "1px solid rgba(34,197,94,0.44)"
                          : filter.value === "paid"
                            ? "1px solid rgba(245,158,11,0.44)"
                            : "1px solid rgba(147,197,253,0.32)"
                        : "1px solid rgba(255,255,255,0.08)",
                      color: isActive
                        ? filter.value === "free"
                          ? "#4ADE80"
                          : filter.value === "paid"
                            ? "#FBBF24"
                            : "#FFFFFF"
                        : "#CBD5E1",
                      fontSize: "0.78rem",
                      fontWeight: 900,
                      lineHeight: 1,
                      whiteSpace: "nowrap",
                      boxShadow:
                        isActive && filter.value === "all"
                          ? "0 10px 22px rgba(29,78,216,0.26)"
                          : "none",
                    }}
                  >
                    {filter.label}
                  </Link>
                );
              })}
            </div>
          </div>

          <label style={{ display: "grid", gap: "0.48rem", minWidth: 0 }}>
            <span
              style={{
                color: "#CBD5E1",
                fontSize: "0.72rem",
                fontWeight: 900,
                textTransform: "uppercase",
                letterSpacing: "0.04em",
              }}
            >
              Country
            </span>
            <select
              name="countries"
              defaultValue={selectedCountries[0] || "all"}
              style={{
                width: "100%",
                minHeight: "40px",
                borderRadius: "10px",
                background: "rgba(15,23,42,0.86)",
                border: "1px solid rgba(255,255,255,0.10)",
                color: "#E5E7EB",
                padding: "0 0.72rem",
                fontSize: "0.82rem",
                fontWeight: 850,
                outline: "none",
              }}
            >
              <option value="all">All countries</option>
              {uniqueCountries.map((country) => (
                <option key={`country-select-${country.countryCode}`} value={country.countryCode}>
                  {country.countryName}
                </option>
              ))}
            </select>
          </label>

          <label style={{ display: "grid", gap: "0.48rem", minWidth: 0 }}>
            <span
              style={{
                color: "#CBD5E1",
                fontSize: "0.72rem",
                fontWeight: 900,
                textTransform: "uppercase",
                letterSpacing: "0.04em",
              }}
            >
              Language
            </span>
            <select
              name="languages"
              defaultValue={selectedLanguages[0] || "all"}
              style={{
                width: "100%",
                minHeight: "40px",
                borderRadius: "10px",
                background: "rgba(15,23,42,0.86)",
                border: "1px solid rgba(255,255,255,0.10)",
                color: "#E5E7EB",
                padding: "0 0.72rem",
                fontSize: "0.82rem",
                fontWeight: 850,
                outline: "none",
              }}
            >
              <option value="all">All languages</option>
              {availableLanguages.map((lang) => (
                <option key={`language-select-${lang}`} value={lang}>
                  {lang}
                </option>
              ))}
            </select>
          </label>

          <label style={{ display: "grid", gap: "0.48rem", minWidth: 0 }}>
            <span
              style={{
                color: "#CBD5E1",
                fontSize: "0.72rem",
                fontWeight: 900,
                textTransform: "uppercase",
                letterSpacing: "0.04em",
              }}
            >
              Search
            </span>
            <input
              name="search"
              defaultValue={selectedSearch}
              placeholder="Search broadcaster..."
              style={{
                width: "100%",
                minHeight: "40px",
                borderRadius: "10px",
                background: "rgba(15,23,42,0.86)",
                border: "1px solid rgba(255,255,255,0.10)",
                color: "#E5E7EB",
                padding: "0 0.72rem",
                fontSize: "0.82rem",
                fontWeight: 800,
                outline: "none",
              }}
            />
          </label>

          <button
            type="submit"
            style={{
              minHeight: "40px",
              borderRadius: "10px",
              background: "linear-gradient(180deg, #3B82F6, #1D4ED8)",
              border: "1px solid rgba(147,197,253,0.32)",
              color: "#FFFFFF",
              padding: "0 0.95rem",
              fontSize: "0.78rem",
              fontWeight: 950,
              cursor: "pointer",
              whiteSpace: "nowrap",
              boxShadow: "0 12px 24px rgba(29,78,216,0.28)",
            }}
          >
            Apply
          </button>

          {hasActiveFilters ? (
            <Link
              href={`/match/${safeMatch.slug}`}
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                minHeight: "40px",
                textDecoration: "none",
                padding: "0 0.82rem",
                borderRadius: "10px",
                background: "rgba(255,255,255,0.06)",
                border: "1px solid rgba(255,255,255,0.08)",
                color: "#CBD5E1",
                fontSize: "0.76rem",
                fontWeight: 900,
                lineHeight: 1,
                whiteSpace: "nowrap",
              }}
            >
              Reset
            </Link>
          ) : null}
        </form>
<div
  style={{
    marginBottom: "1rem",
    borderRadius: "16px",
    overflow: "hidden",
    border: "1px solid rgba(255,255,255,0.08)",
    boxShadow:
      "0 18px 42px rgba(0,0,0,0.18), inset 0 1px 0 rgba(255,255,255,0.04)",
  }}
>
  <div
    style={{
      padding: "0.45rem 0.85rem",
      background: "rgba(15,23,42,0.95)",
      color: "#94A3B8",
      fontSize: "0.72rem",
      fontWeight: 900,
      textTransform: "uppercase",
      letterSpacing: "0.06em",
    }}
  >
    Official Partner • Privacy & Security
  </div>

  <a
    href="https://go.nordvpn.net/aff_c?offer_id=15&aff_id=149235&url_id=902"
    target="_blank"
    rel="sponsored noopener noreferrer"
    style={{
      display: "block",
      textDecoration: "none",
    }}
  >
    <Image
      src="/nordvpn-banner.png"
      alt="NordVPN"
      width={970}
      height={250}
      style={{
        width: "100%",
        height: "auto",
        display: "block",
      }}
    />
  </a>

  <div
    style={{
      padding: "0.75rem 0.95rem",
      background: "rgba(15,23,42,0.95)",
      color: "#CBD5E1",
      fontSize: "0.82rem",
      lineHeight: 1.5,
      borderTop: "1px solid rgba(255,255,255,0.08)",
    }}
  >
Privacy and security for sports fans on the move.
  </div>
</div>
        <div
          style={{
            marginBottom: "1rem",
            padding: "0.9rem",
            borderRadius: "16px",
            background: "linear-gradient(180deg, rgba(17,24,39,0.90), rgba(15,23,42,0.96))",
            border: "1px solid rgba(255,255,255,0.08)",
            boxShadow: "0 18px 42px rgba(0,0,0,0.18), inset 0 1px 0 rgba(255,255,255,0.04)",
          }}
        >
          <div className="premiumSectionHeader" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "0.75rem", marginBottom: "0.85rem" }}>
            <h2
              style={{
                margin: 0,
                color: "#FFFFFF",
                fontSize: "1.05rem",
                lineHeight: 1.1,
                fontWeight: 1000,
                textTransform: "uppercase",
                letterSpacing: "0.02em",
              }}
            >
              All broadcasters by country
            </h2>
            <div style={{ color: "#94A3B8", fontSize: "0.8rem", fontWeight: 700 }}>
              {sortedBroadcasts.length} option{sortedBroadcasts.length > 1 ? "s" : ""} shown
            </div>
          </div>

          <div className="premiumBroadcasterGrid" style={{ display: "grid", gap: "0.75rem" }}>
            {sortedBroadcasts.length > 0 ? (
              sortedBroadcasts.map((item) => renderPremiumBroadcasterCard(item, { compact: true }))
            ) : (
              <div
                style={{
                  gridColumn: "1 / -1",
                  background:
                    "linear-gradient(180deg, rgba(15,23,42,0.92), rgba(11,18,32,0.96))",
                  border: "1px solid rgba(96,165,250,0.18)",
                  borderRadius: "16px",
                  padding: "1rem",
                  color: "#CBD5E1",
                  fontSize: "0.92rem",
                  lineHeight: 1.5,
                }}
              >
                No official broadcaster currently matches these filters.
                Broadcast details are reviewed and updated regularly before matchday, so additional legal viewing options may appear later.
              </div>
            )}
          </div>
        </div>

      <div id="watch-by-country">
  <SectionTitle>Watch this match by country</SectionTitle>
</div>

        <div
          className="watchByCountryChips"
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
        <div
  style={{
    marginTop: "1rem",
    display: "flex",
    justifyContent: "center",
  }}
>
  <a
    href="https://x.com/watchtvsport"
    target="_blank"
    rel="noopener noreferrer"
    style={{
      display: "inline-flex",
      alignItems: "center",
      gap: "0.55rem",
      color: "#FFFFFF",
      textDecoration: "none",
      fontWeight: 700,
      padding: "0.65rem 1rem",
      borderRadius: "999px",
      background: "rgba(255,255,255,0.05)",
      border: "1px solid rgba(255,255,255,0.10)",
    }}
  >
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M18.901 1H22.58L14.54 10.188L24 23H16.594L10.793 15.227L3.98 23H.299L8.898 13.182L0 1H7.594L12.838 8.097L18.901 1Z" />
    </svg>

    Follow WatchTVSport on X
  </a>
</div>
      </div>
    </main>
  );
}