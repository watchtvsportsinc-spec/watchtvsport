import { getFavoriteEventFeed } from "@/lib/calendar";
import { MAX_FAVORITES, type FavoriteLookup } from "@/lib/favorites";
import { getPublicEventsSnapshot } from "@/lib/public-events";

const MAX_REQUEST_BYTES = 50_000;
const TECHNICAL_ID_PATTERN = /^[a-zA-Z0-9][a-zA-Z0-9:._/-]*$/;

function readIds(value: unknown): string[] | null {
  if (value === undefined) return [];
  if (!Array.isArray(value) || value.length > MAX_FAVORITES) return null;

  const ids: string[] = [];
  const seen = new Set<string>();

  for (const valueItem of value) {
    if (typeof valueItem !== "string") return null;

    const id = valueItem.trim();
    if (
      !id ||
      id.length > 180 ||
      !TECHNICAL_ID_PATTERN.test(id)
    ) {
      return null;
    }

    if (!seen.has(id)) {
      seen.add(id);
      ids.push(id);
    }
  }

  return ids;
}

function invalidRequest(message: string, status = 400): Response {
  return Response.json({ error: message }, { status });
}

export async function POST(request: Request): Promise<Response> {
  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (Number.isFinite(contentLength) && contentLength > MAX_REQUEST_BYTES) {
    return invalidRequest("Favorite selection is too large.", 413);
  }

  let value: unknown;

  try {
    value = await request.json();
  } catch {
    return invalidRequest("Request body must be valid JSON.");
  }

  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return invalidRequest("Favorite selection is invalid.");
  }

  const body = value as Record<string, unknown>;
  const eventIds = readIds(body.eventIds);
  const participantIds = readIds(body.participantIds);
  const competitionIds = readIds(body.competitionIds);
  const groupIds = readIds(body.groupIds);

  if (!eventIds || !participantIds || !competitionIds || !groupIds) {
    return invalidRequest("Favorite identifiers are invalid.");
  }

  if (eventIds.length + participantIds.length + competitionIds.length + groupIds.length > MAX_FAVORITES) {
    return invalidRequest("Favorite selection is too large.", 413);
  }

  const lookup: FavoriteLookup = {
    eventIds,
    participantIds,
    competitionIds,
    groupIds,
  };

  const dataSnapshot = await getPublicEventsSnapshot();

  return Response.json(getFavoriteEventFeed(dataSnapshot.events, lookup), {
    headers: {
      "Cache-Control": "private, no-store",
      "X-WatchTVSport-Data-Source": dataSnapshot.source,
      ...(dataSnapshot.warning
        ? { Warning: '110 - "Live sports data unavailable; archive fallback used"' }
        : {}),
    },
  });
}
