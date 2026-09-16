"use client";

import { useRouter } from "next/navigation";

type WindowFilter = "all" | "live" | "today" | "tonight" | "tomorrow" | "week";

type FilterState = {
  when: WindowFilter;
  sport: string;
  competition: string;
  query: string;
  timeZone: string;
};

const SPORT_FILTERS = [
  ["", "All", "▦"],
  ["football", "Football", "⚽"],
  ["basketball", "Basketball", "🏀"],
  ["hockey", "Hockey", "🏒"],
  ["formula-1", "Formula 1", "🏁"],
  ["tennis", "Tennis", "🎾"],
  ["ufc", "UFC", "🥊"],
  ["motogp", "MotoGP", "🏍"],
] as const;

const WINDOW_FILTERS = [
  ["all", "All current"],
  ["live", "Live"],
  ["today", "Today"],
  ["tonight", "Tonight"],
  ["tomorrow", "Tomorrow"],
  ["week", "This week"],
] as const;

function hrefWith(
  current: FilterState,
  patch: Partial<Pick<FilterState, "when" | "sport" | "competition" | "query">>,
): string {
  const next = { ...current, ...patch };
  const params = new URLSearchParams({ view: "all" });
  if (next.when !== "all") params.set("when", next.when);
  if (next.sport) params.set("sport", next.sport);
  if (next.competition) params.set("competition", next.competition);
  if (next.query) params.set("q", next.query);
  if (next.timeZone !== "UTC") params.set("tz", next.timeZone);
  return `/events?${params.toString()}`;
}

export default function EventsFilterNav({ state }: { state: FilterState }) {
  const router = useRouter();

  function navigate(patch: Partial<Pick<FilterState, "when" | "sport" | "competition" | "query">>) {
    router.push(hrefWith(state, patch), { scroll: false });
  }

  return (
    <>
      <nav className="wts-filter-pills" aria-label="Time filters">
        {WINDOW_FILTERS.map(([value, label]) => (
          <button
            className={state.when === value ? "is-active" : undefined}
            key={value}
            onClick={() => navigate({ when: value })}
            type="button"
          >
            {label}
          </button>
        ))}
      </nav>

      <nav className="wts-filter-pills wts-sport-filter-pills" aria-label="Sports filters">
        {SPORT_FILTERS.map(([value, label, icon]) => (
          <button
            className={state.sport === value ? "is-active" : undefined}
            key={label}
            onClick={() => navigate({ sport: value, competition: "" })}
            type="button"
          >
            <span aria-hidden="true">{icon}</span>
            {label}
          </button>
        ))}
      </nav>
    </>
  );
}
