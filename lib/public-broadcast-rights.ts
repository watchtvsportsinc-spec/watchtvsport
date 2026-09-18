import "server-only";

const REQUEST_TIMEOUT_MS = 8_000;
const REVALIDATE_SECONDS = 300;
const DEFAULT_SUPABASE_URL = "https://jywqhiiwsmudthaujhmi.supabase.co";
const DEFAULT_SUPABASE_PUBLISHABLE_KEY = "sb_publishable_30SkJ3gyUbPvH5sGFXpyHg_a4Qlzdi-";

export type PublicCompetitionBroadcastRight = {
  countryCode: string;
  countryName: string;
  broadcaster: string;
  rightsHolder: string;
  access: "Free" | "Paid" | "Unknown";
  coverageType: "full" | "partial" | "unknown";
  officialUrl?: string;
  sourceName?: string;
  sourceUrl?: string;
  lastChecked?: string;
};

function config() {
  const url = (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || DEFAULT_SUPABASE_URL).replace(/\/$/, "");
  const key = process.env.SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_ANON_KEY || DEFAULT_SUPABASE_PUBLISHABLE_KEY;
  return { url, key };
}

function normalizeAccess(value: unknown): "Free" | "Paid" | "Unknown" {
  return value === "Free" || value === "Paid" ? value : "Unknown";
}

function normalizeCoverage(value: unknown): "full" | "partial" | "unknown" {
  return value === "full" || value === "partial" ? value : "unknown";
}

export async function getPublicCompetitionBroadcastRights(input: {
  sport: string;
  competition: string;
  eventDate?: string;
}): Promise<PublicCompetitionBroadcastRight[]> {
  const { url, key } = config();

  try {
    const response = await fetch(`${url}/rest/v1/rpc/get_public_competition_broadcast_rights_v1`, {
      method: "POST",
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        p_sport_slug: input.sport,
        p_competition_slug: input.competition,
        p_event_date: input.eventDate ?? null,
      }),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      next: { revalidate: REVALIDATE_SECONDS },
    });

    if (!response.ok) {
      console.error("Competition broadcast rights request failed", response.status);
      return [];
    }

    const payload: unknown = await response.json();
    if (!Array.isArray(payload)) return [];

    return payload
      .slice(0, 100)
      .map((row): PublicCompetitionBroadcastRight | null => {
        if (!row || typeof row !== "object") return null;
        const item = row as Record<string, unknown>;
        if (typeof item.country_code !== "string" || typeof item.country_name !== "string" || typeof item.broadcaster !== "string") return null;

        return {
          countryCode: item.country_code.toLowerCase(),
          countryName: item.country_name,
          broadcaster: item.broadcaster,
          rightsHolder: typeof item.rights_holder === "string" ? item.rights_holder : item.broadcaster,
          access: normalizeAccess(item.access_type),
          coverageType: normalizeCoverage(item.coverage_type),
          officialUrl: typeof item.official_url === "string" ? item.official_url : undefined,
          sourceName: typeof item.source_name === "string" ? item.source_name : undefined,
          sourceUrl: typeof item.source_url === "string" ? item.source_url : undefined,
          lastChecked: typeof item.last_verified_at === "string" ? item.last_verified_at : undefined,
        };
      })
      .filter((item): item is PublicCompetitionBroadcastRight => Boolean(item));
  } catch (error) {
    console.error("Competition broadcast rights could not be loaded", error instanceof Error ? error.message : "unknown error");
    return [];
  }
}
