import { resolve } from "node:path";
import { createJiti } from "jiti";

const root = resolve(new URL("..", import.meta.url).pathname);
const jiti = createJiti(import.meta.url, { interopDefault: true });
const {
  canRenderEntityMedia,
  getAllEntityMediaCandidates,
  hasEntityMediaProvenance,
  isSafeEntityMediaUrl,
} = await jiti.import(resolve(root, "lib/entity-media.ts"));

const assets = getAllEntityMediaCandidates();
const ids = new Set();
const issues = [];

for (const asset of assets) {
  if (!asset.id?.trim()) issues.push("Media asset without id.");
  if (ids.has(asset.id)) issues.push(`Duplicate media asset id: ${asset.id}.`);
  ids.add(asset.id);

  if (!asset.entityId?.trim()) issues.push(`${asset.id}: missing entityId.`);
  if (!asset.src?.trim()) issues.push(`${asset.id}: missing src.`);
  if (!asset.alt?.trim()) issues.push(`${asset.id}: missing alt text.`);

  if (asset.usageStatus === "approved") {
    if (!isSafeEntityMediaUrl(asset.src)) {
      issues.push(`${asset.id}: approved asset uses an unsafe delivery URL.`);
    }
    if (!hasEntityMediaProvenance(asset)) {
      issues.push(`${asset.id}: approved asset is missing provenance/rights notes.`);
    }
    if (!canRenderEntityMedia(asset)) {
      issues.push(`${asset.id}: approved asset unexpectedly fails the render policy.`);
    }
  } else if (canRenderEntityMedia(asset)) {
    issues.push(`${asset.id}: ${asset.usageStatus} asset must never be renderable.`);
  }
}

if (issues.length > 0) {
  console.error(`[FAIL] Entity media audit found ${issues.length} issue(s).`);
  for (const issue of issues) console.error(`  - ${issue}`);
  process.exitCode = 1;
} else {
  console.log(
    `[PASS] Entity media audit: ${assets.length} candidate(s), ${assets.filter((asset) => asset.usageStatus === "approved").length} approved for rendering.`,
  );
}
