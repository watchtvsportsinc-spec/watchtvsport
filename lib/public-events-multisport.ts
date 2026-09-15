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
]);

function optionalSessionType(value: unknown): SessionType | undefined {
  const session = optionalString(value, 40) as SessionType | undefined;
  return session && SESSION_TYPES.has(session) ? session : undefined;
}

/**
 * Keep the strict public payload validation already used by WatchTVSport, then
 * preserve optional multi-sport fields added by the V2 Supabase read contract.
 * Unknown or malformed optional fields are ignored rather than weakening the
 * base payload validation.
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

    return {
      ...event,
      eventGroupId: optionalString(raw.eventGroupId, 180),
      eventGroupName: optionalString(raw.eventGroupName, 240),
      eventGroupSlug: optionalString(raw.eventGroupSlug, 180),
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
