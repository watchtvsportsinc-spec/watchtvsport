import test from "node:test";
import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

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

test("broadcaster logo manifest points only to existing local assets", async () => {
  const manifest = await loadManifest();
  const seenNames = new Map();

  assert.ok(Object.keys(manifest).length > 0, "logo manifest must not be empty");

  for (const [slug, entry] of Object.entries(manifest)) {
    assert.match(slug, /^[a-z0-9]+(?:-[a-z0-9]+)*$/, `${slug} must be a stable slug`);
    assert.equal(typeof entry.src, "string", `${slug}.src must be a string`);
    assert.match(entry.src, /^\/broadcasters\/[a-z0-9-]+\.svg$/, `${slug}.src must use a local SVG broadcaster asset`);
    assert.ok(Array.isArray(entry.aliases) && entry.aliases.length > 0, `${slug} must have at least one display-name alias`);

    await access(resolve(ROOT, "public", entry.src.replace(/^\/+/, "")));

    for (const candidate of [slug, ...entry.aliases]) {
      const normalized = normalize(candidate);
      const owner = seenNames.get(normalized);
      assert.ok(!owner || owner === slug, `logo alias ${candidate} is shared by ${owner} and ${slug}`);
      seenNames.set(normalized, slug);
    }
  }
});
