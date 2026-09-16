import assert from "node:assert/strict";
import test from "node:test";

const SUPABASE_URL = (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "https://jywqhiiwsmudthaujhmi.supabase.co").replace(/\/$/, "");
const SUPABASE_KEY = process.env.SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || "sb_publishable_30SkJ3gyUbPvH5sGFXpyHg_a4Qlzdi-";
const EXPECTED_ACCESS_CONTRACT_HASH = "37d22d0969afbc2a12ed78b443bc8f64";

async function request(path, { method = "GET", body, accept = "application/json" } = {}) {
  const response = await fetch(`${SUPABASE_URL}${path}`, {
    method,
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      Accept: accept,
      ...(body === undefined ? {} : { "Content-Type": "application/json" }),
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    signal: AbortSignal.timeout(10_000),
  });
  const text = await response.text();
  return { status: response.status, text };
}

function assertDenied(result, label) {
  assert.ok(
    [401, 403, 404, 405].includes(result.status),
    `${label} must be denied to anon; got HTTP ${result.status}: ${result.text.slice(0, 300)}`,
  );
}

test("anon/auth permission, RLS and RPC security fingerprint matches reviewed contract", async () => {
  const result = await request("/rest/v1/rpc/get_public_access_contract_hash_v1", {
    method: "POST",
    body: {},
  });
  assert.equal(result.status, 200, result.text);
  const hash = JSON.parse(result.text);
  assert.equal(
    hash,
    EXPECTED_ACCESS_CONTRACT_HASH,
    "Supabase public/authenticated security surface changed. Audit grants, RLS policies and executable RPCs before accepting a new fingerprint.",
  );
});

test("anon can read the published events contract", async () => {
  const result = await request("/rest/v1/events?select=id&limit=1");
  assert.equal(result.status, 200, result.text);
});

test("anon can call the bounded public events RPC", async () => {
  const result = await request("/rest/v1/rpc/get_public_events_filtered_v1", {
    method: "POST",
    body: { p_limit: 1 },
  });
  assert.equal(result.status, 200, result.text);
});

test("anon cannot read internal data sources", async () => {
  assertDenied(await request("/rest/v1/data_sources?select=*&limit=1"), "data_sources read");
});

test("anon cannot read enrichment tasks", async () => {
  assertDenied(await request("/rest/v1/enrichment_tasks?select=*&limit=1"), "enrichment_tasks read");
});

test("anon cannot read the participant profile audit view", async () => {
  assertDenied(await request("/rest/v1/participant_profile_audit?select=*&limit=1"), "participant_profile_audit read");
});

test("anon cannot mutate published events", async () => {
  const result = await request("/rest/v1/events?id=eq.00000000-0000-0000-0000-000000000000", {
    method: "PATCH",
    body: { is_published: false },
  });
  assertDenied(result, "events update");
});

test("anon cannot mutate participant profiles", async () => {
  const result = await request("/rest/v1/participant_profiles?participant_id=eq.00000000-0000-0000-0000-000000000000", {
    method: "PATCH",
    body: { profile_status: "verified" },
  });
  assertDenied(result, "participant_profiles update");
});

test("anon cannot read correction reports", async () => {
  assertDenied(await request("/rest/v1/listing_corrections?select=*&limit=1"), "listing_corrections read");
});

test("anon cannot update correction reports", async () => {
  const result = await request("/rest/v1/listing_corrections?id=eq.00000000-0000-0000-0000-000000000000", {
    method: "PATCH",
    body: { status: "approved" },
  });
  assertDenied(result, "listing_corrections update");
});

test("correction inserts reject any non-pending status", async () => {
  const result = await request("/rest/v1/listing_corrections", {
    method: "POST",
    body: {
      page_url: "https://watchtvsport.com/__security_probe__",
      message: "Security contract probe; this row must never be inserted.",
      status: "approved",
    },
  });
  assertDenied(result, "listing_corrections non-pending insert");
});

test("pending correction insert permission reaches DB constraints without creating a row", async () => {
  const result = await request("/rest/v1/listing_corrections", {
    method: "POST",
    body: { status: "pending" },
  });
  assert.equal(result.status, 400, `Expected NOT NULL validation after authorized INSERT, got ${result.status}: ${result.text}`);
  assert.match(result.text, /23502|null value|not-null/i, result.text);
});

test("review RPCs require authentication", async () => {
  const result = await request("/rest/v1/rpc/wts_review_identity", { method: "POST", body: {} });
  assertDenied(result, "wts_review_identity RPC");
});

test("internal trigger helpers are not callable as public RPCs", async () => {
  const result = await request("/rest/v1/rpc/validate_event_relationships", { method: "POST", body: {} });
  assertDenied(result, "trigger helper RPC");
});
