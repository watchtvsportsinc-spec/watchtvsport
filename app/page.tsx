"use client";

import Link from "next/link";
import { useMemo } from "react";
import { matches } from "@/lib/matches";
import { getTeamName } from "@/lib/utils";

type Match = (typeof matches)[number];

type TrustIconName = "shield" | "globe" | "lock" | "users";

function TrustIcon({ name }: { name: TrustIconName }) {
  const commonStyle = {
    width: "34px",
    height: "34px",
    minWidth: "34px",
    color: "#60A5FA",
    display: "block",
  };

  if (name === "shield") {
    return (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        aria-hidden="true"
        style={commonStyle}
      >
        <path
          d="M12 3L5 6v5.5c0 4.2 2.9 7.9 7 9.5 4.1-1.6 7-5.3 7-9.5V6l-7-3Z"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinejoin="round"
        />
        <path
          d="M8.5 12l2.2 2.2 4.8-5"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }

  if (name === "globe") {
    return (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        aria-hidden="true"
        style={commonStyle}
      >
        <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.8" />
        <path
          d="M3 12h18M12 3c2.4 2.4 3.6 5.4 3.6 9S14.4 18.6 12 21M12 3C9.6 5.4 8.4 8.4 8.4 12S9.6 18.6 12 21"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
      </svg>
    );
  }

  if (name === "lock") {
    return (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        aria-hidden="true"
        style={commonStyle}
      >
        <path
          d="M7 10V8a5 5 0 0 1 10 0v2"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
        <rect
          x="5"
          y="10"
          width="14"
          height="10"
          rx="2"
          stroke="currentColor"
          strokeWidth="1.8"
        />
        <path
          d="M12 14v2"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" style={commonStyle}>
      <path
        d="M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z"
        stroke="currentColor"
        strokeWidth="1.8"
      />
      <path
        d="M2.8 20c.8-3.5 3.1-5.3 6.2-5.3s5.4 1.8 6.2 5.3"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <path
        d="M17 11a3 3 0 1 0 0-6"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <path
        d="M16.6 14.8c2.4.4 3.9 2 4.6 5.2"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}


type PremiumStatIconName = "calendar" | "globe" | "screen" | "shield";

function PremiumStatIcon({ name }: { name: PremiumStatIconName }) {
  const commonStyle = {
    width: "30px",
    height: "30px",
    minWidth: "30px",
    display: "block",
  };

  if (name === "calendar") {
    return (
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" style={{ ...commonStyle, color: "#E5E7EB" }}>
        <rect x="4" y="5" width="16" height="15" rx="3" stroke="currentColor" strokeWidth="1.6" />
        <path d="M8 3.5v3M16 3.5v3M4 9h16" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        <path d="M8 13h2M13 13h3M8 16h4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      </svg>
    );
  }

  if (name === "globe") {
    return (
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" style={{ ...commonStyle, color: "#E5E7EB" }}>
        <circle cx="12" cy="12" r="8.5" stroke="currentColor" strokeWidth="1.6" />
        <path d="M3.5 12h17M12 3.5c2.2 2.5 3.2 5.3 3.2 8.5s-1 6-3.2 8.5M12 3.5C9.8 6 8.8 8.8 8.8 12s1 6 3.2 8.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      </svg>
    );
  }

  if (name === "screen") {
    return (
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" style={{ ...commonStyle, color: "#F59E0B" }}>
        <rect x="4" y="5" width="16" height="12" rx="2" stroke="currentColor" strokeWidth="1.7" />
        <path d="M9 20h6M12 17v3" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
        <path d="M9 13l2-2 2 1.6 2.5-3.1" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" style={{ ...commonStyle, color: "#E5E7EB" }}>
      <path d="M12 3.5 5 6.5v5.2c0 4.1 2.8 7.6 7 8.8 4.2-1.2 7-4.7 7-8.8V6.5l-7-3Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
      <path d="m8.7 12 2.1 2.1 4.5-4.8" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function getMatchDateLabel(dateString?: string) {
  if (!dateString) return "Date TBC";

  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return "Date TBC";

  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function getShortDateLabel(dateString?: string) {
  if (!dateString) return "TBC";

  const date = new Date(dateString);

  if (Number.isNaN(date.getTime())) return "TBC";

  return new Intl.DateTimeFormat("en-US", {
    day: "2-digit",
    month: "short",
  })
    .format(date)
    .toUpperCase();
}

function getTimeLabel(dateString?: string) {
  if (!dateString) return "--:--";

  const date = new Date(dateString);

  if (Number.isNaN(date.getTime())) return "--:--";

  return new Intl.DateTimeFormat("en-CA", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
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
    Canada: "ca",
    Colombia: "co",
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
    Japan: "jp",
    Mexico: "mx",
    Morocco: "ma",
    Netherlands: "nl",
    Paraguay: "py",
    Portugal: "pt",
    Senegal: "sn",
    "South Africa": "za",
    Spain: "es",
    Switzerland: "ch",
    USA: "us",
  };

  return map[teamName] || "";
}

function SmallMatchCard({ match }: { match: Match }) {
  const homeTeam = getTeamName(match.homeTeam);
  const awayTeam = getTeamName(match.awayTeam);

  const homeFlag = getTeamFlagCode(homeTeam);
  const awayFlag = getTeamFlagCode(awayTeam);

  const countriesCount = new Set(
    match.broadcasts?.map((item) => item.countryCode),
  ).size;

  const freeCount =
    match.broadcasts?.filter((item) => item.access === "Free").length || 0;

  const hasFree = freeCount > 0;

  return (
    <Link
      href={`/match/${match.slug}`}
      draggable={false}
      style={{
        position: "relative",
        overflow: "hidden",
        textDecoration: "none",
        color: "#FFFFFF",
        background:
          "radial-gradient(circle at 50% 0%, rgba(59,130,246,0.30), transparent 42%), linear-gradient(180deg, #10203A 0%, #0B1628 100%)",
        border: "1px solid rgba(96,165,250,0.42)",
        borderRadius: "18px",
        padding: "0.72rem 0.72rem 0.62rem",
        display: "grid",
        gap: "0.48rem",
        minHeight: "146px",
        boxShadow:
          "0 18px 44px rgba(0,0,0,0.24), inset 0 1px 0 rgba(255,255,255,0.07)",
      }}
    >
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          inset: 0,
          background:
            "linear-gradient(135deg, rgba(59,130,246,0.13), transparent 36%, rgba(34,197,94,0.05)), radial-gradient(circle at center, rgba(255,255,255,0.055), transparent 48%)",
          pointerEvents: "none",
        }}
      />

      <div
        style={{
          position: "relative",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          gap: "0.28rem",
        }}
      >
        <span
          style={{
            background:
              "linear-gradient(180deg, rgba(59,130,246,0.48), rgba(29,78,216,0.24))",
            border: "1px solid rgba(96,165,250,0.42)",
            borderRadius: "999px",
            padding: "0.28rem 0.58rem",
            color: "#DBEAFE",
            fontSize: "0.68rem",
            lineHeight: 1,
            fontWeight: 950,
            boxShadow: "0 0 18px rgba(59,130,246,0.18)",
          }}
        >
          {getShortDateLabel(match.matchDate)}
        </span>

        <span
          style={{
            background: "rgba(15,23,42,0.58)",
            border: "1px solid rgba(148,163,184,0.16)",
            borderRadius: "999px",
            padding: "0.27rem 0.5rem",
            color: "#93C5FD",
            fontSize: "0.66rem",
            lineHeight: 1,
            fontWeight: 850,
          }}
        >
          {match.group ? `Group ${match.group}` : "Knockout"}
        </span>
      </div>

      <div
        style={{
          position: "relative",
          display: "grid",
          gridTemplateColumns: "1fr 58px 1fr",
          alignItems: "center",
          gap: "0.38rem",
          minHeight: "68px",
        }}
      >
        <div
          style={{
            display: "grid",
            justifyItems: "center",
            alignContent: "center",
            gap: "0.42rem",
            minWidth: 0,
          }}
        >
          {homeFlag ? (
            <img
              src={`/flags/${homeFlag}.png`}
              alt=""
              draggable={false}
              style={{
                width: "44px",
                height: "44px",
                borderRadius: "999px",
                objectFit: "cover",
                boxShadow:
                  "0 0 0 2px rgba(255,255,255,0.76), 0 0 0 4px rgba(59,130,246,0.20), 0 12px 22px rgba(0,0,0,0.28)",
              }}
            />
          ) : null}

          <div
            style={{
              width: "100%",
              textAlign: "center",
              fontSize: "0.76rem",
              fontWeight: 950,
              lineHeight: 1.08,
              minHeight: "1.65rem",
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
            }}
          >
            {homeTeam}
          </div>
        </div>

        <div
          style={{
            display: "grid",
            justifyItems: "center",
            alignContent: "center",
            gap: "0.32rem",
          }}
        >
          <span
            style={{
              width: "38px",
              height: "38px",
              borderRadius: "999px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background:
                "linear-gradient(180deg, rgba(15,23,42,0.92), rgba(2,6,23,0.72))",
              border: "1px solid rgba(255,255,255,0.14)",
              color: "#FFFFFF",
              fontSize: "0.82rem",
              fontWeight: 1000,
              letterSpacing: "0.04em",
              boxShadow:
                "0 0 24px rgba(59,130,246,0.22), inset 0 1px 0 rgba(255,255,255,0.08)",
            }}
          >
            VS
          </span>

          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "0.26rem",
              color: "#E5E7EB",
              fontSize: "0.76rem",
              fontWeight: 900,
              whiteSpace: "nowrap",
              lineHeight: 1,
              background: "rgba(2,6,23,0.48)",
              border: "1px solid rgba(255,255,255,0.10)",
              borderRadius: "999px",
              padding: "0.3rem 0.46rem",
            }}
          >
            ◷ {getTimeLabel(match.matchDate)}
          </span>
        </div>

        <div
          style={{
            display: "grid",
            justifyItems: "center",
            alignContent: "center",
            gap: "0.42rem",
            minWidth: 0,
          }}
        >
          {awayFlag ? (
            <img
              src={`/flags/${awayFlag}.png`}
              alt=""
              draggable={false}
              style={{
                width: "44px",
                height: "44px",
                borderRadius: "999px",
                objectFit: "cover",
                boxShadow:
                  "0 0 0 2px rgba(255,255,255,0.76), 0 0 0 4px rgba(59,130,246,0.20), 0 12px 22px rgba(0,0,0,0.28)",
              }}
            />
          ) : null}

          <div
            style={{
              width: "100%",
              textAlign: "center",
              fontSize: "0.76rem",
              fontWeight: 950,
              lineHeight: 1.08,
              minHeight: "1.65rem",
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
            }}
          >
            {awayTeam}
          </div>
        </div>
      </div>

      <div
        style={{
          position: "relative",
          borderTop: "1px solid rgba(96,165,250,0.16)",
          paddingTop: "0.52rem",
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "0.42rem",
          alignItems: "center",
        }}
      >
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "0.32rem",
            borderRadius: "10px",
            padding: "0.38rem 0.42rem",
            fontSize: "0.76rem",
            lineHeight: 1,
            background:
              "linear-gradient(180deg, rgba(59,130,246,0.30), rgba(29,78,216,0.17))",
            border: "1px solid rgba(96,165,250,0.36)",
            color: "#DBEAFE",
            fontWeight: 950,
            whiteSpace: "nowrap",
            boxShadow: "0 0 16px rgba(59,130,246,0.12)",
          }}
        >
          ◎ {countriesCount} Countries
        </span>

        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "0.32rem",
            borderRadius: "10px",
            padding: "0.38rem 0.42rem",
            lineHeight: 1,
            background: hasFree
              ? "linear-gradient(180deg, rgba(34,197,94,0.26), rgba(21,128,61,0.16))"
              : "linear-gradient(180deg, rgba(245,158,11,0.22), rgba(146,64,14,0.14))",
            border: hasFree
              ? "1px solid rgba(34,197,94,0.38)"
              : "1px solid rgba(245,158,11,0.34)",
            color: hasFree ? "#4ADE80" : "#F59E0B",
            fontSize: "0.76rem",
            fontWeight: 1000,
            whiteSpace: "nowrap",
            boxShadow: hasFree
              ? "0 0 18px rgba(34,197,94,0.14)"
              : "0 0 18px rgba(245,158,11,0.12)",
          }}
        >
          ▷ {hasFree ? `${freeCount} Free` : "Paid"}
        </span>
      </div>
    </Link>
  );
}

