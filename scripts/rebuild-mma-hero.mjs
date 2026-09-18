import { readdir, readFile, writeFile, mkdir } from "node:fs/promises";
import { join } from "node:path";

async function rebuildWebp({ chunksDir, outputName, expectedSize, label }) {
  const names = (await readdir(chunksDir))
    .filter((name) => /^part\d+\.b64$/.test(name))
    .sort();

  if (!names.length) {
    throw new Error(`No ${label} image chunks found.`);
  }

  const chunks = await Promise.all(
    names.map((name) => readFile(join(chunksDir, name), "utf8")),
  );

  const image = Buffer.from(chunks.join("").replace(/\s+/g, ""), "base64");

  if (image.length !== expectedSize) {
    throw new Error(
      `Unexpected ${label} asset size: ${image.length} bytes (expected ${expectedSize})`,
    );
  }

  if (
    image.toString("ascii", 0, 4) !== "RIFF" ||
    image.toString("ascii", 8, 12) !== "WEBP"
  ) {
    throw new Error(`Rebuilt ${label} asset is not a valid WebP file.`);
  }

  const publicDir = join(process.cwd(), "public");
  await mkdir(publicDir, { recursive: true });
  const output = join(publicDir, outputName);
  await writeFile(output, image);
  console.log(`Rebuilt ${output} (${image.length} bytes)`);
}

await rebuildWebp({
  chunksDir: join(process.cwd(), "assets", "ufc", "arena-bg-900"),
  outputName: "ufc-arena-bg.webp",
  expectedSize: 24392,
  label: "UFC arena",
});

await rebuildWebp({
  chunksDir: join(process.cwd(), "assets", "formula-1", "hero-bg"),
  outputName: "formula-1-hero-bg.webp",
  expectedSize: 24430,
  label: "Formula 1 hero",
});
