import { createHash } from "node:crypto";

export const WORLD_CUP_ARCHIVE_SOURCE = "watchtvsport-v1-archive";
export const WORLD_CUP_ARCHIVE_OBSERVED_AT = "2026-09-14T00:00:00Z";
export const WORLD_CUP_ARCHIVE_SCHEMA_VERSION = 1;
export const BROADCAST_BATCH_SIZE = 400;

const ARCHIVE_URL =
  "https://www.watchtvsport.com/?view=archive&competition=fifa-world-cup-2026";

function slugify(value) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();
}

function uniqueSorted(values) {
  return [...new Set(values)].sort((a, b) => a.localeCompare(b));
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function isHttpsUrl(value) {
  if (typeof value !== "string") return false;

  try {
    return new URL(value).protocol === "https:";
  } catch {
    return false;
  }
}

function evidenceUrl(...candidates) {
  return candidates.find(isHttpsUrl) ?? ARCHIVE_URL;
}

function participantExternalKey(team) {
  return `national-team:${team.code.toLowerCase()}`;
}

function broadcasterExternalKey(broadcast) {
  return `${broadcast.countryCode.toLowerCase()}:${slugify(broadcast.broadcaster)}`;
}

function broadcasterSlug(broadcast) {
  return `${broadcast.countryCode.toLowerCase()}-${slugify(broadcast.broadcaster)}`;
}

function matchEvidenceUrl(match) {
  return `https://www.watchtvsport.com/match/${match.slug}`;
}

function watchPath(match, countryCode) {
  return `/watch/${match.slug}/${countryCode.toLowerCase()}`;
}

function record(entityType, externalKey, url, payload) {
  return {
    entityType,
    externalKey,
    evidenceUrl: url,
    payload,
  };
}

function buildCatalogRecords(matches) {
  const participants = new Map();
  const broadcasters = new Map();

  for (const match of matches) {
    for (const team of [match.homeTeam, match.awayTeam]) {
      const externalKey = participantExternalKey(team);

      if (!participants.has(externalKey)) {
        participants.set(
          externalKey,
          record("participant", externalKey, matchEvidenceUrl(match), {
            sportExternalKey: "football",
            participantType: "country",
            slug: slugify(team.name),
            name: team.name,
            shortName: team.shortName,
            countryCode: team.countryCode.toLowerCase(),
            fifaCode: team.code.toUpperCase(),
            isActive: false,
            archiveOnly: true,
          })
        );
      }
    }

    for (const broadcast of match.broadcasts) {
      const externalKey = broadcasterExternalKey(broadcast);

      if (!broadcasters.has(externalKey)) {
        broadcasters.set(
          externalKey,
          record(
            "broadcaster",
            externalKey,
            evidenceUrl(broadcast.sourceUrl, broadcast.url),
            {
              slug: broadcasterSlug(broadcast),
              name: broadcast.broadcaster,
              kind: "network",
              websiteUrl: broadcast.url,
              territoryCode: broadcast.countryCode.toLowerCase(),
              territoryName: broadcast.countryName,
              archiveOnly: true,
            }
          )
        );
      }
    }
  }

  const eventRecords = [...matches]
    .sort((a, b) => a.matchNumber - b.matchNumber)
    .map((match) => {
      const countries = uniqueSorted(
        match.broadcasts.map((broadcast) => broadcast.countryCode.toLowerCase())
      );
      const canonicalPath = `/match/${match.slug}`;

      return record("event", `legacy-match:${match.id}`, matchEvidenceUrl(match), {
        legacyId: match.id,
        sportExternalKey: "football",
        competitionExternalKey: "football:fifa-world-cup-2026",
        seasonExternalKey: "fifa-world-cup-2026:2026",
        slug: match.slug,
        title: `${match.homeTeam.name} vs ${match.awayTeam.name}`,
        status:
          Date.parse(match.matchDate) < Date.parse(WORLD_CUP_ARCHIVE_OBSERVED_AT)
            ? "finished"
            : match.status ?? "scheduled",
        phase: match.stage,
        groupName: match.group ?? null,
        matchNumber: match.matchNumber,
        eventDate: match.matchDate,
        scheduledDate: match.matchDate,
        venueName: match.stadiumName ?? null,
        venueCity: match.hostCity ?? null,
        timezone: match.timezone ?? "UTC",
        homeParticipantExternalKey: participantExternalKey(match.homeTeam),
        awayParticipantExternalKey: participantExternalKey(match.awayTeam),
        canonicalPath,
        legacyPaths: [
          canonicalPath,
          ...countries.map((countryCode) => watchPath(match, countryCode)),
          ...countries.map((countryCode) => `/country/${countryCode}`),
        ],
        publicationIntent: "preserve-existing-publication",
        verificationStatus: "confirmed",
        archiveOnly: true,
      });
    });

  return [
    record("sport", "football", ARCHIVE_URL, {
      slug: "football",
      name: "Football",
    }),
    record(
      "competition",
      "football:fifa-world-cup-2026",
      ARCHIVE_URL,
      {
        sportExternalKey: "football",
        slug: "fifa-world-cup-2026",
        name: "FIFA World Cup 2026",
        seasonLabel: "2026",
        isActive: false,
        archiveOnly: true,
        legacyPaths: ["/", "/schedule", "/country", "/calendar"],
      }
    ),
    record("season", "fifa-world-cup-2026:2026", ARCHIVE_URL, {
      competitionExternalKey: "football:fifa-world-cup-2026",
      slug: "2026",
      label: "2026",
      startDate: "2026-06-11",
      endDate: "2026-07-19",
      isCurrent: false,
      archiveOnly: true,
    }),
    ...[...participants.values()].sort((a, b) =>
      a.externalKey.localeCompare(b.externalKey)
    ),
    ...[...broadcasters.values()].sort((a, b) =>
      a.externalKey.localeCompare(b.externalKey)
    ),
    ...eventRecords,
  ];
}

function buildBroadcastRecords(matches) {
  return [...matches]
    .sort((a, b) => a.matchNumber - b.matchNumber)
    .flatMap((match) =>
      [...match.broadcasts]
        .sort((a, b) => {
          const aKey = `${a.countryCode}:${a.broadcaster}:${a.access}:${a.url}`;
          const bKey = `${b.countryCode}:${b.broadcaster}:${b.access}:${b.url}`;
          return aKey.localeCompare(bKey);
        })
        .map((broadcast) => {
          const broadcasterKey = broadcasterExternalKey(broadcast);
          const urlFingerprint = sha256(broadcast.url).slice(0, 12);
          const externalKey = [
            match.id,
            broadcast.countryCode.toLowerCase(),
            slugify(broadcast.broadcaster),
            broadcast.access.toLowerCase(),
            urlFingerprint,
          ].join(":");

          return record(
            "event_broadcast",
            externalKey,
            evidenceUrl(
              broadcast.sourceUrl,
              broadcast.url,
              `https://www.watchtvsport.com${watchPath(
                match,
                broadcast.countryCode
              )}`
            ),
            {
              eventExternalKey: `legacy-match:${match.id}`,
              broadcasterExternalKey: broadcasterKey,
              territoryCode: broadcast.countryCode.toLowerCase(),
              territoryName: broadcast.countryName,
              decision: "included",
              accessType: broadcast.access,
              broadcastType: "live",
              officialUrl: broadcast.url,
              affiliateUrl: broadcast.affiliateUrl ?? null,
              commentaryLanguages: uniqueSorted(
                broadcast.commentaryLanguages ?? []
              ),
              coverageType:
                broadcast.coverageType ??
                (broadcast.hasFullCoverage === false ? "partial" : "full"),
              sourceName: broadcast.sourceName ?? null,
              sourceUrl: broadcast.sourceUrl ?? null,
              lastVerifiedAt: broadcast.lastChecked
                ? `${broadcast.lastChecked}T00:00:00Z`
                : null,
              verificationStatus: broadcast.coverageStatus ?? "unknown",
              notes: broadcast.notes ?? null,
              legacyPath: watchPath(match, broadcast.countryCode),
              publicationIntent: "preserve-existing-publication",
              archiveOnly: true,
            }
          );
        })
    );
}

function createBundle(idempotencyKey, records) {
  return {
    schemaVersion: WORLD_CUP_ARCHIVE_SCHEMA_VERSION,
    source: WORLD_CUP_ARCHIVE_SOURCE,
    idempotencyKey,
    observedAt: WORLD_CUP_ARCHIVE_OBSERVED_AT,
    records,
  };
}

export function buildWorldCupArchiveBundles(matches) {
  if (!Array.isArray(matches) || matches.length === 0) {
    throw new Error("World Cup archive export requires at least one match.");
  }

  const catalog = buildCatalogRecords(matches);
  const broadcasts = buildBroadcastRecords(matches);
  const bundles = [
    {
      fileName: "world-cup-2026-catalog.json",
      bundle: createBundle("world-cup-2026-catalog-v1", catalog),
    },
  ];

  for (let offset = 0; offset < broadcasts.length; offset += BROADCAST_BATCH_SIZE) {
    const batchNumber = offset / BROADCAST_BATCH_SIZE + 1;
    const numberLabel = String(batchNumber).padStart(3, "0");

    bundles.push({
      fileName: `world-cup-2026-broadcasts-${numberLabel}.json`,
      bundle: createBundle(
        `world-cup-2026-broadcasts-${numberLabel}-v1`,
        broadcasts.slice(offset, offset + BROADCAST_BATCH_SIZE)
      ),
    });
  }

  return bundles;
}

export function summarizeWorldCupArchiveBundles(bundles) {
  const records = bundles.flatMap(({ bundle }) => bundle.records);
  const byEntityType = {};
  const legacyPaths = new Set();

  for (const item of records) {
    byEntityType[item.entityType] = (byEntityType[item.entityType] ?? 0) + 1;

    for (const path of item.payload.legacyPaths ?? []) legacyPaths.add(path);

    if (item.entityType === "event_broadcast" && item.payload.legacyPath) {
      legacyPaths.add(item.payload.legacyPath);
    }
  }

  return {
    bundleCount: bundles.length,
    recordCount: records.length,
    byEntityType: Object.fromEntries(
      Object.entries(byEntityType).sort(([a], [b]) => a.localeCompare(b))
    ),
    legacyPathCount: legacyPaths.size,
    legacyPaths: [...legacyPaths].sort((a, b) => a.localeCompare(b)),
  };
}
