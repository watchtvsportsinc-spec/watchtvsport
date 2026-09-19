import "server-only";

import { cache } from "react";
import { parseMultisportPublicEventsPayload } from "./public-events-multisport";
import type { EventData } from "./events";
import { getEnabledPublicSupabaseConfig, type PublicSupabaseConfig } from "./public-supabase-config";

const REQUEST_TIMEOUT_MS = 4_000;
const MAX_RESPONSE_BYTES = 1024 * 1024;

function configCandidates(): PublicSupabaseConfig[] {
  const config = getEnabledPublicSupabaseConfig();
  return config ? [config] : [];
}

async function loadParticipantEvents(participantId: string): Promise<EventData[]> {
  for (const { url, key } of configCandidates()) {
    try {
      const response = await fetch(`${url}/rest/v1/rpc/get_public_participant_events_v1`, {
        method: "POST",
        headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
        body: JSON.stringify({ p_participant_id: participantId }),
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
        next: { revalidate: 300, tags: [`participant-events:${participantId}`] },
      });
      if (!response.ok) continue;
      const body = await response.text();
      if (Buffer.byteLength(body, "utf8") > MAX_RESPONSE_BYTES) continue;
      return parseMultisportPublicEventsPayload(JSON.parse(body)).events;
    } catch {
      continue;
    }
  }

  return [];
}

export const getPublicParticipantEvents = cache(loadParticipantEvents);
