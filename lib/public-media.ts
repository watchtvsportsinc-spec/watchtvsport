import "server-only";

import { cache } from "react";
import { isPublicMediaLookup, parsePrimaryMediaAsset, type PublicMediaAsset } from "./public-media-schema";

export type { PublicMediaAsset } from "./public-media-schema";

const DEFAULT_SUPABASE_URL = "https://jywqhiiwsmudthaujhmi.supabase.co";
const DEFAULT_SUPABASE_PUBLISHABLE_KEY = "sb_publishable_30SkJ3gyUbPvH5sGFXpyHg_a4Qlzdi-";
const REQUEST_TIMEOUT_MS = 4_000;

function config() {
  const url = (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || DEFAULT_SUPABASE_URL).replace(/\/$/, "");
  const key = process.env.SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_ANON_KEY || DEFAULT_SUPABASE_PUBLISHABLE_KEY;
  return { url, key };
}

async function loadPrimaryMedia(entityType: string, entityKey: string, assetKind: string): Promise<PublicMediaAsset | null> {
  const lookup = { entityType, entityKey, assetKind };
  if (!isPublicMediaLookup(lookup)) return null;
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
    return parsePrimaryMediaAsset(await response.json(), lookup);
  } catch {
    return null;
  }
}

export const getPrimaryMediaAsset = cache(loadPrimaryMedia);
