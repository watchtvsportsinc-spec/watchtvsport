import "server-only";

import { cache } from "react";
import {
  isParticipantPatternStyle,
  isParticipantRenderFamily,
  safeVisualColor,
  type ParticipantVisualProfile,
} from "./participant-visuals";
import { getEnabledPublicSupabaseConfig, type PublicSupabaseConfig } from "./public-supabase-config";

const REQUEST_TIMEOUT_MS = 4_000;

export type ParticipantProfile = {
  city?: string;
  countryCode?: string;
  foundedYear?: number;
  venueName?: string;
  venueCapacity?: number;
  logoUrl?: string;
  heroImageUrl?: string;
  officialWebsiteUrl?: string;
  instagramUrl?: string;
  xUrl?: string;
  facebookUrl?: string;
  youtubeUrl?: string;
  tiktokUrl?: string;
  summary?: string;
  profileStatus?: "partial" | "verified";
  lastVerifiedAt?: string;
};

export type ParticipantCompetition = {
  id: string;
  slug: string;
  name: string;
  logoUrl?: string;
  officialWebsiteUrl?: string;
};

export type ParticipantProfileSource = {
  field: string;
  sourceName: string;
  sourceUrl: string;
  sourceType: string;
  verifiedAt?: string;
  observedAt?: string;
};

export type PublicParticipantProfile = {
  participantId: string;
  slug: string;
  name: string;
  shortName?: string;
  participantType: string;
  sport: string;
  sportName?: string;
  profile: ParticipantProfile | null;
  visual: ParticipantVisualProfile | null;
  competitions: ParticipantCompetition[];
  sources: ParticipantProfileSource[];
};

function configCandidates(): PublicSupabaseConfig[] {
  const config = getEnabledPublicSupabaseConfig();
  return config ? [config] : [];
}

function isObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function optionalString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function optionalNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function parseVisual(value: unknown): ParticipantVisualProfile | null {
  if (!isObject(value)) return null;
  if (!isParticipantRenderFamily(value.renderFamily) || !isParticipantPatternStyle(value.patternStyle)) return null;
  const visualStatus = value.visualStatus === "verified" || value.visualStatus === "reviewed" || value.visualStatus === "needs_review" ? value.visualStatus : "generated";
  return {
    renderFamily: value.renderFamily,
    primaryColor: safeVisualColor(value.primaryColor, "#123A63"),
    secondaryColor: safeVisualColor(value.secondaryColor, "#F8FAFC"),
    accentColor: safeVisualColor(value.accentColor, "#2F9CFF"),
    patternStyle: value.patternStyle,
    visualStatus,
    seasonLabel: optionalString(value.seasonLabel),
    sourceName: optionalString(value.sourceName),
    sourceUrl: optionalString(value.sourceUrl),
    observedAt: optionalString(value.observedAt),
  };
}

function parseProfile(value: unknown): PublicParticipantProfile | null {
  if (!isObject(value)) return null;
  const participantId = optionalString(value.participantId);
  const slug = optionalString(value.slug);
  const name = optionalString(value.name);
  const participantType = optionalString(value.participantType);
  const sport = optionalString(value.sport);
  if (!participantId || !slug || !name || !participantType || !sport) return null;

  let profile: ParticipantProfile | null = null;
  if (isObject(value.profile)) {
    const p = value.profile;
    profile = {
      city: optionalString(p.city), countryCode: optionalString(p.countryCode), foundedYear: optionalNumber(p.foundedYear),
      venueName: optionalString(p.venueName), venueCapacity: optionalNumber(p.venueCapacity), logoUrl: optionalString(p.logoUrl),
      heroImageUrl: optionalString(p.heroImageUrl), officialWebsiteUrl: optionalString(p.officialWebsiteUrl), instagramUrl: optionalString(p.instagramUrl),
      xUrl: optionalString(p.xUrl), facebookUrl: optionalString(p.facebookUrl), youtubeUrl: optionalString(p.youtubeUrl), tiktokUrl: optionalString(p.tiktokUrl),
      summary: optionalString(p.summary), profileStatus: p.profileStatus === "verified" ? "verified" : p.profileStatus === "partial" ? "partial" : undefined,
      lastVerifiedAt: optionalString(p.lastVerifiedAt),
    };
  }

  const competitions = Array.isArray(value.competitions) ? value.competitions.flatMap((item) => {
    if (!isObject(item)) return [];
    const id = optionalString(item.id); const competitionSlug = optionalString(item.slug); const competitionName = optionalString(item.name);
    if (!id || !competitionSlug || !competitionName) return [];
    return [{ id, slug: competitionSlug, name: competitionName, logoUrl: optionalString(item.logoUrl), officialWebsiteUrl: optionalString(item.officialWebsiteUrl) }];
  }) : [];

  const sources = Array.isArray(value.sources) ? value.sources.flatMap((item) => {
    if (!isObject(item)) return [];
    const field = optionalString(item.field); const sourceName = optionalString(item.sourceName); const sourceUrl = optionalString(item.sourceUrl); const sourceType = optionalString(item.sourceType);
    if (!field || !sourceName || !sourceUrl || !sourceType) return [];
    return [{ field, sourceName, sourceUrl, sourceType, verifiedAt: optionalString(item.verifiedAt), observedAt: optionalString(item.observedAt) }];
  }) : [];

  return {
    participantId,
    slug,
    name,
    shortName: optionalString(value.shortName),
    participantType,
    sport,
    sportName: optionalString(value.sportName),
    profile,
    visual: parseVisual(value.visual),
    competitions,
    sources,
  };
}

async function loadParticipantProfile(slug: string, sport: string): Promise<PublicParticipantProfile | null> {
  const rpcNames = ["get_public_participant_profile_v4", "get_public_participant_profile_v3", "get_public_participant_profile_v2"];

  for (const { url, key } of configCandidates()) {
    for (const rpcName of rpcNames) {
      try {
        const response = await fetch(`${url}/rest/v1/rpc/${rpcName}`, {
          method: "POST",
          headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
          body: JSON.stringify({ p_slug: slug, p_sport_slug: sport }),
          signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
          next: { revalidate: 86400, tags: [`participant-profile:${sport}:${slug}`] },
        });
        if (!response.ok) continue;
        const parsed = parseProfile(await response.json());
        if (parsed) return parsed;
      } catch {
        continue;
      }
    }
  }

  return null;
}

export const getPublicParticipantProfile = cache(loadParticipantProfile);
