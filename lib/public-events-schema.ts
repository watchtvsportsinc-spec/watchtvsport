import type { EventData, Participant, SessionType } from "./events";
import type { BroadcastInfo } from "./matches";
import {
  isParticipantPatternStyle,
  isParticipantRenderFamily,
  safeVisualColor,
  type ParticipantVisualProfile,
} from "./participant-visuals";

export const PUBLIC_EVENTS_SCHEMA_VERSION = 1;
export const MAX_PUBLIC_EVENTS = 2_500;
export const MAX_BROADCASTS_PER_EVENT = 300;

export type PublicEventsPayload = {
  schemaVersion: typeof PUBLIC_EVENTS_SCHEMA_VERSION;
  generatedAt: string;
  events: EventData[];
};

export class PublicEventsPayloadError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PublicEventsPayloadError";
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function requiredString(value: unknown, field: string, maxLength: number): string {
  if (typeof value !== "string") throw new PublicEventsPayloadError(`${field} must be a string`);
  const normalized = value.trim();
  if (!normalized || normalized.length > maxLength) throw new PublicEventsPayloadError(`${field} has an invalid length`);
  return normalized;
}

function optionalString(value: unknown, field: string, maxLength: number): string | undefined {
  if (value === null || value === undefined || value === "") return undefined;
  return requiredString(value, field, maxLength);
}

function optionalInteger(value: unknown, field: string, min = 0, max = 1_000): number | undefined {
  if (value === null || value === undefined || value === "") return undefined;
  if (typeof value !== "number" || !Number.isInteger(value) || value < min || value > max) {
    throw new PublicEventsPayloadError(`${field} must be an integer between ${min} and ${max}`);
  }
  return value;
}

function isoTimestamp(value: unknown, field: string): string {
  const timestamp = requiredString(value, field, 40);
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,6})?(?:Z|[+-]\d{2}:\d{2})$/.test(timestamp) || !Number.isFinite(Date.parse(timestamp))) {
    throw new PublicEventsPayloadError(`${field} must be an ISO timestamp`);
  }
  return timestamp;
}

function httpsUrl(value: unknown, field: string): string {
  const input = requiredString(value, field, 2_048);
  try {
    const url = new URL(input);
    if (url.protocol !== "https:" || !url.hostname) throw new Error();
  } catch {
    throw new PublicEventsPayloadError(`${field} must be an HTTPS URL`);
  }
  return input;
}

function localPath(value: unknown, field: string): string {
  const input = requiredString(value, field, 500);
  if (!input.startsWith("/") || input.startsWith("//") || input.includes("\\")) {
    throw new PublicEventsPayloadError(`${field} must be a local path`);
  }
  const url = new URL(input, "https://watchtvsport.invalid");
  if (url.origin !== "https://watchtvsport.invalid") throw new PublicEventsPayloadError(`${field} must stay on WatchTVSport`);
  return `${url.pathname}${url.search}${url.hash}`;
}

function slug(value: unknown, field: string): string {
  const input = requiredString(value, field, 180);
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(input)) throw new PublicEventsPayloadError(`${field} must be a normalized slug`);
  return input;
}

function optionalSlug(value: unknown, field: string): string | undefined {
  if (value === null || value === undefined || value === "") return undefined;
  return slug(value, field);
}

function parseParticipantVisual(value: unknown, field: string): ParticipantVisualProfile | undefined {
  if (value === null || value === undefined) return undefined;
  if (!isRecord(value)) throw new PublicEventsPayloadError(`${field} must be an object`);
  if (!isParticipantRenderFamily(value.renderFamily) || !isParticipantPatternStyle(value.patternStyle)) {
    throw new PublicEventsPayloadError(`${field} has an unsupported visual family or pattern`);
  }
  const visualStatus = requiredString(value.visualStatus, `${field}.visualStatus`, 30);
  if (!["generated", "reviewed", "verified", "needs_review"].includes(visualStatus)) {
    throw new PublicEventsPayloadError(`${field}.visualStatus is unsupported`);
  }
  return {
    renderFamily: value.renderFamily,
    primaryColor: safeVisualColor(value.primaryColor, "#123A63"),
    secondaryColor: safeVisualColor(value.secondaryColor, "#F8FAFC"),
    accentColor: safeVisualColor(value.accentColor, "#2F9CFF"),
    patternStyle: value.patternStyle,
    visualStatus: visualStatus as ParticipantVisualProfile["visualStatus"],
    seasonLabel: optionalString(value.seasonLabel, `${field}.seasonLabel`, 40),
    sourceName: optionalString(value.sourceName, `${field}.sourceName`, 240),
    sourceUrl: value.sourceUrl == null ? undefined : httpsUrl(value.sourceUrl, `${field}.sourceUrl`),
    observedAt: optionalString(value.observedAt, `${field}.observedAt`, 40),
  };
}

