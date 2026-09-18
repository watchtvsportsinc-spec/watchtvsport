"use client";

import { useRef, useState } from "react";
import {
  favoriteKey,
  type FavoriteCandidate,
} from "@/lib/favorites";
import { toggleFavorite, useFavorites } from "@/lib/favorites-client";

type FavoriteButtonProps = {
  favorite: FavoriteCandidate;
  compact?: boolean;
};

export default function FavoriteButton({
  favorite,
  compact = false,
}: FavoriteButtonProps) {
  const collection = useFavorites();
  const [announcement, setAnnouncement] = useState("");
  const [hasSaveError, setHasSaveError] = useState(false);
  const lastTouchRef = useRef(0);
  const targetKey = favoriteKey(favorite);
  const isSaved = collection.items.some((item) => favoriteKey(item) === targetKey);

  const handleToggle = () => {
    const result = toggleFavorite(favorite);

    if (!result.ok) {
      setHasSaveError(true);
      setAnnouncement(result.message);
      return;
    }

    setHasSaveError(false);
    setAnnouncement(
      result.saved
        ? `${favorite.label} added to favorites.`
        : `${favorite.label} removed from favorites.`
    );
  };

  const accessibleLabel = hasSaveError
    ? `Could not update ${favorite.label} favorite`
    : isSaved
      ? `Remove ${favorite.label} from favorites`
      : `Add ${favorite.label} to favorites`;

  return (
    <>
      <button
        type="button"
        className={`v2-favorite-button is-icon-only${compact ? " is-compact" : ""}${
          isSaved ? " is-saved" : ""
        }${hasSaveError ? " has-error" : ""}`}
        aria-pressed={isSaved}
        aria-label={accessibleLabel}
        title={accessibleLabel}
        onTouchEnd={(event) => {
          event.preventDefault();
          lastTouchRef.current = Date.now();
          handleToggle();
        }}
        onClick={() => {
          if (Date.now() - lastTouchRef.current < 700) return;
          handleToggle();
        }}
      >
        <span aria-hidden="true">{isSaved ? "★" : "☆"}</span>
      </button>
      <span className="sr-only" role="status" aria-live="polite">
        {announcement}
      </span>
    </>
  );
}
