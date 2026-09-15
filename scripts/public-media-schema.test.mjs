import assert from "node:assert/strict";
import test from "node:test";
import { createJiti } from "jiti";

const jiti = createJiti(import.meta.url);
const { isPublicMediaLookup, parsePrimaryMediaAsset } = await jiti.import("../lib/public-media-schema.ts");
const lookup = { entityType: "venue", entityKey: "example-stadium", assetKind: "venue_image" };

function asset(overrides = {}) {
  return {
    ...lookup,
    id: "asset-001",
    url: "https://assets.example.test/stadium.webp",
    alt: "Verified stadium exterior",
    sourceName: "Official venue",
    sourceUrl: "https://venue.example.test/media",
    verifiedAt: "2026-09-15T12:00:00+00:00",
    mimeType: "image/webp",
    width: 1_200,
    height: 800,
    ...overrides,
  };
}

const parse = (value) => parsePrimaryMediaAsset(value, lookup);

test("keeps the approved RPC shape, provenance, attribution and dimensions", () => {
  const input = asset({ credit: "Venue media office", license: "Approved use" });
  assert.deepEqual(parse(input), input);
});

test("permits optimized same-origin assets and optional image metadata", () => {
  const parsed = parse(asset({ url: "/media/stadium.webp?v=2", width: null, height: null, mimeType: null, alt: null }));
  assert.equal(parsed.url, "/media/stadium.webp?v=2");
  assert.equal(parsed.width, undefined);
  assert.equal(parsed.alt, undefined);
});

test("does not create a new sport-specific enum for future entities", () => {
  const future = { entityType: "new-entity", entityKey: "example", assetKind: "new-image-kind" };
  assert.ok(parsePrimaryMediaAsset(asset(future), future));
});

for (const key of ["entityType", "entityKey", "assetKind"]) {
  test(`rejects a response for the wrong ${key}`, () => {
    assert.equal(parse(asset({ [key]: "wrong-identity" })), null);
  });
}

for (const field of ["id", "sourceName", "sourceUrl", "verifiedAt"]) {
  test(`requires non-empty ${field}`, () => {
    for (const value of [undefined, null, "", "   ", 123, {}, []]) {
      assert.equal(parse(asset({ [field]: value })), null);
    }
  });
}

for (const value of [null, undefined, [], "image", 42, {}]) {
  test(`returns the fallback for a non-asset payload: ${JSON.stringify(value)}`, () => {
    assert.equal(parse(value), null);
  });
}

for (const url of [
  "javascript:alert(1)", "data:image/svg+xml,test", "http://assets.example.test/a.png",
  "//assets.example.test/a.png", "https://user:password@assets.example.test/a.png",
  "https:assets.example.test/a.png", "https:///assets.example.test/a.png",
  "https://assets.example.test/a\\b.png", "https://assets.example.test/a\nb.png",
  "/\\assets.example.test/a.png", "/%2fassets.example.test/a.png", "/%5cassets.example.test/a.png",
  "https://assets.example.test/has space.png", "",
]) {
  test(`rejects an unsafe or ambiguous image URL: ${JSON.stringify(url)}`, () => {
    assert.equal(parse(asset({ url })), null);
  });
}

test("requires an HTTPS provenance URL, even for a locally stored image", () => {
  for (const sourceUrl of ["/source", "http://venue.example.test", "https://user@venue.example.test"]) {
    assert.equal(parse(asset({ sourceUrl })), null);
  }
});

test("rejects invalid dates rather than normalizing impossible calendar days", () => {
  for (const verifiedAt of ["yesterday", "2026-09-15", "2026-02-30T12:00:00Z", "2026-02-29T12:00:00Z", "2026-09-15T24:00:00Z", "2026-09-15T12:00:00+25:00"]) {
    assert.equal(parse(asset({ verifiedAt })), null);
  }
  assert.ok(parse(asset({ verifiedAt: "2024-02-29T12:00:00.123456Z" })));
});

test("rejects non-image content types and invalid image dimensions", () => {
  assert.equal(parse(asset({ mimeType: "text/html" })), null);
  for (const field of ["width", "height"]) {
    for (const value of [0, -1, 0.5, NaN, Infinity, "1200", 16_385]) {
      assert.equal(parse(asset({ [field]: value })), null);
    }
  }
});

test("never accepts explicitly pending, rejected or obsolete media", () => {
  for (const key of ["verificationStatus", "verification_status"]) {
    for (const value of ["pending", "rejected", null, true]) assert.equal(parse(asset({ [key]: value })), null);
    assert.ok(parse(asset({ [key]: "approved" })));
  }
  for (const key of ["isCurrent", "is_current"]) {
    for (const value of [false, null, "true", 1]) assert.equal(parse(asset({ [key]: value })), null);
    assert.ok(parse(asset({ [key]: true })));
  }
});

test("bounds text and URL lengths and discards unexpected payload properties", () => {
  for (const [key, length] of [["id", 181], ["alt", 501], ["credit", 1001], ["license", 2001], ["sourceName", 241]]) {
    assert.equal(parse(asset({ [key]: "a".repeat(length) })), null);
  }
  assert.equal(parse(asset({ url: `https://assets.example.test/${"a".repeat(2048)}` })), null);
  assert.equal(parse(asset({ alt: { html: "unsafe" } })), null);
  const input = asset({ internalReviewNotes: "not public" });
  const snapshot = structuredClone(input);
  assert.equal("internalReviewNotes" in parse(input), false);
  assert.deepEqual(input, snapshot);
});

test("rejects invalid lookup identities before a request can be issued", () => {
  assert.equal(isPublicMediaLookup(lookup), true);
  for (const key of ["entityType", "entityKey", "assetKind"]) {
    for (const value of ["", " ", " venue", "venue\n", "a".repeat(181), undefined, 123]) {
      const invalid = { ...lookup, [key]: value };
      assert.equal(isPublicMediaLookup(invalid), false);
      assert.equal(parsePrimaryMediaAsset(asset(), invalid), null);
    }
  }
  assert.equal(isPublicMediaLookup(null), false);
});
