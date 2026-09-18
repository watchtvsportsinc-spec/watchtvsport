import { readdir, readFile, writeFile, mkdir } from "node:fs/promises";
import { join } from "node:path";

const chunksDir = join(process.cwd(), "assets", "ufc", "arena-bg-900");
const publicDir = join(process.cwd(), "public");
const output = join(publicDir, "ufc-arena-bg.webp");

const names = (await readdir(chunksDir))
  .filter((name) => /^part\d+\.b64$/.test(name))
  .sort();

if (!names.length) {
  throw new Error("No UFC arena image chunks found.");
}

const chunks = await Promise.all(
  names.map((name) => readFile(join(chunksDir, name), "utf8")),
);

const image = Buffer.from(chunks.join("").replace(/\s+/g, ""), "base64");

if (image.length !== 24392) {
  throw new Error(`Unexpected UFC arena asset size: ${image.length} bytes`);
}

if (
  image.toString("ascii", 0, 4) !== "RIFF" ||
  image.toString("ascii", 8, 12) !== "WEBP"
) {
  throw new Error("Rebuilt UFC arena asset is not a valid WebP file.");
}

await mkdir(publicDir, { recursive: true });
await writeFile(output, image);
console.log(`Rebuilt ${output} (${image.length} bytes)`);
