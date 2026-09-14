"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import FavoriteButton from "./FavoriteButton";
import {
  buildFavoriteLookup,
  toFavoriteCandidate,
  type FavoriteCandidate,
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

function eventFavorite(event: FavoriteEventSummary): FavoriteCandidate {
  return {
    kind: "event",
    entityId: event.id,
    label: event.title,
    event: {
      detailPath: event.detailPath,
      eventDate: event.eventDate,
      sport: event.sport,
      competition: event.competition,
      participantNames: event.participantNames,
    },
  };
}

function eventHref(event: FavoriteEventSummary, anchor: string): string {
  const params = new URLSearchParams({ returnTo: `/favorites#${anchor}` });
  const separator = event.detailPath.includes("?") ? "&" : "?";
  return `${event.detailPath}${separator}${params.toString()}`;
}

function FavoriteEventCard({
  event,
  favorite,
  headingLevel = "h3",
}: {
  event: FavoriteEventSummary;
  favorite?: FavoriteItem;
  headingLevel?: "h2" | "h3";
}) {
  const anchor = `favorite-event-${event.id}`;
  const Heading = headingLevel;

  return (
    <article className="v2-favorite-event-card" id={anchor}>
      <div className="v2-favorite-event-copy">
        <p>
          {event.sportLabel} · {event.competition}
        </p>
        <Heading>
          <Link prefetch={false} href={eventHref(event, anchor)}>
            {event.title}
          </Link>
        </Heading>
        <p className="v2-favorite-event-meta">
          <time dateTime={event.eventDate}>{formatEventDate(event.eventDate)}</time>
          <span> · {event.statusLabel}</span>
          <span>
            {" "}· {event.confirmedBroadcastCount} confirmed official
            {event.confirmedBroadcastCount === 1 ? " listing" : " listings"}
          </span>
        </p>
      </div>

      <FavoriteButton
        compact
        favorite={favorite ? toFavoriteCandidate(favorite) : eventFavorite(event)}
      />
    </article>
  );
}

function SavedEventFallback({
  favorite,
  state,
}: {
  favorite: FavoriteItem;
  state: "loading" | "error" | "unavailable";
}) {
  const note =
    state === "loading"
      ? "Refreshing this saved event…"
      : state === "error"
        ? "This exact event remains saved. Its current details could not be refreshed."
        : "This exact event is still saved, but it is not currently available in the public calendar.";

  return (
    <article
      className="v2-favorite-event-card is-unavailable"
      id={`favorite-event-${favorite.entityId}`}
    >
      <div className="v2-favorite-event-copy">
        <p>{favorite.event?.competition ?? "Saved event"}</p>
        <h3>{favorite.label}</h3>
        {favorite.event?.eventDate ? (
          <p className="v2-favorite-event-meta">
            <time dateTime={favorite.event.eventDate}>
              {formatEventDate(favorite.event.eventDate)}
            </time>
          </p>
        ) : null}
        <p className="v2-favorite-unavailable-note">
          {note}
        </p>
      </div>

      <FavoriteButton compact favorite={toFavoriteCandidate(favorite)} />
    </article>
  );
}

function isFavoriteEventFeed(value: unknown): value is FavoriteEventFeed {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const candidate = value as Record<string, unknown>;
  return (
    Array.isArray(candidate.exactEvents) &&
    Array.isArray(candidate.upcomingEvents)
  );
}

export default function FavoritesView() {
  const collection = useFavorites();
  const [feedState, setFeedState] = useState<FeedState | null>(null);
  const [retryNumber, setRetryNumber] = useState(0);
  const lookup = useMemo(
    () => buildFavoriteLookup(collection.items),
    [collection.items]
  );
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
        if (!isFavoriteEventFeed(data)) {
          throw new Error("Favorite events returned an invalid response.");
        }

        setFeedState({ lookupKey, data, error: null });
      } catch (error) {
        if (controller.signal.aborted) return;

        setFeedState((current) => ({
          lookupKey,
          data: current?.lookupKey === lookupKey ? current.data : null,
          error:
            error instanceof Error
              ? error.message
              : "Favorite events could not be loaded.",
        }));
      }
    };

    void loadFeed();
    return () => controller.abort();
  }, [collection.items.length, lookupKey, retryNumber]);

  const exactFavorites = collection.items.filter((item) => item.kind === "event");
  const followedFavorites = collection.items.filter(
    (item) => item.kind === "participant" || item.kind === "competition"
  );
  const currentFeed = feedState?.lookupKey === lookupKey ? feedState.data : null;
  const exactEventById = new Map(
    (currentFeed?.exactEvents ?? []).map((event) => [event.id, event])
  );
  const isLoading = collection.items.length > 0 && feedState?.lookupKey !== lookupKey;

  useEffect(() => {
    if (!window.location.hash.startsWith("#favorite-event-")) return;

    let targetId: string;
    try {
      targetId = decodeURIComponent(window.location.hash.slice(1));
    } catch {
      return;
    }

    let firstFrame = 0;
    let secondFrame = 0;
    firstFrame = window.requestAnimationFrame(() => {
      secondFrame = window.requestAnimationFrame(() => {
        document.getElementById(targetId)?.scrollIntoView({ block: "start" });
      });
    });

    return () => {
      window.cancelAnimationFrame(firstFrame);
      window.cancelAnimationFrame(secondFrame);
    };
  }, [collection.items.length, currentFeed]);

  return (
    <main id="main-content" className="v2-calendar v2-favorites-page">
      <section className="v2-favorites-hero" aria-labelledby="favorites-title">
        <p className="v2-eyebrow">Favorites</p>
        <h1 id="favorites-title">Your saved sports</h1>
        <p>
          Saved only on this device for now. No account is required, and a saved
          event always remains that exact event.
        </p>
      </section>

      {collection.items.length === 0 ? (
        <section className="v2-empty-state" aria-labelledby="empty-favorites-title">
          <h2 id="empty-favorites-title">No favorites yet</h2>
          <p>
            Save an event from the calendar, or follow its teams and competition
            from the broadcaster page.
          </p>
          <Link href="/">Browse the calendar</Link>
        </section>
      ) : (
        <div className="v2-favorites-content" aria-busy={isLoading}>
          {feedState?.lookupKey === lookupKey && feedState.error ? (
            <div className="v2-favorites-error" role="alert">
              <div>
                <strong>Could not refresh favorite events.</strong>
                <span>Your saved choices remain on this device.</span>
              </div>
              <button type="button" onClick={() => setRetryNumber((value) => value + 1)}>
                Try again
              </button>
            </div>
          ) : null}

          <section className="v2-favorites-section" aria-labelledby="saved-events-title">
            <div className="v2-favorites-heading">
              <div>
                <p className="v2-eyebrow">Exact events</p>
                <h2 id="saved-events-title">Saved events</h2>
              </div>
              <span>{exactFavorites.length}</span>
            </div>

            {exactFavorites.length > 0 ? (
              <div className="v2-favorite-event-list">
                {exactFavorites.map((favorite) => {
                  const event = exactEventById.get(favorite.entityId);
                  return event ? (
                    <FavoriteEventCard
                      key={favorite.entityId}
                      event={event}
                      favorite={favorite}
                    />
                  ) : (
                    <SavedEventFallback
                      key={favorite.entityId}
                      favorite={favorite}
                      state={
                        isLoading
                          ? "loading"
                          : feedState?.lookupKey === lookupKey && feedState.error
                            ? "error"
                            : "unavailable"
                      }
                    />
                  );
                })}
              </div>
            ) : (
              <p className="v2-favorites-note">
                You have not saved a specific event yet.
              </p>
            )}
          </section>

          <section className="v2-favorites-section" aria-labelledby="following-title">
            <div className="v2-favorites-heading">
              <div>
                <p className="v2-eyebrow">Following</p>
                <h2 id="following-title">Teams and competitions</h2>
              </div>
              <span>{followedFavorites.length}</span>
            </div>

            {followedFavorites.length > 0 ? (
              <ul className="v2-following-list">
                {followedFavorites.map((favorite) => (
                  <li key={`${favorite.kind}:${favorite.entityId}`}>
                    <div>
                      <span className="v2-following-kind">
                        {favorite.kind === "participant" ? "Team" : "Competition"}
                      </span>
                      <strong>{favorite.label}</strong>
                    </div>
                    <FavoriteButton
                      compact
                      favorite={toFavoriteCandidate(favorite)}
                    />
                  </li>
                ))}
              </ul>
            ) : (
              <p className="v2-favorites-note">
                Open an event to follow a team or competition.
              </p>
            )}
          </section>

          <section className="v2-favorites-section" aria-labelledby="next-events-title">
            <div className="v2-favorites-heading">
              <div>
                <p className="v2-eyebrow">Coming up</p>
                <h2 id="next-events-title">Next events you follow</h2>
              </div>
              <span>{currentFeed?.upcomingEvents.length ?? 0}</span>
            </div>

            {isLoading ? (
              <div className="v2-loading" role="status">
                <span className="v2-loading-dot" aria-hidden="true" />
                Refreshing favorite events…
              </div>
            ) : currentFeed && currentFeed.upcomingEvents.length > 0 ? (
              <div className="v2-favorite-event-list">
                {currentFeed.upcomingEvents.map((event) => (
                  <FavoriteEventCard key={event.id} event={event} />
                ))}
              </div>
            ) : (
              <div className="v2-favorites-note">
                <p>No upcoming confirmed event is currently listed for the teams or competitions you follow.</p>
                <Link href="/?view=archive">Browse the archive</Link>
              </div>
            )}
          </section>
        </div>
      )}
    </main>
  );
}
