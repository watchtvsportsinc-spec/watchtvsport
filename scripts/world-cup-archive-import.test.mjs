import assert from "node:assert/strict";
import test from "node:test";
import { createJiti } from "jiti";
import {
  MAX_IMPORT_BYTES,
  validateImportBundle,
} from "./import-validation.mjs";
import {
  buildWorldCupArchiveBundles,
  summarizeWorldCupArchiveBundles,
} from "./world-cup-archive-import.mjs";

const jiti = createJiti(import.meta.url);
const { matches } = await jiti.import("../lib/matches.ts");

test("exports every legacy match and broadcast in valid bounded bundles", () => {
  const bundles = buildWorldCupArchiveBundles(matches);
  const summary = summarizeWorldCupArchiveBundles(bundles);

  assert.equal(matches.length, 104);
  assert.equal(summary.byEntityType.event, 104);
  assert.equal(
    summary.byEntityType.event_broadcast,
    matches.reduce((count, match) => count + match.broadcasts.length, 0)
  );

  for (const { fileName, bundle } of bundles) {
    const validation = validateImportBundle(bundle);
    assert.equal(validation.ok, true, `${fileName} should validate`);
    assert.ok(
      Buffer.byteLength(JSON.stringify(bundle), "utf8") <= MAX_IMPORT_BYTES,
      `${fileName} should stay within the import size limit`
    );
  }
});

test("preserves every match, country and calendar archive path", () => {
  const bundles = buildWorldCupArchiveBundles(matches);
  const { legacyPaths } = summarizeWorldCupArchiveBundles(bundles);
  const exportedPaths = new Set(legacyPaths);
  const expectedPaths = new Set(["/", "/schedule", "/country", "/calendar"]);

  for (const match of matches) {
    expectedPaths.add(`/match/${match.slug}`);

    for (const broadcast of match.broadcasts) {
      expectedPaths.add(
        `/watch/${match.slug}/${broadcast.countryCode.toLowerCase()}`
      );
      expectedPaths.add(`/country/${broadcast.countryCode.toLowerCase()}`);
    }
  }

  for (const expectedPath of expectedPaths) {
    assert.ok(exportedPaths.has(expectedPath), `missing ${expectedPath}`);
  }

  assert.equal(expectedPaths.size, 3_435);
});

test("uses globally unique source identities across all bundles", () => {
  const bundles = buildWorldCupArchiveBundles(matches);
  const seen = new Set();

  for (const { bundle } of bundles) {
    for (const item of bundle.records) {
      const key = `${item.entityType}\u0000${item.externalKey}`;
      assert.equal(seen.has(key), false, `duplicate ${key}`);
      seen.add(key);
    }
  }
});

test("is deterministic and never marks an export ready for publication", () => {
  const first = buildWorldCupArchiveBundles(matches);
  const second = buildWorldCupArchiveBundles(matches);

  assert.deepEqual(second, first);

  for (const { bundle } of first) {
    const validation = validateImportBundle(bundle);
    assert.equal(validation.ok, true);
    assert.equal("publicationReady" in validation.manifest, false);
  }
});
