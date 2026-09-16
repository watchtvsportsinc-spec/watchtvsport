export type SeoEntityKind =
  | "generic"
  | "sport"
  | "competition"
  | "participant"
  | "event"
  | "fixture"
  | "country"
  | "archive"
  | "utility";

export type SeoIndexabilityInput = {
  kind?: SeoEntityKind;
  published?: boolean;
  canonicalPath?: string | null;
  usefulContentCount?: number;
  verifiedBroadcastCount?: number;
  eventCount?: number;
  participantCount?: number;
  historicalRecordCount?: number;
  hasVerifiedProfile?: boolean;
  hasOfficialScheduleWindow?: boolean;
};

export type SeoEligibility = {
  indexable: boolean;
  sitemap: boolean;
  reason: string;
};

function validCanonicalPath(path?: string | null): path is string {
  return Boolean(path && path.startsWith("/") && !path.startsWith("//"));
}

/**
 * One publication gate for metadata and sitemaps.
 *
 * Routes may exist for product/navigation reasons without deserving search
 * indexing. Each entity type therefore needs enough verifiable information to
 * satisfy its search intent before it can be indexed or submitted in a sitemap.
 */
export function evaluateSeoEligibility({
  kind = "generic",
  published = true,
  canonicalPath,
  usefulContentCount = 0,
  verifiedBroadcastCount = 0,
  eventCount = 0,
  participantCount = 0,
  historicalRecordCount = 0,
  hasVerifiedProfile = false,
  hasOfficialScheduleWindow = false,
}: SeoIndexabilityInput): SeoEligibility {
  if (!published) return { indexable: false, sitemap: false, reason: "not-published" };
  if (!validCanonicalPath(canonicalPath)) return { indexable: false, sitemap: false, reason: "unstable-canonical" };
  if (kind === "utility") return { indexable: false, sitemap: false, reason: "utility-page" };

  let indexable = false;
  let reason = "insufficient-verified-content";

  switch (kind) {
    case "sport":
      indexable = eventCount > 0 || verifiedBroadcastCount > 0;
      reason = indexable ? "active-sport" : reason;
      break;
    case "competition":
      indexable =
        eventCount > 0 ||
        verifiedBroadcastCount > 0 ||
        (hasVerifiedProfile && participantCount >= 4 && usefulContentCount >= 2);
      reason = indexable ? "substantive-competition" : reason;
      break;
    case "participant":
      indexable =
        hasVerifiedProfile &&
        (eventCount > 0 || verifiedBroadcastCount > 0 || usefulContentCount >= 2);
      reason = indexable ? "verified-participant" : reason;
      break;
    case "event":
      indexable = usefulContentCount >= 2 || verifiedBroadcastCount > 0;
      reason = indexable ? "verified-event" : reason;
      break;
    case "fixture":
      indexable = hasOfficialScheduleWindow && usefulContentCount >= 2;
      reason = indexable ? "official-fixture-window" : reason;
      break;
    case "country":
      indexable =
        (eventCount > 0 && verifiedBroadcastCount > 0) ||
        historicalRecordCount > 0;
      reason = indexable ? "territory-data" : reason;
      break;
    case "archive":
      indexable = historicalRecordCount > 0 || usefulContentCount > 0;
      reason = indexable ? "historical-record" : reason;
      break;
    case "generic":
    default:
      indexable = usefulContentCount > 0 || verifiedBroadcastCount > 0;
      reason = indexable ? "useful-content" : reason;
      break;
  }

  return { indexable, sitemap: indexable, reason };
}

export function isSeoIndexable(input: SeoIndexabilityInput): boolean {
  return evaluateSeoEligibility(input).indexable;
}

export function shouldIncludeInSitemap(input: SeoIndexabilityInput): boolean {
  return evaluateSeoEligibility(input).sitemap;
}

export function indexableRobots(indexable: boolean) {
  return indexable
    ? { index: true, follow: true }
    : { index: false, follow: true };
}
