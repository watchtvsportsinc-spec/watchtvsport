# WatchTVSport V2

WatchTVSport is a legal sports broadcast discovery product: event schedule + territory + verified official broadcaster/platform.

## Local development
```bash
npm ci
npm run dev
```
Open `http://localhost:3000`.

## Quality gate
```bash
npm test
npm run build
```
`npm test` validates imports, public event payloads, the multisport seed/apply plan and V2 structural quality rules.

## Current V2 launch models
- Football / UEFA Champions League: team matches, club pages, competition pages, permanent fixture pages.
- Formula 1: permanent Grand Prix pages with five session slots per weekend.
- UFC: fight-card pages with Early Prelims / Prelims / Main Card sessions where applicable.

The registry is already prepared for basketball/NBA, hockey/NHL, American football/NFL, MLS-style football competitions, MotoGP, tennis and cycling without forcing player/driver/rider page generation.

## Data
Supabase is the preferred V2 read source. `lib/public-events.ts` falls back to bundled data during migration or read failure. Broadcaster offers are public only when explicitly confirmed at event/session level.

Useful commands:
```bash
npm run export:v2-seed
npm run validate:import -- data/imports/seed-2026-ucl-f1.json
npm run plan:v2-seed
# write operations require explicit environment credentials:
npm run apply:v2-seed
```

## Architecture and policy
Read these before structural changes:
- `docs/v2-product-architecture.md`
- `docs/seo-quality-policy.md`
- `docs/data-sources.md`
- `AGENTS.md`

## Production safety
The `refonte/watchtvsport-v2` branch is the development line. Do not replace the current `watchtvsport.com` production deployment until the visual, SEO and release checks are explicitly approved.
