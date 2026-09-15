"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { SearchSuggestion } from "@/lib/search-suggestions";

type Props = {
  defaultValue?: string;
  sport?: string;
  competition?: string;
  timeZone?: string;
  suggestions: SearchSuggestion[];
};

const GROUP_ORDER: SearchSuggestion["kind"][] = [
  "Sport",
  "Club",
  "Nation",
  "Grand Prix",
  "UFC Event",
  "Competition",
];

const FORM_STYLE = {
  marginTop: "1.25rem",
  position: "relative" as const,
  maxWidth: "720px",
};

const INPUT_STYLE = {
  width: "100%",
  minHeight: "50px",
  borderRadius: "14px",
  border: "1px solid rgba(255,255,255,0.18)",
  background: "rgba(255,255,255,0.08)",
  color: "inherit",
  padding: "0 16px",
  fontSize: "1rem",
};

const LIST_STYLE = {
  position: "absolute" as const,
  zIndex: 20,
  top: "calc(100% + 8px)",
  left: 0,
  right: 0,
  margin: 0,
  padding: "8px",
  listStyle: "none",
  background: "#111827",
  border: "1px solid rgba(255,255,255,0.14)",
  borderRadius: "14px",
  boxShadow: "0 18px 40px rgba(0,0,0,0.28)",
  maxHeight: "420px",
  overflowY: "auto" as const,
};

const BUTTON_STYLE = {
  width: "100%",
  border: 0,
  borderRadius: "10px",
  background: "transparent",
  color: "inherit",
  cursor: "pointer",
  padding: "10px 12px",
  textAlign: "left" as const,
};

function normalize(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function scoreSuggestion(suggestion: SearchSuggestion, query: string): number {
  const normalizedQuery = normalize(query);
  if (!normalizedQuery) return -1;

  const terms = suggestion.searchTerms.map(normalize);
  let best = -1;

  for (const term of terms) {
    if (term === normalizedQuery) best = Math.max(best, 100);
    else if (term.startsWith(normalizedQuery)) best = Math.max(best, 80);
    else if (term.split(/\s+/).some((part) => part.startsWith(normalizedQuery))) {
      best = Math.max(best, 65);
    } else if (term.includes(normalizedQuery)) best = Math.max(best, 45);
  }

  if (best >= 0) {
    if (suggestion.kind === "Sport") best += 14;
    if (suggestion.kind === "Club" || suggestion.kind === "Nation") best += 8;
    if (suggestion.kind === "UFC Event" || suggestion.kind === "Grand Prix") best += 6;
    if (suggestion.kind === "Competition") best += 4;
  }

  return best;
}

function withTimeZone(href: string, timeZone?: string): string {
  if (!timeZone || timeZone === "UTC") return href;

  const url = new URL(href, window.location.origin);
  if (url.origin !== window.location.origin) return href;
  if (url.pathname === "/") url.searchParams.set("tz", timeZone);
  return `${url.pathname}${url.search}${url.hash}`;
}

export default function SearchAutocomplete({
  defaultValue,
  sport,
  competition,
  timeZone,
  suggestions,
}: Props) {
  const router = useRouter();
  const [query, setQuery] = useState(defaultValue ?? "");
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const rootRef = useRef<HTMLDivElement>(null);

  const matches = useMemo(() => {
    return suggestions
      .map((suggestion) => ({ suggestion, score: scoreSuggestion(suggestion, query) }))
      .filter((item) => item.score >= 0)
      .sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        const kindDelta =
          GROUP_ORDER.indexOf(a.suggestion.kind) - GROUP_ORDER.indexOf(b.suggestion.kind);
        if (kindDelta !== 0) return kindDelta;
        return a.suggestion.label.localeCompare(b.suggestion.label);
      })
      .slice(0, 12)
      .map((item) => item.suggestion);
  }, [query, suggestions]);

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, []);

  function selectSuggestion(suggestion: SearchSuggestion) {
    setQuery(suggestion.value);
    setOpen(false);
    setActiveIndex(-1);
    router.push(withTimeZone(suggestion.href, timeZone));
  }

  function submitSearch() {
    const params = new URLSearchParams({ view: "all" });
    const trimmed = query.trim();
    if (trimmed) params.set("q", trimmed);
    if (sport) params.set("sport", sport);
    if (competition) params.set("competition", competition);
    if (timeZone && timeZone !== "UTC") params.set("tz", timeZone);
    router.push(`/?${params.toString()}`);
    setOpen(false);
  }

  return (
    <form
      role="search"
      style={FORM_STYLE}
      onSubmit={(event) => {
        event.preventDefault();
        if (activeIndex >= 0 && matches[activeIndex]) selectSuggestion(matches[activeIndex]);
        else submitSearch();
      }}
    >
      <div ref={rootRef}>
        <label className="sr-only" htmlFor="global-sports-search">
          Search sports, clubs, nations, competitions, Grand Prix or UFC events
        </label>
        <input
          id="global-sports-search"
          type="search"
          autoComplete="off"
          value={query}
          placeholder="Search a sport, club, nation, competition or event"
          style={INPUT_STYLE}
          aria-autocomplete="list"
          aria-expanded={open && matches.length > 0}
          aria-controls="global-sports-search-results"
          aria-activedescendant={activeIndex >= 0 && matches[activeIndex] ? `search-result-${activeIndex}` : undefined}
          onFocus={() => setOpen(true)}
          onChange={(event) => {
            setQuery(event.target.value);
            setOpen(true);
            setActiveIndex(-1);
          }}
          onKeyDown={(event) => {
            if (!open || matches.length === 0) return;
            if (event.key === "ArrowDown") {
              event.preventDefault();
              setActiveIndex((current) => Math.min(current + 1, matches.length - 1));
            } else if (event.key === "ArrowUp") {
              event.preventDefault();
              setActiveIndex((current) => Math.max(current - 1, 0));
            } else if (event.key === "Escape") {
              setOpen(false);
              setActiveIndex(-1);
            }
          }}
        />

        {open && matches.length > 0 ? (
          <ul id="global-sports-search-results" role="listbox" style={LIST_STYLE}>
            {matches.map((suggestion, index) => (
              <li key={suggestion.id} id={`search-result-${index}`} role="option" aria-selected={index === activeIndex}>
                <button
                  type="button"
                  style={{ ...BUTTON_STYLE, background: index === activeIndex ? "rgba(255,255,255,0.1)" : "transparent" }}
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => selectSuggestion(suggestion)}
                >
                  <strong>{suggestion.label}</strong>
                  <span style={{ display: "block", opacity: 0.68, marginTop: 2 }}>{suggestion.kind}</span>
                </button>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </form>
  );
}
