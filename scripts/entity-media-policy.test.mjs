import assert from "node:assert/strict";
import test from "node:test";
import { resolve } from "node:path";
import { createJiti } from "jiti";

const root = resolve(new URL("..", import.meta.url).pathname);
const jiti = createJiti(import.meta.url, { interopDefault: true });

async function load() {
  const media = await jiti.import(resolve(root, "lib/entity-media.ts"));
  const visuals = await jiti.import(resolve(root, "lib/entity-visuals.ts"));
  return { ...media, ...visuals };
}

const provenance = {
  sourceName: "Example rights review",
  sourceUrl: "https://example.com/source-page",
  licenseNote: "Commercial display reviewed and approved for this asset.",
};

function asset(overrides = {}) {
  return {
    id: "test-logo",
    entityId: "club:football:test",
    kind: "logo",
    src: "/media/test-logo.svg",
    alt: "Test logo",
    usageStatus: "approved",
    ...provenance,
    ...overrides,
  };
}

test("candidate Champions League logo remains non-renderable while under review", async () => {
  const { getEntityMediaCandidate, canRenderEntityMedia } = await load();
  const candidate = getEntityMediaCandidate("competition:football:champions-league");
  assert.ok(candidate);
  assert.equal(candidate.usageStatus, "review");
  assert.equal(canRenderEntityMedia(candidate), false);
});

test("only approved assets can render", async () => {
  const { canRenderEntityMedia } = await load();
  for (const usageStatus of ["candidate", "review", "rejected", "blocked"]) {
    assert.equal(canRenderEntityMedia(asset({ usageStatus })), false, usageStatus);
  }
  assert.equal(canRenderEntityMedia(asset()), true);
});

test("approved media still requires safe delivery and provenance", async () => {
  const { canRenderEntityMedia, isSafeEntityMediaUrl } = await load();
  assert.equal(isSafeEntityMediaUrl("/media/test-logo.svg"), true);
  assert.equal(isSafeEntityMediaUrl("//tracker.example/logo.svg"), false);
  assert.equal(isSafeEntityMediaUrl("http://upload.wikimedia.org/logo.svg"), false);
  assert.equal(isSafeEntityMediaUrl("https://evil.example/logo.svg"), false);
  assert.equal(isSafeEntityMediaUrl("https://upload.wikimedia.org/logo.svg"), true);

  assert.equal(canRenderEntityMedia(asset({ sourceName: null })), false);
  assert.equal(canRenderEntityMedia(asset({ sourceUrl: null })), false);
  assert.equal(canRenderEntityMedia(asset({ licenseNote: null })), false);
  assert.equal(canRenderEntityMedia(asset({ src: "https://evil.example/logo.svg" })), false);
});

test("WatchTVSport-owned approved local media can render without external provenance fields", async () => {
  const { canRenderEntityMedia } = await load();
  assert.equal(
    canRenderEntityMedia(asset({
      sourceName: "WatchTVSport",
      sourceUrl: null,
      licenseNote: null,
    })),
    true,
  );
});

test("review media falls back to a WatchTVSport badge instead of a logo", async () => {
  const { getEntityVisual } = await load();
  const visual = getEntityVisual("competition:football:champions-league", "Champions League");
  assert.equal(visual.kind, "badge");
  assert.equal(visual.usageStatus, "fallback");
  assert.equal(visual.source, "WatchTVSport");
});

test("national-team flag treatment remains approved and independent from logo candidates", async () => {
  const { getEntityVisual } = await load();
  const visual = getEntityVisual("national-team:football:fra", "France");
  assert.equal(visual.kind, "flag");
  assert.equal(visual.usageStatus, "approved");
});

test("generic fallback uses the neutral WatchTVSport palette", async () => {
  const { getEntityVisual } = await load();
  const visual = getEntityVisual("club:football:unknown", "Unknown Football Club");
  assert.equal(visual.kind, "badge");
  assert.deepEqual(visual.palette, {
    primaryColor: "#123A63",
    secondaryColor: "#0F172A",
    accentColor: "#F8FAFC",
  });
});

test("only reviewed or verified participant palettes may customize a fallback badge", async () => {
  const { getEntityVisual } = await load();
  const palette = {
    renderFamily: "football_shirt",
    primaryColor: "#112233",
    secondaryColor: "#445566",
    accentColor: "#FFFFFF",
    patternStyle: "solid",
  };

  const reviewed = getEntityVisual("club:football:reviewed", "Reviewed FC", {
    participantVisual: { ...palette, visualStatus: "reviewed" },
  });
  assert.deepEqual(reviewed.palette, {
    primaryColor: "#112233",
    secondaryColor: "#445566",
    accentColor: "#FFFFFF",
  });

  for (const visualStatus of ["generated", "needs_review"]) {
    const visual = getEntityVisual("club:football:unreviewed", "Unreviewed FC", {
      participantVisual: { ...palette, visualStatus },
    });
    assert.deepEqual(visual.palette, {
      primaryColor: "#123A63",
      secondaryColor: "#0F172A",
      accentColor: "#F8FAFC",
    });
  }
});
