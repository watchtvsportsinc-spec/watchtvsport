import "server-only";

import { cache } from "react";
import { getAllEvents, type EventData } from "./events";
import {
  parsePublicEventsPayload,
  type PublicEventsPayload,
} from "./public-events-schema";

const MAX_RESPONSE_BYTES = 8 * 1024 * 1024;
const REQUEST_TIMEOUT_MS = 4_000;

export type PublicEventsSnapshot = {
  events: EventData[];
  source: "local-archive" | "supabase" | "local-fallback";
  generatedAt: string;
  warning?: string;
};

function localArchiveGeneratedAt(events: EventData[]): string {
  let latest = 0;

  for (const event of events) {
    for (const broadcast of event.broadcasts) {
      const checkedAt = broadcast.lastChecked
        ? Date.parse(`${broadcast.lastChecked}T00:00:00Z`)
        : Number.NaN;
      if (Number.isFinite(checkedAt)) latest = Math.max(latest, checkedAt);
    }
  }

  return latest > 0
    ? new Date(latest).toISOString()
    : "2026-07-20T00:00:00.000Z";
}

function localSnapshot(warning?: string): PublicEventsSnapshot {
  const events = getAllEvents();
  return {
    events,
    source: warning ? "local-fallback" : "local-archive",
    generatedAt: localArchiveGeneratedAt(events),
    ...(warning ? { warning } : {}),
  };
}

function isAllowedSupabaseUrl(value: string): boolean {
  try {
    const url = new URL(value);
    const isLoopback = url.hostname === "127.0.0.1" || url.hostname === "localhost";
    return url.protocol === "https:" || (url.protocol === "http:" && isLoopback);
  } catch {
    return false;
  }
}

function readSupabaseConfig(): { url: string; key: string } {
  const url = process.env.SUPABASE_URL?.trim() ?? "";
  const key =
    process.env.SUPABASE_PUBLISHABLE_KEY?.trim() ??
    process.env.SUPABASE_ANON_KEY?.trim() ??
    "";

  if (!url || !isAllowedSupabaseUrl(url)) {
    throw new Error("SUPABASE_URL is missing or invalid");
  }
  if (!key || key.length > 4_096) {
    throw new Error("the Supabase public read key is missing or invalid");
  }

  return { url: url.replace(/\/$/, ""), key };
}

async function fetchSupabaseEvents(): Promise<PublicEventsPayload> {
  const { url, key } = readSupabaseConfig();
  const response = await fetch(`${url}/rest/v1/rpc/get_public_events_v2`, {
    method: "POST",
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: "{}",
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    next: { revalidate: 300, tags: ["public-events-v2"] },
  });

  if (!response.ok) {
    throw new Error(`Supabase public event request failed with ${response.status}`);
  }

  const declaredLength = Number(response.headers.get("content-length") ?? 0);
  if (Number.isFinite(declaredLength) && declaredLength > MAX_RESPONSE_BYTES) {
    throw new Error("Supabase public event response is too large");
  }

  const body = await response.text();
  if (Buffer.byteLength(body, "utf8") > MAX_RESPONSE_BYTES) {
    throw new Error("Supabase public event response is too large");
  }

  let value: unknown;
  try {
    value = JSON.parse(body);
  } catch {
    throw new Error("Supabase public event response is not valid JSON");
  }

  return parsePublicEventsPayload(value);
}

async function loadPublicEventsSnapshot(): Promise<PublicEventsSnapshot> {
  const mode = process.env.WATCHTVSPORT_DATA_SOURCE?.trim() || "local";

  if (mode === "local") return localSnapshot();
  if (mode !== "supabase") {
    return localSnapshot(
      "Live data configuration is invalid. Showing the bundled archive instead."
    );
  }

  try {
    const payload = await fetchSupabaseEvents();
    return {
      events: payload.events,
      source: "supabase",
      generatedAt: payload.generatedAt,
    };
  } catch (error) {
    console.error(
      "Public sports data could not be loaded; using the bundled archive.",
      error instanceof Error ? error.message : "unknown error"
    );
    return localSnapshot(
      "Live sports data is temporarily unavailable. Showing the bundled archive instead."
    );
  }
}

export const getPublicEventsSnapshot = cache(loadPublicEventsSnapshot);
