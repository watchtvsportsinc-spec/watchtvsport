import "server-only";

import { cache } from "react";

const DEFAULT_SUPABASE_URL = "https://jywqhiiwsmudthaujhmi.supabase.co";
const DEFAULT_SUPABASE_PUBLISHABLE_KEY = "sb_publishable_30SkJ3gyUbPvH5sGFXpyHg_a4Qlzdi-";
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
  profile: ParticipantProfile | null;
  sources: ParticipantProfileSource[];
};

function config() {
  const url = (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || DEFAULT_SUPABASE_URL).replace(/\/$/, "");
  const key = process.env.SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_ANON_KEY || DEFAULT_SUPABASE_PUBLISHABLE_KEY;
  return { url, key };
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

  const sources = Array.isArray(value.sources) ? value.sources.flatMap((item) => {
    if (!isObject(item)) return [];
    const field = optionalString(item.field); const sourceName = optionalString(item.sourceName); const sourceUrl = optionalString(item.sourceUrl); const sourceType = optionalString(item.sourceType);
    if (!field || !sourceName || !sourceUrl || !sourceType) return [];
    return [{ field, sourceName, sourceUrl, sourceType, verifiedAt: optionalString(item.verifiedAt), observedAt: optionalString(item.observedAt) }];
  }) : [];

  return { participantId, slug, name, shortName: optionalString(value.shortName), participantType, sport, profile, sources };
}

async function loadParticipantProfile(slug: string, sport: string): Promise<PublicParticipantProfile | null> {
  try {
    const { url, key } = config();
    const response = await fetch(`${url}/rest/v1/rpc/get_public_participant_profile_v2`, {
      method: "POST",
      headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ p_slug: slug, p_sport_slug: sport }),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      next: { revalidate: 86400, tags: [`participant-profile:${sport}:${slug}`] },
    });
    if (!response.ok) return null;
    return parseProfile(await response.json());
  } catch {
    return null;
  }
}

export const getPublicParticipantProfile = cache(loadParticipantProfile);
