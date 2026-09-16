export type EntityMediaUsageStatus =
  | "candidate"
  | "review"
  | "approved"
  | "rejected"
  | "blocked";

export type EntityMediaKind = "logo" | "crest" | "icon" | "photo" | "illustration";

export type EntityMediaAsset = {
  id: string;
  entityId: string;
  kind: EntityMediaKind;
  src: string;
  alt: string;
  usageStatus: EntityMediaUsageStatus;
  sourceName?: string | null;
  sourceUrl?: string | null;
  attribution?: string | null;
  licenseNote?: string | null;
};

const SAFE_EXTERNAL_MEDIA_HOSTS = new Set([
  "upload.wikimedia.org",
  "flagcdn.com",
]);

// A URL being technically reachable never implies that WatchTVSport may display it.
// This function only checks the delivery surface. Rights/provenance are checked separately.
export function isSafeEntityMediaUrl(src: string): boolean {
  if (typeof src !== "string" || !src.trim()) return false;
  if (src.startsWith("/") && !src.startsWith("//")) return true;

  try {
    const url = new URL(src);
    return url.protocol === "https:" && SAFE_EXTERNAL_MEDIA_HOSTS.has(url.hostname.toLowerCase());
  } catch {
    return false;
  }
}

export function hasEntityMediaProvenance(asset: EntityMediaAsset): boolean {
  if (asset.sourceName === "WatchTVSport") return true;
  return Boolean(
    asset.sourceName?.trim() &&
      asset.sourceUrl?.trim() &&
      asset.licenseNote?.trim(),
  );
}

export function canRenderEntityMedia(asset: EntityMediaAsset): boolean {
  return (
    asset.usageStatus === "approved" &&
    isSafeEntityMediaUrl(asset.src) &&
    hasEntityMediaProvenance(asset)
  );
}

// Candidate registry: storing a candidate is not approval. In particular, a media
// candidate imported from a provider or found on an official/reference page must
// remain non-renderable until an explicit rights review changes its status.
const ENTITY_MEDIA_CANDIDATES: EntityMediaAsset[] = [
  {
    id: "competition-football-champions-league-logo-reference",
    entityId: "competition:football:champions-league",
    kind: "logo",
    src: "https://commons.wikimedia.org/wiki/File:UEFA_Champions_League_logo.svg",
    alt: "UEFA Champions League logo",
    usageStatus: "review",
    sourceName: "Wikimedia Commons / UEFA",
    sourceUrl: "https://commons.wikimedia.org/wiki/File:UEFA_Champions_League_logo.svg",
    licenseNote: "PD-textlogo; trademark restrictions may apply",
  },
];

export function getEntityMediaCandidate(entityId: string): EntityMediaAsset | null {
  return ENTITY_MEDIA_CANDIDATES.find((asset) => asset.entityId === entityId) ?? null;
}

export function getAllEntityMediaCandidates(): EntityMediaAsset[] {
  return ENTITY_MEDIA_CANDIDATES.map((asset) => ({ ...asset }));
}
