import "server-only";

import { cache } from "react";
import { getAllEvents, type EventData } from "./events";
import { parseMultisportPublicEventsPayload } from "./public-events-multisport";
import type { PublicEventsPayload } from "./public-events-schema";

const MAX_RESPONSE_BYTES = 8 * 1024 * 1024;
const REQUEST_TIMEOUT_MS = 8_000;
const TARGETED_REVALIDATE_SECONDS = 120;

const DEFAULT_SUPABASE_URL = "https://jywqhiiwsmudthaujhmi.supabase.co";
const DEFAULT_SUPABASE_PUBLISHABLE_KEY = "sb_publishable_30SkJ3gyUbPvH5sGFXpyHg_a4Qlzdi-";

export type PublicEventsSnapshot = {
  events: EventData[];
  source: "local-archive" | "supabase" | "local-fallback";
  generatedAt: string;
  warning?: string;
};

export type PublicEventFilters = {
  sport?: string;
  competition?: string;
  slug?: string;
  country?: string;
  from?: string;
  to?: string;
  limit?: number;
};

function localArchiveGeneratedAt(events: EventData[]): string {
  let latest = 0;
  for (const event of events) {
    for (const broadcast of event.broadcasts) {
      const checkedAt = broadcast.lastChecked ? Date.parse(`${broadcast.lastChecked}T00:00:00Z`) : Number.NaN;
      if (Number.isFinite(checkedAt)) latest = Math.max(latest, checkedAt);
    }
  }
  return latest > 0 ? new Date(latest).toISOString() : "2026-07-20T00:00:00.000Z";
}

function boundedLimit(limit?: number): number {
  if (!Number.isFinite(limit)) return 250;
  return Math.max(1, Math.min(Math.trunc(limit!), 500));
}

function filterEvents(events: EventData[], filters: PublicEventFilters): EventData[] {
  const from = filters.from ? Date.parse(filters.from) : Number.NaN;
  const to = filters.to ? Date.parse(filters.to) : Number.NaN;
  const country = filters.country?.trim().toLowerCase();
  return events
    .filter((event) => !filters.sport || event.sport === filters.sport)
    .filter((event) => !filters.competition || event.competitionSlug === filters.competition)
    .filter((event) => !filters.slug || event.slug === filters.slug)
    .filter((event) => !country || event.broadcasts.some((broadcast) => broadcast.coverageStatus === "confirmed" && broadcast.countryCode?.toLowerCase() === country))
    .filter((event) => !Number.isFinite(from) || Date.parse(event.eventDate) >= from)
    .filter((event) => !Number.isFinite(to) || Date.parse(event.eventDate) < to)
    .sort((a, b) => Date.parse(a.eventDate) - Date.parse(b.eventDate))
    .slice(0, boundedLimit(filters.limit));
}

function localSnapshot(filters: PublicEventFilters, warning?: string): PublicEventsSnapshot {
  const allEvents = getAllEvents();
  const events = filterEvents(allEvents, filters);
  return {
    events,
    source: warning ? "local-fallback" : "local-archive",
    generatedAt: localArchiveGeneratedAt(allEvents),
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
  const url = process.env.SUPABASE_URL?.trim() || process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() || DEFAULT_SUPABASE_URL;
  const key = process.env.SUPABASE_PUBLISHABLE_KEY?.trim() || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim() || process.env.SUPABASE_ANON_KEY?.trim() || DEFAULT_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !isAllowedSupabaseUrl(url)) throw new Error("SUPABASE_URL is missing or invalid");
  if (!key || key.length > 4_096) throw new Error("the Supabase public read key is missing or invalid");
  return { url: url.replace(/\/$/, ""), key };
}

