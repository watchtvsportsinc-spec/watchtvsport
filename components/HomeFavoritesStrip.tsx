"use client";

import Link from "next/link";
import { type FavoriteItem } from "@/lib/favorites";
import { useFavorites } from "@/lib/favorites-client";

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

function favoriteSport(item: FavoriteItem): string {
  if (item.event?.sport) return item.event.sport;
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

function sportGlyph(sport: string): string {
  if (sport === "football") return "⚽";
  if (sport === "basketball") return "🏀";
  if (sport === "hockey" || sport === "ice-hockey") return "🏒";
  if (sport === "formula-1" || sport === "f1") return "🏁";
  if (sport === "tennis") return "🎾";
  if (sport === "ufc" || sport === "mma") return "🥊";
  if (sport === "motogp" || sport === "motorcycle-racing") return "🏍";
  if (sport === "american-football") return "🏈";
  if (sport === "baseball") return "⚾";
  return "●";
}

function displayLabel(item: FavoriteItem): string {
  if (item.kind === "participant") {
    return item.label.replace(/\s*\((?:football|soccer|basketball|ice hockey|hockey|tennis|motorsports?|formula 1|f1|mma|ufc|baseball|american football)\)\s*$/i, "").trim();
  }
  return item.label;
}

export default function HomeFavoritesStrip() {
  const collection = useFavorites();

  if (collection.items.length === 0) {
    return (
      <section className="wts-home-section wts-home-favorites" aria-labelledby="home-favorites-title">
        <div className="wts-home-section-heading"><div><span className="wts-section-icon" aria-hidden="true">★</span><h2 id="home-favorites-title">Your favorites</h2></div><Link href="/favorites">Add favorites →</Link></div>
        <div className="wts-home-favorites-empty"><strong>Your teams and competitions will appear here.</strong><span>Save what you follow to reach it in one tap.</span></div>
      </section>
    );
  }

  const visible = collection.items.slice(0, 15);

  return (
    <section className="wts-home-section wts-home-favorites" aria-labelledby="home-favorites-title">
      <div className="wts-home-section-heading"><div><span className="wts-section-icon" aria-hidden="true">★</span><h2 id="home-favorites-title">Your favorites</h2></div><Link href="/favorites">View all →</Link></div>
      <div className="wts-favorites-rail">
        {visible.map((item) => {
          const sport = favoriteSport(item);
          return (
            <Link className="wts-favorite-tile wts-favorite-name-only" href={fallbackHref(item)} key={`${item.kind}:${item.entityId}`}>
              <span className="wts-favorite-mini-glyph" aria-hidden="true">{sportGlyph(sport)}</span>
              <strong>{displayLabel(item)}</strong>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
