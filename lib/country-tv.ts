import "server-only";

import type { EventData } from "./events";
import type { BroadcastInfo } from "./matches";
import { getPublicEventsSnapshot } from "./public-events";

export type CountryTvSummary = {
  countryCode: string;
  countryName: string;
  eventCount: number;
  broadcasterCount: number;
  freeListings: number;
  paidListings: number;
  broadcasters: string[];
  sports: string[];
};

export type CountryCurrentEvent = {
  event: EventData;
  broadcasts: BroadcastInfo[];
};

function currentFrom(now = new Date()): string {
  return new Date(now.getTime() - 12 * 60 * 60 * 1000).toISOString();
}

function isCurrent(event: EventData, now = Date.now()): boolean {
  if (event.status === "live") return true;
  if (event.status === "finished") return false;
  return Date.parse(event.eventDate) >= now;
}

export function broadcastsForCountry(event: EventData, code: string): BroadcastInfo[] {
  const normalized = code.toLowerCase();
  return event.broadcasts.filter(
    (broadcast) =>
      broadcast.coverageStatus === "confirmed" &&
      broadcast.countryCode?.toLowerCase() === normalized &&
      Boolean(broadcast.broadcaster) &&
      Boolean(broadcast.url),
  );
}

export async function getCurrentCountryGuide(code: string): Promise<{
  events: CountryCurrentEvent[];
  generatedAt: string;
  warning?: string;
}> {
  const normalized = code.toLowerCase();
  const snapshot = await getPublicEventsSnapshot({
    country: normalized,
    from: currentFrom(),
    limit: 500,
  });
  const now = Date.now();
  const events = snapshot.events
    .filter((event) => isCurrent(event, now))
    .map((event) => ({ event, broadcasts: broadcastsForCountry(event, normalized) }))
    .filter((item) => item.broadcasts.length > 0)
    .sort((a, b) => Date.parse(a.event.eventDate) - Date.parse(b.event.eventDate));
  return { events, generatedAt: snapshot.generatedAt, ...(snapshot.warning ? { warning: snapshot.warning } : {}) };
}

export async function getCurrentCountrySummaries(): Promise<{
  countries: CountryTvSummary[];
  generatedAt: string;
  warning?: string;
}> {
  const snapshot = await getPublicEventsSnapshot({ from: currentFrom(), limit: 500 });
  const now = Date.now();
  const rows = new Map<string, {
    countryName: string;
    eventIds: Set<string>;
    broadcasters: Set<string>;
    sports: Set<string>;
    freeListings: number;
    paidListings: number;
  }>();

  for (const event of snapshot.events) {
    if (!isCurrent(event, now)) continue;
    for (const broadcast of event.broadcasts) {
      if (broadcast.coverageStatus !== "confirmed" || !broadcast.countryCode || !broadcast.countryName || !broadcast.broadcaster || !broadcast.url) continue;
      const code = broadcast.countryCode.toLowerCase();
      const row = rows.get(code) ?? {
        countryName: broadcast.countryName,
        eventIds: new Set<string>(),
        broadcasters: new Set<string>(),
        sports: new Set<string>(),
        freeListings: 0,
        paidListings: 0,
      };
      row.eventIds.add(event.id);
      row.broadcasters.add(broadcast.broadcaster);
      row.sports.add(event.sport);
      if (broadcast.access === "Free") row.freeListings += 1;
      if (broadcast.access === "Paid") row.paidListings += 1;
      rows.set(code, row);
    }
  }

  const countries = Array.from(rows.entries())
    .map(([countryCode, row]) => ({
      countryCode,
      countryName: row.countryName,
      eventCount: row.eventIds.size,
      broadcasterCount: row.broadcasters.size,
      freeListings: row.freeListings,
      paidListings: row.paidListings,
      broadcasters: Array.from(row.broadcasters).sort().slice(0, 4),
      sports: Array.from(row.sports).sort(),
    }))
    .sort((a, b) => a.countryName.localeCompare(b.countryName));

  return { countries, generatedAt: snapshot.generatedAt, ...(snapshot.warning ? { warning: snapshot.warning } : {}) };
}
