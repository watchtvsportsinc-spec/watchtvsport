import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("club pages use approved media assets for identity and preview fixtures", () => {
  const page = read("app/football/club/[club]/page.tsx");
  const preview = read("lib/dev-preview-fixtures.ts");
  assert.ok(page.includes('getPrimaryMediaAsset("participant", club, "team_logo")'));
  assert.ok(page.includes('getPrimaryMediaAsset("participant", club, "team_hero")'));
  assert.ok(page.includes("images: hero?.url ? [hero.url] : undefined"));
  assert.ok(page.includes("getPreviewClubFixtures(club)"));
  assert.ok(page.includes("imageUrl={logo?.url}"));
  assert.ok(page.includes("imageUrl={other.logoUrl}"));
  assert.ok(preview.includes("asset_kind=eq.team_logo"));
  assert.ok(preview.includes("verification_status=eq.approved"));
  assert.ok(preview.includes("is_current=eq.true"));
  assert.ok(preview.includes("logoUrl: logoBySlug.get(home.slug)"));
  assert.ok(preview.includes("logoUrl: logoBySlug.get(away.slug)"));
  assert.ok(!page.includes("profile?.logoUrl"));
  assert.ok(!page.includes("profile?.heroImageUrl"));
});

test("competition pages use approved competition logos", () => {
  const page = read("app/football/competition/[competition]/page.tsx");
  assert.ok(page.includes('getPrimaryMediaAsset("competition", competition, "competition_logo")'));
  assert.ok(page.includes("images: logo?.url ? [logo.url] : undefined"));
  assert.ok(page.includes("<img src={logo.url}"));
});

test("public participant directory enriches clubs with approved current logos in one batched request", () => {
  const source = read("lib/public-participants.ts");
  assert.ok(source.includes("logoUrl?: string"));
  assert.ok(source.includes("media_assets?select=entity_key,storage_url,verified_at"));
  assert.ok(source.includes("entity_type=eq.participant"));
  assert.ok(source.includes("asset_kind=eq.team_logo"));
  assert.ok(source.includes("verification_status=eq.approved"));
  assert.ok(source.includes("is_current=eq.true"));
  assert.ok(source.includes("logoUrl: logoBySlug.get(slug)"));
  assert.ok(!source.includes("getPrimaryMediaAsset"));
});

test("reusable entity visuals render only an explicitly supplied public image before fallback", () => {
  const component = read("components/EntityVisual.tsx");
  assert.ok(component.includes("imageUrl?: string"));
  assert.ok(component.includes("if (imageUrl)"));
  assert.ok(component.includes("src={imageUrl}"));
  assert.ok(component.includes("getEntityVisual(entityId, label)"));
});

test("football browse and schedule cards consume logo URLs from the validated public contracts", () => {
  const page = read("app/football/page.tsx");
  assert.ok(page.includes("logoUrl: event.competitionLogoUrl"));
  assert.ok(page.includes("directoryClubs"));
  assert.ok(page.includes("imageUrl={competition.logoUrl}"));
  assert.ok(page.includes("imageUrl={club.logoUrl}"));
  assert.ok(page.includes("imageUrl={event.participant1.logoUrl}"));
  assert.ok(page.includes("imageUrl={event.participant2.logoUrl}"));
  assert.ok(!page.includes("getPublicParticipantProfile"));
});

test("competition participant and match cards reuse validated participant logos", () => {
  const page = read("app/football/competition/[competition]/page.tsx");
  assert.ok(page.includes("member.logoUrl ?? eventClubs.get(member.slug)?.logoUrl"));
  assert.ok(page.includes("imageUrl={club.logoUrl}"));
  assert.ok(page.includes("imageUrl={event.participant1.logoUrl}"));
  assert.ok(page.includes("imageUrl={event.participant2.logoUrl}"));
  assert.ok(page.includes("imageUrl={fixture.home.logoUrl}"));
  assert.ok(page.includes("imageUrl={fixture.away.logoUrl}"));
});

test("homepage featured and calendar cards reuse the validated public event visual contract", () => {
  const page = read("app/page.tsx");
  assert.ok(page.includes("function EventIdentityVisuals"));
  assert.ok(page.includes("imageUrl={event.participant1.logoUrl}"));
  assert.ok(page.includes("imageUrl={event.participant2.logoUrl}"));
  assert.ok(page.includes("imageUrl={event.competitionLogoUrl}"));
  assert.ok(page.includes('<EventIdentityVisuals event={event} size="md" />'));
  assert.ok(page.includes("<EventIdentityVisuals event={event} />"));
});
