/** Pure validation for the approved-media RPC; no network or server credentials. */
export type PublicMediaLookup = {
  entityType: string;
  entityKey: string;
  assetKind: string;
};

export type PublicMediaAsset = PublicMediaLookup & {
  id: string;
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

const IMAGE_MIME_TYPES = new Set([
  "image/avif", "image/webp", "image/png", "image/jpeg", "image/gif", "image/svg+xml",
]);

function text(value: unknown, maxLength: number): string {
  if (typeof value !== "string" || value.length > maxLength) throw new Error("Invalid text");
  if ([...value].some((character) => character.charCodeAt(0) < 32 || character.charCodeAt(0) === 127)) {
    throw new Error("Invalid text characters");
  }
  const normalized = value.trim();
  if (!normalized || normalized.length > maxLength) throw new Error("Invalid text length");
  return normalized;
}

function optionalText(value: unknown, maxLength: number): string | undefined {
  if (value === null || value === undefined || value === "") return undefined;
  return text(value, maxLength);
}

function url(value: unknown, allowLocal: boolean): string {
  const input = text(value, 2_048);
  if (/[\s\\]/.test(input)) throw new Error("Invalid URL characters");
  if (allowLocal && input.startsWith("/") && !input.startsWith("//")) {
    if (/%(?:2f|5c)/i.test(input)) throw new Error("Ambiguous local URL");
    const parsed = new URL(input, "https://watchtvsport.invalid");
    if (parsed.origin !== "https://watchtvsport.invalid") throw new Error("Non-local URL");
    return input;
  }
  if (!/^https:\/\/[^/]/i.test(input)) throw new Error("HTTPS required");
  const parsed = new URL(input);
  if (!parsed.hostname || parsed.username || parsed.password) throw new Error("Invalid public URL");
  return input;
}

function timestamp(value: unknown): string {
  const input = text(value, 40);
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.\d{1,6})?(?:Z|[+-]\d{2}:\d{2})$/.exec(input);
  if (!match || !Number.isFinite(Date.parse(input))) throw new Error("Invalid verification timestamp");
  const [year, month, day, hour, minute, second] = match.slice(1).map(Number);
  const leapYear = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  const days = [31, leapYear ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  if (month < 1 || month > 12 || day < 1 || day > days[month - 1] || hour > 23 || minute > 59 || second > 59) {
    throw new Error("Invalid verification date");
  }
  return input;
}

function dimension(value: unknown): number | undefined {
  if (value === null || value === undefined) return undefined;
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < 1 || value > 16_384) {
    throw new Error("Invalid image dimension");
  }
  return value;
}

export function isPublicMediaLookup(value: PublicMediaLookup): boolean {
  try {
    return text(value.entityType, 80) === value.entityType
      && text(value.entityKey, 180) === value.entityKey
      && text(value.assetKind, 80) === value.assetKind;
  } catch {
    return false;
  }
}

/**
 * Approval/currentness is enforced by the RPC and RLS, not inferred from a URL.
 * Require provenance and the requested identity as a second, fail-closed boundary.
 * Invalid decorative media must not make an event page unavailable.
 */
export function parsePrimaryMediaAsset(value: unknown, expected: PublicMediaLookup): PublicMediaAsset | null {
  try {
    if (!isPublicMediaLookup(expected) || !value || typeof value !== "object" || Array.isArray(value)) return null;
    const row = value as Record<string, unknown>;
    for (const key of ["entityType", "entityKey", "assetKind"] as const) {
      if (row[key] !== expected[key]) return null;
    }
    for (const key of ["verificationStatus", "verification_status"]) {
      if (key in row && row[key] !== "approved") return null;
    }
    for (const key of ["isCurrent", "is_current"]) {
      if (key in row && row[key] !== true) return null;
    }
    const mimeType = optionalText(row.mimeType, 80);
    if (mimeType && !IMAGE_MIME_TYPES.has(mimeType)) return null;
    return {
      id: text(row.id, 180),
      entityType: expected.entityType,
      entityKey: expected.entityKey,
      assetKind: expected.assetKind,
      url: url(row.url, true),
      alt: optionalText(row.alt, 500),
      credit: optionalText(row.credit, 1_000),
      license: optionalText(row.license, 2_000),
      mimeType,
      width: dimension(row.width),
      height: dimension(row.height),
      sourceName: text(row.sourceName, 240),
      sourceUrl: url(row.sourceUrl, false),
      verifiedAt: timestamp(row.verifiedAt),
    };
  } catch {
    return null;
  }
}
