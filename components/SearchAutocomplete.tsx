"use client";

import { useMemo, useRef, useState } from "react";
import type { KeyboardEvent } from "react";
import type { SearchSuggestion } from "@/lib/search-suggestions";

type Props = {
  defaultValue: string;
  sport?: string;
  competition?: string;
  timeZone?: string;
  suggestions: SearchSuggestion[];
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
    requestAnimationFrame(() => inputRef.current?.form?.requestSubmit());
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
      <div className="v2-search-autocomplete">
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
          <div className="v2-search-suggestions" id="search-suggestions" role="listbox">
            {matches.map((suggestion, index) => (
              <button
                type="button"
                id={`search-suggestion-${index}`}
                role="option"
                aria-selected={index === activeIndex}
                className={index === activeIndex ? "is-active" : undefined}
                key={suggestion.id}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => chooseSuggestion(index)}
              >
                <span>{suggestion.label}</span>
                <small>{suggestion.kind}</small>
              </button>
            ))}
            <p className="v2-search-shortcuts" aria-hidden="true">
              ↑↓ navigate · Enter select · Esc close
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
