import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { validateImportBundle } from "./import-validation.mjs";

const APPLY_ORDER = [
  "sport",
  "competition",
  "season",
  "participant",
  "event_page",
  "event_edition",
  "event",
];

function required(value, label) {
  if (value === undefined || value === null || value === "") {
    throw new Error(`Missing required value: ${label}`);
  }
  return value;
}

function boolForPublication(payload, allowPublication) {
  return allowPublication === true && payload.isPublished === true;
}

function verificationDate(record, bundle) {
  return record.payload.verificationStatus === "confirmed" ? bundle.observedAt : null;
}

export function buildSeedApplyPlan(bundle, { allowPublication = false } = {}) {
  const validation = validateImportBundle(bundle);
  if (!validation.ok) {
    throw new Error(`Import bundle is invalid:\n${JSON.stringify(validation.issues, null, 2)}`);
  }

  const byKey = new Map(bundle.records.map((record) => [record.externalKey, record]));
  const operations = [];

  const needRef = (externalKey, expectedType, ownerKey, field) => {
    const ref = byKey.get(required(externalKey, `${ownerKey}.${field}`));
    if (!ref) throw new Error(`${ownerKey} references missing ${field}: ${externalKey}`);
    if (ref.entityType !== expectedType) {
      throw new Error(`${ownerKey}.${field} must reference ${expectedType}, got ${ref.entityType}`);
    }
    return externalKey;
  };

  for (const entityType of APPLY_ORDER) {
    for (const record of bundle.records.filter((item) => item.entityType === entityType)) {
      const p = record.payload;
      const base = {
        entityType,
        externalKey: record.externalKey,
        evidenceUrl: record.evidenceUrl,
      };

      if (entityType === "sport") {
        operations.push({
          ...base,
          table: "sports",
          conflict: ["slug"],
          row: {
            slug: required(p.slug, `${record.externalKey}.slug`),
            name: required(p.name, `${record.externalKey}.name`),
            public_slug: p.slug,
            event_model: p.eventModel ?? "team_match",
            participant_page_policy:
              p.participantPages === "none" ? "none" : "teams_and_nations",
            is_enabled: true,
          },
        });
        continue;
      }

      if (entityType === "competition") {
        operations.push({
          ...base,
          table: "competitions",
          conflict: ["sport_id", "slug"],
          refs: {
            sport_id: needRef(p.sportExternalKey, "sport", record.externalKey, "sportExternalKey"),
          },
          row: {
            slug: required(p.slug, `${record.externalKey}.slug`),
            name: required(p.name, `${record.externalKey}.name`),
            is_active: true,
          },
        });
        continue;
      }

      if (entityType === "season") {
        operations.push({
          ...base,
          table: "seasons",
          conflict: ["competition_id", "slug"],
          refs: {
            competition_id: needRef(
              p.competitionExternalKey,
              "competition",
              record.externalKey,
              "competitionExternalKey"
            ),
          },
          row: {
            slug: required(p.slug, `${record.externalKey}.slug`),
            label: required(p.label, `${record.externalKey}.label`),
            is_current: p.isCurrent === true,
          },
        });
        continue;
      }

      if (entityType === "participant") {
        operations.push({
          ...base,
          table: "participants",
          conflict: ["sport_id", "slug"],
          refs: {
            sport_id: needRef(p.sportExternalKey, "sport", record.externalKey, "sportExternalKey"),
          },
          row: {
            participant_type: p.participantType === "club" ? "club" : p.participantType,
            slug: required(p.slug, `${record.externalKey}.slug`),
            name: required(p.name, `${record.externalKey}.name`),
            short_name: p.shortName ?? null,
            is_active: p.isActive !== false,
          },
        });
        continue;
      }

      if (entityType === "event_page") {
        const refs = {
          sport_id: needRef(p.sportExternalKey, "sport", record.externalKey, "sportExternalKey"),
          competition_id: needRef(
            p.competitionExternalKey,
            "competition",
            record.externalKey,
            "competitionExternalKey"
          ),
        };
        if (p.homeParticipantExternalKey) {
          refs.home_participant_id = needRef(
            p.homeParticipantExternalKey,
            "participant",
            record.externalKey,
            "homeParticipantExternalKey"
          );
        }
        if (p.awayParticipantExternalKey) {
          refs.away_participant_id = needRef(
            p.awayParticipantExternalKey,
            "participant",
            record.externalKey,
            "awayParticipantExternalKey"
          );
        }
        operations.push({
          ...base,
          table: "event_pages",
          conflict: ["competition_id", "slug"],
          refs,
          row: {
            page_type: required(p.pageType, `${record.externalKey}.pageType`),
            entity_kind: p.eventGroupType === "race_weekend" ? "race_weekend" : "fixture",
            slug: required(p.slug, `${record.externalKey}.slug`),
            title: required(p.title, `${record.externalKey}.title`),
            is_published: boolForPublication(p, allowPublication),
            published_at: boolForPublication(p, allowPublication) ? bundle.observedAt : null,
            source_name: bundle.source,
            source_url: record.evidenceUrl,
            last_verified_at: verificationDate(record, bundle),
            verification_status: p.verificationStatus ?? "unknown",
          },
          canonicalPath: p.canonicalPath ?? null,
        });
        continue;
      }

      if (entityType === "event_edition") {
        operations.push({
          ...base,
          table: "event_editions",
          conflict: ["event_page_id", "edition_key"],
          refs: {
            event_page_id: needRef(
              p.eventPageExternalKey,
              "event_page",
              record.externalKey,
              "eventPageExternalKey"
            ),
            season_id: needRef(
              p.seasonExternalKey,
              "season",
              record.externalKey,
              "seasonExternalKey"
            ),
          },
          row: {
            edition_key: required(p.editionKey, `${record.externalKey}.editionKey`),
            label: required(p.label, `${record.externalKey}.label`),
            round_number: p.roundNumber ?? null,
            venue_name: p.venueName ?? null,
            status: p.status ?? "scheduled",
            is_published: boolForPublication(p, allowPublication),
            published_at: boolForPublication(p, allowPublication) ? bundle.observedAt : null,
            source_name: bundle.source,
            source_url: record.evidenceUrl,
            last_verified_at: verificationDate(record, bundle),
            verification_status: p.verificationStatus ?? "unknown",
          },
        });
        continue;
      }

      if (entityType === "event") {
        const refs = {
          sport_id: needRef(p.sportExternalKey, "sport", record.externalKey, "sportExternalKey"),
          competition_id: needRef(
            p.competitionExternalKey,
            "competition",
            record.externalKey,
            "competitionExternalKey"
          ),
          season_id: needRef(p.seasonExternalKey, "season", record.externalKey, "seasonExternalKey"),
          event_page_id: needRef(
            p.eventPageExternalKey,
            "event_page",
            record.externalKey,
            "eventPageExternalKey"
          ),
        };
        if (p.eventEditionExternalKey) {
          refs.event_edition_id = needRef(
            p.eventEditionExternalKey,
            "event_edition",
            record.externalKey,
            "eventEditionExternalKey"
          );
        }
        if (p.homeParticipantExternalKey) {
          refs.home_participant_id = needRef(
            p.homeParticipantExternalKey,
            "participant",
            record.externalKey,
            "homeParticipantExternalKey"
          );
        }
        if (p.awayParticipantExternalKey) {
          refs.away_participant_id = needRef(
            p.awayParticipantExternalKey,
            "participant",
            record.externalKey,
            "awayParticipantExternalKey"
          );
        }
        operations.push({
          ...base,
          table: "events",
          conflict: ["sport_id", "slug"],
          refs,
          row: {
            status: p.status ?? "scheduled",
            slug: required(p.slug, `${record.externalKey}.slug`),
            phase: p.phase ?? null,
            event_date: p.eventDate ?? null,
            scheduled_date: p.eventDate ?? null,
            venue_name: p.venueName ?? null,
            event_kind: p.eventKind ?? "match",
            session_type: p.sessionType ?? null,
            session_label: p.sessionLabel ?? null,
            session_order: p.sequenceNumber ?? null,
            is_published: false,
            source_name: bundle.source,
            source_url: record.evidenceUrl,
            last_verified_at: verificationDate(record, bundle),
            verification_status: p.verificationStatus ?? "unknown",
          },
          canonicalPath: p.canonicalPath ?? null,
        });
      }
    }
  }

  return { bundle, operations };
}

