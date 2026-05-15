"use client";

import { useEffect, useMemo, useState } from "react";

type LocalTimeProps = {
  date: string;
};

function formatStableFallback(date: Date) {
  return date.toISOString().replace("T", " ").slice(0, 16) + " UTC";
}

function formatLocal(date: Date) {
  try {
    return new Intl.DateTimeFormat(undefined, {
      weekday: "short",
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).format(date);
  } catch {
    return formatStableFallback(date);
  }
}

export default function LocalTime({ date }: LocalTimeProps) {
  const parsedDate = useMemo(() => new Date(date), [date]);
  const fallback = useMemo(() => formatStableFallback(parsedDate), [parsedDate]);

  const [local, setLocal] = useState(fallback);

  useEffect(() => {
    setLocal(formatLocal(parsedDate));
  }, [parsedDate]);

  return (
    <span style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
      <span suppressHydrationWarning>{local}</span>
    </span>
  );
}