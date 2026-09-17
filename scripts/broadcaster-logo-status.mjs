import { access, readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const STRICT = process.argv.includes("--strict");

function parseEnvValue(raw) {
  const value = raw.trim();
  if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
    return value.slice(1, -1);
  }
  return value;
}

async function loadLocalEnv() {
  for (const filename of [".env.local", ".env"]) {
    try {
      const raw = await readFile(resolve(ROOT, filename), "utf8");
      for (const line of raw.split(/\r?\n/)) {
        if (!line || line.trimStart().startsWith("#")) continue;
        const match = line.match(/^([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
        if (!match || process.env[match[1]] !== undefined) continue;
        process.env[match[1]] = parseEnvValue(match[2]);
      }
    } catch (error) {
      if (error?.code !== "ENOENT") throw error;
    }
  }
}

function normalize(value) {
  return String(value ?? "")
    .normalize("NFKC")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

async function loadManifest() {
  return JSON.parse(await readFile(resolve(ROOT, "data/broadcaster-logos.json"), "utf8"));
}

function findManifestEntry(manifest, broadcaster) {
  if (manifest[broadcaster.slug]) return [broadcaster.slug, manifest[broadcaster.slug]];
  const wanted = normalize(broadcaster.name);
  return Object.entries(manifest).find(([slug, entry]) =>
    [slug, ...(entry.aliases ?? [])].some((candidate) => normalize(candidate) === wanted),
  ) ?? null;
}

async function fetchBroadcasters() {
  const baseUrl = (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "").replace(/\/$/, "");
  const key = process.env.SUPABASE_PUBLISHABLE_KEY
    || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
    || process.env.SUPABASE_ANON_KEY
    || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    || "";

  if (!baseUrl || !key) {
    throw new Error("Missing Supabase URL or public/anon key. Configure .env.local before running logos:status.");
  }

  const endpoint = new URL(`${baseUrl}/rest/v1/broadcasters`);
  endpoint.searchParams.set("select", "slug,name,website_url");
  endpoint.searchParams.set("is_active", "eq.true");
  endpoint.searchParams.set("order", "name.asc");

  const response = await fetch(endpoint, {
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
    },
    signal: AbortSignal.timeout(8_000),
  });

  if (!response.ok) {
    throw new Error(`Broadcaster lookup failed with HTTP ${response.status}`);
  }

  return response.json();
}

async function main() {
  await loadLocalEnv();
  const [manifest, broadcasters] = await Promise.all([loadManifest(), fetchBroadcasters()]);
  const known = [];
  const missing = [];
  const brokenAssets = [];

  for (const broadcaster of broadcasters) {
    const match = findManifestEntry(manifest, broadcaster);
    if (!match) {
      missing.push(broadcaster);
      continue;
    }

    const [manifestSlug, entry] = match;
    const assetPath = resolve(ROOT, "public", String(entry.src).replace(/^\/+/, ""));
    try {
      await access(assetPath);
      known.push({ ...broadcaster, manifestSlug, src: entry.src });
    } catch {
      brokenAssets.push({ ...broadcaster, manifestSlug, src: entry.src });
    }
  }

  console.log(`Broadcaster logo library: ${known.length}/${broadcasters.length} active broadcasters ready.`);

  if (brokenAssets.length) {
    console.log("\nManifest entries with a missing local asset:");
    for (const broadcaster of brokenAssets) {
      console.log(`- ${broadcaster.name}: ${broadcaster.src}`);
    }
  }

  if (missing.length) {
    console.log("\nBroadcasters waiting for a verified local logo:");
    for (const broadcaster of missing) {
      const source = broadcaster.website_url ? ` — ${broadcaster.website_url}` : "";
      console.log(`- ${broadcaster.name} (${broadcaster.slug})${source}`);
    }
  } else {
    console.log("\nNo broadcaster logo is missing.");
  }

  if (brokenAssets.length || (STRICT && missing.length)) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
