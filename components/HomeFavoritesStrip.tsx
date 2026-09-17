"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { buildFavoriteLookup, type FavoriteEventFeed, type FavoriteEventSummary, type FavoriteItem } from "@/lib/favorites";
import { useFavorites } from "@/lib/favorites-client";

type FeedState = { key: string; data: FavoriteEventFeed | null };

function normalize(value: string): string {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
}

function isFeed(value: unknown): value is FavoriteEventFeed {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const candidate = value as Record<string, unknown>;
  return Array.isArray(candidate.exactEvents) && Array.isArray(candidate.upcomingEvents);
}

function favoriteSport(item: FavoriteItem, event?: FavoriteEventSummary): string {
  if (event?.sport) return event.sport;
  if (item.kind === "participant") {
    const match = item.entityId.match(/^club:([^:]+):/);
    if (match) return match[1];
  }
  if (item.kind === "competition") {
    const separator = item.entityId.indexOf(":");
    if (separator > 0) return item.entityId.slice(0, separator);
  }
  return "all";
}

function sportClass(sport: string): string {
  if (sport === "football") return "football";
  if (sport === "basketball") return "basketball";
  if (sport === "hockey" || sport === "ice-hockey") return "hockey";
  if (sport === "formula-1" || sport === "f1") return "formula-1";
  if (sport === "tennis") return "tennis";
  if (sport === "ufc" || sport === "mma") return "ufc";
  if (sport === "motogp" || sport === "motorcycle-racing") return "motogp";
  return "all";
}

function sportGlyph(sport: string): string {
  if (sport === "football") return "⚽";
  if (sport === "basketball") return "🏀";
  if (sport === "hockey" || sport === "ice-hockey") return "🏒";
  if (sport === "formula-1" || sport === "f1") return "🏁";
  if (sport === "tennis") return "🎾";
  if (sport === "ufc" || sport === "mma") return "🥊";
  if (sport === "motogp" || sport === "motorcycle-racing") return "🏍";
  return "●";
}

function fallbackHref(item: FavoriteItem): string {
  if (item.href) return item.href;
  if (item.kind === "participant") {
    const club = item.entityId.match(/^club:([^:]+):(.+)$/);
    if (club) return `/sports/${club[1]}/club/${club[2]}`;
  }
  if (item.kind === "competition") {
    const separator = item.entityId.indexOf(":");
    if (separator > 0) return `/sports/${item.entityId.slice(0, separator)}/competition/${item.entityId.slice(separator + 1)}`;
  }
  return "/favorites";
}

function nextEventFor(item: FavoriteItem, events: FavoriteEventSummary[]): FavoriteEventSummary | undefined {
  const label = normalize(item.label);
  if (item.kind === "competition") {
    return events.find((event) => normalize(event.competition) === label || normalize(event.competition).includes(label));
  }
  if (item.kind === "participant") {
    return events.find((event) => event.participantNames.some((name) => normalize(name) === label || normalize(name).includes(label) || label.includes(normalize(name))));
  }
  return events.find((event) => event.id === item.entityId);
}

function formatNext(dateValue: string): string {
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return "Date TBC";
  const now = new Date();
  const sameDay = date.toDateString() === now.toDateString();
  const tomorrow = new Date(now);
  tomorrow.setDate(now.getDate() + 1);
  const isTomorrow = date.toDateString() === tomorrow.toDateString();
  const time = new Intl.DateTimeFormat(undefined, { hour: "2-digit", minute: "2-digit" }).format(date);
  if (sameDay) return `Today ${time}`;
  if (isTomorrow) return `Tomorrow ${time}`;
  return new Intl.DateTimeFormat(undefined, { weekday: "short", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }).format(date);
}

export default function HomeFavoritesStrip() {
  const collection = useFavorites();
  const [feed, setFeed] = useState<FeedState | null>(null);
  const lookup = useMemo(() => buildFavoriteLookup(collection.items), [collection.items]);
  const key = JSON.stringify(lookup);

  useEffect(() => {
    if (collection.items.length === 0) return;
    const controller = new AbortController();
    void fetch("/api/favorites/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: key,
      signal: controller.signal,
    }).then(async (response) => {
      if (!response.ok) return;
      const value: unknown = await response.json();
      if (isFeed(value)) setFeed({ key, data: value });
    }).catch(() => undefined);
    return () => controller.abort();
  }, [collection.items.length, key]);

  if (collection.items.length === 0) {
    return (
      <section className="wts-home-section wts-home-favorites" aria-labelledby="home-favorites-title">
        <div className="wts-home-section-heading"><div><span className="wts-section-icon" aria-hidden="true">★</span><h2 id="home-favorites-title">Your favorites</h2></div><Link href="/favorites">Add favorites →</Link></div>
        <div className="wts-home-favorites-empty"><strong>Your teams and competitions will appear here.</strong><span>Save what you follow to reach the next event in one tap.</span></div>
      </section>
    );
  }

  const events = feed?.key === key ? feed.data?.upcomingEvents ?? [] : [];
  const visible = collection.items.slice(0, 6);

  return (
    <section className="wts-home-section wts-home-favorites" aria-labelledby="home-favorites-title">
      <div className="wts-home-section-heading"><div><span className="wts-section-icon" aria-hidden="true">★</span><h2 id="home-favorites-title">Your favorites</h2></div><Link href="/favorites">View all →</Link></div>
      <div className="wts-favorites-rail">
        {visible.map((item) => {
          const event = nextEventFor(item, events);
          const sport = favoriteSport(item, event);
          const href = event?.detailPath ?? fallbackHref(item);
          return (
            <Link className={`wts-favorite-tile wts-sport-bg wts-bg-${sportClass(sport)}`} href={href} key={`${item.kind}:${item.entityId}`}>
              <span className="wts-favorite-glyph" aria-hidden="true">{sportGlyph(sport)}</span>
              <span className="wts-favorite-copy">
                <strong>{item.label}</strong>
                {event ? <><small>{formatNext(event.eventDate)}</small><span>{event.title}</span></> : null}
              </span>
              <b aria-hidden="true">›</b>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
