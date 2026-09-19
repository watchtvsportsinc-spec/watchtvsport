import "server-only";

import { cache } from "react";
import { buildSearchSuggestions, type SearchSuggestion } from "./search-suggestions";
import { getSportLabel, sportAllowsParticipantPages } from "./sports-registry";

const REQUEST_TIMEOUT_MS = 4_000;

type Row = Record<string, unknown>;

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function rows(value: unknown): Row[] {
  return Array.isArray(value)
    ? value.filter(
        (item): item is Row =>
          Boolean(item) && typeof item === "object" && !Array.isArray(item),
      )
    : [];
}

function unique(values: string[]): string[] {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));
}

function config(): { url: string; key: string } {
  const url = (
    process.env.SUPABASE_URL ||
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    ""
  ).replace(/\/$/, "");
  const key =
    process.env.SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    "";
  if (!url || !key) throw new Error("Supabase public read configuration is incomplete");
  return { url, key };
}

async function getJson(url: string, key: string): Promise<unknown> {
  const response = await fetch(url, {
    headers: { apikey: key, Authorization: `Bearer ${key}` },
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    next: { revalidate: 3600, tags: ["header-search-entities"] },
  });
  if (!response.ok) {
    throw new Error(`Supabase request failed with ${response.status}`);
  }
  return response.json();
}

function competitionHref(sport: string, slug: string): string {
  if (sport === "football") return `/football/competition/${slug}`;
  if (sport === "formula-1") return "/formula-1";
  if (sport === "ufc") return "/ufc";
  return `/sports/${sport}/competition/${slug}`;
}

function participantHref(sport: string, slug: string): string {
  if (sport === "football") return `/football/club/${slug}`;
  return `/sports/${sport}/club/${slug}`;
}

function mergeSuggestion(
  target: Map<string, SearchSuggestion>,
  suggestion: SearchSuggestion,
): void {
  const existing = target.get(suggestion.id);
  if (!existing) {
    target.set(suggestion.id, suggestion);
    return;
  }

  target.set(suggestion.id, {
    ...existing,
    ...suggestion,
    searchTerms: unique([...existing.searchTerms, ...suggestion.searchTerms]),
  });
}

async function loadHeaderSearchSuggestions(): Promise<SearchSuggestion[]> {
  const base = buildSearchSuggestions([]);
  if (process.env.WATCHTVSPORT_DATA_SOURCE?.trim() !== "supabase") return base;
  const suggestions = new Map(base.map((suggestion) => [suggestion.id, suggestion]));

  try {
    const { url, key } = config();
    const [sportRows, competitionRows, membershipRows, participantRows] =
      await Promise.all([
        getJson(
          `${url}/rest/v1/sports?is_enabled=eq.true&select=id,slug,public_slug,name`,
          key,
        ).then(rows),
        getJson(
          `${url}/rest/v1/competitions?is_active=eq.true&select=id,sport_id,slug,name,display_name`,
          key,
        ).then(rows),
        getJson(
          `${url}/rest/v1/competition_memberships?membership_status=eq.confirmed&select=competition_id,participant_id`,
          key,
        ).then(rows),
        getJson(
          `${url}/rest/v1/participants?is_active=eq.true&select=id,sport_id,participant_type,slug,name,short_name`,
          key,
        ).then(rows),
      ]);

    const aliasesRows = await getJson(
      `${url}/rest/v1/participant_aliases?select=participant_id,alias`,
      key,
    )
      .then(rows)
      .catch(() => []);

    const sportById = new Map<
      string,
      { slug: string; name: string }
    >();
    for (const row of sportRows) {
      const id = text(row.id);
      const slug = text(row.public_slug) || text(row.slug);
      const name = text(row.name);
      if (id && slug) sportById.set(id, { slug, name });
    }

    const competitionById = new Map<
      string,
      { id: string; sport: string; slug: string; name: string }
    >();
    for (const row of competitionRows) {
      const id = text(row.id);
      const sport = sportById.get(text(row.sport_id));
      const slug = text(row.slug);
      const name = text(row.display_name) || text(row.name);
      if (!id || !sport || !slug || !name) continue;

      const competition = { id, sport: sport.slug, slug, name };
      competitionById.set(id, competition);

      const sportLabel = getSportLabel(sport.slug);
      mergeSuggestion(suggestions, {
        id: `competition:${sport.slug}:${slug}`,
        label: `${name} (${sportLabel})`,
        value: name,
        kind: "Competition",
        href: competitionHref(sport.slug, slug),
        searchTerms: unique([
          name,
          slug.replaceAll("-", " "),
          sport.slug,
          sportLabel,
          sport.name,
        ]),
        favorite: {
          kind: "competition",
          entityId: `${sport.slug}:${slug}`,
          label: name,
          href: competitionHref(sport.slug, slug),
        },
      });
    }

    const competitionIdsByParticipant = new Map<string, Set<string>>();
    for (const row of membershipRows) {
      const participantId = text(row.participant_id);
      const competitionId = text(row.competition_id);
      if (
        !participantId ||
        !competitionId ||
        !competitionById.has(competitionId)
      ) {
        continue;
      }
      const current =
        competitionIdsByParticipant.get(participantId) ?? new Set<string>();
      current.add(competitionId);
      competitionIdsByParticipant.set(participantId, current);
    }

    const aliasesByParticipant = new Map<string, string[]>();
    for (const row of aliasesRows) {
      const participantId = text(row.participant_id);
      const alias = text(row.alias);
      if (!participantId || !alias) continue;
      aliasesByParticipant.set(participantId, [
        ...(aliasesByParticipant.get(participantId) ?? []),
        alias,
      ]);
    }

    for (const row of participantRows) {
      const id = text(row.id);
      const sport = sportById.get(text(row.sport_id));
      const participantType = text(row.participant_type);
      const slug = text(row.slug);
      const name = text(row.name);
      const shortName = text(row.short_name);
      const competitionIds = competitionIdsByParticipant.get(id);

      if (
        !id ||
        !sport ||
        !slug ||
        !name ||
        !competitionIds?.size ||
        !sportAllowsParticipantPages(sport.slug) ||
        (participantType !== "club" && participantType !== "team")
      ) {
        continue;
      }

      const competitions = Array.from(competitionIds)
        .map((competitionId) => competitionById.get(competitionId))
        .filter(
          (
            competition,
          ): competition is NonNullable<typeof competition> => Boolean(competition),
        );

      const sportLabel = getSportLabel(sport.slug);
      const href = participantHref(sport.slug, slug);
      mergeSuggestion(suggestions, {
        id: `participant:${sport.slug}:club:${slug}`,
        label: `${name} (${sportLabel})`,
        value: name,
        kind: "Club",
        href,
        searchTerms: unique([
          name,
          shortName,
          slug.replaceAll("-", " "),
          ...(aliasesByParticipant.get(id) ?? []),
          ...competitions.flatMap((competition) => [
            competition.name,
            competition.slug.replaceAll("-", " "),
          ]),
          sport.slug,
          sportLabel,
          sport.name,
        ]),
        favorite: {
          kind: "participant",
          entityId: `club:${sport.slug}:${slug}`,
          label: name,
          href,
        },
      });
    }

    return Array.from(suggestions.values());
  } catch (error) {
    console.error(
      "Header search entities could not be loaded",
      error instanceof Error ? error.message : "unknown error",
    );
    return base;
  }
}

export const getHeaderSearchSuggestions = cache(loadHeaderSearchSuggestions);
