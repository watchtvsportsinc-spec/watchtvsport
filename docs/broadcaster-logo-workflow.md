# Broadcaster logo workflow

WatchTVSport serves broadcaster logos only from the local `public/broadcasters/` library. A missing logo must never trigger a network request during a public page render.

## Runtime behavior

- `data/broadcaster-logos.json` is the registry of approved local broadcaster logos and name aliases.
- `lib/broadcaster-logos.ts` builds the runtime lookup from that manifest.
- If a broadcaster is present in the manifest, the compact TV guide uses its local SVG.
- If no approved logo is available, the TV guide immediately falls back to broadcaster initials so the UI stays stable.

## Missing-logo detection

Supabase automatically creates a `broadcaster_logo` enrichment task whenever a broadcaster is inserted or its identity/website information changes. Existing broadcasters without a local approved asset remain `pending`; broadcasters with approved local assets can be marked `verified`.

Run:

```bash
npm run logos:status
```

to compare active Supabase broadcasters with the local manifest and list missing logos. `npm run logos:status:strict` also exits non-zero when any active broadcaster is missing a logo.

## Candidate discovery and approval

A pending task is a request for enrichment, not permission to publish an arbitrary image. Candidate discovery must use an explicitly approved source/reuse policy. Before a candidate becomes available to the public site, verify:

1. the logo belongs to the exact broadcaster;
2. the source/provenance is recorded and its intended reuse is acceptable;
3. the SVG is safe and visually correct on WatchTVSport's dark UI;
4. the asset is copied into `public/broadcasters/`;
5. the broadcaster entry and aliases are added to `data/broadcaster-logos.json`;
6. automated tests pass;
7. only then is the enrichment task marked `verified`.

Automatic candidate collection from a new external provider must be configured separately from automatic publication. Public pages continue to use initials until an asset is approved locally.
