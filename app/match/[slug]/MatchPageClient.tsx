"use client";

import { useEffect, useMemo, useState } from "react";

type MatchPageClientProps = {
  matchTimestamp: number | null;
};

type TimingTone = "upcoming" | "live" | "finished";

function getTimingBadgeStyle(tone: TimingTone) {
  if (tone === "live") {
    return {
      background: "rgba(239,68,68,0.16)",
      color: "#F87171",
      border: "1px solid rgba(239,68,68,0.35)",
      boxShadow: "0 0 0 1px rgba(239,68,68,0.08) inset",
    };
  }

  if (tone === "finished") {
    return {
      background: "rgba(148,163,184,0.12)",
      color: "#CBD5E1",
      border: "1px solid rgba(148,163,184,0.20)",
      boxShadow: "none",
    };
  }

  return {
    background: "rgba(59,130,246,0.15)",
    color: "#BFDBFE",
    border: "1px solid rgba(59,130,246,0.28)",
    boxShadow: "none",
  };
}

function getMatchStatus(matchTimestamp: number | null): {
  label: string;
  tone: TimingTone;
} {
  if (!matchTimestamp) {
    return {
      label: "Local time unavailable",
      tone: "upcoming",
    };
  }

  const now = Date.now();
  const endTimestamp = matchTimestamp + 2 * 60 * 60 * 1000;

  if (now >= matchTimestamp && now < endTimestamp) {
    return {
      label: "LIVE",
      tone: "live",
    };
  }

  if (now >= endTimestamp) {
    return {
      label: "Finished",
      tone: "finished",
    };
  }

  const diff = matchTimestamp - now;
  const totalMinutes = Math.max(0, Math.floor(diff / 60000));
  const days = Math.floor(totalMinutes / (60 * 24));
  const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
  const minutes = totalMinutes % 60;

  if (days > 0) {
    return {
      label: `Starts in ${days}d ${hours}h`,
      tone: "upcoming",
    };
  }

  if (hours > 0) {
    return {
      label: `Starts in ${hours}h ${minutes}m`,
      tone: "upcoming",
    };
  }

  return {
    label: `Starts in ${minutes}m`,
    tone: "upcoming",
  };
}

function formatLocalKickoff(matchTimestamp: number | null): string {
  if (!matchTimestamp) return "Local time unavailable";

  try {
    return new Intl.DateTimeFormat("en-CA", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(matchTimestamp));
  } catch {
    return "Local time unavailable";
  }
}

export default function MatchPageClient({
  matchTimestamp,
}: MatchPageClientProps) {
  const [now, setNow] = useState<number>(Date.now());

  useEffect(() => {
    const interval = window.setInterval(() => {
      setNow(Date.now());
    }, 30000);

    return () => window.clearInterval(interval);
  }, []);

  const status = useMemo(() => {
    return getMatchStatus(matchTimestamp);
  }, [matchTimestamp, now]);

  const timingBadgeStyle = getTimingBadgeStyle(status.tone);
  const localKickoff = useMemo(() => {
    return formatLocalKickoff(matchTimestamp);
  }, [matchTimestamp]);

  return (
    <div
      style={{
        display: "grid",
        gap: "0.9rem",
      }}
    >
      <div
        style={{
          display: "flex",
          gap: "0.75rem",
          flexWrap: "wrap",
          alignItems: "center",
        }}
      >
        <span
          style={{
            padding: "0.45rem 0.8rem",
            borderRadius: "999px",
            fontSize: "0.85rem",
            fontWeight: 700,
            ...timingBadgeStyle,
          }}
        >
          {status.label}
        </span>

        <span
          style={{
            color: "#CBD5E1",
            fontSize: "0.95rem",
          }}
        >
          {localKickoff}
        </span>
      </div>

      <div
        style={{
          color: "#94A3B8",
          fontSize: "0.9rem",
          lineHeight: 1.5,
        }}
      >
        This block updates automatically for upcoming, live and finished match
        status.
      </div>
    </div>
  );
}