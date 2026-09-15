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
  logoUrl?: string;
};

function config() {
  const url = (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || DEFAULT_SUPABASE_URL).replace(/\/$/, "");
  const key = process.env.SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_ANON_KEY || DEFAULT_SUPABASE_PUBLISHABLE_KEY;
  return { url, key };
}

function requestInit(key: string) {
  return {
    headers: { apikey: key, Authorization: `Bearer ${key}` },
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    next: { revalidate: 86400, tags: ["public-participants"] },
  } as const;
}

async function loadParticipants(): Promise<PublicParticipant[]> {
  try {
    const { url, key } = config();
    const [sportsResponse, participantsResponse, mediaResponse] = await Promise.all([
      fetch(`${url}/rest/v1/sports?select=id,slug`, requestInit(key)),
      fetch(`${url}/rest/v1/participants?select=id,sport_id,participant_type,slug,name,short_name,country_code&is_active=eq.true&order=name.asc`, requestInit(key)),
      fetch(`${url}/rest/v1/media_assets?select=entity_key,storage_url,verified_at&entity_type=eq.participant&asset_kind=eq.team_logo&verification_status=eq.approved&is_current=eq.true&storage_url=not.is.null&order=verified_at.desc`, requestInit(key)),
    ]);

    if (!sportsResponse.ok || !participantsResponse.ok) return [];

    const sports = await sportsResponse.json() as Array<{ id: string; slug: string }>;
    const sportById = new Map(sports.map((sport) => [sport.id, sport.slug]));

    const logoBySlug = new Map<string, string>();
    if (mediaResponse.ok) {
      const mediaRows = await mediaResponse.json() as Array<Record<string, unknown>>;
      for (const row of mediaRows) {
        if (typeof row.entity_key !== "string" || typeof row.storage_url !== "string") continue;
        if (!logoBySlug.has(row.entity_key)) logoBySlug.set(row.entity_key, row.storage_url);
      }
    }

    const rows = await participantsResponse.json() as Array<Record<string, unknown>>;
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
        logoUrl: logoBySlug.get(slug),
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
