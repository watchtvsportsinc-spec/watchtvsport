import "server-only";

import { cache } from "react";
import type { EntityMediaAsset, EntityMediaKind, EntityMediaUsageStatus } from "./entity-media";

const DEFAULT_SUPABASE_URL = "https://jywqhiiwsmudthaujhmi.supabase.co";
const DEFAULT_SUPABASE_PUBLISHABLE_KEY = "sb_publishable_30SkJ3gyUbPvH5sGFXpyHg_a4Qlzdi-";
const REQUEST_TIMEOUT_MS = 4_000;
const MAX_RESPONSE_BYTES = 64 * 1024;

type SupabaseReadConfig = { url: string; key: string };

function configCandidates(): SupabaseReadConfig[] {
  const configuredUrl = (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || DEFAULT_SUPABASE_URL).replace(/\/$/, "");
  const configuredKey = process.env.SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_ANON_KEY || DEFAULT_SUPABASE_PUBLISHABLE_KEY;
  const candidates: SupabaseReadConfig[] = [
    { url: configuredUrl, key: configuredKey },
    { url: DEFAULT_SUPABASE_URL, key: DEFAULT_SUPABASE_PUBLISHABLE_KEY },
  ];
  return candidates.filter((candidate, index, all) => all.findIndex((entry) => entry.url === candidate.url && entry.key === candidate.key) === index);
}

function optionalString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function parseApprovedParticipantMedia(value: unknown): EntityMediaAsset | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const row = value as Record<string, unknown>;
  const id = optionalString(row.id);
  const entityId = optionalString(row.entityId);
  const src = optionalString(row.src);
  const alt = optionalString(row.alt) ?? "";
  const kind = optionalString(row.kind) as EntityMediaKind | undefined;
  const usageStatus = optionalString(row.usageStatus) as EntityMediaUsageStatus | undefined;
  if (!id || !entityId || !src || !kind || usageStatus !== "approved") return null;
  if (kind !== "logo" && kind !== "crest") return null;

  return {
    id,
    entityId,
    kind,
    src,
    alt,
    usageStatus,
    sourceName: optionalString(row.sourceName),
    sourceUrl: optionalString(row.sourceUrl),
    attribution: optionalString(row.attribution),
    licenseNote: optionalString(row.licenseNote),
  };
}

async function loadApprovedParticipantMedia(entityId: string): Promise<EntityMediaAsset | null> {
  for (const { url, key } of configCandidates()) {
    try {
      const response = await fetch(`${url}/rest/v1/rpc/get_public_participant_media_v1`, {
        method: "POST",
        headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
        body: JSON.stringify({ p_entity_id: entityId }),
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
        next: { revalidate: 900, tags: [`participant-media:${entityId}`] },
      });
      if (!response.ok) continue;
      const body = await response.text();
      if (Buffer.byteLength(body, "utf8") > MAX_RESPONSE_BYTES) continue;
      return parseApprovedParticipantMedia(JSON.parse(body));
    } catch {
      continue;
    }
  }
  return null;
}

export const getApprovedParticipantMedia = cache(loadApprovedParticipantMedia);