async function parseEventResponse(response: Response): Promise<PublicEventsPayload> {
  const declaredLength = Number(response.headers.get("content-length") ?? 0);
  if (Number.isFinite(declaredLength) && declaredLength > MAX_RESPONSE_BYTES) throw new Error("Supabase public event response is too large");
  const body = await response.text();
  if (Buffer.byteLength(body, "utf8") > MAX_RESPONSE_BYTES) throw new Error("Supabase public event response is too large");
  let value: unknown;
  try { value = JSON.parse(body); } catch { throw new Error("Supabase public event response is not valid JSON"); }
  return parseMultisportPublicEventsPayload(value);
}

function hasFilters(filters: PublicEventFilters): boolean {
  return Boolean(filters.sport || filters.competition || filters.slug || filters.country || filters.from || filters.to || filters.limit);
}

async function postRpc(rpcName: string, body: Record<string, unknown>, targeted: boolean): Promise<Response> {
  const { url, key } = readSupabaseConfig();
  return fetch(`${url}/rest/v1/rpc/${rpcName}`, {
    method: "POST",
    headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    ...(targeted ? { next: { revalidate: TARGETED_REVALIDATE_SECONDS } } : { cache: "no-store" as const }),
  });
}

async function fetchSupabaseEvents(filters: PublicEventFilters): Promise<PublicEventsPayload> {
  if (hasFilters(filters)) {
    const targetedResponse = await postRpc("get_public_events_filtered_v1", {
      p_sport_slug: filters.sport ?? null,
      p_competition_slug: filters.competition ?? null,
      p_event_slug: filters.slug ?? null,
      p_country_code: filters.country?.toLowerCase() ?? null,
      p_from: filters.from ?? null,
      p_to: filters.to ?? null,
      p_limit: boundedLimit(filters.limit),
    }, true);
    if (targetedResponse.ok) return parseEventResponse(targetedResponse);
    if (targetedResponse.status !== 404 && targetedResponse.status !== 400) {
      throw new Error(`Supabase targeted event request failed with ${targetedResponse.status}`);
    }
  }

  let lastStatus = 0;
  for (const rpcName of ["get_public_events_v3", "get_public_events_v2"]) {
    const response = await postRpc(rpcName, {}, false);
    if (response.ok) {
      const payload = await parseEventResponse(response);
      return hasFilters(filters) ? { ...payload, events: filterEvents(payload.events, filters) } : payload;
    }
    lastStatus = response.status;
    if (response.status !== 404 && response.status !== 400) break;
  }
  throw new Error(`Supabase public event request failed with ${lastStatus || "unknown status"}`);
}

async function loadPublicEventsSnapshot(
  sport?: string,
  competition?: string,
  slug?: string,
  country?: string,
  from?: string,
  to?: string,
  limit?: number,
): Promise<PublicEventsSnapshot> {
  const filters: PublicEventFilters = { sport, competition, slug, country, from, to, limit };
  const mode = process.env.WATCHTVSPORT_DATA_SOURCE?.trim() || "supabase";
  if (mode === "local") return localSnapshot(filters);
  if (mode !== "supabase") return localSnapshot(filters, "Live data configuration is invalid. Showing the bundled archive instead.");

  try {
    const payload = await fetchSupabaseEvents(filters);
    const localEvents = filterEvents(getAllEvents(), filters);
    if (payload.events.length === 0 && localEvents.length > 0) {
      return localSnapshot(filters, "The live database is connected but has no published matching events yet. Showing bundled data during migration.");
    }
    return { events: payload.events, source: "supabase", generatedAt: payload.generatedAt };
  } catch (error) {
    console.error("Public sports data could not be loaded; using the bundled archive.", error instanceof Error ? error.message : "unknown error");
    return localSnapshot(filters, "Live sports data is temporarily unavailable. Showing the bundled archive instead.");
  }
}

const getCachedSnapshot = cache(loadPublicEventsSnapshot);

export function getPublicEventsSnapshot(filters: PublicEventFilters = {}) {
  return getCachedSnapshot(
    filters.sport,
    filters.competition,
    filters.slug,
    filters.country,
    filters.from,
    filters.to,
    boundedLimit(filters.limit),
  );
}
