import type { EventData, SessionType } from "./events";
import {
  parsePublicEventsPayload,
  type PublicEventsPayload,
} from "./public-events-schema";

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function optionalString(value: unknown, maxLength: number): string | undefined {
  if (value === null || value === undefined || value === "") return undefined;
  if (typeof value !== "string") return undefined;
  const normalized = value.trim();
  if (!normalized || normalized.length > maxLength) return undefined;
  return normalized;
}

function optionalPositiveInteger(value: unknown): number | undefined {
  return typeof value === "number" && Number.isInteger(value) && value > 0
    ? value
    : undefined;
}

const SESSION_TYPES = new Set<SessionType>([
  "practice",
  "sprint_qualifying",
  "sprint",
  "qualifying",
  "race",
  "early_prelims",
  "prelims",
  "main_card",
]);

function optionalSessionType(value: unknown): SessionType | undefined {
  const session = optionalString(value, 40) as SessionType | undefined;
  return session && SESSION_TYPES.has(session) ? session : undefined;
}

function deriveGroupSlug(event: EventData, raw: Record<string, unknown>): string | undefined {
  const explicit = optionalString(raw.eventGroupSlug, 180);
  if (explicit) return explicit;

  if (event.sport === "ufc") {
    const match = event.detailPath.match(/^\/ufc\/event\/([^#?]+)/);
    if (match?.[1]) return match[1];
  }

  return undefined;
}

function deriveGroupName(event: EventData, raw: Record<string, unknown>): string | undefined {
  return optionalString(raw.eventGroupName, 240) ?? (event.sport === "ufc" ? event.title : undefined);
}

/**
 * Keep the strict public payload validation already used by WatchTVSport, then
 * preserve optional multi-sport fields added by the V2 Supabase read contract.
 * UFC group metadata can be reconstructed from its permanent detailPath because
 * the current RPC intentionally returns the permanent URL even when separate
 * event-group columns are omitted.
 */
export function parseMultisportPublicEventsPayload(
  value: unknown
): PublicEventsPayload {
  const base = parsePublicEventsPayload(value);
  if (!isRecord(value)) return base;
  const rawEvents = value.events;
  if (!Array.isArray(rawEvents)) return base;

  const events: EventData[] = base.events.map((event, index) => {
    const raw = rawEvents[index];
    if (!isRecord(raw)) return event;

    const groupSlug = deriveGroupSlug(event, raw);
    const groupName = deriveGroupName(event, raw);

    return {
      ...event,
      eventGroupId: optionalString(raw.eventGroupId, 180) ?? groupSlug,
      eventGroupName: groupName,
      eventGroupSlug: groupSlug,
      eventEditionKey: optionalString(raw.eventEditionKey, 80),
      eventEditionLabel: optionalString(raw.eventEditionLabel, 120),
      sessionType: optionalSessionType(raw.sessionType),
      sequenceNumber: optionalPositiveInteger(raw.sequenceNumber),
      venue: optionalString(raw.venue, 240),
      country: optionalString(raw.country, 120),
    };
  });

  return { ...base, events };
}
