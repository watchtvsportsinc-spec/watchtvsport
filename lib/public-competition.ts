import "server-only";

import { cache } from "react";

const DEFAULT_SUPABASE_URL = "https://jywqhiiwsmudthaujhmi.supabase.co";
const DEFAULT_SUPABASE_PUBLISHABLE_KEY = "sb_publishable_30SkJ3gyUbPvH5sGFXpyHg_a4Qlzdi-";
const REQUEST_TIMEOUT_MS = 4_000;

type Row = Record<string, unknown>;

export type PublicCompetitionTeam = {
  id: string;
  slug: string;
  name: string;
  shortName?: string;
};

export type PublicCompetition = {
  id: string;
  slug: string;
  name: string;
  sport: string;
  sportName: string;
  teams: PublicCompetitionTeam[];
};

function config() {
  const url = (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || DEFAULT_SUPABASE_URL).replace(/\/$/, "");
  const key = process.env.SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_ANON_KEY || DEFAULT_SUPABASE_PUBLISHABLE_KEY;
  return { url, key };
}

function headers(key: string) {
  return { apikey: key, Authorization: `Bearer ${key}` };
}

async function getJson(url: string, key: string): Promise<unknown> {
  const response = await fetch(url, {
    headers: headers(key),
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    next: { revalidate: 3600, tags: ["public-competition-memberships"] },
  });
  if (!response.ok) throw new Error(`Supabase request failed with ${response.status}`);
  return response.json();
}

function rows(value: unknown): Row[] {
  return Array.isArray(value) ? value.filter((item): item is Row => Boolean(item) && typeof item === "object" && !Array.isArray(item)) : [];
}

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

async function loadPublicCompetition(sportSlug: string, competitionSlug: string): Promise<PublicCompetition | null> {
  try {
    const { url, key } = config();
    const sportRows = rows(await getJson(`${url}/rest/v1/sports?slug=eq.${encodeURIComponent(sportSlug)}&select=id,slug,name&limit=1`, key));
    const sport = sportRows[0];
    const sportId = text(sport?.id);
    const sportName = text(sport?.name) || sportSlug;
    if (!sportId) return null;

    const competitionRows = rows(await getJson(`${url}/rest/v1/competitions?sport_id=eq.${encodeURIComponent(sportId)}&slug=eq.${encodeURIComponent(competitionSlug)}&select=id,slug,name&limit=1`, key));
    const competition = competitionRows[0];
    const competitionId = text(competition?.id);
    const competitionName = text(competition?.name);
    if (!competitionId || !competitionName) return null;

    const membershipRows = rows(await getJson(`${url}/rest/v1/competition_memberships?competition_id=eq.${encodeURIComponent(competitionId)}&membership_status=eq.confirmed&select=participant_id`, key));
    const participantIds = Array.from(new Set(membershipRows.map((row) => text(row.participant_id)).filter(Boolean)));

    let teams: PublicCompetitionTeam[] = [];
    if (participantIds.length) {
      const filter = participantIds.map((id) => `\"${id.replaceAll('"', '')}\"`).join(",");
      const participantRows = rows(await getJson(`${url}/rest/v1/participants?id=in.(${encodeURIComponent(filter)})&is_active=eq.true&select=id,slug,name,short_name&order=name.asc`, key));
      teams = participantRows.flatMap((row) => {
        const id = text(row.id);
        const slug = text(row.slug);
        const name = text(row.name);
        if (!id || !slug || !name) return [];
        const shortName = text(row.short_name) || undefined;
        return [{ id, slug, name, shortName }];
      });
    }

    return {
      id: competitionId,
      slug: text(competition.slug) || competitionSlug,
      name: competitionName,
      sport: sportSlug,
      sportName,
      teams,
    };
  } catch (error) {
    console.error("Permanent competition data could not be loaded", error instanceof Error ? error.message : "unknown error");
    return null;
  }
}

export const getPublicCompetition = cache(loadPublicCompetition);
