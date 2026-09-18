"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import FavoriteButton from "@/components/FavoriteButton";
import LocalTime from "@/components/LocalTime";
import {
  FAVORITES_CHANGED_EVENT,
  FAVORITES_STORAGE_KEY,
  favoriteKey,
  parseFavoritesSnapshot,
} from "@/lib/favorites";
import styles from "@/components/sport-hub.module.css";

export type UfcHubCard = {
  id: string;
  slug: string;
  name: string;
  mainDate: string;
  country?: string;
  venue?: string;
  sessionCount: number;
  sessionLabels: string[];
  confirmedListings: number;
  freeCountries: number;
  paidCountries: number;
  live: boolean;
};

function favoriteId(card: UfcHubCard) {
  return favoriteKey({
    kind: "group",
    entityId: card.id,
    label: card.name,
    href: "/ufc/event/" + card.slug,
  });
}

function loadFavoriteIds(): Set<string> {
  if (typeof window === "undefined") return new Set();
  const snapshot = parseFavoritesSnapshot(
    window.localStorage.getItem(FAVORITES_STORAGE_KEY),
  );
  return new Set(snapshot.items.map((item) => favoriteKey(item)));
}

export default function UfcEventGrid({
  items,
}: {
  items: UfcHubCard[];
}) {
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    const refresh = () => setFavoriteIds(loadFavoriteIds());
    refresh();
    window.addEventListener(FAVORITES_CHANGED_EVENT, refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener(FAVORITES_CHANGED_EVENT, refresh);
      window.removeEventListener("storage", refresh);
    };
  }, []);

  const ordered = useMemo(
    () =>
      [...items].sort((a, b) => {
        const aFavorite = favoriteIds.has(favoriteId(a));
        const bFavorite = favoriteIds.has(favoriteId(b));
        if (aFavorite !== bFavorite) return aFavorite ? -1 : 1;
        if (a.live !== b.live) return a.live ? -1 : 1;
        return Date.parse(a.mainDate) - Date.parse(b.mainDate);
      }),
    [favoriteIds, items],
  );

  return (
    <div className={styles.competitionGrid}>
      {ordered.map((card, index) => {
        const saved = favoriteIds.has(favoriteId(card));
        const cardClass =
          index === 0 || saved || card.live
            ? styles.featuredCard
            : styles.card;

        return (
          <article className={cardClass} key={card.id}>
            <span
              className={styles.cardVisual}
              style={{ backgroundImage: "url('/sports/ufc.webp')" }}
              aria-hidden="true"
            />

            <div className={styles.cardTopline}>
              <span
                className={
                  card.live
                    ? `${styles.statusBadge} ${styles.liveBadge}`
                    : styles.statusBadge
                }
              >
                {card.live ? "LIVE" : index === 0 ? "NEXT" : "UFC EVENT"}
              </span>

              <FavoriteButton
                favorite={{
                  kind: "group",
                  entityId: card.id,
                  label: card.name,
                  href: "/ufc/event/" + card.slug,
                }}
              />
            </div>

            <Link
              className={styles.cardBodyLink}
              href={"/ufc/event/" + card.slug}
            >
              <small>
                UFC{card.country ? " · " + card.country : ""}
              </small>

              <strong>{card.name}</strong>

              <span className={styles.nextLine}>
                <span>
                  Main Card · <LocalTime date={card.mainDate} />
                </span>
                <b aria-hidden="true">→</b>
              </span>

              <span className={styles.dateLine}>
                {card.venue || "Venue TBC"}
              </span>

              <span className={styles.tvLine}>
                <b>{card.confirmedListings}</b> confirmed
                {card.freeCountries > 0 ? (
                  <em>
                    free in {card.freeCountries} countr
                    {card.freeCountries === 1 ? "y" : "ies"}
                  </em>
                ) : null}
                {card.paidCountries > 0 ? (
                  <em>
                    paid in {card.paidCountries} countr
                    {card.paidCountries === 1 ? "y" : "ies"}
                  </em>
                ) : null}
              </span>

              <span className={styles.openLink}>
                {card.sessionCount} card session
                {card.sessionCount === 1 ? "" : "s"} · View event →
              </span>
            </Link>
          </article>
        );
      })}
    </div>
  );
}
