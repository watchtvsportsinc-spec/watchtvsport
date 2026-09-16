import "server-only";

import { cache } from "react";

const DEFAULT_SUPABASE_URL = "https://jywqhiiwsmudthaujhmi.supabase.co";
const DEFAULT_SUPABASE_PUBLISHABLE_KEY = "sb_publishable_30SkJ3gyUbPvH5sGFXpyHg_a4Qlzdi-";
const REQUEST_TIMEOUT_MS = 5_000;
const MAX_RESPONSE_BYTES = 512 * 1024;

type Row = Record<string, unknown>;

export type PublicCompetitionDirectoryItem = {
  id: string;
  sport: string;
  slug: string;
  name: string;
  displayName?: string;
  seasonLabel?: string;
  competitionType?: string;
  regionLabel?: string;
  countryCode?: string;
  metadataStatus?: "reviewed" | "verified";
  participantCount: number;
  publishedEventCount: number;
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

function nonNegativeInteger(value: unknown): number {
  return typeof value === "number" && Number.isInteger(value) && value >= 0 ? value : 0;
}

function parseItem(value: unknown): PublicCompetitionDirectoryItem | null {
  if (!isObject(value)) return null;
  const id = text(value.id);
  const sport = text(value.sport);
  const slug = text(value.slug);
  const name = text(value.name);
  if (!id || !sport || !slug || !name) return null;
  const rawStatus = text(value.metadataStatus);
  const metadataStatus = rawStatus === "verified" || rawStatus === "reviewed" ? rawStatus : undefined;
  return {
    id,
    sport,
    slug,
    name,
    displayName: text(value.displayName),
    seasonLabel: text(value.seasonLabel),
    competitionType: text(value.competitionType),
    regionLabel: text(value.regionLabel),
    countryCode: text(value.countryCode),
    metadataStatus,
    participantCount: nonNegativeInteger(value.participantCount),
    publishedEventCount: nonNegativeInteger(value.publishedEventCount),
    lastModified: text(value.lastModified),
  };
}

function parseDirectory(value: unknown): PublicCompetitionDirectoryItem[] {
  if (!isObject(value) || !Array.isArray(value.competitions)) return [];
  return value.competitions.map(parseItem).filter((item): item is PublicCompetitionDirectoryItem => Boolean(item));
}

async function loadPublicCompetitionDirectory(): Promise<PublicCompetitionDirectoryItem[]> {
  for (const { url, key } of configCandidates()) {
    try {
      const response = await fetch(`${url}/rest/v1/rpc/get_public_competition_directory_v1`, {
        method: "POST",
        headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
        body: "{}",
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
        next: { revalidate: 900, tags: ["public-competition-directory"] },
      });
      if (!response.ok) continue;
      const body = await response.text();
      if (Buffer.byteLength(body, "utf8") > MAX_RESPONSE_BYTES) continue;
      const parsed = parseDirectory(JSON.parse(body));
      if (parsed.length > 0) return parsed;
    } catch {
      continue;
    }
  }
  return [];
}

export const getPublicCompetitionDirectory = cache(loadPublicCompetitionDirectory);
