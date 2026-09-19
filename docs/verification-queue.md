# Verification queue migration

This migration adds a private staging layer between external collection and public WatchTVSport data.

## Tables

- `verification_runs`: one daily collection pass and its summary.
- `verification_proposals`: one proposed change requiring automated or human handling.
- `verification_decisions`: append-only audit trail of accept/reject/undo decisions.

## Safety model

These tables are not public content. RLS is enabled and public/authenticated browser access is denied by default. They are intended to be accessed only through trusted server-side code using privileged credentials.

Accepting a proposal must not directly expose data publicly unless the server-side action explicitly performs the corresponding validated write to `events`, `broadcast_rights`, or `event_broadcasts`.

The current admin UI remains preview-only until the server API and authentication layer are added.
