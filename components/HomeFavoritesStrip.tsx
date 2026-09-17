"use client";

import Link from "next/link";
import { type FavoriteItem } from "@/lib/favorites";
import { toggleFavorite, useFavorites } from "@/lib/favorites-client";

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

function normalizeSport(value: string): string {
  const sport = value.trim().toLowerCase().replace(/_/g, "-").replace(/\s+/g, "-");
  if (sport === "soccer") return "football";
  if (sport === "ice-hockey") return "hockey";
  if (sport === "f1" || sport === "formula1") return "formula-1";
  if (sport === "mma") return "ufc";
  if (sport === "motorcycle-racing" || sport === "motorcycling") return "motogp";
  return sport;
}

function knownSport(value: string): string | null {
  const sport = normalizeSport(value);
  return [
    "football",
    "basketball",
    "hockey",
    "tennis",
    "formula-1",
    "ufc",
    "motogp",
    "rugby",
    "baseball",
    "american-football",
    "cycling",
  ].includes(sport) ? sport : null;
}

function sportFromHref(href?: string): string | null {
  if (!href) return null;
  const path = href.split(/[?#]/, 1)[0];
  const sportsMatch = path.match(/^\/sports\/([^/]+)/);
  if (sportsMatch) return knownSport(sportsMatch[1]);
  if (path === "/football" || path.startsWith("/football/")) return "football";
  if (path === "/formula-1" || path.startsWith("/formula-1/")) return "formula-1";
  if (path === "/motorsports" || path.startsWith("/motorsports/")) return "formula-1";
  if (path === "/combat-sports" || path.startsWith("/combat-sports/") || path === "/ufc" || path.startsWith("/ufc/")) return "ufc";
  return null;
}

function sportFromLabel(label: string): string | null {
  const match = label.match(/\((football|soccer|basketball|ice hockey|hockey|tennis|motorsports?|formula 1|f1|mma|ufc|motogp|motorcycle racing|rugby|baseball|american football|cycling)\)\s*$/i);
  return match ? knownSport(match[1]) : null;
}

function favoriteSport(item: FavoriteItem): string {
  const eventSport = item.event?.sport ? knownSport(item.event.sport) : null;
  if (eventSport) return eventSport;

  if (item.kind === "participant") {
    const match = item.entityId.match(/^club:([^:]+):/);
    const participantSport = match ? knownSport(match[1]) : null;
    if (participantSport) return participantSport;
  }

  if (item.kind === "competition") {
    const separator = item.entityId.indexOf(":");
    const competitionSport = separator > 0 ? knownSport(item.entityId.slice(0, separator)) : null;
    if (competitionSport) return competitionSport;
  }

  const idParts = item.entityId.split(":");
  for (const part of idParts) {
    const sport = knownSport(part);
    if (sport) return sport;
  }

  const hrefSport = sportFromHref(item.href ?? item.event?.detailPath);
  if (hrefSport) return hrefSport;

  const labelSport = sportFromLabel(item.label);
  if (labelSport) return labelSport;

  return "all";
}

function sportGlyph(sport: string): string {
  if (sport === "football") return "⚽";
  if (sport === "basketball") return "🏀";
  if (sport === "hockey") return "🏒";
  if (sport === "formula-1") return "🏁";
  if (sport === "tennis") return "🎾";
  if (sport === "ufc") return "🥊";
  if (sport === "motogp") return "🏍️";
  if (sport === "rugby") return "🏉";
  if (sport === "american-football") return "🏈";
  if (sport === "baseball") return "⚾";
  if (sport === "cycling") return "🚴";
  return "●";
}

function displayLabel(item: FavoriteItem): string {
  if (item.kind === "participant") {
    return item.label.replace(/\s*\((?:football|soccer|basketball|ice hockey|hockey|tennis|motorsports?|formula 1|f1|mma|ufc|motogp|motorcycle racing|rugby|baseball|american football|cycling)\)\s*$/i, "").trim();
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
      <div className="wts-home-section-heading"><div><span className="wts-section-icon" aria-hidden="true">★</span><h2 id="home-favorites-title">Your favorites</h2></div><Link href="/favorites">Manage favorites →</Link></div>
      <div className="wts-favorites-rail">
        {visible.map((item) => {
          const sport = favoriteSport(item);
          return (
            <div className="wts-favorite-tile wts-favorite-name-only has-home-remove" key={`${item.kind}:${item.entityId}`}>
              <Link className="wts-home-favorite-main" href={fallbackHref(item)}>
                <span className="wts-favorite-mini-glyph" aria-hidden="true">{sportGlyph(sport)}</span>
                <strong>{displayLabel(item)}</strong>
              </Link>
              <button
                type="button"
                className="wts-home-favorite-remove"
                aria-label={`Remove ${displayLabel(item)} from favorites`}
                title="Remove from favorites"
                onClick={() => toggleFavorite(item)}
              >
                <span aria-hidden="true">★</span>
              </button>
            </div>
          );
        })}
      </div>
      <style jsx global>{`
        .wts-home-favorites .wts-favorite-name-only.has-home-remove {
          grid-template-columns: minmax(0,1fr) 24px !important;
          gap: 6px !important;
        }
        .wts-home-favorites .wts-home-favorite-main {
          display: grid;
          grid-template-columns: 22px minmax(0,1fr);
          align-items: center;
          gap: 7px;
          min-width: 0;
          color: inherit;
          text-decoration: none;
        }
        .wts-home-favorites .wts-home-favorite-main strong {
          display: -webkit-box;
          min-width: 0;
          overflow: hidden;
          -webkit-box-orient: vertical;
          -webkit-line-clamp: 2;
          white-space: normal;
          overflow-wrap: anywhere;
          text-overflow: ellipsis;
          font-size: 10px;
          line-height: 1.15;
        }
        .wts-home-favorites .wts-home-favorite-remove {
          display: grid;
          width: 24px;
          height: 24px;
          padding: 0;
          place-items: center;
          border: 0;
          border-radius: 50%;
          background: transparent;
          color: #63b9ff;
          cursor: pointer;
          font: inherit;
          line-height: 1;
        }
        .wts-home-favorites .wts-home-favorite-remove:hover,
        .wts-home-favorites .wts-home-favorite-remove:focus-visible {
          background: rgba(99,185,255,.12);
          color: #fff;
          outline: none;
        }
        @media(max-width:760px) {
          .wts-home-favorites .wts-favorite-name-only.has-home-remove {
            grid-template-columns: minmax(0,1fr) 26px !important;
          }
          .wts-home-favorites .wts-home-favorite-remove {
            width: 26px;
            height: 26px;
          }
        }
      `}</style>
    </section>
  );
}
