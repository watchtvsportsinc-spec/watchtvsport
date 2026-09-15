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

export type PreviewFootballOverview = {
  totalCount: number;
  upcomingDatedCount: number;
  tbcCount: number;
  nextFixtures: PreviewFixture[];
};

const DEFAULT_SUPABASE_URL = "https://jywqhiiwsmudthaujhmi.supabase.co";
const REQUEST_TIMEOUT_MS = 5_000;

function previewEnabled(): boolean {
  return process.env.NODE_ENV !== "production"
    && process.env.VERCEL_ENV !== "production"
    && process.env.WATCHTVSPORT_PREVIEW_UNPUBLISHED === "1";
}

function readConfig() {
  if (!previewEnabled()) return null;
  const url = (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || DEFAULT_SUPABASE_URL).replace(/\/$/, "");
  const key = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw new Error("V2 local preview requires SUPABASE_SECRET_KEY or SUPABASE_SERVICE_ROLE_KEY in .env.local");
  return { url, key };
}

async function rest<T>(path: string): Promise<T> {
  const config = readConfig();
  if (!config) return [] as T;
  const response = await fetch(`${config.url}/rest/v1/${path}`, {
    headers: { apikey: config.key, Authorization: `Bearer ${config.key}` },
    cache: "no-store",
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
  if (!response.ok) throw new Error(`Preview Supabase request failed with ${response.status}`);
  return response.json() as Promise<T>;
}

async function restCount(path: string): Promise<number> {
  const config = readConfig();
  if (!config) return 0;
  const response = await fetch(`${config.url}/rest/v1/${path}`, {
    headers: {
      apikey: config.key,
      Authorization: `Bearer ${config.key}`,
      Prefer: "count=exact",
      Range: "0-0",
    },
    cache: "no-store",
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
  if (!response.ok) throw new Error(`Preview Supabase count request failed with ${response.status}`);
  const contentRange = response.headers.get("content-range");
  const total = contentRange?.match(/\/(\d+)$/)?.[1];
  if (!total) throw new Error("Preview Supabase count response is missing an exact total");
  return Number(total);
}

function encodeIn(values: string[]): string {
  return `in.(${values.map((value) => `"${value.replaceAll('"', '')}"`).join(",")})`;
}

export function isPreviewFixtureMode(): boolean {
  return previewEnabled();
}

type EventRow = {
  id: string;
  slug: string;
  phase: string | null;
  event_date: string | null;
  status: string;
  is_published: boolean;
  competition_id: string;
  home_participant_id: string | null;
  away_participant_id: string | null;
};

type ParticipantRow = { id: string; slug: string; name: string; short_name: string | null };
type CompetitionRow = { id: string; slug: string; name: string };
type SportRow = { id: string; slug: string };

async function hydrateFixtures(rows: EventRow[], competitions: CompetitionRow[]): Promise<PreviewFixture[]> {
  const participantIds = Array.from(new Set(rows.flatMap((row) => [row.home_participant_id, row.away_participant_id]).filter((value): value is string => Boolean(value))));
  if (!participantIds.length) return [];

  const participants = await rest<ParticipantRow[]>(
    `participants?select=id,slug,name,short_name&id=${encodeURIComponent(encodeIn(participantIds))}&limit=500`
  );
  const participantById = new Map(participants.map((participant) => [participant.id, participant]));
  const competitionById = new Map(competitions.map((competition) => [competition.id, competition]));

  const media = participants.length
    ? await rest<Array<{ entity_key: string; storage_url: string | null }>>(
      `media_assets?select=entity_key,storage_url&entity_type=eq.participant&asset_kind=eq.team_logo&verification_status=eq.approved&is_current=eq.true&entity_key=${encodeURIComponent(encodeIn(participants.map((participant) => participant.slug)))}&limit=500`
    )
    : [];
  const logoBySlug = new Map(media.filter((item) => item.storage_url).map((item) => [item.entity_key, item.storage_url!]));

  return rows.flatMap((row) => {
    const home = row.home_participant_id ? participantById.get(row.home_participant_id) : null;
    const away = row.away_participant_id ? participantById.get(row.away_participant_id) : null;
    const competition = competitionById.get(row.competition_id);
    if (!home || !away || !competition) return [];
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

async function getFootballCompetitions(): Promise<CompetitionRow[]> {
  const sports = await rest<SportRow[]>("sports?select=id,slug&slug=eq.football&limit=1");
  const football = sports[0];
  if (!football) return [];
  return rest<CompetitionRow[]>(`competitions?select=id,slug,name&sport_id=eq.${football.id}&is_active=eq.true&limit=100`);
}

export async function getPreviewFootballOverview(): Promise<PreviewFootballOverview> {
  if (!isPreviewFixtureMode()) return { totalCount: 0, upcomingDatedCount: 0, tbcCount: 0, nextFixtures: [] };
  const competitions = await getFootballCompetitions();
  if (!competitions.length) return { totalCount: 0, upcomingDatedCount: 0, tbcCount: 0, nextFixtures: [] };

  const competitionFilter = `competition_id=${encodeURIComponent(encodeIn(competitions.map((competition) => competition.id)))}`;
  const baseFilter = `${competitionFilter}&verification_status=eq.confirmed&is_published=eq.false`;
  const now = new Date().toISOString();
  const [totalCount, tbcCount, upcomingDatedCount, rows] = await Promise.all([
    restCount(`events?select=id&${baseFilter}`),
    restCount(`events?select=id&${baseFilter}&event_date=is.null`),
    restCount(`events?select=id&${baseFilter}&event_date=gte.${encodeURIComponent(now)}`),
    rest<EventRow[]>(
      `events?select=id,slug,phase,event_date,status,is_published,competition_id,home_participant_id,away_participant_id&${baseFilter}&event_date=gte.${encodeURIComponent(now)}&order=event_date.asc,slug.asc&limit=24`
    ),
  ]);

  return {
    totalCount,
    tbcCount,
    upcomingDatedCount,
    nextFixtures: await hydrateFixtures(rows, competitions),
  };
}

export async function getPreviewCompetitionFixtures(competitionSlug: string): Promise<PreviewFixture[]> {
  if (!isPreviewFixtureMode()) return [];
  const competitions = await rest<CompetitionRow[]>(
    `competitions?select=id,slug,name&slug=eq.${encodeURIComponent(competitionSlug)}&limit=1`
  );
  const competition = competitions[0];
  if (!competition) return [];
  const rows = await rest<EventRow[]>(
    `events?select=id,slug,phase,event_date,status,is_published,competition_id,home_participant_id,away_participant_id&competition_id=eq.${competition.id}&verification_status=eq.confirmed&order=event_date.asc.nullslast,slug.asc&limit=1000`
  );
  return hydrateFixtures(rows, [competition]);
}

export async function getPreviewClubFixtures(clubSlug: string): Promise<PreviewFixture[]> {
  if (!isPreviewFixtureMode()) return [];
  const participants = await rest<ParticipantRow[]>(
    `participants?select=id,slug,name,short_name&slug=eq.${encodeURIComponent(clubSlug)}&limit=1`
  );
  const club = participants[0];
  if (!club) return [];

  const select = "id,slug,phase,event_date,status,is_published,competition_id,home_participant_id,away_participant_id";
  const [homeRows, awayRows] = await Promise.all([
    rest<EventRow[]>(
      `events?select=${select}&home_participant_id=eq.${club.id}&verification_status=eq.confirmed&order=event_date.asc.nullslast,slug.asc&limit=250`
    ),
    rest<EventRow[]>(
      `events?select=${select}&away_participant_id=eq.${club.id}&verification_status=eq.confirmed&order=event_date.asc.nullslast,slug.asc&limit=250`
    ),
  ]);

  const rows = Array.from(new Map([...homeRows, ...awayRows].map((row) => [row.id, row])).values())
    .sort((a, b) => {
      if (a.event_date && b.event_date) return Date.parse(a.event_date) - Date.parse(b.event_date) || a.slug.localeCompare(b.slug);
      if (a.event_date) return -1;
      if (b.event_date) return 1;
      return a.slug.localeCompare(b.slug);
    });

  const competitionIds = Array.from(new Set(rows.map((row) => row.competition_id)));
  if (!competitionIds.length) return [];
  const competitions = await rest<CompetitionRow[]>(
    `competitions?select=id,slug,name&id=${encodeURIComponent(encodeIn(competitionIds))}&limit=100`
  );
  return hydrateFixtures(rows, competitions);
}
