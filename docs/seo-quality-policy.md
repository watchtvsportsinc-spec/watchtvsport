# V2 SEO and quality policy

## Indexation rules
Index canonical pages that answer a stable user intent: sport hubs, competitions, clubs/nations where participant pages are enabled, permanent fixtures, Grand Prix pages, UFC event pages and retained World Cup archive pages.

Do not create indexable pages for every database row. Search/filter query strings, favorites, internal APIs and utility states are not SEO landing pages. Canonical URLs must exclude UI filters such as country/access.

## Metadata
Every indexable entity page should provide a unique title and description based on the entity, plus a canonical URL. Event pages should answer `where to watch`, identify the competition/sport and avoid claiming a broadcaster unless the data is confirmed. Open Graph should describe the same canonical entity.

## Structured data
- Football fixtures: `SportsEvent` + `SportsTeam` competitors.
- Club pages: `SportsTeam` with supported aliases.
- F1 Grand Prix: `SportsEvent` for the race weekend/race, with venue when known.
- UFC fight card: `SportsEvent`, with venue when known.
- Global shell: `Organization` and `WebSite`/`SearchAction`.

Structured data must never contain fabricated scores, participants, locations or broadcasters.

## Duplicate-page protection
- One canonical permanent page per meaningful entity.
- Edition/session data lives under its parent permanent page when separate indexable pages add no search value.
- F1 does not generate driver/team session pages.
- UFC does not generate fighter pages.
- Tennis does not generate player pages initially.
- Cycling does not generate rider/team pages initially.
- Country/access filters remain query parameters on canonical event pages, not new sitemap URLs.

## Internal linking
Event -> competition and participants where applicable. Club -> competition/event. Competition -> clubs/events. Grand Prix/UFC hubs -> permanent event pages. Home/search -> canonical destinations. Breadcrumbs are required on deep pages.

## Quality gate before production
Run `npm test` and `npm run build`. The quality suite checks launch-sport event counts, unique IDs, known sport registry entries, route shapes, participant model rules and required fields for confirmed broadcaster offers.

Manual release checks still required before production: 320/375/390/768/1024/desktop layouts, keyboard navigation, focus visibility, 404 behavior, Supabase failure fallback, no horizontal page overflow, correct TBC states, link targets, sitemap/robots output, and representative UCL/F1/UFC pages.

## Data publication gate
Schedules may be public while still `expected`/TBC if uncertainty is visibly represented. Broadcast offers are stricter: only confirmed included event-level offers are exposed. Never convert rights-level knowledge into event-level coverage without supporting evidence.
