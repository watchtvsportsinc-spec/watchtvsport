# V2 data-source policy

Last reviewed: 2026-09-14

WatchTVSport separates reference material, collection, validation, database writes,
and publication. A page being official does not by itself authorize automated or
commercial reuse, and a competition-level broadcast right does not prove that
every event or session is carried.

This is an engineering record, not legal advice. Re-check the linked terms before
changing a source from `restricted` or `review_required` to `approved`.

## Launch-source assessment

| Competition | Official reference | Domain | Reuse decision | Automation |
| --- | --- | --- | --- | --- |
| UEFA Champions League | [Fixtures and results](https://www.uefa.com/uefachampionsleague/fixtures-results/) | Calendar | [UEFA terms](https://www.uefa.com/termsconditions/) prohibit systematic collection and scraping | Disabled |
| NBA | [NBA schedule](https://www.nba.com/schedule) | Calendar | [NBA terms](https://www.nba.com/termsofuse) restrict public and commercial reuse without written permission | Disabled |
| Formula 1 | [2026 calendar](https://www.formula1.com/en/racing/2026) | Calendar | [Formula 1 legal notices](https://www.formula1.com/en/information/legal-notices.7egvZU48hzrypubGBNcQKt) limit site material to personal, non-commercial use unless consent is obtained | Disabled |
| MotoGP | [2026 calendar](https://www.motogp.com/en/calendar/2026) | Calendar | [MotoGP legal notice](https://www.motogp.com/en/legal-notice) limits channel content to personal use | Disabled |
| MotoGP | [2026 broadcasters](https://www.motogp.com/en/broadcasters) | Broadcast rights reference | Same MotoGP terms; this list also needs event/session-level confirmation | Disabled |

The official pages remain useful for manual verification and evidence links. They
must not be scraped by the V2 importer under the current assessment. A licensed
API, feed, or file provider can be added later without changing the public UI.
No paid provider has been selected or authorized.

## Database controls

`supabase-v2-ingestion-migration.sql` adds an internal control plane:

- `data_sources` records terms, reuse, cost, quota, and source kill switches.
- `source_scopes` records the sport, competition, territory, and data domain a
  source actually covers.
- `import_runs` enforces resumable state transitions and per-source idempotency.
- `import_items` stages external data before it can affect public records.
- `source_entity_links` keeps stable provider-to-WatchTVSport identities and
  protects manual corrections.
- `import_changes` stores before/after snapshots for audit and restoration.

The seeded official websites use `web_reference`, `restricted`, and disabled
automation. The migration grants no access to `anon` or `authenticated` roles.

## Import contract

The deterministic validator accepts a local JSON file only. It performs no
network request and no database write.

Run:

`npm run validate:import -- path/to/bundle.json`

An import bundle contains:

- `schemaVersion`: currently `1`.
- `source`: the stable `data_sources.slug` value.
- `idempotencyKey`: a source-specific identifier that cannot be reused.
- `observedAt`: an ISO 8601 timestamp with an explicit timezone.
- `records`: one or more source records, each with an entity type, external key,
  HTTPS evidence URL, and JSON payload.

Validation rejects empty responses, duplicate entities, unknown instruction
fields, non-HTTPS evidence, secret-like payload fields, excessive size/depth, and
unsupported entity types. It computes deterministic SHA-256 hashes for the input
and each payload.

A successful structural validation deliberately returns
`publicationReady: false`. Editorial/source validation and the database state
machine are separate gates.

## Promotion rules

A future provider can use scheduled collection only after all of these are true:

1. Its reuse status is `approved` and commercial use is explicitly allowed.
2. Its terms have a recorded review date.
3. Its access method is a file, API, or feed rather than a website reference.
4. The source and its relevant scope are enabled.
5. Cost, quota, frequency, failure behavior, and fallback are documented.

Automatic publication remains off. Enabling collection does not authorize
publication, adding competitions, spending money, deployment, or production
database access.

## Safe run sequence

1. Create a `pending` run using a new idempotency key.
2. Move it to `collecting` and stage records as `pending` items.
3. Record the non-empty snapshot hash, count, and observation time; move to
   `collected`.
4. Move to `validating`; mark each item accepted, conflicting, invalid, or
   ignored. Conflicts cannot become ready.
5. Move a clean run to `ready`; acquire a short-lived worker lock before
   `applying`.
6. Respect full-entity and field-level manual protections.
7. Link every external identity, store a before/after change snapshot, and then
   mark the item applied.
8. Mark the run `applied` only when every applied item is linked and auditable.

Failed, rejected, cancelled, unchanged, and applied runs are terminal. An
unchanged run records a safe idempotent no-op. A retry is a new run linked to a
failed or cancelled parent, preserving the original evidence.
