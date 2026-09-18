import { readdir, readFile, writeFile, mkdir } from "node:fs/promises";
import { join } from "node:path";

const chunksDir = join(process.cwd(), "assets", "mma", "approved-bg");
const publicDir = join(process.cwd(), "public");
const output = join(publicDir, "mma-hero-approved.jpg");

const names = (await readdir(chunksDir))
  .filter((name) => /^part\d+\.b64$/.test(name))
  .sort();

if (!names.length) {
  throw new Error("No MMA hero image chunks found.");
}

const chunks = await Promise.all(
  names.map((name) => readFile(join(chunksDir, name), "utf8")),
);

const image = Buffer.from(chunks.join("").replace(/\s+/g, ""), "base64");

if (image.length !== 66818) {
  throw new Error(`Unexpected MMA hero asset size: ${image.length} bytes`);
}

if (image[0] !== 0xff || image[1] !== 0xd8 || image.at(-2) !== 0xff || image.at(-1) !== 0xd9) {
  throw new Error("Rebuilt MMA hero asset is not a valid JPEG envelope.");
}

await mkdir(publicDir, { recursive: true });
await writeFile(output, image);
console.log(`Rebuilt ${output} (${image.length} bytes)`);
