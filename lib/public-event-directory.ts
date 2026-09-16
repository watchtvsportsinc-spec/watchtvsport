import "server-only";

import { cache } from "react";

const DEFAULT_SUPABASE_URL = "https://jywqhiiwsmudthaujhmi.supabase.co";
const DEFAULT_SUPABASE_PUBLISHABLE_KEY = "sb_publishable_30SkJ3gyUbPvH5sGFXpyHg_a4Qlzdi-";
const REQUEST_TIMEOUT_MS = 8_000;
const MAX_PAGE_BYTES = 1024 * 1024;
const PAGE_SIZE = 500;
const MAX_PAGES = 20;

type Row = Record<string, unknown>;

export type PublicEventDirectoryItem = {
  id: string;
  slug: string;
  detailPath: string;
  sport: string;
  competitionSlug: string;
  eventDate?: string;
  status?: string;
  verificationStatus?: "confirmed" | "expected";
  canonicalKind: "permanent-page" | "event";
  lastModified?: string;
};

type SupabaseReadConfig = { url: string; key: string };

function configCandidates(): SupabaseReadConfig[] {
  const configuredUrl = (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || DEFAULT_SUPABASE_URL).replace(/\/$/, "");
  const configuredKey = process.env.SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_ANON_KEY || DEFAULT_SUPABASE_PUBLISHABLE_KEY;
  const candidates: SupabaseReadConfig[] = [
    { url: configuredUrl, key: configuredKey },
    { url: DEFAULT_SUPABASE_URL, key: DEFAULT_SUPABASE_PUBLISHABLE_KEY },
  ];
  return candidates.filter((candidate, index, all) => all.findIndex((entry) => entry.url === candidate.url && entry.key === candidate.key) === index);
}

function isObject(value: unknown): value is Row {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function text(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function parseItem(value: unknown): PublicEventDirectoryItem | null {
  if (!isObject(value)) return null;
  const id = text(value.id);
  const slug = text(value.slug);
  const detailPath = text(value.detailPath);
  const sport = text(value.sport);
  const competitionSlug = text(value.competitionSlug);
  if (!id || !slug || !detailPath || !detailPath.startsWith("/") || detailPath.startsWith("//") || !sport || !competitionSlug) return null;
  const rawVerification = text(value.verificationStatus);
  const verificationStatus = rawVerification === "confirmed" || rawVerification === "expected" ? rawVerification : undefined;
  return {
    id,
    slug,
    detailPath,
    sport,
    competitionSlug,
    eventDate: text(value.eventDate),
    status: text(value.status),
    verificationStatus,
    canonicalKind: value.canonicalKind === "permanent-page" ? "permanent-page" : "event",
    lastModified: text(value.lastModified),
  };
}

function parsePage(value: unknown): { events: PublicEventDirectoryItem[]; hasMore: boolean } {
  if (!isObject(value) || !Array.isArray(value.events)) return { events: [], hasMore: false };
  return {
    events: value.events.map(parseItem).filter((item): item is PublicEventDirectoryItem => Boolean(item)),
    hasMore: value.hasMore === true,
  };
}

async function fetchPage(url: string, key: string, offset: number) {
  const response = await fetch(`${url}/rest/v1/rpc/get_public_event_directory_v1`, {
    method: "POST",
    headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ p_offset: offset, p_limit: PAGE_SIZE }),
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    next: { revalidate: 300, tags: ["public-event-directory"] },
  });
  if (!response.ok) throw new Error(`event directory request failed with ${response.status}`);
  const body = await response.text();
  if (Buffer.byteLength(body, "utf8") > MAX_PAGE_BYTES) throw new Error("event directory page is too large");
  return parsePage(JSON.parse(body));
}

async function loadPublicEventDirectory(): Promise<PublicEventDirectoryItem[]> {
  for (const { url, key } of configCandidates()) {
    try {
      const all: PublicEventDirectoryItem[] = [];
      let offset = 0;
      for (let page = 0; page < MAX_PAGES; page += 1) {
        const payload = await fetchPage(url, key, offset);
        all.push(...payload.events);
        if (!payload.hasMore || payload.events.length === 0) break;
        offset += payload.events.length;
      }
      if (all.length > 0) {
        return Array.from(new Map(all.map((event) => [event.detailPath, event] as const)).values());
      }
    } catch {
      continue;
    }
  }
  return [];
}

export const getPublicEventDirectory = cache(loadPublicEventDirectory);
