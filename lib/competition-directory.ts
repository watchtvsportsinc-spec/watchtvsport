import "server-only";

import { cache } from "react";
import { getPublicParticipants, type PublicParticipant } from "./public-participants";

const DEFAULT_SUPABASE_URL = "https://jywqhiiwsmudthaujhmi.supabase.co";
const DEFAULT_SUPABASE_PUBLISHABLE_KEY = "sb_publishable_30SkJ3gyUbPvH5sGFXpyHg_a4Qlzdi-";
const REQUEST_TIMEOUT_MS = 4_000;

export type PublicCompetitionDirectory = {
  id: string;
  sport: string;
  slug: string;
  name: string;
  seasonLabel?: string;
  members: PublicParticipant[];
};

function config() {
  const url = (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || DEFAULT_SUPABASE_URL).replace(/\/$/, "");
  const key = process.env.SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_ANON_KEY || DEFAULT_SUPABASE_PUBLISHABLE_KEY;
  return { url, key };
}

async function fetchJson(path: string): Promise<unknown[]> {
  const { url, key } = config();
  const response = await fetch(`${url}/rest/v1/${path}`, {
    headers: { apikey: key, Authorization: `Bearer ${key}` },
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    next: { revalidate: 86400, tags: ["competition-directory"] },
  });
  if (!response.ok) return [];
  const value = await response.json();
  return Array.isArray(value) ? value : [];
}

async function loadCompetitionDirectories(): Promise<PublicCompetitionDirectory[]> {
  try {
    const [sportsRaw, compsRaw, seasonsRaw, membershipsRaw, participants] = await Promise.all([
      fetchJson("sports?select=id,slug"),
      fetchJson("competitions?select=id,sport_id,slug,name,season_label&is_active=eq.true"),
      fetchJson("seasons?select=id,competition_id,slug,label,is_current&is_current=eq.true"),
      fetchJson("competition_memberships?select=competition_id,season_id,participant_id,membership_status&membership_status=eq.confirmed"),
      getPublicParticipants(),
    ]);

    const sportById = new Map(sportsRaw.flatMap((row) => {
      if (!row || typeof row !== "object" || Array.isArray(row)) return [];
      const r = row as Record<string, unknown>;
      return typeof r.id === "string" && typeof r.slug === "string" ? [[r.id, r.slug] as const] : [];
    }));
    const participantById = new Map(participants.map((participant) => [participant.id, participant]));
    const currentSeasonByCompetition = new Map(seasonsRaw.flatMap((row) => {
      if (!row || typeof row !== "object" || Array.isArray(row)) return [];
      const r = row as Record<string, unknown>;
      return typeof r.id === "string" && typeof r.competition_id === "string" ? [[r.competition_id, { id: r.id, label: typeof r.label === "string" ? r.label : undefined }] as const] : [];
    }));

    const memberIdsByCompetition = new Map<string, string[]>();
    for (const row of membershipsRaw) {
      if (!row || typeof row !== "object" || Array.isArray(row)) continue;
      const r = row as Record<string, unknown>;
      if (typeof r.competition_id !== "string" || typeof r.participant_id !== "string") continue;
      const season = currentSeasonByCompetition.get(r.competition_id);
      if (season && r.season_id !== season.id) continue;
      memberIdsByCompetition.set(r.competition_id, [...(memberIdsByCompetition.get(r.competition_id) ?? []), r.participant_id]);
    }

    return compsRaw.flatMap((row) => {
      if (!row || typeof row !== "object" || Array.isArray(row)) return [];
      const r = row as Record<string, unknown>;
      const id = typeof r.id === "string" ? r.id : "";
      const sport = typeof r.sport_id === "string" ? sportById.get(r.sport_id) ?? "" : "";
      const slug = typeof r.slug === "string" ? r.slug : "";
      const name = typeof r.name === "string" ? r.name : "";
      if (!id || !sport || !slug || !name) return [];
      const members = (memberIdsByCompetition.get(id) ?? []).flatMap((participantId) => {
        const participant = participantById.get(participantId);
        return participant ? [participant] : [];
      }).sort((a,b) => a.name.localeCompare(b.name));
      return [{ id, sport, slug, name, seasonLabel: typeof r.season_label === "string" ? r.season_label : currentSeasonByCompetition.get(id)?.label, members } satisfies PublicCompetitionDirectory];
    });
  } catch {
    return [];
  }
}

export const getPublicCompetitionDirectories = cache(loadCompetitionDirectories);

export async function getPublicCompetitionDirectory(sport: string, slug: string): Promise<PublicCompetitionDirectory | null> {
  return (await getPublicCompetitionDirectories()).find((competition) => competition.sport === sport && competition.slug === slug) ?? null;
}
