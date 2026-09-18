<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing framework-sensitive code. Heed deprecation notices.

<!-- END:nextjs-agent-rules -->

# WatchTVSport V2 guardrails

- Mobile-first is mandatory. Validate the information hierarchy for narrow screens before desktop embellishment.
- Never break or remove indexed World Cup archive URLs without an explicit redirect/canonical migration plan.
- Supabase is the preferred V2 source, but public payloads must pass strict validation and the bundled fallback must remain safe during migration.
- Never invent schedules, participants, scores, broadcaster assignments or access conditions.
- A competition-level broadcast right is not event-level proof. Public offers require confirmed event-level data.
- Preserve `TBC`/`expected` uncertainty instead of manufacturing precision.
- Reuse event models from `lib/sports-registry.ts`. Avoid sport-specific schema forks unless the scheduling semantics truly require one.
- Team/nation participant pages are allowed only when the sport registry policy enables them. No player/fighter/driver/rider page explosion.
- Search suggestions should point to useful canonical entities (participants when allowed, competitions, Grand Prix/fight cards), not every session/match by default.
- Filters such as country/access remain UI query parameters and must not create duplicate canonical SEO pages.
- New data-source automation requires explicit source reuse approval. Automatic collection and automatic publication are separate permissions.
- Every material V2 change must keep `npm test` and `npm run build` green.
- Workflow ownership: ChatGPT performs the code changes directly on GitHub on the `refonte/watchtvsport-v2` branch. The user should not be asked to edit code manually; their normal local action is only to pull the branch and run the terminal commands needed to preview/test the result.
- Keep low-bandwidth operation viable: CSS/HTML must carry the core UX; decorative media is optional enhancement.

See `docs/v2-product-architecture.md`, `docs/seo-quality-policy.md`, and `docs/data-sources.md` before changing data or routing architecture.
