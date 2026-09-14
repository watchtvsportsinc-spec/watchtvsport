export const FAVORITES_SCHEMA_VERSION = 1 as const;
export const FAVORITES_STORAGE_KEY = "watchtvsport:favorites:v1";
export const FAVORITES_CHANGED_EVENT = "watchtvsport:favorites-changed";
export const MAX_FAVORITES = 200;

export type FavoriteKind = "event" | "participant" | "competition";

export type FavoriteEventContext = {
  detailPath: string;
  eventDate: string;
  sport: string;
  competition: string;
  participantNames: string[];
};

export type FavoriteCandidate = {
  kind: FavoriteKind;
  entityId: string;
  label: string;
  event?: FavoriteEventContext;
};

export type FavoriteItem = FavoriteCandidate & {
  savedAt: string;
};

export type FavoriteCollection = {
  schemaVersion: typeof FAVORITES_SCHEMA_VERSION;
  items: FavoriteItem[];
};

export type FavoriteLookup = {
  eventIds: string[];
  participantIds: string[];
  competitionIds: string[];
};

export type FavoriteEventSummary = {
  id: string;
  detailPath: string;
  title: string;
  sport: string;
  sportLabel: string;
  competition: string;
  eventDate: string;
  statusLabel: "Live" | "Finished" | "Past event" | "Scheduled";
  participantNames: string[];
  confirmedBroadcastCount: number;
};

export type FavoriteEventFeed = {
  exactEvents: FavoriteEventSummary[];
  upcomingEvents: FavoriteEventSummary[];
};

export const EMPTY_FAVORITES: FavoriteCollection = {
  schemaVersion: FAVORITES_SCHEMA_VERSION,
  items: [],
};

function safeString(value: unknown, maxLength: number): string {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

function isFavoriteKind(value: unknown): value is FavoriteKind {
  return value === "event" || value === "participant" || value === "competition";
}

function isTechnicalId(value: string): boolean {
  return /^[a-zA-Z0-9][a-zA-Z0-9:._/-]*$/.test(value);
}

function sanitizeEventContext(value: unknown): FavoriteEventContext | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) return undefined;

  const candidate = value as Record<string, unknown>;
  const detailPath = safeString(candidate.detailPath, 300);
  const eventDate = safeString(candidate.eventDate, 40);
  const sport = safeString(candidate.sport, 80);
  const competition = safeString(candidate.competition, 160);
  const participantNames = Array.isArray(candidate.participantNames)
    ? candidate.participantNames
        .map((name) => safeString(name, 160))
        .filter(Boolean)
        .slice(0, 8)
    : [];

  if (
    !detailPath.startsWith("/") ||
    detailPath.startsWith("//") ||
    !eventDate ||
    !sport ||
    !competition
  ) {
    return undefined;
  }

  return { detailPath, eventDate, sport, competition, participantNames };
}

function sanitizeFavoriteItem(value: unknown): FavoriteItem | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;

  const candidate = value as Record<string, unknown>;
  const kind = candidate.kind;
  const entityId = safeString(candidate.entityId, 180);
  const label = safeString(candidate.label, 200);
  const savedAt = safeString(candidate.savedAt, 40);

  if (
    !isFavoriteKind(kind) ||
    !entityId ||
    !isTechnicalId(entityId) ||
    !label ||
    !savedAt
  ) {
    return null;
  }

  const parsedDate = new Date(savedAt);
  if (Number.isNaN(parsedDate.getTime())) return null;

  const event = kind === "event" ? sanitizeEventContext(candidate.event) : undefined;

  return {
    kind,
    entityId,
    label,
    savedAt: parsedDate.toISOString(),
    ...(event ? { event } : {}),
  };
}

export function favoriteKey(
  favorite: Pick<FavoriteCandidate, "kind" | "entityId">
): string {
  return `${favorite.kind}:${favorite.entityId}`;
}

export function parseFavoritesSnapshot(raw: string | null): FavoriteCollection {
  if (!raw) return EMPTY_FAVORITES;

  try {
    const value = JSON.parse(raw) as unknown;
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      return EMPTY_FAVORITES;
    }

    const collection = value as Record<string, unknown>;
    if (
      collection.schemaVersion !== FAVORITES_SCHEMA_VERSION ||
      !Array.isArray(collection.items)
    ) {
      return EMPTY_FAVORITES;
    }

    const uniqueItems = new Map<string, FavoriteItem>();

    for (const rawItem of collection.items.slice(0, MAX_FAVORITES)) {
      const item = sanitizeFavoriteItem(rawItem);
      if (!item) continue;

      const key = favoriteKey(item);
      if (!uniqueItems.has(key)) uniqueItems.set(key, item);
    }

    return {
      schemaVersion: FAVORITES_SCHEMA_VERSION,
      items: Array.from(uniqueItems.values()),
    };
  } catch {
    return EMPTY_FAVORITES;
  }
}

export function toFavoriteCandidate(item: FavoriteItem): FavoriteCandidate {
  return {
    kind: item.kind,
    entityId: item.entityId,
    label: item.label,
    ...(item.event ? { event: item.event } : {}),
  };
}

export function buildFavoriteLookup(items: FavoriteItem[]): FavoriteLookup {
  const eventIds: string[] = [];
  const participantIds: string[] = [];
  const competitionIds: string[] = [];

  for (const item of items) {
    if (item.kind === "event") eventIds.push(item.entityId);
    if (item.kind === "participant") participantIds.push(item.entityId);
    if (item.kind === "competition") competitionIds.push(item.entityId);
  }

  return { eventIds, participantIds, competitionIds };
}