function parseParticipant(value: unknown, field: string): Participant | undefined {
  if (value === null || value === undefined) return undefined;
  if (!isRecord(value)) throw new PublicEventsPayloadError(`${field} must be an object`);
  const type = requiredString(value.type, `${field}.type`, 40);
  const visualType = requiredString(value.visualType, `${field}.visualType`, 40);
  if (!["national_team", "club", "player", "event"].includes(type) || !["flag", "crest", "player", "generic"].includes(visualType)) {
    throw new PublicEventsPayloadError(`${field} has an unsupported participant type`);
  }
  return {
    id: requiredString(value.id, `${field}.id`, 180),
    slug: optionalSlug(value.slug, `${field}.slug`),
    name: requiredString(value.name, `${field}.name`, 200),
    shortName: optionalString(value.shortName, `${field}.shortName`, 80),
    type: type as Participant["type"],
    visualType: visualType as Participant["visualType"],
    visual: optionalString(value.visual, `${field}.visual`, 120) ?? "",
    countryCode: optionalString(value.countryCode, `${field}.countryCode`, 12),
    visualProfile: parseParticipantVisual(value.visualProfile, `${field}.visualProfile`),
  };
}

function parseLanguages(value: unknown, field: string): string[] | undefined {
  if (value === null || value === undefined) return undefined;
  if (!Array.isArray(value) || value.length > 30) throw new PublicEventsPayloadError(`${field} must be a short array`);
  return value.map((language, index) => requiredString(language, `${field}[${index}]`, 40));
}

function parseBroadcast(value: unknown, field: string): BroadcastInfo {
  if (!isRecord(value)) throw new PublicEventsPayloadError(`${field} must be an object`);
  const access = requiredString(value.access, `${field}.access`, 20);
  const broadcastType = requiredString(value.broadcastType, `${field}.broadcastType`, 20);
  if (access !== "Free" && access !== "Paid") throw new PublicEventsPayloadError(`${field}.access must be Free or Paid`);
  if (!["live", "delayed", "replay", "highlights"].includes(broadcastType)) throw new PublicEventsPayloadError(`${field}.broadcastType is unsupported`);
  if (value.coverageStatus !== "confirmed") throw new PublicEventsPayloadError(`${field} must be confirmed`);
  const coverageType = optionalString(value.coverageType, `${field}.coverageType`, 20);
  if (coverageType && !["full", "partial", "unknown"].includes(coverageType)) throw new PublicEventsPayloadError(`${field}.coverageType is unsupported`);
  return {
    countryCode: requiredString(value.countryCode, `${field}.countryCode`, 12).toLowerCase(),
    countryName: requiredString(value.countryName, `${field}.countryName`, 120),
    broadcaster: requiredString(value.broadcaster, `${field}.broadcaster`, 160),
    access,
    url: httpsUrl(value.url, `${field}.url`),
    affiliateUrl: value.affiliateUrl == null ? undefined : httpsUrl(value.affiliateUrl, `${field}.affiliateUrl`),
    sourceName: optionalString(value.sourceName, `${field}.sourceName`, 240),
    sourceUrl: value.sourceUrl == null ? undefined : httpsUrl(value.sourceUrl, `${field}.sourceUrl`),
    lastChecked: optionalString(value.lastChecked, `${field}.lastChecked`, 40),
    notes: optionalString(value.notes, `${field}.notes`, 2_000),
    commentaryLanguages: parseLanguages(value.commentaryLanguages, `${field}.commentaryLanguages`),
    coverageType: coverageType as BroadcastInfo["coverageType"],
    coverageStatus: "confirmed",
    broadcastType: broadcastType as BroadcastInfo["broadcastType"],
    accessConditions: optionalString(value.accessConditions, `${field}.accessConditions`, 1_000),
    requiresAccount: value.requiresAccount === true,
    isFreeTrial: value.isFreeTrial === true,
  };
}

