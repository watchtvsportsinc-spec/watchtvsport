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
  searchPath?: string;
};

const GROUP_ORDER: SearchSuggestion["kind"][] = ["Sport", "Club", "Nation", "Grand Prix", "UFC Event", "Competition"];

function normalize(value: string): string {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
}

function scoreSuggestion(suggestion: SearchSuggestion, query: string): number {
  const normalizedQuery = normalize(query);
  if (!normalizedQuery) return -1;
  const terms = suggestion.searchTerms.map(normalize);
  let best = -1;
  for (const term of terms) {
    if (term === normalizedQuery) best = Math.max(best, 100);
    else if (term.startsWith(normalizedQuery)) best = Math.max(best, 80);
    else if (term.split(/\s+/).some((part) => part.startsWith(normalizedQuery))) best = Math.max(best, 65);
    else if (term.includes(normalizedQuery)) best = Math.max(best, 45);
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
  if (url.pathname === "/" || url.pathname === "/events") url.searchParams.set("tz", timeZone);
  return `${url.pathname}${url.search}${url.hash}`;
}

function kindIcon(kind: SearchSuggestion["kind"]): string {
  if (kind === "Club") return "◆";
  if (kind === "Nation") return "◎";
  if (kind === "Competition") return "🏆";
  if (kind === "Grand Prix") return "◉";
  if (kind === "UFC Event") return "◇";
  return "●";
}

export default function SearchAutocomplete({ defaultValue, sport, competition, timeZone, suggestions, searchPath = "/" }: Props) {
  const router = useRouter();
  const [query, setQuery] = useState(defaultValue ?? "");
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const rootRef = useRef<HTMLDivElement>(null);

  const matches = useMemo(() => suggestions
    .map((suggestion) => ({ suggestion, score: scoreSuggestion(suggestion, query) }))
    .filter((item) => item.score >= 0)
    .sort((a, b) => b.score !== a.score ? b.score - a.score : GROUP_ORDER.indexOf(a.suggestion.kind) - GROUP_ORDER.indexOf(b.suggestion.kind) || a.suggestion.label.localeCompare(b.suggestion.label))
    .slice(0, 10)
    .map((item) => item.suggestion), [query, suggestions]);

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
    router.push(`${searchPath}?${params.toString()}`);
    setOpen(false);
  }

  return (
    <form className="wts-search" role="search" onSubmit={(event) => {
      event.preventDefault();
      if (activeIndex >= 0 && matches[activeIndex]) selectSuggestion(matches[activeIndex]);
      else submitSearch();
    }}>
      <div className="wts-search-root" ref={rootRef}>
        <label className="sr-only" htmlFor="global-sports-search">Search teams, competitions or events</label>
        <span className="wts-search-icon" aria-hidden="true">⌕</span>
        <input
          id="global-sports-search"
          type="search"
          autoComplete="off"
          value={query}
          placeholder="Search a team, competition or event…"
          aria-autocomplete="list"
          aria-expanded={open && matches.length > 0}
          aria-controls="global-sports-search-results"
          aria-activedescendant={activeIndex >= 0 && matches[activeIndex] ? `search-result-${activeIndex}` : undefined}
          onFocus={() => setOpen(true)}
          onChange={(event) => { setQuery(event.target.value); setOpen(true); setActiveIndex(-1); }}
          onKeyDown={(event) => {
            if (!open || matches.length === 0) return;
            if (event.key === "ArrowDown") { event.preventDefault(); setActiveIndex((current) => Math.min(current + 1, matches.length - 1)); }
            else if (event.key === "ArrowUp") { event.preventDefault(); setActiveIndex((current) => Math.max(current - 1, 0)); }
            else if (event.key === "Escape") { setOpen(false); setActiveIndex(-1); }
          }}
        />
        <button className="wts-search-submit" type="submit" aria-label="Search">Search</button>

        {open && query.trim() && matches.length > 0 ? (
          <ul id="global-sports-search-results" className="wts-search-results" role="listbox">
            {matches.map((suggestion, index) => (
              <li key={suggestion.id} id={`search-result-${index}`} role="option" aria-selected={index === activeIndex}>
                <button className={index === activeIndex ? "is-active" : undefined} type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => selectSuggestion(suggestion)}>
                  <span className="wts-search-result-icon" aria-hidden="true">{kindIcon(suggestion.kind)}</span>
                  <span><strong>{suggestion.label}</strong><small>{suggestion.kind}</small></span>
                  <b aria-hidden="true">→</b>
                </button>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </form>
  );
}
