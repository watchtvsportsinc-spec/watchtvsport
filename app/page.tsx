"use client";
import { usePathname } from "next/navigation";
import { getDictionary } from "@/lib/i18n";
import Link from "next/link";
import { useMemo, useState } from "react";
import {
  getHomepageStats,
  getTeamName,
  formatStage,
} from "@/lib/utils";
import { matches } from "@/lib/matches";
import { SectionTitle } from "@/components/ui";
import MatchStatusBadge from "@/components/MatchStatusBadge";
import { isMatchFinished } from "@/lib/match-status";

function getDayLabel(dateString?: string) {
  if (!dateString) return "Date TBC";

  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return "Date TBC";

  return new Intl.DateTimeFormat("en-CA", {
    weekday: "short",
    day: "numeric",
    month: "short",
    timeZone: "America/Toronto",
  }).format(date);
}

function getDayKey(dateString?: string) {
  if (!dateString) return "date-tbc";

  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return "date-tbc";

  return new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone: "America/Toronto",
  }).format(date);
}

function getTodayDayKey() {
  return new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone: "America/Toronto",
  }).format(new Date());
}

function getTimeLabel(dateString?: string) {
  if (!dateString) return "--:--";

  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return "--:--";

  return new Intl.DateTimeFormat("en-CA", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "America/Toronto",
  }).format(date);
}

function startsWithQuery(teamName: string, query: string) {
  return teamName.toLowerCase().startsWith(query.toLowerCase());
}

function getTeamFlagCode(teamName: string) {
  const map: Record<string, string> = {
    Algeria: "dz",
    Argentina: "ar",
    Australia: "au",
    Austria: "at",
    Belgium: "be",
    "Bosnia and Herzegovina": "ba",
    Brazil: "br",
    "Cabo Verde": "cv",
    Canada: "ca",
    Colombia: "co",
    "Congo DR": "cd",
    "Côte d'Ivoire": "ci",
    Croatia: "hr",
    Curaçao: "cw",
    Czechia: "cz",
    Ecuador: "ec",
    Egypt: "eg",
    England: "gb",
    France: "fr",
    Germany: "de",
    Ghana: "gh",
    Haiti: "ht",
    "IR Iran": "ir",
    Iraq: "iq",
    Japan: "jp",
    Jordan: "jo",
    "Korea Republic": "kr",
    Mexico: "mx",
    Morocco: "ma",
    Netherlands: "nl",
    "New Zealand": "nz",
    Norway: "no",
    Panama: "pa",
    Paraguay: "py",
    Portugal: "pt",
    Qatar: "qa",
    "Saudi Arabia": "sa",
    Scotland: "gb",
    Senegal: "sn",
    "South Africa": "za",
    Spain: "es",
    Sweden: "se",
    Switzerland: "ch",
    Tunisia: "tn",
    Türkiye: "tr",
    Uruguay: "uy",
    USA: "us",
    Uzbekistan: "uz",
  };

  return map[teamName] || "";
}

