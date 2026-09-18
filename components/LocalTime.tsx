"use client";

import { useEffect, useMemo, useState } from "react";

type LocalTimeProps = {
  date: string;
  showYear?: boolean;
  showTimeZone?: boolean;
};

function formatStableFallback(date: Date) {
  return date.toISOString().replace("T", " ").slice(0, 16) + " UTC";
}

function formatLocal(date: Date, showYear: boolean) {
  try {
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
    return formatStableFallback(date);
  }
}

function localTimeZoneLabel(date: Date) {
  try {
    const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const abbreviation = new Intl.DateTimeFormat(undefined, { timeZoneName: "short" })
      .formatToParts(date)
      .find((part) => part.type === "timeZoneName")?.value;
    return [timeZone, abbreviation].filter(Boolean).join(" · ");
  } catch {
    return "Local time";
  }
}

export default function LocalTime({ date, showYear = false, showTimeZone = false }: LocalTimeProps) {
  const parsedDate = useMemo(() => new Date(date), [date]);
  const fallback = useMemo(() => formatStableFallback(parsedDate), [parsedDate]);

  const [local, setLocal] = useState(fallback);
  const [timeZone, setTimeZone] = useState("Local time");

  useEffect(() => {
    setLocal(formatLocal(parsedDate, showYear));
    if (showTimeZone) setTimeZone(localTimeZoneLabel(parsedDate));
  }, [parsedDate, showTimeZone, showYear]);

  return (
    <span style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
      <span suppressHydrationWarning>{local}</span>
      {showTimeZone ? <small className="v2-local-time-zone" suppressHydrationWarning>{timeZone}</small> : null}
    </span>
  );
}
