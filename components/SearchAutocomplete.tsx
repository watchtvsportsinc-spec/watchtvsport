"use client";

import { useMemo, useRef, useState } from "react";
import type { CSSProperties, KeyboardEvent } from "react";
import type { SearchSuggestion } from "@/lib/search-suggestions";

type Props = {
  defaultValue: string;
  sport?: string;
  competition?: string;
  timeZone?: string;
  suggestions: SearchSuggestion[];
};

const suggestionPanelStyle: CSSProperties = {
  position: "absolute",
  top: "calc(100% + 6px)",
  left: 0,
  right: 0,
  zIndex: 40,
  overflow: "hidden",
  border: "1px solid rgba(147, 197, 253, 0.25)",
  borderRadius: 12,
  background: "#0b1220",
  boxShadow: "0 18px 48px rgba(0, 0, 0, 0.35)",
};

const suggestionButtonStyle: CSSProperties = {
  display: "flex",
  width: "100%",
  minHeight: 44,
  alignItems: "center",
  justifyContent: "space-between",
  gap: 12,
  border: 0,
  borderBottom: "1px solid rgba(255, 255, 255, 0.07)",
  borderRadius: 0,
  background: "transparent",
  color: "#f8fafc",
  padding: "10px 12px",
  textAlign: "left",
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
    if (suggestion.kind === "Team") best += 8;
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
  const [value, setValue] = useState(defaultValue);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const matches = useMemo(() => {
    const query = value.trim();
    if (!query) return [];

    return suggestions
      .map((suggestion) => ({ suggestion, score: scoreSuggestion(suggestion, query) }))
      .filter((item) => item.score >= 0)
      .sort((a, b) => b.score - a.score || a.suggestion.label.localeCompare(b.suggestion.label))
      .slice(0, 8)
      .map((item) => item.suggestion);
  }, [suggestions, value]);

  const isOpen = isFocused && matches.length > 0;

  function chooseSuggestion(index: number) {
    const suggestion = matches[index];
    if (!suggestion) return;

    setValue(suggestion.value);
    setActiveIndex(-1);
    window.location.assign(withTimeZone(suggestion.href, timeZone));
  }

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (!isOpen && event.key !== "ArrowDown") return;

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((current) => (current + 1) % matches.length);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((current) => (current <= 0 ? matches.length - 1 : current - 1));
    } else if (event.key === "Enter" && activeIndex >= 0) {
      event.preventDefault();
      chooseSuggestion(activeIndex);
    } else if (event.key === "Escape") {
      event.preventDefault();
      setActiveIndex(-1);
      setIsFocused(false);
      inputRef.current?.blur();
    }
  }

  return (
    <form className="v2-search" action="/" method="get" role="search">
      <label htmlFor="event-search">Team, competition or event</label>
      <div style={{ position: "relative" }}>
        <div className="v2-search-row">
          <input
            ref={inputRef}
            id="event-search"
            name="q"
            type="search"
            value={value}
            onChange={(event) => {
              setValue(event.target.value);
              setActiveIndex(-1);
            }}
            onFocus={() => setIsFocused(true)}
            onBlur={() => window.setTimeout(() => setIsFocused(false), 120)}
            onKeyDown={onKeyDown}
            maxLength={100}
            placeholder="Search PSG, Barça, Champions League..."
            autoComplete="off"
            aria-autocomplete="list"
            aria-expanded={isOpen}
            aria-controls="search-suggestions"
            aria-activedescendant={
              activeIndex >= 0 ? `search-suggestion-${activeIndex}` : undefined
            }
          />
          <button type="submit">Search</button>
        </div>

        {isOpen ? (
          <div id="search-suggestions" role="listbox" style={suggestionPanelStyle}>
            {matches.map((suggestion, index) => (
              <button
                type="button"
                id={`search-suggestion-${index}`}
                role="option"
                aria-selected={index === activeIndex}
                key={suggestion.id}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => chooseSuggestion(index)}
                style={{
                  ...suggestionButtonStyle,
                  background: index === activeIndex ? "#1e3a8a" : "transparent",
                }}
              >
                <span style={{ fontWeight: 800 }}>{suggestion.label}</span>
                <small style={{ color: "#93c5fd", fontWeight: 800 }}>
                  {suggestion.kind}
                </small>
              </button>
            ))}
            <p
              aria-hidden="true"
              style={{
                margin: 0,
                padding: "8px 12px",
                color: "#94a3b8",
                fontSize: 12,
                fontWeight: 700,
              }}
            >
              ↑↓ navigate · Enter open · Esc close
            </p>
          </div>
        ) : null}
      </div>

      <input type="hidden" name="view" value="all" />
      {sport ? <input type="hidden" name="sport" value={sport} /> : null}
      {competition ? <input type="hidden" name="competition" value={competition} /> : null}
      {timeZone && timeZone !== "UTC" ? (
        <input type="hidden" name="tz" value={timeZone} />
      ) : null}
    </form>
  );
}
