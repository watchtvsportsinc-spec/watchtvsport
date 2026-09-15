import "server-only";

import { cache } from "react";

const DEFAULT_SUPABASE_URL = "https://jywqhiiwsmudthaujhmi.supabase.co";
const DEFAULT_SUPABASE_PUBLISHABLE_KEY = "sb_publishable_30SkJ3gyUbPvH5sGFXpyHg_a4Qlzdi-";
const REQUEST_TIMEOUT_MS = 4_000;

export type PublicParticipant = {
  id: string;
  sport: string;
  type: string;
  slug: string;
  name: string;
  shortName?: string;
  countryCode?: string;
};

function config() {
  const url = (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || DEFAULT_SUPABASE_URL).replace(/\/$/, "");
  const key = process.env.SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_ANON_KEY || DEFAULT_SUPABASE_PUBLISHABLE_KEY;
  return { url, key };
}

async function loadParticipants(): Promise<PublicParticipant[]> {
  try {
    const { url, key } = config();
    const sportsResponse = await fetch(`${url}/rest/v1/sports?select=id,slug`, {
      headers: { apikey: key, Authorization: `Bearer ${key}` },
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      next: { revalidate: 86400, tags: ["public-participants"] },
    });
    if (!sportsResponse.ok) return [];
    const sports = await sportsResponse.json() as Array<{ id: string; slug: string }>;
    const sportById = new Map(sports.map((sport) => [sport.id, sport.slug]));

    const response = await fetch(`${url}/rest/v1/participants?select=id,sport_id,participant_type,slug,name,short_name,country_code&is_active=eq.true&order=name.asc`, {
      headers: { apikey: key, Authorization: `Bearer ${key}` },
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      next: { revalidate: 86400, tags: ["public-participants"] },
    });
    if (!response.ok) return [];
    const rows = await response.json() as Array<Record<string, unknown>>;
    return rows.flatMap((row) => {
      const id = typeof row.id === "string" ? row.id : "";
      const sport = typeof row.sport_id === "string" ? sportById.get(row.sport_id) ?? "" : "";
      const type = typeof row.participant_type === "string" ? row.participant_type : "";
      const slug = typeof row.slug === "string" ? row.slug : "";
      const name = typeof row.name === "string" ? row.name : "";
      if (!id || !sport || !type || !slug || !name) return [];
      return [{
        id,
        sport,
        type,
        slug,
        name,
        shortName: typeof row.short_name === "string" ? row.short_name : undefined,
        countryCode: typeof row.country_code === "string" ? row.country_code : undefined,
      } satisfies PublicParticipant];
    });
  } catch {
    return [];
  }
}

export const getPublicParticipants = cache(loadParticipants);

export async function getPublicParticipantsForSport(sport: string): Promise<PublicParticipant[]> {
  return (await getPublicParticipants()).filter((participant) => participant.sport === sport);
}

export async function getPublicParticipantBySlug(sport: string, slug: string): Promise<PublicParticipant | null> {
  return (await getPublicParticipants()).find((participant) => participant.sport === sport && participant.slug === slug) ?? null;
}
