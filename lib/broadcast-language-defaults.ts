import type { BroadcastInfo } from "./matches";

type EventWithBroadcasts = {
  sport: string;
  broadcasts: BroadcastInfo[];
};

function hasExplicitCommentaryLanguage(broadcast: BroadcastInfo): boolean {
  return Boolean(
    broadcast.commentaryLanguages?.some(
      (language) => typeof language === "string" && language.trim().length > 0
    )
  );
}

/**
 * Domain defaults confirmed by WatchTVSport.
 *
 * Football broadcasts in France use French commentary unless a source provides
 * an explicit commentary language for that specific offer. Explicit source data
 * always wins over this fallback.
 */
export function withBroadcastLanguageDefaults<T extends EventWithBroadcasts>(event: T): T {
  if (event.sport !== "football") return event;

  let changed = false;
  const broadcasts = event.broadcasts.map((broadcast) => {
    if (
      broadcast.countryCode.trim().toLowerCase() !== "fr" ||
      hasExplicitCommentaryLanguage(broadcast)
    ) {
      return broadcast;
    }

    changed = true;
    return {
      ...broadcast,
      commentaryLanguages: ["French"],
    };
  });

  return changed ? { ...event, broadcasts } : event;
}