function CountryBroadcastCard({
  country,
}: {
  country: {
    countryCode: string;
    countryName: string;
    broadcasters: string[];
    accessTypes: ("Free" | "Paid")[];
  };
}) {
  const code = country.countryCode.toLowerCase();
  const visibleBroadcasters = country.broadcasters.slice(0, 2).join(" / ");
  const hasFree = country.accessTypes.includes("Free");
  const hasPaid = country.accessTypes.includes("Paid");
  const accessLabel =
    hasFree && hasPaid ? "Free + Paid" : hasFree ? "Free" : "Paid";

  return (
    <Link
      href={`/country/${code}`}
      draggable={false}
      style={{
        position: "relative",
        overflow: "hidden",
        textDecoration: "none",
        color: "#FFFFFF",
        background:
          "radial-gradient(circle at 50% 0%, rgba(59,130,246,0.26), transparent 44%), linear-gradient(180deg, #10203A 0%, #0B1628 100%)",
        border: "1px solid rgba(96,165,250,0.36)",
        borderRadius: "18px",
        padding: "0.72rem 0.7rem 0.68rem",
        display: "grid",
        justifyItems: "center",
        alignContent: "center",
        gap: "0.42rem",
        minHeight: "122px",
        boxShadow:
          "0 18px 42px rgba(0,0,0,0.22), inset 0 1px 0 rgba(255,255,255,0.06)",
      }}
    >
      <img
        aria-hidden="true"
        src={`/flags/${code}.png`}
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
        src={`/flags/${code}.png`}
        alt=""
        draggable={false}
        style={{
          position: "relative",
          width: "40px",
          height: "40px",
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
            fontSize: "0.9rem",
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
            fontSize: "0.78rem",
            fontWeight: 850,
            lineHeight: 1.1,
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
            fontSize: "0.76rem",
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
}


function FreeMatchRow({ match }: { match: Match }) {
  const homeTeam = getTeamName(match.homeTeam);
  const awayTeam = getTeamName(match.awayTeam);
  const homeFlag = getTeamFlagCode(homeTeam);
  const awayFlag = getTeamFlagCode(awayTeam);

  const freeCountriesCount = new Set(
    match.broadcasts
      ?.filter((item) => item.access === "Free")
      .map((item) => item.countryCode),
  ).size;

  return (
    <Link
      href={`/match/${match.slug}`}
      className="freeMatchRow"
      style={{
        display: "grid",
        gridTemplateColumns:
          "82px minmax(150px, 1fr) 44px 40px 44px minmax(150px, 1fr) 82px minmax(190px, auto) 20px",
        alignItems: "center",
        gap: "0.62rem",
        color: "#FFFFFF",
        textDecoration: "none",
        padding: "0.72rem 1.15rem",
        borderTop: "1px solid rgba(96,165,250,0.12)",
        background:
          "linear-gradient(90deg, rgba(59,130,246,0.05), transparent 42%, rgba(34,197,94,0.035))",
      }}
    >
      <div style={{ display: "grid", gap: "0.45rem" }}>
        <div style={{ fontSize: "0.98rem", fontWeight: 950, lineHeight: 1 }}>
          {getTimeLabel(match.matchDate)}
        </div>
        <div
          style={{
            color: "#BFDBFE",
            fontSize: "0.68rem",
            fontWeight: 850,
            lineHeight: 1,
          }}
        >
          {getShortDateLabel(match.matchDate)}
        </div>
      </div>

      <div
        style={{
          fontSize: "0.96rem",
          fontWeight: 900,
          lineHeight: 1.08,
          textAlign: "right",
          display: "-webkit-box",
          WebkitLineClamp: 2,
          WebkitBoxOrient: "vertical",
          overflow: "hidden",
          minWidth: 0,
        }}
      >
        {homeTeam}
      </div>

      <div style={{ width: "32px", height: "32px" }}>
        {homeFlag ? (
          <img
            src={`/flags/${homeFlag}.png`}
            alt=""
            style={{
              width: "32px",
              height: "32px",
              borderRadius: "999px",
              objectFit: "cover",
              display: "block",
              boxShadow:
                "0 0 0 2px rgba(96,165,250,0.18), 0 0 16px rgba(59,130,246,0.14)",
            }}
          />
        ) : null}
      </div>

      <div
        style={{
          color: "#E5E7EB",
          textAlign: "center",
          fontSize: "0.8rem",
          fontWeight: 900,
        }}
      >
        VS
      </div>

      <div style={{ width: "32px", height: "32px" }}>
        {awayFlag ? (
          <img
            src={`/flags/${awayFlag}.png`}
            alt=""
            style={{
              width: "32px",
              height: "32px",
              borderRadius: "999px",
              objectFit: "cover",
              display: "block",
              boxShadow:
                "0 0 0 2px rgba(96,165,250,0.18), 0 0 16px rgba(59,130,246,0.14)",
            }}
          />
        ) : null}
      </div>

      <div
        style={{
          fontSize: "0.94rem",
          fontWeight: 900,
          lineHeight: 1.08,
          textAlign: "left",
          display: "-webkit-box",
          WebkitLineClamp: 2,
          WebkitBoxOrient: "vertical",
          overflow: "hidden",
          minWidth: 0,
        }}
      >
        {awayTeam}
      </div>

      <span
        style={{
          justifySelf: "center",
          borderRadius: "999px",
          padding: "0.34rem 0.62rem",
          background:
            "linear-gradient(180deg, rgba(34,197,94,0.22), rgba(21,128,61,0.14))",
          border: "1px solid rgba(34,197,94,0.38)",
          color: "#4ADE80",
          fontSize: "0.82rem",
          fontWeight: 950,
          lineHeight: 1,
          whiteSpace: "nowrap",
          boxShadow: "0 0 16px rgba(34,197,94,0.12)",
        }}
      >
        Free
      </span>

      <span
        style={{
          justifySelf: "end",
          color: "#CBD5E1",
          fontSize: "0.82rem",
          whiteSpace: "nowrap",
        }}
      >
        Available in {freeCountriesCount} countries
      </span>

      <div
        style={{
          color: "#93C5FD",
          fontSize: "1.45rem",
          lineHeight: 1,
          textAlign: "right",
        }}
      >
        ›
      </div>
    </Link>
  );
}

export default function HomePage() {
  const sortedMatches = useMemo(() => {
    return [...matches].sort((a, b) => {
      const aTime = a.matchDate
        ? new Date(a.matchDate).getTime()
        : Number.MAX_SAFE_INTEGER;
      const bTime = b.matchDate
        ? new Date(b.matchDate).getTime()
        : Number.MAX_SAFE_INTEGER;
      return aTime - bTime;
    });
  }, []);

  const featuredMatch = sortedMatches[0];
  const featuredHomeTeam = getTeamName(featuredMatch.homeTeam);
  const featuredAwayTeam = getTeamName(featuredMatch.awayTeam);
  const featuredHomeFlag = getTeamFlagCode(featuredHomeTeam);
  const featuredAwayFlag = getTeamFlagCode(featuredAwayTeam);
  const featuredCountriesCount = new Set(
    featuredMatch.broadcasts?.map((item) => item.countryCode),
  ).size;
  const featuredFreeCount =
    featuredMatch.broadcasts?.filter((item) => item.access === "Free").length || 0;
  const featuredPaidCount =
    featuredMatch.broadcasts?.filter((item) => item.access === "Paid").length || 0;

  const upcomingMatches = sortedMatches.filter(
    (match) => match.slug !== featuredMatch.slug,
  );
  const visibleUpcomingMatches = upcomingMatches.slice(0, 4);

  const countryBroadcasts = useMemo(() => {
    const priorityCountries = [
      "us",
      "ca",
      "gb",
      "fr",
      "be",
      "ch",
      "au",
      "mx",
      "br",
      "ar",
      "de",
      "es",
      "nl",
      "pt",
    ];

    const byCountry = new Map<
      string,
      {
        countryCode: string;
        countryName: string;
        broadcasters: Set<string>;
        accessTypes: Set<"Free" | "Paid">;
      }
    >();

    sortedMatches.forEach((match) => {
      match.broadcasts?.forEach((broadcast) => {
        const code = broadcast.countryCode.toLowerCase();
        const existing = byCountry.get(code);

        if (existing) {
          existing.broadcasters.add(broadcast.broadcaster);
          existing.accessTypes.add(broadcast.access);
          return;
        }

        byCountry.set(code, {
          countryCode: code,
          countryName: broadcast.countryName,
          broadcasters: new Set([broadcast.broadcaster]),
          accessTypes: new Set([broadcast.access]),
        });
      });
    });

    return Array.from(byCountry.values())
      .map((country) => ({
        countryCode: country.countryCode,
        countryName: country.countryName,
        broadcasters: Array.from(country.broadcasters),
        accessTypes: Array.from(country.accessTypes),
      }))
      .sort((a, b) => {
        const aPriority = priorityCountries.indexOf(a.countryCode);
        const bPriority = priorityCountries.indexOf(b.countryCode);

        if (aPriority !== -1 || bPriority !== -1) {
          return (
            (aPriority === -1 ? 999 : aPriority) -
            (bPriority === -1 ? 999 : bPriority)
          );
        }

        return a.countryName.localeCompare(b.countryName);
      });
  }, [sortedMatches]);

  const priorityCountryCodes = ["us", "ca", "mx", "fr", "gb", "br"];

  const visibleCountryBroadcasts = priorityCountryCodes
    .map((code) =>
      countryBroadcasts.find((country) => country.countryCode === code),
    )
    .filter(Boolean) as typeof countryBroadcasts;

  const freeMatches = sortedMatches
    .filter((match) => match.broadcasts?.some((item) => item.access === "Free"))
    .slice(0, 4);

  return (
    <main
      style={{
        minHeight: "100vh",
        background:
          "radial-gradient(circle at top left, rgba(59,130,246,0.12), transparent 28%), radial-gradient(circle at top right, rgba(15,23,42,0.92), transparent 34%), #050B16",
        color: "#FFFFFF",
      }}
    >
      <section
        style={{
          padding: "1.6rem 1rem 0.75rem",
          marginBottom: "0.75rem",
        }}
      >
        <div style={{ maxWidth: "1360px", margin: "0 auto" }}>
          <div
            className="homepageHeroGrid"
            style={{
              display: "grid",
gridTemplateColumns: "1fr 1fr",
              gap: "1.65rem",
              alignItems: "stretch",
            }}
          >
            <div
              style={{
                border: "0",
                borderRadius: "0",
                padding: "0.35rem 0 0",
                background: "transparent",
              }}
            >

              <h1
                className="homepageHeroTitle"
                style={{
                  margin: 0,
                  fontSize: "2.82rem",
                  lineHeight: 1.02,
                  letterSpacing: "-0.04em",
                }}
              >
                Find where to watch World Cup matches{" "}
                <span style={{ color: "#3B82F6" }}>legally worldwide</span>
              </h1>

              <p
                style={{
                  color: "#CBD5E1",
                  fontSize: "0.88rem",
                  lineHeight: 1.42,
                  maxWidth: "520px",
                  margin: "0.82rem 0 0",
                }}
              >
                Compare official broadcasters by country, discover free and paid
                viewing options, and open detailed match pages for legal TV
                coverage.
              </p>

              <Link
                href="/schedule"
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: "100%",
                  maxWidth: "620px",
                  boxSizing: "border-box",
                  marginTop: "1rem",
                  minHeight: "22px",
                  padding: "0.18rem 0.9rem",
                  borderRadius: "10px",
                  background: "#3B82F6",
                  color: "#FFFFFF",
                  textDecoration: "none",
                  fontWeight: 800,
                }}
              >
                View full schedule
              </Link>

        <div
  className="homepageHeroStats"
  style={{
    display: "grid",
    gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
    gap: "0.55rem",
    marginTop: "1.25rem",
    maxWidth: "620px",
    fontSize: "0.78rem",
  }}
              >
                {[
                  { icon: "calendar" as const, value: "104", label: "Matches" },
                  { icon: "globe" as const, value: "81", label: "Countries" },
                  { icon: "screen" as const, value: "Free options", label: "Available" },
                  { icon: "shield" as const, value: "100%", label: "Official" },
                ].map((item) => (
                  <div
                    key={item.label}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "0.9rem",
                      minWidth: 0,
                    }}
                  >
                    <PremiumStatIcon name={item.icon} />
                    <div style={{ minWidth: 0 }}>
                      <div
                        style={{
                          color: "#FFFFFF",
                          fontSize: item.value === "Free options" ? "0.88rem" : "1.08rem",
                          fontWeight: 850,
                          lineHeight: 1.05,
                          whiteSpace: "nowrap",
                        }}
                      >
                        {item.value}
                      </div>
                      <div
                        style={{
                          color: "#CBD5E1",
                          fontSize: "0.78rem",
                          lineHeight: 1.15,
                          marginTop: "0.18rem",
                        }}
                      >
                        {item.label}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

           <aside
  style={{
    position: "relative",
    overflow: "hidden",
    border: "1px solid rgba(96,165,250,0.42)",
    borderRadius: "24px",
    padding: "0.95rem 1.55rem 0.78rem",
    backgroundImage:
      "linear-gradient(180deg, rgba(2,6,23,0.18) 0%, rgba(2,6,23,0.54) 48%, rgba(6,78,59,0.36) 100%), url('/hero-stadium-bg.png')",
    backgroundSize: "cover",
    backgroundPosition: "center",
    backgroundRepeat: "no-repeat",
    boxShadow:
      "0 28px 90px rgba(0,0,0,0.50), 0 0 0 1px rgba(255,255,255,0.035), inset 0 1px 0 rgba(255,255,255,0.08), 0 0 50px rgba(59,130,246,0.16)",
  }}
>
  <div
    aria-hidden="true"
    style={{
      position: "absolute",
      inset: 0,
      background:
        "radial-gradient(circle at 50% 16%, rgba(59,130,246,0.28), transparent 34%), linear-gradient(90deg, rgba(59,130,246,0.10), transparent 32%, rgba(34,197,94,0.08))",
      pointerEvents: "none",
      zIndex: 0,
    }}
  />

  {featuredHomeFlag ? (
    <img
      aria-hidden="true"
      src={`/flags/${featuredHomeFlag}.png`}
      alt=""
      draggable={false}
      style={{
        position: "absolute",
        left: "-62px",
        top: "-54px",
        width: "215px",
        height: "215px",
        borderRadius: "999px",
        objectFit: "cover",
        opacity: 0.18,
        filter: "blur(0.2px) saturate(1.2)",
        transform: "rotate(-14deg)",
        zIndex: 0,
        pointerEvents: "none",
      }}
    />
  ) : null}

  {featuredAwayFlag ? (
    <img
      aria-hidden="true"
      src={`/flags/${featuredAwayFlag}.png`}
      alt=""
      draggable={false}
      style={{
        position: "absolute",
        right: "-58px",
        top: "-50px",
        width: "215px",
        height: "215px",
        borderRadius: "999px",
        objectFit: "cover",
        opacity: 0.18,
        filter: "blur(0.2px) saturate(1.2)",
        transform: "rotate(14deg)",
        zIndex: 0,
        pointerEvents: "none",
      }}
    />
  ) : null}

  <div
    aria-hidden="true"
    style={{
      position: "absolute",
      left: "10%",
      right: "10%",
      top: "43%",
      height: "1px",
      background:
        "linear-gradient(90deg, transparent, rgba(147,197,253,0.42), transparent)",
      zIndex: 0,
    }}
  />


  <div style={{ position: "relative", zIndex: 3 }}>

    <div
      style={{
        display: "grid",
        gridTemplateColumns: "1fr auto 1fr",
        alignItems: "center",
        gap: "1rem",
        marginBottom: "0.58rem",
      }}
    >
      <div
        style={{
          display: "grid",
          justifyItems: "center",
          gap: "0.5rem",
        }}
      >
        <img
          src={featuredHomeFlag ? `/flags/${featuredHomeFlag}.png` : "/flags/mx.png"}
          alt={`${featuredHomeTeam} flag`}
          style={{
            width: "60px",
            height: "60px",
            borderRadius: "999px",
            objectFit: "cover",
            border: "2px solid rgba(255,255,255,0.24)",
            boxShadow:
              "0 0 0 5px rgba(59,130,246,0.14), 0 18px 42px rgba(0,0,0,0.42), 0 0 34px rgba(59,130,246,0.20)",
          }}
        />
        <div
          style={{
            fontSize: "1.08rem",
            fontWeight: 950,
            lineHeight: 1,
            textShadow: "0 8px 22px rgba(0,0,0,0.48)",
          }}
        >
          {featuredHomeTeam}
        </div>
      </div>

      <div
        style={{
          display: "grid",
          justifyItems: "center",
          gap: "0.28rem",
        }}
      >
        <div
          style={{
            fontSize: "2.65rem",
            fontWeight: 1000,
            letterSpacing: "-0.05em",
            color: "#FFFFFF",
            lineHeight: 1,
            textShadow:
              "0 0 28px rgba(96,165,250,0.48), 0 12px 30px rgba(0,0,0,0.55)",
          }}
        >
          VS
        </div>
      </div>

      <div
        style={{
          display: "grid",
          justifyItems: "center",
          gap: "0.5rem",
        }}
      >
        <img
          src={featuredAwayFlag ? `/flags/${featuredAwayFlag}.png` : "/flags/za.png"}
          alt={`${featuredAwayTeam} flag`}
          style={{
            width: "60px",
            height: "60px",
            borderRadius: "999px",
            objectFit: "cover",
            border: "2px solid rgba(255,255,255,0.24)",
            boxShadow:
              "0 0 0 5px rgba(59,130,246,0.14), 0 18px 42px rgba(0,0,0,0.42), 0 0 34px rgba(59,130,246,0.20)",
          }}
        />
        <div
          style={{
            fontSize: "1.08rem",
            fontWeight: 950,
            lineHeight: 1,
            textShadow: "0 8px 22px rgba(0,0,0,0.48)",
          }}
        >
          {featuredAwayTeam}
        </div>
      </div>
    </div>

    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
        alignItems: "center",
        maxWidth: "560px",
        margin: "0 auto 0.5rem",
        border: "1px solid rgba(255,255,255,0.13)",
        borderRadius: "14px",
        background: "rgba(15,23,42,0.62)",
        backdropFilter: "blur(10px)",
        boxShadow:
          "0 16px 34px rgba(0,0,0,0.28), inset 0 1px 0 rgba(255,255,255,0.06)",
      }}
    >
      {[
        [getMatchDateLabel(featuredMatch.matchDate), getTimeLabel(featuredMatch.matchDate)],
        [featuredMatch.stadiumName || "Stadium TBC", featuredMatch.hostCity || "City TBC"],
        [featuredMatch.group ? `Group ${featuredMatch.group}` : featuredMatch.stage, `Match ${featuredMatch.matchNumber}`],
      ].map(([top, bottom], index) => (
        <div
          key={top}
          style={{
            padding: "0.5rem 0.78rem",
            textAlign: "center",
            borderLeft:
              index === 0 ? "none" : "1px solid rgba(255,255,255,0.10)",
          }}
        >
          <div
            style={{
              color: "#FFFFFF",
              fontSize: "0.86rem",
              fontWeight: 900,
              lineHeight: 1.15,
            }}
          >
            {top}
          </div>
          <div
            style={{
              marginTop: "0.25rem",
              color: "#94A3B8",
              fontSize: "0.78rem",
              fontWeight: 750,
              lineHeight: 1.1,
            }}
          >
            {bottom}
          </div>
        </div>
      ))}
    </div>

    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
        gap: "0.55rem",
        marginBottom: "0.58rem",
      }}
    >
      {[
        ["🌍", `${featuredCountriesCount} Countries`, "#BFDBFE", "rgba(59,130,246,0.18)"],
        ["▣", `${featuredFreeCount} Free`, "#4ADE80", "rgba(34,197,94,0.16)"],
        ["◉", `${featuredPaidCount} Paid`, "#FBBF24", "rgba(245,158,11,0.16)"],
      ].map(([icon, label, color, bg]) => (
        <div
          key={label}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "0.42rem",
            border: "1px solid rgba(255,255,255,0.13)",
            borderRadius: "999px",
            background: "rgba(15,23,42,0.66)",
            backdropFilter: "blur(10px)",
            padding: "0.42rem 0.5rem",
            color,
            fontSize: "0.84rem",
            fontWeight: 950,
            boxShadow: "0 12px 28px rgba(0,0,0,0.22)",
          }}
        >
          <span
            style={{
              width: "22px",
              height: "22px",
              borderRadius: "999px",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              background: bg,
              fontSize: "0.72rem",
              lineHeight: 1,
            }}
          >
            {icon}
          </span>
          {label}
        </div>
      ))}
    </div>

