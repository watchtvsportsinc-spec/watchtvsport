"use client";

import { useState } from "react";
import {
  favoriteKey,
  type FavoriteCandidate,
} from "@/lib/favorites";
import { toggleFavorite, useFavorites } from "@/lib/favorites-client";

type FavoriteButtonProps = {
  favorite: FavoriteCandidate;
  compact?: boolean;
};

function actionLabel(favorite: FavoriteCandidate, isSaved: boolean): string {
  if (favorite.kind === "event") return isSaved ? "Event saved" : "Save event";
  return isSaved ? `Following ${favorite.label}` : `Follow ${favorite.label}`;
}

export default function FavoriteButton({
  favorite,
  compact = false,
}: FavoriteButtonProps) {
  const collection = useFavorites();
  const [announcement, setAnnouncement] = useState("");
  const [hasSaveError, setHasSaveError] = useState(false);
  const targetKey = favoriteKey(favorite);
  const isSaved = collection.items.some((item) => favoriteKey(item) === targetKey);
  const visibleLabel = compact
    ? hasSaveError
      ? "Could not save"
      : isSaved
        ? "Saved"
        : "Save"
    : hasSaveError
      ? "Could not save"
      : actionLabel(favorite, isSaved);

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

  return (
    <>
      <button
        type="button"
        className={`v2-favorite-button${compact ? " is-compact" : ""}${
          isSaved ? " is-saved" : ""
        }${hasSaveError ? " has-error" : ""}`}
        aria-pressed={isSaved}
        aria-label={
          isSaved
            ? `Remove ${favorite.label} from favorites`
            : `Add ${favorite.label} to favorites`
        }
        onClick={handleToggle}
      >
        <span aria-hidden="true">{isSaved ? "★" : "☆"}</span>
        <span>{visibleLabel}</span>
      </button>
      <span className="sr-only" role="status" aria-live="polite">
        {announcement}
      </span>
    </>
  );
}
