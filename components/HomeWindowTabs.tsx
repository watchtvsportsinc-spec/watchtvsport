"use client";

import { useRouter } from "next/navigation";

type HomeWindow = "live" | "tonight" | "tomorrow" | "week";

export default function HomeWindowTabs({
  activeWindow,
  counts,
  timeZone,
}: {
  activeWindow: HomeWindow;
  counts: Record<HomeWindow, number>;
  timeZone: string;
}) {
  const router = useRouter();

  function openWindow(window: HomeWindow) {
    const params = new URLSearchParams({ when: window });
    if (timeZone !== "UTC") params.set("tz", timeZone);
    router.push(`/?${params.toString()}#home-schedule`, { scroll: false });
  }

  return (
    <div className="wts-home-window-tabs" role="navigation" aria-label="Schedule period">
      {([
        ["live", "Live", counts.live],
        ["tonight", "Tonight", counts.tonight],
        ["tomorrow", "Tomorrow", counts.tomorrow],
        ["week", "This week", counts.week],
      ] as const).map(([value, label, count]) => (
        <button
          className={activeWindow === value ? "is-active" : undefined}
          key={value}
          onClick={() => openWindow(value)}
          type="button"
        >
          {value === "live" ? <i aria-hidden="true" /> : null}
          {label}
          <span>{count}</span>
        </button>
      ))}
    </div>
  );
}
