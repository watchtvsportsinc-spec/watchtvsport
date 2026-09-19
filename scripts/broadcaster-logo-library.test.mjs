import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const TRUSTED_LOGO_HOSTS = new Set(["jywqhiiwsmudthaujhmi.supabase.co"]);

function normalize(value) {
  return String(value)
    .normalize("NFKC")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

async function loadManifest() {
  return JSON.parse(await readFile(resolve(ROOT, "data/broadcaster-logos.json"), "utf8"));
}

test("broadcaster logo manifest uses verified HTTPS brand assets", async () => {
  const manifest = await loadManifest();
  const seenNames = new Map();

  assert.ok(Object.keys(manifest).length > 0, "logo manifest must not be empty");

  for (const [slug, entry] of Object.entries(manifest)) {
    assert.match(slug, /^[a-z0-9]+(?:-[a-z0-9]+)*$/, `${slug} must be a stable slug`);
    assert.equal(typeof entry.src, "string", `${slug}.src must be a string`);
    assert.equal(typeof entry.sourceUrl, "string", `${slug}.sourceUrl must document provenance`);
    assert.ok(Array.isArray(entry.aliases) && entry.aliases.length > 0, `${slug} must have at least one display-name alias`);

    const assetUrl = new URL(entry.src);
    assert.equal(assetUrl.protocol, "https:", `${slug}.src must use HTTPS`);
    assert.ok(TRUSTED_LOGO_HOSTS.has(assetUrl.hostname), `${slug}.src host is not approved: ${assetUrl.hostname}`);

    const sourceUrl = new URL(entry.sourceUrl);
    assert.equal(sourceUrl.protocol, "https:", `${slug}.sourceUrl must use HTTPS`);

    for (const candidate of [slug, ...entry.aliases]) {
      const normalized = normalize(candidate);
      const owner = seenNames.get(normalized);
      assert.ok(!owner || owner === slug, `logo alias ${candidate} is shared by ${owner} and ${slug}`);
      seenNames.set(normalized, slug);
    }
  }
});
