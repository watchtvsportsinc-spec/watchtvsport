#!/usr/bin/env node

import { lstat, readFile } from "node:fs/promises";
import { resolve } from "node:path";
import {
  MAX_IMPORT_BYTES,
  validateImportBundle,
} from "./import-validation.mjs";

function fail(message) {
  process.stderr.write(`${message}\n`);
  process.exitCode = 1;
}

const [inputPath, ...extraArguments] = process.argv.slice(2);

if (!inputPath || extraArguments.length > 0) {
  fail("Usage: npm run validate:import -- <bundle.json>");
} else {
  const absolutePath = resolve(inputPath);

  try {
    const file = await lstat(absolutePath);

    if (!file.isFile() || file.isSymbolicLink()) {
      throw new Error("input must be a regular file, not a symlink");
    }

    if (file.size > MAX_IMPORT_BYTES) {
      throw new Error(`input exceeds ${MAX_IMPORT_BYTES} bytes`);
    }

    const content = await readFile(absolutePath, "utf8");
    const parsed = JSON.parse(content);
    const result = validateImportBundle(parsed);

    if (!result.ok) {
      for (const issue of result.issues) {
        process.stderr.write(`${issue.path}: ${issue.message}\n`);
      }
      process.exitCode = 1;
    } else {
      const summary = {
        schemaVersion: result.manifest.schemaVersion,
        source: result.manifest.source,
        idempotencyKey: result.manifest.idempotencyKey,
        sourceObservedAt: result.manifest.sourceObservedAt,
        inputHash: result.manifest.inputHash,
        recordCount: result.manifest.recordCount,
      };
      process.stdout.write(
        `${JSON.stringify(
          {
            valid: true,
            publicationReady: false,
            message: "Structure validated only; records still require source and editorial verification.",
            ...summary,
          },
          null,
          2
        )}\n`
      );
    }
  } catch (error) {
    fail(error instanceof Error ? error.message : "unable to validate import");
  }
}
