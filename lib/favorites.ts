import { clubSlug, resolveClubSlug } from "./club-aliases";
import { sportsRegistry } from "./sports-registry";

export const FAVORITES_SCHEMA_VERSION = 1 as const;
export const FAVORITES_STORAGE_KEY = "watchtvsport:favorites:v1";
export const FAVORITES_CHANGED_EVENT = "watchtvsport:favorites-changed";
export const MAX_FAVORITES = 200;

export type FavoriteKind = "event" | "participant" | "competition" | "group";

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
  href?: string;
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
  groupIds?: string[];
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
  return value === "event" || value === "participant" || value === "competition" || value === "group";
}

function isTechnicalId(value: string): boolean {
  return /^[a-zA-Z0-9][a-zA-Z0-9:._/-]*$/.test(value);
}

function safeInternalHref(value: unknown): string | undefined {
  const href = safeString(value, 300);
  if (!href || !href.startsWith("/") || href.startsWith("//")) return undefined;
  return href;
}

function normalizedLabel(value: string): string {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
}

function sportFromParticipantLabel(label: string): { sport: string; name: string } | null {
  const match = label.match(/^(.*?)\s*\(([^)]+)\)\s*$/);
  if (!match) return null;

  const suffix = normalizedLabel(match[2]);
  const sport = sportsRegistry.find((item) =>
    [item.defaultLabel, ...Object.values(item.labels)]
      .filter((value): value is string => Boolean(value))
      .some((value) => normalizedLabel(value) === suffix)
  );

  return sport ? { sport: sport.slug, name: match[1].trim() } : null;
}

function canonicalClubId(sport: string, value: string): string {
  const slug = sport === "football" ? resolveClubSlug(value) : clubSlug(value);
  return `club:${sport}:${slug}`;
}

function clubIdFromHref(href?: string): string | null {
  if (!href) return null;
  const path = href.split(/[?#]/, 1)[0];

  const legacyFootball = path.match(/^\/football\/club\/([^/]+)$/);
  if (legacyFootball) return canonicalClubId("football", legacyFootball[1]);

  const universal = path.match(/^\/sports\/([^/]+)\/club\/([^/]+)$/);
  if (universal) return canonicalClubId(universal[1], universal[2]);

  return null;
}

function migrateLegacyParticipantId(
  kind: FavoriteKind,
  entityId: string,
  label: string,
  href?: string
): string {
  if (kind !== "participant") return entityId;
  if (entityId.startsWith("national-team:")) return entityId;

  const currentClub = entityId.match(/^club:([^:]+):(.+)$/);
  if (currentClub) return canonicalClubId(currentClub[1], currentClub[2]);

  const hrefClub = clubIdFromHref(href);
  if (hrefClub) return hrefClub;

  const legacyFootball = entityId.match(/^club:([^:]+)$/);
  if (legacyFootball) return canonicalClubId("football", legacyFootball[1]);

  const labelledParticipant = sportFromParticipantLabel(label);
  if (labelledParticipant) {
    return canonicalClubId(labelledParticipant.sport, labelledParticipant.name);
  }

  return entityId;
}

function participantHrefFromId(entityId: string): string | undefined {
  const club = entityId.match(/^club:([^:]+):(.+)$/);
  if (!club) return undefined;
  return `/sports/${club[1]}/club/${club[2]}`;
}

function sanitizeEventContext(value: unknown): FavoriteEventContext | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) return undefined;

  const candidate = value as Record<string, unknown>;
  const detailPath = safeString(candidate.detailPath, 300);
  const eventDate = safeString(candidate.eventDate, 40);
  const sport = safeString(candidate.sport, 80);
  const competition = safeString(candidate.competition, 160);
  const participantNames = Array.isArray(candidate.participantNames)
    ? candidate.participantNames.map((name) => safeString(name, 160)).filter(Boolean).slice(0, 8)
    : [];

  if (!detailPath.startsWith("/") || detailPath.startsWith("//") || !eventDate || !sport || !competition) {
    return undefined;
  }

  return { detailPath, eventDate, sport, competition, participantNames };
}

function sanitizeFavoriteItem(value: unknown): FavoriteItem | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;

  const candidate = value as Record<string, unknown>;
  const kind = candidate.kind;
  const rawEntityId = safeString(candidate.entityId, 180);
  const label = safeString(candidate.label, 200);
  const savedAt = safeString(candidate.savedAt, 40);

  if (!isFavoriteKind(kind) || !rawEntityId || !isTechnicalId(rawEntityId) || !label || !savedAt) return null;

  const rawHref = safeInternalHref(candidate.href);
  const entityId = migrateLegacyParticipantId(kind, rawEntityId, label, rawHref);
  const parsedDate = new Date(savedAt);
  if (Number.isNaN(parsedDate.getTime())) return null;

  const event = kind === "event" ? sanitizeEventContext(candidate.event) : undefined;
  const href = rawHref ?? (kind === "participant" ? participantHrefFromId(entityId) : undefined);

  return {
    kind,
    entityId,
    label,
    savedAt: parsedDate.toISOString(),
    ...(href ? { href } : {}),
    ...(event ? { event } : {}),
  };
}

export function favoriteKey(favorite: Pick<FavoriteCandidate, "kind" | "entityId">): string {
  return `${favorite.kind}:${favorite.entityId}`;
}

export function parseFavoritesSnapshot(raw: string | null): FavoriteCollection {
  if (!raw) return EMPTY_FAVORITES;

  try {
    const value = JSON.parse(raw) as unknown;
    if (!value || typeof value !== "object" || Array.isArray(value)) return EMPTY_FAVORITES;

    const collection = value as Record<string, unknown>;
    if (collection.schemaVersion !== FAVORITES_SCHEMA_VERSION || !Array.isArray(collection.items)) return EMPTY_FAVORITES;

    const uniqueItems = new Map<string, FavoriteItem>();
    for (const rawItem of collection.items) {
      const item = sanitizeFavoriteItem(rawItem);
      if (!item) continue;
      const key = favoriteKey(item);
      if (!uniqueItems.has(key)) uniqueItems.set(key, item);
      if (uniqueItems.size >= MAX_FAVORITES) break;
    }

    return { schemaVersion: FAVORITES_SCHEMA_VERSION, items: Array.from(uniqueItems.values()) };
  } catch {
    return EMPTY_FAVORITES;
  }
}

export function toFavoriteCandidate(item: FavoriteItem): FavoriteCandidate {
  return {
    kind: item.kind,
    entityId: item.entityId,
    label: item.label,
    ...(item.href ? { href: item.href } : {}),
    ...(item.event ? { event: item.event } : {}),
  };
}

export function buildFavoriteLookup(items: FavoriteItem[]): FavoriteLookup {
  const eventIds: string[] = [];
  const participantIds: string[] = [];
  const competitionIds: string[] = [];
  const groupIds: string[] = [];

  for (const item of items) {
    if (item.kind === "event") eventIds.push(item.entityId);
    if (item.kind === "participant") participantIds.push(item.entityId);
    if (item.kind === "competition") competitionIds.push(item.entityId);
    if (item.kind === "group") groupIds.push(item.entityId);
  }

  return { eventIds, participantIds, competitionIds, groupIds };
}
