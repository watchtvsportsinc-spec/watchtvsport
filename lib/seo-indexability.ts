export type SeoIndexabilityInput = {
  published?: boolean;
  canonicalPath?: string | null;
  usefulContentCount?: number;
  verifiedBroadcastCount?: number;
};

/**
 * Central SEO publication rule.
 *
 * A route may exist for product/navigation purposes without being suitable for
 * search indexing. Pages are indexable only when they are published, have a
 * stable canonical URL and contain at least one useful, verifiable data point.
 */
export function isSeoIndexable({
  published = true,
  canonicalPath,
  usefulContentCount = 0,
  verifiedBroadcastCount = 0,
}: SeoIndexabilityInput): boolean {
  return Boolean(
    published &&
      canonicalPath &&
      canonicalPath.startsWith("/") &&
      (usefulContentCount > 0 || verifiedBroadcastCount > 0),
  );
}

export function indexableRobots(indexable: boolean) {
  return indexable
    ? { index: true, follow: true }
    : { index: false, follow: true };
}