export default function HomePage() {
  const stats = getHomepageStats();
  const [teamQuery, setTeamQuery] = useState("");

  const uniqueTeamNames = useMemo(() => {
    return Array.from(
      new Set(
        matches.flatMap((match) => [
          getTeamName(match.homeTeam),
          getTeamName(match.awayTeam),
        ])
      )
    ).sort((a, b) => a.localeCompare(b));
  }, []);

  const suggestedTeams = useMemo(() => {
    if (!teamQuery.trim()) return [];

    return uniqueTeamNames
      .filter((teamName) => startsWithQuery(teamName, teamQuery.trim()))
      .slice(0, 8);
  }, [teamQuery, uniqueTeamNames]);

  const todayDayKey = useMemo(() => getTodayDayKey(), []);

  const todayMatches = useMemo(() => {
    return [...matches]
      .filter((match) => getDayKey(match.matchDate) === todayDayKey)
      .sort((a, b) => {
        const aTime = a.matchDate ? new Date(a.matchDate).getTime() : Number.MAX_SAFE_INTEGER;
        const bTime = b.matchDate ? new Date(b.matchDate).getTime() : Number.MAX_SAFE_INTEGER;
        return aTime - bTime;
      });
  }, [todayDayKey]);

  const nextDayKey = useMemo(() => {
    const groupedMatches = matches.reduce<Record<string, typeof matches>>(
      (acc, match) => {
        const dayKey = getDayKey(match.matchDate);

        if (!acc[dayKey]) {
          acc[dayKey] = [];
        }

        acc[dayKey].push(match);

        return acc;
      },
      {}
    );

    const sortedDays = Object.keys(groupedMatches).sort();

    const nextActiveDay = sortedDays.find((dayKey) =>
      groupedMatches[dayKey].some((match) => !isMatchFinished(match.slug))
    );

    return nextActiveDay || null;
  }, []);

  const featuredMatches = useMemo(() => {
    if (todayMatches.length > 0 && todayMatches.some((match) => !isMatchFinished(match.slug))) {
      return todayMatches;
    }

    if (!nextDayKey) {
      return [];
    }

    return [...matches]
      .filter((match) => getDayKey(match.matchDate) === nextDayKey)
      .sort((a, b) => {
        const aTime = a.matchDate ? new Date(a.matchDate).getTime() : Number.MAX_SAFE_INTEGER;
        const bTime = b.matchDate ? new Date(b.matchDate).getTime() : Number.MAX_SAFE_INTEGER;
        return aTime - bTime;
      });
  }, [todayMatches, nextDayKey]);

  const featuredMatchesTitle = todayMatches.length > 0 && todayMatches.some((match) => !isMatchFinished(match.slug)) ? "Matches today" : "Next games";

  const sortedMatches = useMemo(() => {
    const normalizedTeamQuery = teamQuery.trim().toLowerCase();

    return [...matches]
      .filter((match) => {
        if (!normalizedTeamQuery) return true;

        const homeTeam = getTeamName(match.homeTeam);
        const awayTeam = getTeamName(match.awayTeam);

      
        return (
          startsWithQuery(homeTeam, normalizedTeamQuery) ||
          startsWithQuery(awayTeam, normalizedTeamQuery)
        );
      })
      .sort((a, b) => {
        const aTime = a.matchDate ? new Date(a.matchDate).getTime() : Number.MAX_SAFE_INTEGER;
        const bTime = b.matchDate ? new Date(b.matchDate).getTime() : Number.MAX_SAFE_INTEGER;
        return aTime - bTime;
      });
  }, [teamQuery]);

  return (
    <main
      style={{
        position: "relative",
        background:
          "radial-gradient(circle at top, rgba(59,130,246,0.10), transparent 30%), #0B1220",
        color: "#FFFFFF",
        minHeight: "100vh",
        padding: "1.25rem 1rem 2.5rem",
      }}
    >

      <style
        dangerouslySetInnerHTML={{
          __html: `
            .homepageTeamShort {
              display: none;
            }

@media (max-width: 767px) {

  .homepageMatchRow {
    grid-template-columns: 76px minmax(0, 1fr) 70px !important;
    gap: 0.25rem !important;
    padding: 0.22rem 0.42rem !important;
  }

  .homepageHeroTitle {
    font-size: 1.55rem !important;
    line-height: 1.08 !important;
  }

  .homepageMatchTime {
    min-width: auto !important;
    font-size: 0.70rem !important;
  }

  .homepageTeamName {
    gap: 0.20rem !important;
    font-size: 0.68rem !important;
    line-height: 1 !important;
  }

  .homepageTeamFull {
    display: none !important;
  }

  .homepageTeamShort {
    display: inline !important;
  }

  .homepageVsPill {
    font-size: 0.52rem !important;
    padding: 0.08rem 0.24rem !important;
  }

  .homepageStageText {
    font-size: 0.58rem !important;
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
          style={{
            display: "flex",
            gap: "0.5rem",
            flexWrap: "wrap",
            justifyContent: "center",
            alignItems: "center",
            width: "fit-content",
            margin: "0 auto 0.8rem",
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
            Official broadcasters only
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
            FIFA World Cup 2026
          </span>
        </div>

<h1
  className="homepageHeroTitle"
  style={{
            fontSize: "2rem",
            lineHeight: 1.05,
            margin: "0 auto",
            marginBottom: "0.55rem",
            maxWidth: "900px",
            letterSpacing: "-0.02em",
            textAlign: "center",
          }}
        >
          Official FIFA World Cup 2026 TV channels & broadcasters
        </h1>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
            gap: "0.5rem",
            marginBottom: "0.8rem",
          }}
        >
          {[
            { value: stats.totalMatches, label: "Matches" },
            { value: stats.totalCountries, label: "Countries" },
            { value: stats.freeOptions, label: "Free" },
            { value: stats.paidOptions, label: "Paid" },
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

        <div
          id="team-finder"
          style={{
            background: "#111827",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: "18px",
            padding: "0.75rem",
            marginBottom: "0.8rem",
          }}
        >
          <div
            style={{
              fontWeight: 800,
              fontSize: "0.92rem",
              marginBottom: "0.35rem",
            }}
          >
            Find your team
          </div>

                   <div
            style={{
              display: "flex",
              gap: "0.6rem",
              flexWrap: "wrap",
              alignItems: "flex-start",
            }}
          >
            <div
              style={{
                flex: "1 1 260px",
                minWidth: "220px",
              }}
            >
              <input
                type="text"
                value={teamQuery}
                onChange={(event) => setTeamQuery(event.target.value)}
                placeholder="Search a team: France, Brazil, Mexico..."
                aria-label="Search a team"
                autoComplete="new-password"
                name="team-search"
                style={{
                  width: "100%",
                  boxSizing: "border-box",
                  background: "#0F172A",
                  color: "#FFFFFF",
                  border: "1px solid rgba(255,255,255,0.10)",
                  borderRadius: "10px",
                 padding: "0.62rem 0.85rem",
                  fontSize: "0.90rem",
                  outline: "none",
                }}
              />

              {suggestedTeams.length > 0 ? (
                <div
                  style={{
                    marginTop: "0.45rem",
                    display: "flex",
                    flexWrap: "wrap",
                    gap: "0.45rem",
                  }}
                >
                  {suggestedTeams.map((teamName) => (
                    <button
                      key={teamName}
                      type="button"
                      onClick={() => setTeamQuery(teamName)}
                      style={{
                        cursor: "pointer",
                        color: "#FFFFFF",
                        background: "rgba(59,130,246,0.14)",
                        border: "1px solid rgba(59,130,246,0.30)",
                        borderRadius: "999px",
                        padding: "0.45rem 0.7rem",
                        fontSize: "0.85rem",
                        lineHeight: 1,
                        fontWeight: 600,
                      }}
                    >
                      {teamName}
                    </button>
                  ))}
                </div>
              ) : null}
            </div>

            <button
              type="button"
              style={{
                border: "none",
                cursor: "pointer",
                textDecoration: "none",
                color: "#FFFFFF",
                background: "#3B82F6",
                fontWeight: 700,
                padding: "0.8rem 1rem",
                borderRadius: "12px",
                fontSize: "0.92rem",
                lineHeight: 1,
              }}
            >
              Search
            </button>

            {teamQuery ? (
              <button
                type="button"
                onClick={() => setTeamQuery("")}
                style={{
                  cursor: "pointer",
                  color: "#CBD5E1",
                  fontWeight: 600,
                  padding: "0.8rem 1rem",
                  borderRadius: "12px",
                  border: "1px solid rgba(255,255,255,0.10)",
                  background: "rgba(255,255,255,0.03)",
                  fontSize: "0.92rem",
                  lineHeight: 1,
                }}
              >
                Clear
              </button>
            ) : null}
          </div>

          {teamQuery ? (
            <div
              style={{
                marginTop: "0.7rem",
                color: "#94A3B8",
                fontSize: "0.84rem",
              }}
            >
              {sortedMatches.length} match{sortedMatches.length > 1 ? "es" : ""} found for{" "}
              <span style={{ color: "#FFFFFF", fontWeight: 700 }}>{teamQuery}</span>
            </div>
          ) : null}
        </div>

        <SectionTitle>{featuredMatchesTitle}</SectionTitle>

        <section
          style={{
background: "linear-gradient(180deg, #1E3A8A 0%, #0F172A 100%)",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: "18px",
            padding: "1.1rem",
            boxShadow: "0 18px 40px rgba(0,0,0,0.22)",
            textAlign: "center",
            marginBottom: "0.8rem",
          }}
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "92px 1fr 92px",
              gap: "0.45rem",
              padding: "0.48rem 0.75rem",
              borderBottom: "1px solid rgba(255,255,255,0.08)",
              background: "rgba(255,255,255,0.03)",
              color: "#94A3B8",
              fontSize: "0.62rem",
              fontWeight: 800,
              textTransform: "uppercase",
              letterSpacing: "0.08em",
            }}
          >
            <div style={{ textAlign: "center" }}>Time</div>
            <div>Match</div>
            <div style={{ textAlign: "right" }}>Stage</div>
          </div>

          <div>
            {featuredMatches.length > 0 ? (
              featuredMatches.map((match, index) => {
                const stageLabel = formatStage(match.group);
                const currentDayKey = getDayKey(match.matchDate);
                const previousDayKey =
                  index > 0 ? getDayKey(featuredMatches[index - 1].matchDate) : null;
                const isNewDay = index === 0 || currentDayKey !== previousDayKey;

                return (
                  <div key={match.slug}>
                    {isNewDay ? (
                      <div
                        style={{
                          padding: index === 0 ? "0.38rem 0.65rem 0.15rem" : "0.5rem 0.65rem 0.15rem",
                          background: "rgba(255,255,255,0.015)",
                        }}
                      >
                        <span
                          style={{
                            textAlign: "center",
                            color: "#000205",
                            fontSize: "0.84rem",
                            fontWeight: 800,
                            letterSpacing: "0.04em",
                            background: "rgba(255, 255, 255, 0.64)",
                            border: "1px solid rgba(59,130,246,0.35)",
                            borderRadius: "8px",
                            padding: "0.2rem 0.36rem",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          {getDayLabel(match.matchDate)}
                        </span>
                      </div>
                    ) : null}

                    <Link
                      href={`/match/${match.slug}`}
                      className="homepageMatchRow"
                      style={{
                        display: "grid",
                        gridTemplateColumns: "92px 1fr 92px",
                        gap: "0.45rem",
                        alignItems: "center",
                        padding: "0.22rem 0.65rem",
                        textDecoration: "none",
                        color: "#FFFFFF",
                        borderTop: isNewDay ? "1px solid rgba(255,255,255,0.04)" : "none",
                        borderRight: "1px solid rgba(255,255,255,0.04)",
                        borderBottom: "1px solid rgba(255,255,255,0.04)",
                        borderLeft: "1px solid rgba(255,255,255,0.04)",
                        background: "rgba(255,255,255,0.01)",
                        minHeight: "28px",
                      }}
                    >
                      <div style={{ textAlign: "center" }}>
                        <div
                          className="homepageMatchTime"
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            justifyContent: "center",
                            minWidth: "64px",
                            padding: "0.05rem 0",
                            color: "#BFDBFE",
                            fontWeight: 800,
                            fontSize: "0.78rem",
                            lineHeight: 1,
                            whiteSpace: "nowrap",
                          }}
                        >
                      
<span
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                justifyContent: "center",
                                gap: "0.3rem",
                                whiteSpace: "nowrap",
                              }}
                            >
                              <span>{getTimeLabel(match.matchDate)}</span>

                              <span
                                style={{
                                  transform: "scale(0.68)",
                                  transformOrigin: "left center",
                                  display: "inline-flex",
                                  marginLeft: "-0.12rem",
                                }}
                              >
                                <MatchStatusBadge matchDate={match.matchDate} slug={match.slug} />
                              </span>
                            </span>
                        
                        </div>
                      </div>

                      <div
                        style={{
                          minWidth: 0,
                          display: "grid",
                          gridTemplateColumns: "1fr auto 1fr",
                          alignItems: "center",
                          columnGap: "0.5rem",
                          width: "100%",
                        }}
                      >
                        <span
                          className="homepageTeamName"
                          style={{
                            fontWeight: 700,
                            fontSize: "0.92rem",
                            lineHeight: 1.05,
                            color: "#FFFFFF",
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            display: "inline-flex",
                            alignItems: "center",
                            justifyContent: "flex-end",
                            gap: "0.45rem",
                            minWidth: 0,
                            width: "100%",
                          }}
                        >
                          {getTeamFlagCode(getTeamName(match.homeTeam)) ? (
                            <img
                              src={`/flags/${getTeamFlagCode(getTeamName(match.homeTeam))}.png`}
                              alt=""
                              style={{
                                width: "20px",
                                height: "20px",
                                borderRadius: "999px",
                                objectFit: "cover",
                                display: "block",
                                flexShrink: 0,
                              }}
                            />
                          ) : null}
                          <span
                            style={{
                              whiteSpace: "nowrap",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                            }}
                          >
                            <span className="homepageTeamFull">{getTeamName(match.homeTeam)}</span>
                            <span className="homepageTeamShort">{getTeamName(match.homeTeam).slice(0, 2).toUpperCase()}</span>
                          </span>
                        </span>

                        <span
                          className="homepageVsPill"
                          style={{
                            padding: "0.14rem 0.34rem",
                            borderRadius: "999px",
                            background: "rgba(255,255,255,0.06)",
                            border: "1px solid rgba(255,255,255,0.08)",
                            color: "#CBD5E1",
                            fontSize: "0.58rem",
                            fontWeight: 800,
                            lineHeight: 1,
                            letterSpacing: "0.04em",
                            flexShrink: 0,
                          }}
                        >
                          VS
                        </span>

                        <span
                          className="homepageTeamName"
                          style={{
                            fontWeight: 700,
                            fontSize: "0.92rem",
                            lineHeight: 1.05,
                            color: "#FFFFFF",
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            display: "inline-flex",
                            alignItems: "center",
                            justifyContent: "flex-start",
                            gap: "0.45rem",
                            minWidth: 0,
                            width: "100%",
                          }}
                        >
                          <span
                            style={{
                              whiteSpace: "nowrap",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                            }}
                          >
                            <span className="homepageTeamFull">{getTeamName(match.awayTeam)}</span>
                            <span className="homepageTeamShort">{getTeamName(match.awayTeam).slice(0, 2).toUpperCase()}</span>
                          </span>
                          {getTeamFlagCode(getTeamName(match.awayTeam)) ? (
                            <img
                              src={`/flags/${getTeamFlagCode(getTeamName(match.awayTeam))}.png`}
                              alt=""
                              style={{
                                width: "20px",
                                height: "20px",
                                borderRadius: "999px",
                                objectFit: "cover",
                                display: "block",
                                flexShrink: 0,
                              }}
                            />
                          ) : null}
                        </span>
                      </div>

                      <div
                        style={{
                          display: "flex",
                          justifyContent: "flex-end",
                        }}
                      >
                        <span
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            justifyContent: "center",
                            padding: "0.12rem 0.34rem",
                            borderRadius: "999px",
                            background: "rgba(255,255,255,0.04)",
                            border: "1px solid rgba(255,255,255,0.08)",
                            color: "#94A3B8",
                            fontSize: "0.56rem",
                            fontWeight: 700,
                            whiteSpace: "nowrap",
                            lineHeight: 1,
                          }}
                        >
                          {stageLabel}
                        </span>
                      </div>
                    </Link>
                  </div>
                );
              })
            ) : (
              <div
                style={{
                  padding: "1.1rem 0.75rem 0.4rem",
                  color: "#CBD5E1",
                  fontSize: "0.92rem",
                  lineHeight: 1.6,
                }}
              >
                No upcoming matches scheduled.
              </div>
            )}
          </div>
        </section>

        <SectionTitle>All scheduled matches</SectionTitle>

        <section
          style={{
            background: "linear-gradient(180deg, #111827 0%, #0F172A 100%)",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: "18px",
            padding: "1.1rem",
            boxShadow: "0 18px 40px rgba(0,0,0,0.22)",
            textAlign: "center",
          }}
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "92px 1fr 92px",
              gap: "0.45rem",
              padding: "0.48rem 0.75rem",
              borderBottom: "1px solid rgba(255,255,255,0.08)",
              background: "rgba(255,255,255,0.03)",
              color: "#94A3B8",
              fontSize: "0.62rem",
              fontWeight: 800,
              textTransform: "uppercase",
              letterSpacing: "0.08em",
            }}
          >
            <div style={{ textAlign: "center" }}>Time</div>
            <div>Match</div>
            <div style={{ textAlign: "right" }}>Stage</div>
          </div>

          <div>
            {sortedMatches.length > 0 ? (
              sortedMatches.map((match, index) => {
                const currentDayKey = getDayKey(match.matchDate);
                const previousDayKey =
                  index > 0 ? getDayKey(sortedMatches[index - 1].matchDate) : null;
                const isNewDay = index === 0 || currentDayKey !== previousDayKey;
                const stageLabel = formatStage(match.group);

                return (
                  <div key={match.slug}>
                    {isNewDay ? (
                      <div
                        style={{
                          padding: index === 0 ? "0.38rem 0.65rem 0.15rem" : "0.5rem 0.65rem 0.15rem",
                          background: "rgba(255,255,255,0.015)",
                        }}
                      >
                        <span
                          style={{
                            textAlign: "center",
                            color: "#000205",
                            fontSize: "0.84rem",
                            fontWeight: 800,
                            letterSpacing: "0.04em",
                            background: "rgba(255, 255, 255, 0.64)",
                            border: "1px solid rgba(59,130,246,0.35)",
                            borderRadius: "8px",
                            padding: "0.2rem 0.36rem",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          {getDayLabel(match.matchDate)}
                        </span>
                      </div>
                    ) : null}

                    <Link
                      href={`/match/${match.slug}`}
                      className="homepageMatchRow"
                      style={{
                        display: "grid",
                        gridTemplateColumns: "92px 1fr 92px",
                        gap: "0.45rem",
                        alignItems: "center",
                        padding: "0.22rem 0.65rem",
                        textDecoration: "none",
                        color: "#FFFFFF",
                        borderTop: isNewDay ? "1px solid rgba(255,255,255,0.04)" : "none",
                        borderRight: "1px solid rgba(255,255,255,0.04)",
                        borderBottom: "1px solid rgba(255,255,255,0.04)",
                        borderLeft: "1px solid rgba(255,255,255,0.04)",
                        background: index % 2 === 0 ? "rgba(255,255,255,0.01)" : "transparent",
                        minHeight: "28px",
                      }}
                    >
                      <div style={{ textAlign: "center" }}>
                        <div
                          className="homepageMatchTime"
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            justifyContent: "center",
                            minWidth: "64px",
                            padding: "0.05rem 0",
                            color: "#BFDBFE",
                            fontWeight: 800,
                            fontSize: "0.78rem",
                            lineHeight: 1,
                            whiteSpace: "nowrap",
                          }}
                        >
                          
<span
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                justifyContent: "center",
                                gap: "0.3rem",
                                whiteSpace: "nowrap",
                              }}
                            >
                              <span>{getTimeLabel(match.matchDate)}</span>

                              <span
                                style={{
                                  transform: "scale(0.68)",
                                  transformOrigin: "left center",
                                  display: "inline-flex",
                                  marginLeft: "-0.12rem",
                                }}
                              >
                                <MatchStatusBadge matchDate={match.matchDate} slug={match.slug} />
                              </span>
                            </span>
                        
                        </div>
                      </div>

                      <div
                        style={{
                          minWidth: 0,
                          display: "grid",
                          gridTemplateColumns: "1fr auto 1fr",
                          alignItems: "center",
                          columnGap: "0.5rem",
                          width: "100%",
                        }}
                      >
                        <span
                          className="homepageTeamName"
                          style={{
                            fontWeight: 700,
                            fontSize: "0.92rem",
                            lineHeight: 1.05,
                            color: "#FFFFFF",
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            display: "inline-flex",
                            alignItems: "center",
                            justifyContent: "flex-end",
                            gap: "0.45rem",
                            minWidth: 0,
                            width: "100%",
                          }}
                        >
                          {getTeamFlagCode(getTeamName(match.homeTeam)) ? (
                            <img
                              src={`/flags/${getTeamFlagCode(getTeamName(match.homeTeam))}.png`}
                              alt=""
                              style={{
                                width: "20px",
                                height: "20px",
                                borderRadius: "999px",
                                objectFit: "cover",
                                display: "block",
                                flexShrink: 0,
                              }}
                            />
                          ) : null}
                          <span
                            style={{
                              whiteSpace: "nowrap",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                            }}
                          >
                            <span className="homepageTeamFull">{getTeamName(match.homeTeam)}</span>
                            <span className="homepageTeamShort">{getTeamName(match.homeTeam).slice(0, 2).toUpperCase()}</span>
                          </span>
                        </span>

                        <span
                          className="homepageVsPill"
                          style={{
                            padding: "0.14rem 0.34rem",
                            borderRadius: "999px",
                            background: "rgba(255,255,255,0.06)",
                            border: "1px solid rgba(255,255,255,0.08)",
                            color: "#CBD5E1",
                            fontSize: "0.58rem",
                            fontWeight: 800,
                            lineHeight: 1,
                            letterSpacing: "0.04em",
                            flexShrink: 0,
                          }}
                        >
                          VS
                        </span>

                        <span
                          className="homepageTeamName"
                          style={{
                            fontWeight: 700,
                            fontSize: "0.92rem",
                            lineHeight: 1.05,
                            color: "#FFFFFF",
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            display: "inline-flex",
                            alignItems: "center",
                            justifyContent: "flex-start",
                            gap: "0.45rem",
                            minWidth: 0,
                            width: "100%",
                          }}
                        >
                          <span
                            style={{
                              whiteSpace: "nowrap",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                            }}
                          >
                            <span className="homepageTeamFull">{getTeamName(match.awayTeam)}</span>
                            <span className="homepageTeamShort">{getTeamName(match.awayTeam).slice(0, 2).toUpperCase()}</span>
                          </span>
                          {getTeamFlagCode(getTeamName(match.awayTeam)) ? (
                            <img
                              src={`/flags/${getTeamFlagCode(getTeamName(match.awayTeam))}.png`}
                              alt=""
                              style={{
                                width: "20px",
                                height: "20px",
                                borderRadius: "999px",
                                objectFit: "cover",
                                display: "block",
                                flexShrink: 0,
                              }}
                            />
                          ) : null}
                        </span>
                      </div>

                      <div
                        style={{
                          display: "flex",
                          justifyContent: "flex-end",
                        }}
                      >
                        <span
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            justifyContent: "center",
                            padding: "0.12rem 0.34rem",
                            borderRadius: "999px",
                            background: "rgba(255,255,255,0.04)",
                            border: "1px solid rgba(255,255,255,0.08)",
                            color: "#94A3B8",
                            fontSize: "0.56rem",
                            fontWeight: 700,
                            whiteSpace: "nowrap",
                            lineHeight: 1,
                          }}
                        >
                          {stageLabel}
                        </span>
                      </div>
                    </Link>
                  </div>
                );
              })
            ) : (
              <div
                style={{
                  padding: "1.1rem 0.75rem 0.4rem",
                  color: "#CBD5E1",
                  fontSize: "0.92rem",
                  lineHeight: 1.6,
                }}
              >
                No matches found for <span style={{ fontWeight: 700 }}>{teamQuery}</span>.
              </div>
            )}
          </div>
        </section>

        <SectionTitle>How WatchTVSport works</SectionTitle>

        <div
          style={{
            display: "flex",
            gap: "0.5rem",
            flexWrap: "wrap",
            marginBottom: "0.8rem",
            justifyContent: "center",
            alignItems: "center",
            width: "100%",
            margin: "0 auto 0.8rem",
            maxWidth: "fit-content",
          }}
        >
          {[
            {
              title: "1. Pick a match",
              text: "Open a match page to compare official broadcasters and legal viewing options across countries.",
            },
            {
              title: "2. Check your country",
              text: "Open the dedicated country page to see local broadcasters and whether the match is free or paid.",
            },
            {
              title: "3. Use official links",
              text: "WatchTVSport only lists official broadcasters and legal viewing options. No illegal streams. No VPN recommendations.",
            },
          ].map((item) => (
            <div
              key={item.title}
              style={{
                background: "#111827",
                border: "1px solid rgba(255,255,255,0.08)",
                borderRadius: "14px",
                padding: "0.9rem",
              }}
            >
              <div style={{ fontWeight: 700, marginBottom: "0.35rem", fontSize: "0.95rem" }}>
                {item.title}
              </div>
              <div style={{ color: "#CBD5E1", lineHeight: 1.55, fontSize: "0.9rem" }}>
                {item.text}
              </div>
            </div>
          ))}
        </div>

        <SectionTitle>FAQ</SectionTitle>

        <div
          id="faq"
          style={{
            display: "grid",
            gap: "0.75rem",
          }}
        >
          {[
            {
              title: "What does WatchTVSport do?",
              text: "WatchTVSport helps users find where to watch football matches legally by country, with official broadcasters and free or paid viewing information.",
            },
            {
              title: "Does WatchTVSport list illegal streams?",
              text: "No. WatchTVSport only lists official broadcasters and legal viewing options by country.",
            },
            {
              title: "Can I compare countries?",
              text: "Yes. You can browse country pages and match pages to compare official viewing options across multiple markets.",
            },
          ].map((item) => (
            <div
              key={item.title}
              style={{
                background: "#111827",
                border: "1px solid rgba(255,255,255,0.08)",
                borderRadius: "14px",
                padding: "0.9rem",
              }}
            >
              <h3 style={{ marginTop: 0, marginBottom: "0.45rem", fontSize: "1rem" }}>
                {item.title}
              </h3>
              <p
                style={{
                  color: "#CBD5E1",
                  marginBottom: 0,
                  lineHeight: 1.6,
                  fontSize: "0.92rem",
                }}
              >
                {item.text}
              </p>
            </div>
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
          WatchTVSport helps you find where to watch FIFA World Cup 2026 matches on
          official TV channels and broadcasters by country. Compare legal viewing
          options worldwide, discover whether coverage is free or paid, and access
          match pages to see official broadcasters for each game.
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
          WatchTVSport only lists official broadcasters. No illegal streams. No VPN
          recommendations. Information is provided for legal viewing options only.
        </div>
      </div>
    </main>
  );
}