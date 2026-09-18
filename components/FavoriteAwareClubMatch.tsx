"use client";

import type { ReactNode } from "react";
import { useMemo } from "react";
import { useFavorites } from "@/lib/favorites-client";

type FavoriteTeam = {
  id: string;
  label: string;
};

type Props = {
  teams: FavoriteTeam[];
  isNext?: boolean;
  children: ReactNode;
};

export default function FavoriteAwareClubMatch({ teams, isNext = false, children }: Props) {
  const favorites = useFavorites();

  const favoriteTeam = useMemo(() => {
    const participantIds = new Set(
      favorites.items
        .filter((item) => item.kind === "participant")
        .map((item) => item.entityId)
    );
    return teams.find((team) => participantIds.has(team.id)) ?? null;
  }, [favorites.items, teams]);

  return (
    <article
      className={[
        "wts-club-match-card",
        favoriteTeam ? "is-favorite-team-match" : "",
        isNext ? "is-next-match" : "",
      ].filter(Boolean).join(" ")}
      data-favorite-team={favoriteTeam?.label || undefined}
    >
      {favoriteTeam ? (
        <span
          className="wts-club-favorite-match-star"
          title={`${favoriteTeam.label} is in your favorites`}
          aria-label={`${favoriteTeam.label} is in your favorites`}
        >
          ★
        </span>
      ) : null}
      {children}
    </article>
  );
}