function supabaseConfig() {
  const url = process.env.SUPABASE_URL?.replace(/\/$/, "");
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) {
    throw new Error(
      "SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required for --apply. Never commit these values."
    );
  }
  return { url, serviceRoleKey };
}

async function request(config, table, { method = "GET", query = "", body } = {}) {
  const response = await fetch(`${config.url}/rest/v1/${table}${query}`, {
    method,
    headers: {
      apikey: config.serviceRoleKey,
      Authorization: `Bearer ${config.serviceRoleKey}`,
      "Content-Type": "application/json",
      Prefer: "resolution=merge-duplicates,return=representation",
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await response.text();
  if (!response.ok) {
    throw new Error(`${method} ${table} failed (${response.status}): ${text.slice(0, 1000)}`);
  }
  return text ? JSON.parse(text) : null;
}

async function upsertReturning(config, operation, resolvedIds) {
  const row = { ...operation.row };
  for (const [column, externalKey] of Object.entries(operation.refs ?? {})) {
    const id = resolvedIds.get(externalKey);
    if (!id) throw new Error(`Unresolved dependency ${externalKey} for ${operation.externalKey}`);
    row[column] = id;
  }

  const query = `?on_conflict=${encodeURIComponent(operation.conflict.join(","))}`;
  const result = await request(config, operation.table, { method: "POST", query, body: row });
  const saved = Array.isArray(result) ? result[0] : result;
  if (!saved?.id) throw new Error(`No id returned for ${operation.externalKey}`);
  resolvedIds.set(operation.externalKey, saved.id);

  if (operation.canonicalPath) {
    const urlTable = operation.table === "event_pages" ? "event_page_urls" : "event_urls";
    const ownerColumn = operation.table === "event_pages" ? "event_page_id" : "event_id";
    await request(config, urlTable, {
      method: "POST",
      query: "?on_conflict=url_path",
      body: {
        [ownerColumn]: saved.id,
        url_path: operation.canonicalPath.split("#")[0],
        kind: "canonical",
        is_active: true,
      },
    });
  }

  return saved.id;
}

export async function applySeedPlan(plan, { allowPublication = false } = {}) {
  const config = supabaseConfig();
  const resolvedIds = new Map();
  for (const operation of plan.operations) {
    if (!allowPublication && operation.row.is_published === true) {
      throw new Error("Plan contains published rows without --publish approval");
    }
    await upsertReturning(config, operation, resolvedIds);
  }
  return resolvedIds;
}

function parseArgs(argv) {
  const flags = new Set(argv.filter((value) => value.startsWith("--")));
  const file = argv.find((value) => !value.startsWith("--"));
  return {
    file: resolve(process.cwd(), file ?? "data/imports/seed-2026-ucl-f1.json"),
    apply: flags.has("--apply"),
    publish: flags.has("--publish"),
  };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const bundle = JSON.parse(await readFile(args.file, "utf8"));
  const plan = buildSeedApplyPlan(bundle, { allowPublication: args.publish });
  const counts = plan.operations.reduce((acc, operation) => {
    acc[operation.table] = (acc[operation.table] ?? 0) + 1;
    return acc;
  }, {});

  console.log(JSON.stringify({
    mode: args.apply ? "apply" : "dry-run",
    publish: args.publish,
    source: bundle.source,
    idempotencyKey: bundle.idempotencyKey,
    operationCount: plan.operations.length,
    counts,
  }, null, 2));

  if (!args.apply) {
    console.log("Dry run only. Add --apply to write to Supabase.");
    return;
  }

  await applySeedPlan(plan, { allowPublication: args.publish });
  console.log(`Applied ${plan.operations.length} canonical records to Supabase.`);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
