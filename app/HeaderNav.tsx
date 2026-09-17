"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { buildSearchSuggestions, type SearchSuggestion } from "@/lib/search-suggestions";

const links = [
  { href: "/events", label: "Events" },
  { href: "/sports", label: "Sports" },
];

const headerSuggestions = buildSearchSuggestions([]);

function normalize(value: string): string {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
}

function scoreSuggestion(suggestion: SearchSuggestion, query: string): number {
  const q = normalize(query);
  if (!q) return -1;
  let best = -1;
  for (const term of [suggestion.value, suggestion.label, ...suggestion.searchTerms]) {
    const normalizedTerm = normalize(term);
    if (normalizedTerm === q) best = Math.max(best, 100);
    else if (normalizedTerm.startsWith(q)) best = Math.max(best, 80);
    else if (normalizedTerm.split(/\s+/).some((part) => part.startsWith(q))) best = Math.max(best, 65);
    else if (normalizedTerm.includes(q)) best = Math.max(best, 45);
  }
  if (best >= 0) {
    if (suggestion.kind === "Sport") best += 8;
    if (suggestion.kind === "Club" || suggestion.kind === "Nation") best += 6;
    if (suggestion.kind === "Competition") best += 4;
  }
  return best;
}

function sportsIsActive(pathname: string): boolean {
  return pathname.startsWith("/sports") || pathname.startsWith("/football") || pathname.startsWith("/formula-1") || pathname.startsWith("/motorsports") || pathname.startsWith("/combat-sports") || pathname.startsWith("/ufc");
}

export default function HeaderNav() {
  const pathname = usePathname();
  const router = useRouter();
  const homeIsActive = pathname === "/";
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);

  const matches = useMemo(() => {
    if (!query.trim()) return [];
    return headerSuggestions
      .map((suggestion) => ({ suggestion, score: scoreSuggestion(suggestion, query) }))
      .filter((item) => item.score >= 0)
      .sort((a, b) => b.score - a.score || a.suggestion.label.localeCompare(b.suggestion.label))
      .slice(0, 7)
      .map((item) => item.suggestion);
  }, [query]);

  function goToSuggestion(suggestion: SearchSuggestion) {
    setOpen(false);
    setActiveIndex(-1);
    setQuery(suggestion.value);
    router.push(suggestion.href);
  }

  function submitSearch(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = query.trim();
    if (!trimmed) return;

    if (activeIndex >= 0 && matches[activeIndex]) {
      goToSuggestion(matches[activeIndex]);
      return;
    }

    const normalizedQuery = normalize(trimmed);
    const exact = headerSuggestions.find((suggestion) =>
      [suggestion.value, suggestion.label, ...suggestion.searchTerms].some((term) => normalize(term) === normalizedQuery),
    );
    if (exact) {
      goToSuggestion(exact);
      return;
    }

    setOpen(false);
    router.push(`/events?q=${encodeURIComponent(trimmed)}`);
  }

  return (
    <nav className="wts-primary-nav" aria-label="Primary navigation">
      <div className="wts-nav-links">
        <Link className={homeIsActive ? "is-active" : undefined} href="/">Home</Link>
        {links.map((link) => {
          const active = (pathname === "/events" && (link.label === "Events" || link.label === "Calendar")) || (link.label === "Sports" && sportsIsActive(pathname));
          return <Link className={active ? "is-active" : undefined} key={link.label} href={link.href}>{link.label}</Link>;
        })}
      </div>

      <div className="wts-nav-actions">
        <form
          className={`wts-header-search${pathname === "/events" ? " is-page-search-duplicate" : ""}`}
          action="/events"
          method="get"
          role="search"
          onSubmit={submitSearch}
          onBlur={(event) => {
            if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
              setOpen(false);
              setActiveIndex(-1);
            }
          }}
        >
          <label className="sr-only" htmlFor="wts-header-search-input">Search teams, competitions and events</label>
          <button className="wts-header-search-submit" type="submit" aria-label="Search">
            <svg className="wts-header-search-icon" aria-hidden="true" viewBox="0 0 24 24" fill="none">
              <circle cx="11" cy="11" r="6.5" stroke="currentColor" strokeWidth="1.8" />
              <path d="m16 16 4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          </button>
          <input
            id="wts-header-search-input"
            name="q"
            type="search"
            placeholder="Search for teams, competitions..."
            autoComplete="off"
            value={query}
            aria-autocomplete="list"
            aria-expanded={open && matches.length > 0}
            aria-controls="wts-header-search-results"
            aria-activedescendant={activeIndex >= 0 && matches[activeIndex] ? `wts-header-search-result-${activeIndex}` : undefined}
            onFocus={() => setOpen(true)}
            onChange={(event) => {
              setQuery(event.target.value);
              setOpen(true);
              setActiveIndex(-1);
            }}
            onKeyDown={(event) => {
              if (event.key === "Escape") {
                setOpen(false);
                setActiveIndex(-1);
                return;
              }
              if (!open || matches.length === 0) return;
              if (event.key === "ArrowDown") {
                event.preventDefault();
                setActiveIndex((current) => Math.min(current + 1, matches.length - 1));
              } else if (event.key === "ArrowUp") {
                event.preventDefault();
                setActiveIndex((current) => Math.max(current - 1, 0));
              }
            }}
          />
          {open && matches.length > 0 ? (
            <ul id="wts-header-search-results" className="wts-header-search-results" role="listbox">
              {matches.map((suggestion, index) => (
                <li key={suggestion.id} id={`wts-header-search-result-${index}`} role="option" aria-selected={index === activeIndex}>
                  <button
                    className={index === activeIndex ? "is-active" : undefined}
                    type="button"
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => goToSuggestion(suggestion)}
                  >
                    <span>
                      <strong>{suggestion.label}</strong>
                      <small>{suggestion.kind}</small>
                    </span>
                    <b aria-hidden="true">›</b>
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </form>

        <Link
          aria-label="Open favorites"
          className={`wts-nav-favorites${pathname === "/favorites" ? " is-active" : ""}`}
          href="/favorites"
        >
          <span aria-hidden="true">★</span>
          <span>Favorites</span>
        </Link>
      </div>
    </nav>
  );
}