<div
  style={{
    display: "grid",
    gridTemplateColumns: "1fr",
    gap: "0.55rem",
    marginTop: "0.2rem",
  }}
>
  <Link
    href={`/match/${featuredMatch.slug}`}
    style={{
      textDecoration: "none",
      background: "linear-gradient(180deg, #3B82F6, #2563EB)",
      color: "#FFFFFF",
      borderRadius: "14px",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontWeight: 900,
      fontSize: "0.96rem",
      boxShadow:
        "0 14px 30px rgba(37,99,235,0.32), inset 0 1px 0 rgba(255,255,255,0.10)",
      border: "1px solid rgba(255,255,255,0.08)",
      width: "min(210px, 100%)",
      justifySelf: "center",
      minHeight: "22px",
      padding: "0.14rem 0.68rem",
    }}
  >
    Watch match
  </Link>

</div>
  </div>
</aside>
          </div>
        </div>
      </section>

      <section style={{ padding: "0 1rem 1.1rem" }}>
        <div style={{ maxWidth: "1360px", margin: "0 auto" }}>
          <div
            className="homepageSectionHeaderInline"
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "1rem",
              marginBottom: "0.55rem",
              flexWrap: "wrap",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "baseline",
                gap: "0.7rem",
                flexWrap: "wrap",
              }}
            >
              <h2 style={{ fontSize: "1.35rem", margin: 0 }}>
                Upcoming matches
              </h2>
              <p style={{ color: "#94A3B8", margin: 0 }}>
                Selected upcoming fixtures. Use Schedule for the full list.
              </p>
            </div>

            <Link
              href="/schedule"
              style={{
                color: "#3B82F6",
                textDecoration: "none",
                fontSize: "0.82rem",
                fontWeight: 850,
                whiteSpace: "nowrap",
              }}
            >
              See all upcoming matches →
            </Link>
          </div>

          <div
            className="homepageUpcomingGrid"
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
              gap: "0.75rem",
            }}
          >
            {visibleUpcomingMatches.map((match) => (
              <SmallMatchCard key={match.slug} match={match} />
            ))}
          </div>
        </div>
      </section>

      <section style={{ padding: "0 1rem 1.05rem" }}>
        <div style={{ maxWidth: "1360px", margin: "0 auto" }}>
          <div
            className="homepageSectionHeaderInline"
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "1rem",
              marginBottom: "0.45rem",
              flexWrap: "wrap",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "baseline",
                gap: "0.7rem",
                flexWrap: "wrap",
              }}
            >
              <h2 style={{ fontSize: "1.35rem", margin: 0 }}>
                Broadcasters by country
              </h2>
              <p style={{ color: "#94A3B8", margin: 0 }}>
                Quick access to official broadcast information by country.
              </p>
            </div>

            <Link
              href="/country"
              style={{
                color: "#3B82F6",
                textDecoration: "none",
                fontSize: "0.82rem",
                fontWeight: 850,
                whiteSpace: "nowrap",
              }}
            >
              See all countries →
            </Link>
          </div>

          <div
            className="homepageCountriesGrid"
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(6, minmax(0, 1fr))",
              gap: "0.75rem",
            }}
          >
            {visibleCountryBroadcasts.map((country) => (
              <CountryBroadcastCard key={country.countryCode} country={country} />
            ))}
          </div>
        </div>
      </section>

      <section
        className="homepageFreeMatchesTodaySection"
        style={{ padding: "0 1rem 1.35rem" }}
      >
        <div style={{ maxWidth: "1360px", margin: "0 auto" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "1rem",
              marginBottom: "0.55rem",
            }}
          >
            <div
              style={{ display: "flex", alignItems: "center", gap: "0.65rem" }}
            >
              <span
                style={{
                  width: "22px",
                  height: "22px",
                  borderRadius: "999px",
                  border: "1px solid rgba(34,197,94,0.36)",
                  background: "rgba(34,197,94,0.12)",
                  color: "#22C55E",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "0.78rem",
                  fontWeight: 900,
                }}
              >
                ⊞
              </span>
              <h2 style={{ fontSize: "1.35rem", margin: 0 }}>
                Next free matches
              </h2>
            </div>

            <Link
              href="/schedule"
              style={{
                color: "#3B82F6",
                textDecoration: "none",
                fontSize: "0.82rem",
                fontWeight: 850,
                whiteSpace: "nowrap",
              }}
            >
              See all free matches →
            </Link>
          </div>

          <div
            className="homepageFreeMatchesToday"
            style={{
              borderRadius: "10px",
              border: "1px solid rgba(59,130,246,0.18)",
              background: "rgba(15,23,42,0.52)",
overflow: "visible",
            }}
          >
            {freeMatches.slice(0, 3).map((match, index) => (
              <div
                key={match.slug}
                style={{ marginTop: index === 0 ? "-1px" : 0 }}
              >
                <FreeMatchRow match={match} />
              </div>
            ))}
          </div>

          <div
            className="homepageTrustCapsules"
            style={{
              marginTop: "0.8rem",
              background:
                "linear-gradient(90deg, rgba(15,23,42,0.98) 0%, rgba(9,18,40,0.98) 100%)",
              border: "1px solid rgba(59,130,246,0.18)",
              borderRadius: "18px",
              padding: "1.1rem 1.15rem",
              display: "grid",
              gridTemplateColumns: "repeat(4,minmax(0,1fr))",
              gap: "1rem",
              alignItems: "stretch",
            }}
          >
            {[
              {
                icon: "shield" as const,
                title: "100% Official",
                text: "We only list official broadcasters and legal viewing options.",
              },
              {
                icon: "globe" as const,
                title: "Worldwide Coverage",
                text: "Compare broadcasters by country worldwide.",
              },
              {
                icon: "lock" as const,
                title: "Legal & Safe",
                text: "No illegal streams. No VPN recommendations.",
              },
              {
                icon: "users" as const,
                title: "Made for Fans",
                text: "Simple, fast and built for sports fans everywhere.",
              },
            ].map((item, index) => (
              <div
                key={item.title}
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: "0.75rem",
                  paddingRight: index !== 3 ? "0.9rem" : undefined,
                  borderRight:
                    index !== 3
                      ? "1px solid rgba(255,255,255,0.08)"
                      : undefined,
                }}
              >
                <TrustIcon name={item.icon} />

                <div>
                  <div
                    style={{
                      color: "#FFFFFF",
                      fontWeight: 850,
                      fontSize: "0.92rem",
                      marginBottom: "0.25rem",
                      lineHeight: 1.1,
                    }}
                  >
                    {item.title}
                  </div>

                  <div
                    style={{
                      color: "#CBD5E1",
                      fontSize: "0.76rem",
                      lineHeight: 1.35,
                    }}
                  >
                    {item.text}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section style={{ padding: "0 1rem 2rem" }}>
        <div
          style={{
            maxWidth: "1360px",
            margin: "0 auto",
            minHeight: "110px",
            borderRadius: "22px",
            border: "1px dashed rgba(255,255,255,0.14)",
            background: "rgba(255,255,255,0.025)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#64748B",
          }}
        >
          Future premium sponsor placement
        </div>
      </section>

      <section style={{ padding: "0 1rem 3rem" }}></section>

      <style jsx>{`
        .homepageFreeMatchesToday a:hover {
          background: rgba(59, 130, 246, 0.06);
        }

        @media (max-width: 980px) {
          .homepageTrustCapsules {
            grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
          }

          .homepageTrustCapsules > div {
            border-right: 0 !important;
            padding-right: 0 !important;
          }

          .homepageUpcomingGrid {
            grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
          }

          .homepageCountriesGrid {
            grid-template-columns: repeat(3, minmax(0, 1fr)) !important;
          }

          .homepageCountriesGrid > a:nth-child(n + 4) {
            display: none !important;
          }

          .homepageFreeMatchesToday a {
            grid-template-columns: 62px minmax(115px, 1fr) 32px 40px 32px minmax(
                115px,
                1fr
              ) 62px !important;
            gap: 0.28rem !important;
            padding: 0.6rem 0.7rem !important;
          }

          .homepageFreeMatchesToday a > span:nth-child(8),
          .homepageFreeMatchesToday a > div:nth-child(9) {
            display: none !important;
          }

          .homepageHeroStats > div {
            column-gap: 0.38rem !important;
          }

          .homepageHeader {
            grid-template-columns: 1fr !important;
          }

          .homepageHeroGrid {
            grid-template-columns: 1fr !important;
          }

          .homepageMatchGrid {
            grid-template-columns: 1fr !important;
          }

          .homepageHeroTitle {
            font-size: 2.2rem !important;
          }
        }

        @media (max-width: 767px) {
          .homepageFreeMatchesTodaySection {
            display: none !important;
          }

          .homepageUpcomingGrid > a:nth-child(n + 3) {
            display: none !important;
          }

          .homepageHeroStats {
            grid-template-columns: repeat(4, minmax(0, 1fr)) !important;
            gap: 0.45rem !important;
          }

          .homepageHeroStats > div {
            min-width: 0 !important;
          }

          .homepageHeroStats span,
          .homepageHeroStats div {
            font-size: clamp(0.68rem, 2vw, 0.82rem) !important;
          }

          .homepageHeroStats > div:nth-child(3) {
            letter-spacing: -0.03em;
          }

          .homepageHeroStats svg {
            width: 16px !important;
            height: 16px !important;
            flex-shrink: 0 !important;
          }
        }

        @media (max-width: 640px) {
          .homepageHeroTitle {
            font-size: 1.85rem !important;
          }
        }
      `}</style>
    </main>
  );
}