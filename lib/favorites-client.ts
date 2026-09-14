"use client";

import { useMemo, useSyncExternalStore } from "react";
import {
  EMPTY_FAVORITES,
  FAVORITES_CHANGED_EVENT,
  FAVORITES_SCHEMA_VERSION,
  FAVORITES_STORAGE_KEY,
  MAX_FAVORITES,
  favoriteKey,
  parseFavoritesSnapshot,
  type FavoriteCandidate,
  type FavoriteCollection,
} from "./favorites";

const EMPTY_SNAPSHOT = JSON.stringify(EMPTY_FAVORITES);

function readFavoritesSnapshot(): string {
  try {
    return window.localStorage.getItem(FAVORITES_STORAGE_KEY) ?? EMPTY_SNAPSHOT;
  } catch {
    return EMPTY_SNAPSHOT;
  }
}

function readServerSnapshot(): string {
  return EMPTY_SNAPSHOT;
}

function subscribeToFavorites(onStoreChange: () => void): () => void {
  const handleStorage = (event: StorageEvent) => {
    if (event.key === FAVORITES_STORAGE_KEY || event.key === null) {
      onStoreChange();
    }
  };

  window.addEventListener("storage", handleStorage);
  window.addEventListener(FAVORITES_CHANGED_EVENT, onStoreChange);

  return () => {
    window.removeEventListener("storage", handleStorage);
    window.removeEventListener(FAVORITES_CHANGED_EVENT, onStoreChange);
  };
}

export function useFavorites(): FavoriteCollection {
  const rawSnapshot = useSyncExternalStore(
    subscribeToFavorites,
    readFavoritesSnapshot,
    readServerSnapshot
  );

  return useMemo(() => parseFavoritesSnapshot(rawSnapshot), [rawSnapshot]);
}

export function toggleFavorite(
  candidate: FavoriteCandidate
): { ok: true; saved: boolean } | { ok: false; message: string } {
  try {
    const current = parseFavoritesSnapshot(
      window.localStorage.getItem(FAVORITES_STORAGE_KEY)
    );
    const targetKey = favoriteKey(candidate);
    const alreadySaved = current.items.some(
      (item) => favoriteKey(item) === targetKey
    );
    const items = alreadySaved
      ? current.items.filter((item) => favoriteKey(item) !== targetKey)
      : [
          { ...candidate, savedAt: new Date().toISOString() },
          ...current.items,
        ].slice(0, MAX_FAVORITES);

    window.localStorage.setItem(
      FAVORITES_STORAGE_KEY,
      JSON.stringify({ schemaVersion: FAVORITES_SCHEMA_VERSION, items })
    );
    window.dispatchEvent(new Event(FAVORITES_CHANGED_EVENT));

    return { ok: true, saved: !alreadySaved };
  } catch {
    return {
      ok: false,
      message: "Favorites could not be saved on this device.",
    };
  }
}
