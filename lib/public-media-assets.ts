import "server-only";

import { cache } from "react";

const DEFAULT_SUPABASE_URL = "https://jywqhiiwsmudthaujhmi.supabase.co";
const DEFAULT_SUPABASE_PUBLISHABLE_KEY = "sb_publishable_30SkJ3gyUbPvH5sGFXpyHg_a4Qlzdi-";
const REQUEST_TIMEOUT_MS = 4_000;

export type ApprovedMediaAsset = {
  entityKey: string;
  url: string;
  altText?: string;
  sourceName?: string;
};

type Row = Record<string, unknown>;

function config() {
  const url = (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || DEFAULT_SUPABASE_URL).replace(/\/$/, "");
  const key = process.env.SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_ANON_KEY || DEFAULT_SUPABASE_PUBLISHABLE_KEY;
  return { url, key };
}

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function rows(value: unknown): Row[] {
  return Array.isArray(value) ? value.filter((item): item is Row => Boolean(item) && typeof item === "object" && !Array.isArray(item)) : [];
}

async function loadApprovedMediaAssets(entityType: string, assetKind: string, joinedKeys: string): Promise<Record<string, ApprovedMediaAsset>> {
  const keys = joinedKeys.split("\n").map((key) => key.trim()).filter(Boolean);
  if (!keys.length) return {};

  try {
    const { url, key } = config();
    const filter = keys.map((value) => `"${value.replaceAll('"', "")}"`).join(",");
    const response = await fetch(
      `${url}/rest/v1/media_assets?entity_type=eq.${encodeURIComponent(entityType)}&asset_kind=eq.${encodeURIComponent(assetKind)}&entity_key=in.(${encodeURIComponent(filter)})&verification_status=eq.approved&is_current=eq.true&storage_url=not.is.null&select=entity_key,storage_url,alt_text,source_name,verified_at&order=verified_at.desc.nullslast`,
      {
        headers: { apikey: key, Authorization: `Bearer ${key}` },
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
        next: { revalidate: 3600, tags: ["approved-media-assets"] },
      },
    );
    if (!response.ok) return {};

    const result: Record<string, ApprovedMediaAsset> = {};
    for (const row of rows(await response.json())) {
      const entityKey = text(row.entity_key);
      const assetUrl = text(row.storage_url);
      if (!entityKey || !assetUrl || result[entityKey]) continue;
      result[entityKey] = {
        entityKey,
        url: assetUrl,
        altText: text(row.alt_text) || undefined,
        sourceName: text(row.source_name) || undefined,
      };
    }
    return result;
  } catch {
    return {};
  }
}

const cachedApprovedMediaAssets = cache(loadApprovedMediaAssets);

export function getApprovedMediaAssets(entityType: string, assetKind: string, keys: string[]) {
  const joinedKeys = Array.from(new Set(keys.map((key) => key.trim()).filter(Boolean))).sort().join("\n");
  return cachedApprovedMediaAssets(entityType, assetKind, joinedKeys);
}
