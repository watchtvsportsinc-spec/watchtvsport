import { createHash } from "node:crypto";

export const IMPORT_SCHEMA_VERSION = 1;
export const MAX_IMPORT_BYTES = 5 * 1024 * 1024;
export const MAX_IMPORT_RECORDS = 5_000;

const MAX_JSON_DEPTH = 20;
const MAX_JSON_NODES = 50_000;
const MAX_ISSUES = 50;

const ENTITY_TYPES = new Set([
  "sport",
  "competition",
  "season",
  "participant",
  "event_page",
  "event_edition",
  "event",
  "broadcaster",
  "platform",
  "broadcast_right",
  "event_broadcast",
]);

const ROOT_KEYS = new Set([
  "schemaVersion",
  "source",
  "idempotencyKey",
  "observedAt",
  "records",
]);

const RECORD_KEYS = new Set([
  "entityType",
  "externalKey",
  "evidenceUrl",
  "payload",
]);

const SENSITIVE_KEYS = new Set([
  "apikey",
  "authorization",
  "cookie",
  "password",
  "privatekey",
  "secret",
  "token",
]);

function isPlainObject(value) {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }

  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function normalizeKey(value) {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function addIssue(issues, path, message) {
  if (issues.length < MAX_ISSUES) {
    issues.push({ path, message });
  }
}

function validateExactKeys(value, allowedKeys, path, issues) {
  for (const key of Object.keys(value)) {
    if (!allowedKeys.has(key)) {
      addIssue(issues, `${path}.${key}`, "unexpected field");
    }
  }
}

function validateString(value, path, issues, { maxLength, pattern } = {}) {
  if (typeof value !== "string" || value.trim() === "") {
    addIssue(issues, path, "must be a non-empty string");
    return false;
  }

  if (maxLength && value.length > maxLength) {
    addIssue(issues, path, `must be at most ${maxLength} characters`);
    return false;
  }

  if (pattern && !pattern.test(value)) {
    addIssue(issues, path, "has an invalid format");
    return false;
  }

  return true;
}

function isIsoTimestamp(value) {
  if (
    typeof value !== "string" ||
    !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?(?:Z|[+-]\d{2}:\d{2})$/.test(value)
  ) {
    return false;
  }

  return Number.isFinite(Date.parse(value));
}

function isHttpsUrl(value) {
  if (typeof value !== "string" || value.length > 2_048) return false;

  try {
    const url = new URL(value);
    return url.protocol === "https:" && Boolean(url.hostname);
  } catch {
    return false;
  }
}

function validateJsonData(value, path, issues, state, depth = 0) {
  state.nodes += 1;

  if (state.nodes > MAX_JSON_NODES) {
    addIssue(issues, path, `exceeds ${MAX_JSON_NODES} JSON values`);
    return;
  }

  if (depth > MAX_JSON_DEPTH) {
    addIssue(issues, path, `exceeds maximum depth ${MAX_JSON_DEPTH}`);
    return;
  }

  if (value === null || typeof value === "boolean") return;

  if (typeof value === "number") {
    if (!Number.isFinite(value)) {
      addIssue(issues, path, "must contain finite numbers only");
    }
    return;
  }

  if (typeof value === "string") {
    if (value.length > 20_000) {
      addIssue(issues, path, "string exceeds 20000 characters");
    }
    return;
  }

  if (Array.isArray(value)) {
    value.forEach((item, index) => {
      validateJsonData(item, `${path}[${index}]`, issues, state, depth + 1);
    });
    return;
  }

  if (!isPlainObject(value)) {
    addIssue(issues, path, "must contain JSON data only");
    return;
  }

  for (const [key, child] of Object.entries(value)) {
    const normalizedKey = normalizeKey(key);

    if (SENSITIVE_KEYS.has(normalizedKey)) {
      addIssue(issues, `${path}.${key}`, "secret-like fields are not allowed in import data");
    }

    validateJsonData(child, `${path}.${key}`, issues, state, depth + 1);
  }
}

function canonicalize(value) {
  if (Array.isArray(value)) {
    return value.map(canonicalize);
  }

  if (isPlainObject(value)) {
    return Object.fromEntries(
      Object.keys(value)
        .sort()
        .map((key) => [key, canonicalize(value[key])])
    );
  }

  return value;
}

export function canonicalJson(value) {
  return JSON.stringify(canonicalize(value));
}

export function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

export function validateImportBundle(value) {
  const issues = [];

  if (!isPlainObject(value)) {
    return {
      ok: false,
      issues: [{ path: "$", message: "must be a JSON object" }],
    };
  }

  validateExactKeys(value, ROOT_KEYS, "$", issues);

  if (value.schemaVersion !== IMPORT_SCHEMA_VERSION) {
    addIssue(
      issues,
      "$.schemaVersion",
      `must equal ${IMPORT_SCHEMA_VERSION}`
    );
  }

  validateString(value.source, "$.source", issues, {
    maxLength: 80,
    pattern: /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
  });
  validateString(value.idempotencyKey, "$.idempotencyKey", issues, {
    maxLength: 200,
  });

  if (!isIsoTimestamp(value.observedAt)) {
    addIssue(issues, "$.observedAt", "must be an ISO 8601 timestamp with a timezone");
  }

  if (!Array.isArray(value.records)) {
    addIssue(issues, "$.records", "must be an array");
  } else if (
    value.records.length === 0 ||
    value.records.length > MAX_IMPORT_RECORDS
  ) {
    addIssue(
      issues,
      "$.records",
      `must contain between 1 and ${MAX_IMPORT_RECORDS} records`
    );
  }

  const seenKeys = new Set();
  const payloadState = { nodes: 0 };

  if (Array.isArray(value.records)) {
    value.records.forEach((record, index) => {
      const path = `$.records[${index}]`;

      if (!isPlainObject(record)) {
        addIssue(issues, path, "must be a JSON object");
        return;
      }

      validateExactKeys(record, RECORD_KEYS, path, issues);

      if (!ENTITY_TYPES.has(record.entityType)) {
        addIssue(issues, `${path}.entityType`, "is not a supported entity type");
      }

      const hasExternalKey = validateString(
        record.externalKey,
        `${path}.externalKey`,
        issues,
        { maxLength: 200 }
      );

      if (hasExternalKey && ENTITY_TYPES.has(record.entityType)) {
        const uniqueKey = `${record.entityType}\u0000${record.externalKey}`;
        if (seenKeys.has(uniqueKey)) {
          addIssue(
            issues,
            `${path}.externalKey`,
            "duplicates an entity in this import"
          );
        }
        seenKeys.add(uniqueKey);
      }

      if (!isHttpsUrl(record.evidenceUrl)) {
        addIssue(issues, `${path}.evidenceUrl`, "must be an HTTPS URL");
      }

      if (!isPlainObject(record.payload) || Object.keys(record.payload).length === 0) {
        addIssue(issues, `${path}.payload`, "must be a non-empty JSON object");
      } else {
        validateJsonData(record.payload, `${path}.payload`, issues, payloadState);
      }
    });
  }

  if (issues.length > 0) {
    return { ok: false, issues };
  }

  const normalized = canonicalize(value);
  const records = normalized.records.map((record, index) => ({
    itemIndex: index + 1,
    entityType: record.entityType,
    externalKey: record.externalKey,
    evidenceUrl: record.evidenceUrl,
    sourceObservedAt: normalized.observedAt,
    payload: record.payload,
    payloadHash: sha256(canonicalJson(record.payload)),
  }));

  return {
    ok: true,
    manifest: {
      schemaVersion: IMPORT_SCHEMA_VERSION,
      source: normalized.source,
      idempotencyKey: normalized.idempotencyKey,
      sourceObservedAt: normalized.observedAt,
      inputHash: sha256(canonicalJson(normalized)),
      recordCount: records.length,
      records,
    },
  };
}
