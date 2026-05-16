"use client";

import { useEffect, useState } from "react";

type MatchStatusBadgeProps = {
  matchDate: string;
  liveDurationMinutes?: number;
};

function getStatus(matchDate: string, liveDurationMinutes: number) {
  const startTime = new Date(matchDate).getTime();
  const now = Date.now();
  const liveEndTime = startTime + liveDurationMinutes * 60 * 1000;

  if (!Number.isFinite(startTime)) {
    return {
      label: "",
      status: "unknown" as const,
    };
  }

  if (now >= startTime && now <= liveEndTime) {
    return {
      label: "LIVE",
      status: "live" as const,
    };
  }

  if (now > liveEndTime) {
    return {
      label: "Finished",
      status: "finished" as const,
    };
  }

  const diffMs = startTime - now;
  const totalMinutes = Math.max(0, Math.floor(diffMs / 60000));
  const days = Math.floor(totalMinutes / (60 * 24));
  const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
  const minutes = totalMinutes % 60;

  if (days > 0) {
    return {
      label: `Starts in ${days}d ${hours}h`,
      status: "upcoming" as const,
    };
  }

  if (hours > 0) {
    return {
      label: `Starts in ${hours}h ${minutes}m`,
      status: "upcoming" as const,
    };
  }

  return {
    label: `Starts in ${minutes}m`,
    status: "upcoming" as const,
  };
}

export default function MatchStatusBadge({
  matchDate,
  liveDurationMinutes = 120,
}: MatchStatusBadgeProps) {
  const [status, setStatus] = useState(() =>
    getStatus(matchDate, liveDurationMinutes)
  );

  useEffect(() => {
    setStatus(getStatus(matchDate, liveDurationMinutes));

    const interval = window.setInterval(() => {
      setStatus(getStatus(matchDate, liveDurationMinutes));
    }, 60000);

    return () => window.clearInterval(interval);
  }, [matchDate, liveDurationMinutes]);

  if (!status.label) {
    return null;
  }

  const isLive = status.status === "live";
  const isFinished = status.status === "finished";

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "0.35rem",
        width: "fit-content",
        borderRadius: "999px",
        padding: "0.22rem 0.5rem",
        fontSize: "0.72rem",
        fontWeight: 900,
        lineHeight: 1,
        whiteSpace: "nowrap",
        color: isLive ? "#FFFFFF" : isFinished ? "#CBD5E1" : "#BFDBFE",
        background: isLive
          ? "#DC2626"
          : isFinished
            ? "rgba(148,163,184,0.12)"
            : "rgba(59,130,246,0.16)",
        border: isLive
          ? "1px solid rgba(248,113,113,0.75)"
          : isFinished
            ? "1px solid rgba(148,163,184,0.18)"
            : "1px solid rgba(59,130,246,0.25)",
        boxShadow: isLive ? "0 0 14px rgba(220,38,38,0.28)" : "none",
      }}
    >
      {isLive ? (
        <span
          aria-hidden="true"
          style={{
            width: "0.42rem",
            height: "0.42rem",
            borderRadius: "999px",
            background: "#FFFFFF",
            display: "inline-block",
          }}
        />
      ) : null}
      {status.label}
    </span>
  );
}