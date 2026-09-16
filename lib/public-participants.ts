import "server-only";

import { cache } from "react";

const DEFAULT_SUPABASE_URL = "https://jywqhiiwsmudthaujhmi.supabase.co";
const DEFAULT_SUPABASE_PUBLISHABLE_KEY = "sb_publishable_30SkJ3gyUbPvH5sGFXpyHg_a4Qlzdi-";
const REQUEST_TIMEOUT_MS = 4_000;
const MAX_RESPONSE_BYTES = 1024 * 1024;

export type PublicParticipantDirectoryEntry = {
  id: string;
  slug: string;
  name: string;
  shortName?: string;
  participantType: string;
  sport: string;
  countryCode?: string;
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

function optionalString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function parseParticipantDirectory(value: unknown): PublicParticipantDirectoryEntry[] {
  if (!value || typeof value !== "object" || Array.isArray(value)) return [];
  const root = value as Record<string, unknown>;
  if (!Array.isArray(root.participants)) return [];

  return root.participants.flatMap((item) => {
    if (!item || typeof item !== "object" || Array.isArray(item)) return [];
    const row = item as Record<string, unknown>;
    const id = optionalString(row.id);
    const slug = optionalString(row.slug);
    const name = optionalString(row.name);
    const participantType = optionalString(row.participantType);
    const sport = optionalString(row.sport);
    if (!id || !slug || !name || !participantType || !sport) return [];
    return [{
      id,
      slug,
      name,
      participantType,
      sport,
      shortName: optionalString(row.shortName),
      countryCode: optionalString(row.countryCode),
    }];
  });
}

async function loadPublicParticipantDirectory(): Promise<PublicParticipantDirectoryEntry[]> {
  for (const { url, key } of configCandidates()) {
    try {
      const response = await fetch(`${url}/rest/v1/rpc/get_public_participant_directory_v1`, {
        method: "POST",
        headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
        body: "{}",
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
        next: { revalidate: 3600, tags: ["participant-directory"] },
      });
      if (!response.ok) continue;
      const body = await response.text();
      if (Buffer.byteLength(body, "utf8") > MAX_RESPONSE_BYTES) continue;
      return parseParticipantDirectory(JSON.parse(body));
    } catch {
      continue;
    }
  }
  return [];
}

export const getPublicParticipantDirectory = cache(loadPublicParticipantDirectory);
