import "server-only";

export type PreviewFixtureParticipant = {
  id: string;
  slug: string;
  name: string;
  shortName?: string;
  logoUrl?: string;
};

export type PreviewFixture = {
  id: string;
  slug: string;
  competitionSlug: string;
  competitionName: string;
  phase?: string;
  eventDate?: string;
  status: "scheduled" | "live" | "finished";
  isPublished: boolean;
  home: PreviewFixtureParticipant;
  away: PreviewFixtureParticipant;
};

const DEFAULT_SUPABASE_URL = "https://jywqhiiwsmudthaujhmi.supabase.co";
const REQUEST_TIMEOUT_MS = 5_000;

function previewEnabled(): boolean {
  return process.env.NODE_ENV !== "production" && process.env.WATCHTVSPORT_PREVIEW_UNPUBLISHED === "1";
}

function readConfig() {
  if (!previewEnabled()) return null;
  const url = (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || DEFAULT_SUPABASE_URL).replace(/\/$/, "");
  const key = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) return null;
  return { url, key };
}

async function rest<T>(path: string): Promise<T> {
  const config = readConfig();
  if (!config) throw new Error("Preview fixture mode is not configured");
  const response = await fetch(`${config.url}/rest/v1/${path}`, {
    headers: { apikey: config.key, Authorization: `Bearer ${config.key}` },
    cache: "no-store",
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
  if (!response.ok) throw new Error(`Preview Supabase request failed with ${response.status}`);
  return response.json() as Promise<T>;
}

function encodeIn(values: string[]): string {
  return `in.(${values.map((value) => `"${value.replaceAll('"', '')}"`).join(",")})`;
}

export function isPreviewFixtureMode(): boolean {
  return previewEnabled() && Boolean(process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY);
}

export async function getPreviewCompetitionFixtures(competitionSlug: string): Promise<PreviewFixture[]> {
  if (!isPreviewFixtureMode()) return [];

  const competitions = await rest<Array<{ id: string; slug: string; name: string }>>(
    `competitions?select=id,slug,name&slug=eq.${encodeURIComponent(competitionSlug)}&limit=1`
  );
  const competition = competitions[0];
  if (!competition) return [];

  const rows = await rest<Array<{
    id: string;
    slug: string;
    phase: string | null;
    event_date: string | null;
    status: string;
    is_published: boolean;
    home_participant_id: string | null;
    away_participant_id: string | null;
  }>>(
    `events?select=id,slug,phase,event_date,status,is_published,home_participant_id,away_participant_id&competition_id=eq.${competition.id}&verification_status=eq.confirmed&order=event_date.asc.nullslast,slug.asc&limit=1000`
  );

  const participantIds = Array.from(new Set(rows.flatMap((row) => [row.home_participant_id, row.away_participant_id]).filter((value): value is string => Boolean(value))));
  if (!participantIds.length) return [];

  const participants = await rest<Array<{
    id: string;
    slug: string;
    name: string;
    short_name: string | null;
  }>>(`participants?select=id,slug,name,short_name&id=${encodeURIComponent(encodeIn(participantIds))}`);
  const participantById = new Map(participants.map((participant) => [participant.id, participant]));

  const media = await rest<Array<{ entity_key: string; storage_url: string | null }>>(
    `media_assets?select=entity_key,storage_url&entity_type=eq.participant&asset_kind=eq.team_logo&verification_status=eq.approved&is_current=eq.true&entity_key=${encodeURIComponent(encodeIn(participants.map((participant) => participant.slug)))}&limit=1000`
  );
  const logoBySlug = new Map(media.filter((item) => item.storage_url).map((item) => [item.entity_key, item.storage_url!]))

  return rows.flatMap((row) => {
    const home = row.home_participant_id ? participantById.get(row.home_participant_id) : null;
    const away = row.away_participant_id ? participantById.get(row.away_participant_id) : null;
    if (!home || !away) return [];
    const status: PreviewFixture["status"] = row.status === "live" || row.status === "finished" ? row.status : "scheduled";
    return [{
      id: row.id,
      slug: row.slug,
      competitionSlug: competition.slug,
      competitionName: competition.name,
      phase: row.phase ?? undefined,
      eventDate: row.event_date ?? undefined,
      status,
      isPublished: row.is_published,
      home: { id: home.id, slug: home.slug, name: home.name, shortName: home.short_name ?? undefined, logoUrl: logoBySlug.get(home.slug) },
      away: { id: away.id, slug: away.slug, name: away.name, shortName: away.short_name ?? undefined, logoUrl: logoBySlug.get(away.slug) },
    }];
  });
}