function parseSessionType(value: unknown, field: string): SessionType | undefined {
  const sessionType = optionalString(value, field, 40);
  if (!sessionType) return undefined;
  const allowed: SessionType[] = ["practice", "sprint_qualifying", "sprint", "qualifying", "race", "early_prelims", "prelims", "main_card"];
  if (!allowed.includes(sessionType as SessionType)) throw new PublicEventsPayloadError(`${field} is unsupported`);
  return sessionType as SessionType;
}

function parseEvent(value: unknown, index: number): EventData {
  const field = `events[${index}]`;
  if (!isRecord(value)) throw new PublicEventsPayloadError(`${field} must be an object`);
  const rawBroadcasts = value.broadcasts;
  if (!Array.isArray(rawBroadcasts) || rawBroadcasts.length > MAX_BROADCASTS_PER_EVENT) throw new PublicEventsPayloadError(`${field}.broadcasts exceeds its limit`);
  const status = optionalString(value.status, `${field}.status`, 20);
  if (status && !["scheduled", "live", "finished"].includes(status)) throw new PublicEventsPayloadError(`${field}.status is unsupported`);

  return {
    id: requiredString(value.id, `${field}.id`, 180),
    slug: slug(value.slug, `${field}.slug`),
    detailPath: localPath(value.detailPath, `${field}.detailPath`),
    sport: slug(value.sport, `${field}.sport`),
    competition: requiredString(value.competition, `${field}.competition`, 200),
    competitionSlug: slug(value.competitionSlug, `${field}.competitionSlug`),
    stage: optionalString(value.stage, `${field}.stage`, 120),
    group: optionalString(value.group, `${field}.group`, 80),
    eventDate: isoTimestamp(value.eventDate, `${field}.eventDate`),
    status: status as EventData["status"],
    participant1: parseParticipant(value.participant1, `${field}.participant1`),
    participant2: parseParticipant(value.participant2, `${field}.participant2`),
    title: requiredString(value.title, `${field}.title`, 300),
    broadcasts: rawBroadcasts.map((broadcast, broadcastIndex) => parseBroadcast(broadcast, `${field}.broadcasts[${broadcastIndex}]`)),
    eventGroupId: optionalString(value.eventGroupId, `${field}.eventGroupId`, 180),
    eventGroupName: optionalString(value.eventGroupName, `${field}.eventGroupName`, 240),
    eventGroupSlug: optionalSlug(value.eventGroupSlug, `${field}.eventGroupSlug`),
    eventEditionKey: optionalString(value.eventEditionKey, `${field}.eventEditionKey`, 180),
    eventEditionLabel: optionalString(value.eventEditionLabel, `${field}.eventEditionLabel`, 120),
    sessionType: parseSessionType(value.sessionType, `${field}.sessionType`),
    sequenceNumber: optionalInteger(value.sequenceNumber, `${field}.sequenceNumber`, 1, 100),
    venue: optionalString(value.venue, `${field}.venue`, 240),
    country: optionalString(value.country, `${field}.country`, 120),
  };
}

export function parsePublicEventsPayload(value: unknown): PublicEventsPayload {
  if (!isRecord(value)) throw new PublicEventsPayloadError("payload must be an object");
  if (value.schemaVersion !== PUBLIC_EVENTS_SCHEMA_VERSION) throw new PublicEventsPayloadError("payload schema version is unsupported");
  if (!Array.isArray(value.events) || value.events.length > MAX_PUBLIC_EVENTS) throw new PublicEventsPayloadError("events must be a bounded array");
  const events = value.events.map(parseEvent);
  const identities = new Set<string>();
  const paths = new Set<string>();
  for (const event of events) {
    if (identities.has(event.id)) throw new PublicEventsPayloadError(`duplicate event id: ${event.id}`);
    if (paths.has(event.detailPath)) throw new PublicEventsPayloadError(`duplicate event detail path: ${event.detailPath}`);
    identities.add(event.id);
    paths.add(event.detailPath);
  }
  return {
    schemaVersion: PUBLIC_EVENTS_SCHEMA_VERSION,
    generatedAt: isoTimestamp(value.generatedAt, "generatedAt"),
    events,
  };
}
