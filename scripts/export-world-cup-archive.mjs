#!/usr/bin/env node

import { mkdir, lstat, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { createJiti } from "jiti";
import { validateImportBundle } from "./import-validation.mjs";
import {
  buildWorldCupArchiveBundles,
  summarizeWorldCupArchiveBundles,
} from "./world-cup-archive-import.mjs";

function readOutputDirectory(args) {
  const optionIndex = args.indexOf("--output-dir");
  const outputDirectory = optionIndex >= 0 ? args[optionIndex + 1] : "";

  if (!outputDirectory || outputDirectory.startsWith("-")) {
    throw new Error("Usage: npm run export:world-cup -- --output-dir <empty-directory>");
  }

  return path.resolve(outputDirectory);
}

async function ensureEmptyDirectory(outputDirectory) {
  try {
    const stats = await lstat(outputDirectory);

    if (stats.isSymbolicLink() || !stats.isDirectory()) {
      throw new Error("The output path must be a real directory, not a file or symlink.");
    }

    if ((await readdir(outputDirectory)).length > 0) {
      throw new Error("The output directory must be empty.");
    }
  } catch (error) {
    if (error && typeof error === "object" && error.code === "ENOENT") {
      await mkdir(outputDirectory, { recursive: true });
      return;
    }

    throw error;
  }
}

async function main() {
  const outputDirectory = readOutputDirectory(process.argv.slice(2));
  await ensureEmptyDirectory(outputDirectory);

  const jiti = createJiti(import.meta.url);
  const { matches } = await jiti.import("../lib/matches.ts");
  const bundles = buildWorldCupArchiveBundles(matches);
  const manifestEntries = [];

  for (const { fileName, bundle } of bundles) {
    const validation = validateImportBundle(bundle);

    if (!validation.ok) {
      throw new Error(
        `${fileName} failed validation: ${JSON.stringify(validation.issues)}`
      );
    }

    await writeFile(
      path.join(outputDirectory, fileName),
      `${JSON.stringify(bundle, null, 2)}\n`,
      { encoding: "utf8", flag: "wx" }
    );

    manifestEntries.push({
      fileName,
      recordCount: validation.manifest.recordCount,
      inputHash: validation.manifest.inputHash,
    });
  }

  const summary = summarizeWorldCupArchiveBundles(bundles);
  const manifest = {
    schemaVersion: 1,
    generatedFrom: "WatchTVSport V1 tracked source files",
    publicationReady: false,
    ...summary,
    legacyPaths: undefined,
    bundles: manifestEntries,
  };

  await writeFile(
    path.join(outputDirectory, "manifest.json"),
    `${JSON.stringify(manifest, null, 2)}\n`,
    { encoding: "utf8", flag: "wx" }
  );

  console.log(
    `Exported ${summary.recordCount} records in ${summary.bundleCount} bundles; ` +
      `${summary.legacyPathCount} historical paths preserved. Publication remains disabled.`
  );
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
