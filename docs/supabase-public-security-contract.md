# WatchTVSport V2 — Supabase public security contract

Reviewed: 2026-09-16
Project: `jywqhiiwsmudthaujhmi`

This document defines the anonymous/public API surface that WatchTVSport intentionally exposes. Any change to this contract must be reviewed together with `scripts/public-security-contract.test.mjs`.

## Public read-only tables/views

The anonymous role may read only rows allowed by RLS from these relations:

- `broadcast_rights`
- `broadcasters`
- `competition_aliases`
- `competition_memberships`
- `competitions`
- `event_broadcasts`
- `event_editions`
- `event_page_urls`
- `event_pages`
- `event_participants`
- `event_urls`
- `events`
- `languages`
- `media_assets`
- `participant_aliases`
- `participant_categories`
- `participant_profile_claims`
- `participant_profiles`
- `participant_visual_profiles`
- `participants`
- `platforms`
- `seasons`
- `sports`
- `territories`
- `ufc_fight_bouts`
- `venues`

All of these relations are read-only to `anon` and `authenticated` at the SQL grant level. RLS further restricts rows such as unpublished events, unconfirmed rights, unapproved media, and unconfirmed venues/bouts.

## Public write exception

`listing_corrections` is the only intended anonymous write surface.

- No anonymous `SELECT`, `UPDATE`, or `DELETE`.
- `INSERT` is granted only on `page_url`, `message`, `reporter_email`, and `status`.
- RLS accepts inserts only when `status = 'pending'`.
- `id` and `created_at` are not client-insertable.

## Internal relations

Internal ingestion, provenance, audit, sync, and review-support data are not part of the public contract. Examples include:

- `data_sources`
- `enrichment_tasks`
- `event_edition_external_ids`
- `event_external_ids`
- `event_page_external_ids`
- `event_updates`
- `import_changes`
- `import_items`
- `import_runs`
- `participant_profile_audit`
- `schedule_sync_auth`
- `source_entity_links`
- `source_scopes`

These must not become anonymous PostgREST endpoints.

## Public RPC allowlist

The following RPCs are intentionally executable by anonymous/public website traffic:

- `get_event_venue_media_v2`
- `get_primary_media_asset_v2`
- `get_public_competition_fixtures_v1`
- `get_public_events_filtered_v1`
- `get_public_events_v2`
- `get_public_events_v3`
- `get_public_fixture_page_v1`
- `get_public_media_assets_v2`
- `get_public_participant_events_v1`
- `get_public_participant_fixtures_v1`
- `get_public_participant_profile_v2`
- `get_public_participant_profile_v3`
- `get_public_participant_profile_v4`
- `get_public_ufc_card_v2`
- `get_public_ufc_card_v3`
- `participant_visual_defaults`

The review RPCs (`wts_review_*`) require an authenticated role. Trigger functions are internal implementation details and must have no `EXECUTE` privilege for `anon` or `authenticated`.

## Storage

At the time of this review there are no Supabase Storage buckets. Adding the first bucket requires a separate review of bucket visibility and `storage.objects` policies before production use.

## CI enforcement

`npm run test:security` performs live requests using the public Supabase publishable key and verifies:

- the anonymous OpenAPI table/view allowlist;
- the anonymous RPC allowlist;
- no public table mutation methods except the correction-report `POST`;
- public event reads still work;
- the bounded public events RPC still works;
- internal tables/views remain inaccessible;
- public event/profile mutation is rejected;
- correction reports cannot be read or updated;
- correction inserts are restricted to `pending`;
- review RPCs require authentication;
- trigger helpers are not callable publicly.

The main V2 GitHub Actions workflow runs this live security contract after the offline test suite and before `next build`.

## Rule for future agents and migrations

Do not grant public access merely to make an API request succeed. New public tables, views, RPCs, buckets, or write operations must be intentional, RLS-protected, added to this contract, and covered by the security test before merge.
