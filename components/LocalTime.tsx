"use client";

import { useEffect, useMemo, useState } from "react";

type LocalTimeDisplay = "datetime" | "date" | "time";

type LocalTimeProps = {
  date: string;
  showYear?: boolean;
  showTimeZone?: boolean;
  display?: LocalTimeDisplay;
};

function formatStableFallback(date: Date, display: LocalTimeDisplay) {
  if (display === "time") return date.toISOString().slice(11, 16) + " UTC";
  if (display === "date") return date.toISOString().slice(0, 10) + " UTC";
  return date.toISOString().replace("T", " ").slice(0, 16) + " UTC";
}

function formatLocal(
  date: Date,
  showYear: boolean,
  display: LocalTimeDisplay,
) {
  try {
    if (display === "time") {
      return new Intl.DateTimeFormat(undefined, {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      }).format(date);
    }

    if (display === "date") {
      return new Intl.DateTimeFormat(undefined, {
        weekday: "short",
        day: "numeric",
        month: "short",
        ...(showYear ? { year: "numeric" as const } : {}),
      }).format(date);
    }

    return new Intl.DateTimeFormat(undefined, {
      weekday: "short",
      day: "numeric",
      month: "short",
      ...(showYear ? { year: "numeric" as const } : {}),
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).format(date);
  } catch {
    return formatStableFallback(date, display);
  }
}

function localTimeZoneLabel(date: Date) {
  try {
    const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const abbreviation = new Intl.DateTimeFormat(undefined, {
      timeZoneName: "short",
    })
      .formatToParts(date)
      .find((part) => part.type === "timeZoneName")?.value;

    return [timeZone, abbreviation].filter(Boolean).join(" · ");
  } catch {
    return "Local time";
  }
}

export default function LocalTime({
  date,
  showYear = false,
  showTimeZone = false,
  display = "datetime",
}: LocalTimeProps) {
  const parsedDate = useMemo(() => new Date(date), [date]);
  const fallback = useMemo(
    () => formatStableFallback(parsedDate, display),
    [display, parsedDate],
  );

  const [local, setLocal] = useState(fallback);
  const [timeZone, setTimeZone] = useState("Local time");

  useEffect(() => {
    setLocal(formatLocal(parsedDate, showYear, display));
    if (showTimeZone) setTimeZone(localTimeZoneLabel(parsedDate));
  }, [display, parsedDate, showTimeZone, showYear]);

  return (
    <span style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
      <span suppressHydrationWarning>{local}</span>
      {showTimeZone ? (
        <small className="v2-local-time-zone" suppressHydrationWarning>
          {timeZone}
        </small>
      ) : null}
    </span>
  );
}
