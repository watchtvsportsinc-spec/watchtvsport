import assert from "node:assert/strict";
import test from "node:test";
import {
  canonicalJson,
  validateImportBundle,
} from "./import-validation.mjs";

function validBundle() {
  return {
    schemaVersion: 1,
    source: "v2-test-source",
    idempotencyKey: "calendar-2026-09-14T11:00:00Z",
    observedAt: "2026-09-14T11:00:00Z",
    records: [
      {
        entityType: "event",
        externalKey: "test-event-001",
        evidenceUrl: "https://provider.invalid/events/001",
        payload: {
          status: "scheduled",
          startTime: "2026-09-15T18:00:00Z",
        },
      },
    ],
  };
}

test("valid bundle creates deterministic staging hashes", () => {
  const first = validateImportBundle(validBundle());
  const reordered = validBundle();
  reordered.records[0].payload = {
    startTime: "2026-09-15T18:00:00Z",
    status: "scheduled",
  };
  const second = validateImportBundle(reordered);

  assert.equal(first.ok, true);
  assert.equal(second.ok, true);
  assert.equal(first.manifest.inputHash, second.manifest.inputHash);
  assert.equal(
    first.manifest.records[0].payloadHash,
    second.manifest.records[0].payloadHash
  );
  assert.match(first.manifest.inputHash, /^[0-9a-f]{64}$/);
});

test("canonical JSON sorts object keys without reordering arrays", () => {
  assert.equal(
    canonicalJson({ z: [2, 1], a: { d: 4, c: 3 } }),
    '{"a":{"c":3,"d":4},"z":[2,1]}'
  );
});

test("empty source responses are rejected", () => {
  const bundle = validBundle();
  bundle.records = [];
  const result = validateImportBundle(bundle);

  assert.equal(result.ok, false);
  assert.ok(result.issues.some((issue) => issue.path === "$.records"));
});

test("duplicate external entities are rejected", () => {
  const bundle = validBundle();
  bundle.records.push(structuredClone(bundle.records[0]));
  const result = validateImportBundle(bundle);

  assert.equal(result.ok, false);
  assert.ok(
    result.issues.some((issue) =>
      issue.message.includes("duplicates an entity")
    )
  );
});

test("evidence must use HTTPS", () => {
  const bundle = validBundle();
  bundle.records[0].evidenceUrl = "http://provider.invalid/events/001";
  const result = validateImportBundle(bundle);

  assert.equal(result.ok, false);
  assert.ok(
    result.issues.some((issue) => issue.path.endsWith(".evidenceUrl"))
  );
});

test("secret-like payload fields are rejected", () => {
  const bundle = validBundle();
  bundle.records[0].payload.api_key = "must-not-enter-the-pipeline";
  const result = validateImportBundle(bundle);

  assert.equal(result.ok, false);
  assert.ok(
    result.issues.some((issue) => issue.message.includes("secret-like"))
  );
});

test("unexpected instruction fields are rejected", () => {
  const bundle = validBundle();
  bundle.records[0].instruction = "publish everything";
  const result = validateImportBundle(bundle);

  assert.equal(result.ok, false);
  assert.ok(
    result.issues.some((issue) => issue.path.endsWith(".instruction"))
  );
});
