"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import FavoriteButton from "./FavoriteButton";
import {
  buildFavoriteLookup,
  toFavoriteCandidate,
  type FavoriteEventFeed,
  type FavoriteEventSummary,
  type FavoriteItem,
} from "@/lib/favorites";
import { useFavorites } from "@/lib/favorites-client";

type FeedState = {
  lookupKey: string;
  data: FavoriteEventFeed | null;
  error: string | null;
};

function formatEventDate(eventDate: string): string {
  const date = new Date(eventDate);
  if (Number.isNaN(date.getTime())) return "Date to be confirmed";

  return new Intl.DateTimeFormat(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function eventHref(event: FavoriteEventSummary, anchor: string): string {
  const params = new URLSearchParams({ returnTo: `/favorites#${anchor}` });
  const separator = event.detailPath.includes("?") ? "&" : "?";
  return `${event.detailPath}${separator}${params.toString()}`;
}

function slugify(value: string): string {
  return value
    .replace(/\s*\([^)]*\)\s*$/, "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ø/gi, "o")
    .replace(/æ/gi, "ae")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function favoriteHref(item: FavoriteItem): string | null {
  if (item.href) return item.href;

  if (item.kind === "participant") {
    const clubMatch = item.entityId.match(/^club:([^:]+):(.+)$/);
    if (clubMatch) {
      const [, sport, slug] = clubMatch;
      return sport === "football" ? `/football/club/${slug}` : `/?view=all&sport=${encodeURIComponent(sport)}&q=${encodeURIComponent(item.label)}`;
    }

    if (item.entityId.startsWith("national-team:")) {
      return `/football/nation/${slugify(item.label)}`;
    }
  }

  if (item.kind === "competition") {
    const separator = item.entityId.indexOf(":");
    if (separator > 0) {
      const sport = item.entityId.slice(0, separator);
      const competition = item.entityId.slice(separator + 1);
      return sport === "football"
        ? `/football/competition/${competition}`
        : `/?view=all&sport=${encodeURIComponent(sport)}&competition=${encodeURIComponent(competition)}`;
    }
  }

  return null;
}

function FavoriteEventCard({ event }: { event: FavoriteEventSummary }) {
  const anchor = `favorite-event-${event.id}`;

  return (
    <article className="v2-favorite-event-card" id={anchor}>
      <div className="v2-favorite-event-copy">
        <p>{event.sportLabel} · {event.competition}</p>
        <h3><Link prefetch={false} href={eventHref(event, anchor)}>{event.title}</Link></h3>
        <p className="v2-favorite-event-meta">
          <time dateTime={event.eventDate}>{formatEventDate(event.eventDate)}</time>
          <span> · {event.statusLabel}</span>
          <span> · {event.confirmedBroadcastCount} confirmed official{event.confirmedBroadcastCount === 1 ? " listing" : " listings"}</span>
        </p>
      </div>
    </article>
  );
}

function LegacySavedEvent({ favorite, event }: { favorite: FavoriteItem; event?: FavoriteEventSummary }) {
  return (
    <article className="v2-favorite-event-card is-unavailable" id={`favorite-event-${favorite.entityId}`}>
      <div className="v2-favorite-event-copy">
        <p>{event?.competition ?? favorite.event?.competition ?? "Legacy saved event"}</p>
        <h3>{event ? <Link prefetch={false} href={eventHref(event, `favorite-event-${event.id}`)}>{event.title}</Link> : favorite.label}</h3>
        <p className="v2-favorite-unavailable-note">This match was saved with the previous favorites model. You can remove it here; new match favorites are no longer created.</p>
      </div>
      <FavoriteButton compact favorite={toFavoriteCandidate(favorite)} />
    </article>
  );
}

function isFavoriteEventFeed(value: unknown): value is FavoriteEventFeed {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const candidate = value as Record<string, unknown>;
  return Array.isArray(candidate.exactEvents) && Array.isArray(candidate.upcomingEvents);
}

function participantKind(item: FavoriteItem): "Club" | "Nation" | "Team" {
  if (item.entityId.startsWith("club:")) return "Club";
  if (item.entityId.startsWith("national-team:")) return "Nation";
  return "Team";
}

function FollowedItem({ favorite, kind }: { favorite: FavoriteItem; kind: string }) {
  const href = favoriteHref(favorite);
  return (
    <li>
      <div>
        <span className="v2-following-kind">{kind}</span>
        {href ? <strong><Link href={href}>{favorite.label}</Link></strong> : <strong>{favorite.label}</strong>}
      </div>
      <FavoriteButton compact favorite={toFavoriteCandidate(favorite)} />
    </li>
  );
}

export default function FavoritesView() {
  const collection = useFavorites();
  const [feedState, setFeedState] = useState<FeedState | null>(null);
  const [retryNumber, setRetryNumber] = useState(0);
  const lookup = useMemo(() => buildFavoriteLookup(collection.items), [collection.items]);
  const lookupKey = JSON.stringify(lookup);

  useEffect(() => {
    if (collection.items.length === 0) return;
    const controller = new AbortController();

    const loadFeed = async () => {
      try {
        const response = await fetch("/api/favorites/events", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: lookupKey,
          signal: controller.signal,
        });
        if (!response.ok) throw new Error("Favorite events could not be loaded.");
        const data: unknown = await response.json();
        if (!isFavoriteEventFeed(data)) throw new Error("Favorite events returned an invalid response.");
        setFeedState({ lookupKey, data, error: null });
      } catch (error) {
        if (controller.signal.aborted) return;
        setFeedState((current) => ({
          lookupKey,
          data: current?.lookupKey === lookupKey ? current.data : null,
          error: error instanceof Error ? error.message : "Favorite events could not be loaded.",
        }));
      }
    };

    void loadFeed();
    return () => controller.abort();
  }, [collection.items.length, lookupKey, retryNumber]);

  const participantFavorites = collection.items.filter((item) => item.kind === "participant");
  const competitionFavorites = collection.items.filter((item) => item.kind === "competition");
  const legacyEventFavorites = collection.items.filter((item) => item.kind === "event");
  const currentFeed = feedState?.lookupKey === lookupKey ? feedState.data : null;
  const exactEventById = new Map((currentFeed?.exactEvents ?? []).map((event) => [event.id, event]));
  const isLoading = collection.items.length > 0 && feedState?.lookupKey !== lookupKey;

  return (
    <main id="main-content" className="v2-calendar v2-favorites-page">
      <section className="v2-favorites-hero" aria-labelledby="favorites-title">
        <p className="v2-eyebrow">Favorites</p>
        <h1 id="favorites-title">What you follow</h1>
        <p>Follow teams, nations and competitions. WatchTVSport then brings their upcoming events together here. Favorites are stored on this device for now.</p>
      </section>

      {collection.items.length === 0 ? (
        <section className="v2-empty-state" aria-labelledby="empty-favorites-title">
          <h2 id="empty-favorites-title">No favorites yet</h2>
          <p>Follow a club, national team or competition to build your personal sports feed.</p>
          <Link href="/">Browse the calendar</Link>
        </section>
      ) : (
        <div className="v2-favorites-content" aria-busy={isLoading}>
          {feedState?.lookupKey === lookupKey && feedState.error ? (
            <div className="v2-favorites-error" role="alert">
              <div><strong>Could not refresh favorite events.</strong><span>Your followed teams and competitions remain saved on this device.</span></div>
              <button type="button" onClick={() => setRetryNumber((value) => value + 1)}>Try again</button>
            </div>
          ) : null}

          <section className="v2-favorites-section" aria-labelledby="teams-title">
            <div className="v2-favorites-heading">
              <div><p className="v2-eyebrow">Following</p><h2 id="teams-title">Teams & nations</h2></div>
              <span>{participantFavorites.length}</span>
            </div>
            {participantFavorites.length > 0 ? (
              <ul className="v2-following-list">
                {participantFavorites.map((favorite) => (
                  <FollowedItem key={`${favorite.kind}:${favorite.entityId}`} favorite={favorite} kind={participantKind(favorite)} />
                ))}
              </ul>
            ) : <p className="v2-favorites-note">You are not following a team or nation yet.</p>}
          </section>

          <section className="v2-favorites-section" aria-labelledby="competitions-title">
            <div className="v2-favorites-heading">
              <div><p className="v2-eyebrow">Following</p><h2 id="competitions-title">Competitions</h2></div>
              <span>{competitionFavorites.length}</span>
            </div>
            {competitionFavorites.length > 0 ? (
              <ul className="v2-following-list">
                {competitionFavorites.map((favorite) => (
                  <FollowedItem key={`${favorite.kind}:${favorite.entityId}`} favorite={favorite} kind="Competition" />
                ))}
              </ul>
            ) : <p className="v2-favorites-note">You are not following a competition yet.</p>}
          </section>

          <section className="v2-favorites-section" aria-labelledby="next-events-title">
            <div className="v2-favorites-heading">
              <div><p className="v2-eyebrow">Coming up</p><h2 id="next-events-title">Upcoming events from your favorites</h2></div>
              <span>{currentFeed?.upcomingEvents.length ?? 0}</span>
            </div>
            {isLoading ? (
              <div className="v2-loading" role="status"><span className="v2-loading-dot" aria-hidden="true" />Refreshing favorite events…</div>
            ) : currentFeed && currentFeed.upcomingEvents.length > 0 ? (
              <div className="v2-favorite-event-list">{currentFeed.upcomingEvents.map((event) => <FavoriteEventCard key={event.id} event={event} />)}</div>
            ) : (
              <div className="v2-favorites-note"><p>No upcoming confirmed event is currently listed for what you follow.</p><Link href="/?view=archive">Browse the archive</Link></div>
            )}
          </section>

          {legacyEventFavorites.length > 0 ? (
            <section className="v2-favorites-section" aria-labelledby="legacy-events-title">
              <div className="v2-favorites-heading"><div><p className="v2-eyebrow">Legacy</p><h2 id="legacy-events-title">Previously saved matches</h2></div><span>{legacyEventFavorites.length}</span></div>
              <div className="v2-favorite-event-list">
                {legacyEventFavorites.map((favorite) => <LegacySavedEvent key={favorite.entityId} favorite={favorite} event={exactEventById.get(favorite.entityId)} />)}
              </div>
            </section>
          ) : null}
        </div>
      )}
    </main>
  );
}
