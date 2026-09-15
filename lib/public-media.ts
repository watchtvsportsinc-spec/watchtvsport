import "server-only";

import { cache } from "react";

const DEFAULT_SUPABASE_URL = "https://jywqhiiwsmudthaujhmi.supabase.co";
const DEFAULT_SUPABASE_PUBLISHABLE_KEY = "sb_publishable_30SkJ3gyUbPvH5sGFXpyHg_a4Qlzdi-";
const REQUEST_TIMEOUT_MS = 4_000;

export type PublicMediaAsset = {
  id: string;
  assetKind: string;
  entityType: string;
  entityKey: string;
  url: string;
  alt?: string;
  credit?: string;
  license?: string;
  mimeType?: string;
  width?: number;
  height?: number;
  sourceName?: string;
  sourceUrl?: string;
  verifiedAt?: string;
};

function config() {
  const url = (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || DEFAULT_SUPABASE_URL).replace(/\/$/, "");
  const key = process.env.SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_ANON_KEY || DEFAULT_SUPABASE_PUBLISHABLE_KEY;
  return { url, key };
}

function parse(value: unknown): PublicMediaAsset | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const row = value as Record<string, unknown>;
  const id = typeof row.id === "string" ? row.id : "";
  const assetKind = typeof row.assetKind === "string" ? row.assetKind : "";
  const entityType = typeof row.entityType === "string" ? row.entityType : "";
  const entityKey = typeof row.entityKey === "string" ? row.entityKey : "";
  const url = typeof row.url === "string" ? row.url : "";
  if (!id || !assetKind || !entityType || !entityKey || !url) return null;
  return {
    id, assetKind, entityType, entityKey, url,
    alt: typeof row.alt === "string" ? row.alt : undefined,
    credit: typeof row.credit === "string" ? row.credit : undefined,
    license: typeof row.license === "string" ? row.license : undefined,
    mimeType: typeof row.mimeType === "string" ? row.mimeType : undefined,
    width: typeof row.width === "number" ? row.width : undefined,
    height: typeof row.height === "number" ? row.height : undefined,
    sourceName: typeof row.sourceName === "string" ? row.sourceName : undefined,
    sourceUrl: typeof row.sourceUrl === "string" ? row.sourceUrl : undefined,
    verifiedAt: typeof row.verifiedAt === "string" ? row.verifiedAt : undefined,
  };
}

async function loadPrimaryMedia(entityType: string, entityKey: string, assetKind: string): Promise<PublicMediaAsset | null> {
  try {
    const { url, key } = config();
    const response = await fetch(`${url}/rest/v1/rpc/get_primary_media_asset_v2`, {
      method: "POST",
      headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ p_entity_type: entityType, p_entity_key: entityKey, p_asset_kind: assetKind }),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      next: { revalidate: 86400, tags: [`media:${entityType}:${entityKey}:${assetKind}`] },
    });
    if (!response.ok) return null;
    return parse(await response.json());
  } catch {
    return null;
  }
}

export const getPrimaryMediaAsset = cache(loadPrimaryMedia);
