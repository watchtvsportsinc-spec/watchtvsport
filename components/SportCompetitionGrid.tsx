"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import FavoriteButton from "@/components/FavoriteButton";
import { FAVORITES_CHANGED_EVENT, FAVORITES_STORAGE_KEY, parseFavoritesSnapshot } from "@/lib/favorites";
import styles from "./sport-hub.module.css";

export type SportCompetitionCard = {
  sport: string;
  slug: string;
  name: string;
  href: string;
  season?: string;
  next?: string | null;
  nextTitle?: string | null;
  liveCount: number;
  todayCount: number;
  eventCount: number;
  confirmedListings: number;
  freeCountries: number;
  paidCountries: number;
};

function loadFavoriteIds(): Set<string> {
  if (typeof window === "undefined") return new Set();
  const snapshot = parseFavoritesSnapshot(window.localStorage.getItem(FAVORITES_STORAGE_KEY));
  return new Set(snapshot.items.filter((item) => item.kind === "competition").map((item) => item.entityId));
}

function statusRank(item: SportCompetitionCard, favoriteIds: Set<string>): number {
  if (favoriteIds.has(`${item.sport}:${item.slug}`)) return 0;
  if (item.liveCount > 0) return 1;
  if (item.todayCount > 0) return 2;
  if (item.next) return 3;
  return 4;
}

function compactDate(value?: string | null): string {
  if (!value) return "Schedule pending";
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric" }).format(new Date(value));
}

export default function SportCompetitionGrid({ items, backdrop }: { items: SportCompetitionCard[]; backdrop: string }) {
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

  const ordered = useMemo(() => [...items].sort((a, b) => {
    const rank = statusRank(a, favoriteIds) - statusRank(b, favoriteIds);
    if (rank) return rank;
    if (a.next && b.next) return Date.parse(a.next) - Date.parse(b.next);
    if (a.next) return -1;
    if (b.next) return 1;
    return a.name.localeCompare(b.name);
  }), [favoriteIds, items]);

  return <div className={styles.competitionGrid}>{ordered.map((item, index) => {
    const isFavorite = favoriteIds.has(`${item.sport}:${item.slug}`);
    const status = item.liveCount > 0 ? "LIVE" : item.todayCount > 0 ? "TODAY" : item.next ? "UPCOMING" : "READY";
    return <article className={index < 4 || isFavorite || item.liveCount > 0 ? styles.featuredCard : styles.card} key={item.slug}>
      <span className={styles.cardVisual} style={{ backgroundImage: `url('${backdrop}')` }} aria-hidden="true" />
      <div className={styles.cardTopline}>
        <span className={`${styles.statusBadge} ${item.liveCount > 0 ? styles.liveBadge : item.todayCount > 0 ? styles.todayBadge : ""}`}>{status}</span>
        <FavoriteButton favorite={{ kind: "competition", entityId: `${item.sport}:${item.slug}`, label: item.name, href: item.href }} />
      </div>
      <Link className={styles.cardBodyLink} href={item.href}>
        <small>{item.season ?? "Competition"}</small>
        <strong>{item.name}</strong>
        <span className={styles.nextLine}>{item.nextTitle ? item.nextTitle : compactDate(item.next)}</span>
        <span className={styles.dateLine}>{item.next ? compactDate(item.next) : `${item.eventCount} referenced events`}</span>
        <span className={styles.tvLine}>
          <b>{item.confirmedListings}</b> TV listings
          {item.freeCountries > 0 ? <em>{item.freeCountries} free countr{item.freeCountries === 1 ? "y" : "ies"}</em> : null}
          {item.paidCountries > 0 ? <em>{item.paidCountries} paid countr{item.paidCountries === 1 ? "y" : "ies"}</em> : null}
        </span>
        <span className={styles.openLink}>Open competition →</span>
      </Link>
    </article>;
  })}</div>;
}
