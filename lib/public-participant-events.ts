import "server-only";

import { cache } from "react";
import { parseMultisportPublicEventsPayload } from "./public-events-multisport";
import type { EventData } from "./events";

const DEFAULT_SUPABASE_URL = "https://jywqhiiwsmudthaujhmi.supabase.co";
const DEFAULT_SUPABASE_PUBLISHABLE_KEY = "sb_publishable_30SkJ3gyUbPvH5sGFXpyHg_a4Qlzdi-";
const REQUEST_TIMEOUT_MS = 4_000;
const MAX_RESPONSE_BYTES = 1024 * 1024;

function config() {
  const url = (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || DEFAULT_SUPABASE_URL).replace(/\/$/, "");
  const key = process.env.SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_ANON_KEY || DEFAULT_SUPABASE_PUBLISHABLE_KEY;
  return { url, key };
}

async function loadParticipantEvents(participantId: string): Promise<EventData[]> {
  try {
    const { url, key } = config();
    const response = await fetch(`${url}/rest/v1/rpc/get_public_participant_events_v1`, {
      method: "POST",
      headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ p_participant_id: participantId }),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      next: { revalidate: 300, tags: [`participant-events:${participantId}`] },
    });
    if (!response.ok) return [];
    const body = await response.text();
    if (Buffer.byteLength(body, "utf8") > MAX_RESPONSE_BYTES) return [];
    return parseMultisportPublicEventsPayload(JSON.parse(body)).events;
  } catch {
    return [];
  }
}

export const getPublicParticipantEvents = cache(loadParticipantEvents);
