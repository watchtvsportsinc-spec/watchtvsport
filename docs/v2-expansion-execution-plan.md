# WatchTVSport V2 — expansion execution plan

Status: active development / not production
Date: 2026-09-15

## Non-negotiable rules

- Mobile-first rendering and performance.
- Never invent a club, fixture, venue, circuit, fighter, nationality, broadcaster, time, logo, social account or image attribution.
- Prefer official league, competition, club, venue and athlete sources.
- Every enriched profile field and media asset must retain provenance and verification date.
- Missing data remains missing/TBC/expected rather than inferred.
- Do not hotlink fragile third-party media into the public UI. Store an approved/optimized asset or retain a fallback.
- Do not deploy V2 to production without explicit approval.

## Expansion scope

### Football
Add 2026/27 Premier League, Ligue 1, LaLiga and Bundesliga alongside UEFA Champions League. Create competition/season/team records, then fixtures only from authoritative schedules. Team pages share the same permanent identity across competitions.

### North American team sports
Add all current NBA, NHL and NFL franchises as permanent participants. Prepare league/team pages before importing full schedules. Venue and official-site data are profile attributes with field-level provenance.

### Team profiles
For Champions League clubs first, then all new league/franchise participants, verify: official name, aliases, country, city, founded year, home venue, capacity, official site and official social channels. Logos and hero/venue imagery are separate media assets, not free-form URLs mixed into fixture data.

### Match thumbnails
The venue determines the thumbnail: the home team venue for a normal home fixture; the explicitly assigned venue for neutral-site events. Away-team pages therefore show the opponent/home venue for that fixture. Never infer a venue when the event is neutral or relocated.

### Formula 1
Each Grand Prix page must use the verified circuit identity and a real circuit-layout asset. No generated or approximate track maps. Session times stay TBC until confirmed.

### UFC
Each event has a verified venue. Event pages may use an approved venue exterior/aerial asset when provenance/usage is acceptable. Fighter cards use UFC-confirmed bout data, nationality/flag and an official fighter image only when an asset can be safely incorporated; otherwise use a neutral fallback. Do not create indexable fighter pages merely because fighter records exist.

## Media asset model

Required asset kinds: team_logo, competition_logo, league_logo, venue_image, team_hero, circuit_layout, fighter_photo, event_artwork.

Each asset needs: entity association, source URL, source name, verification timestamp, status, alt text, optional credit/license note, width/height, mime type and storage/public URL. Public rendering only uses approved assets.

## UX rules

- Logos are meaningful visual identity and must have text alternatives.
- Social links render as recognizable clickable icons with accessible labels, not bare `X`, `Facebook`, etc.
- Hero imagery is responsive and decorative content must not block the core event/broadcaster information.
- Match cards prioritize date/time, teams, competition and Where to watch. Venue imagery is progressively loaded.
- Country flags are contextual metadata, never substitutes for text labels where ambiguity matters.

## SEO rules

- Permanent team/franchise and competition pages are canonical entities.
- Match/event URLs remain stable and do not encode transient query filters.
- Thin participant/fighter/driver pages remain absent/noindex until they have independent user value.
- Search/filter combinations are noindex.
- Schema.org uses verified SportsTeam/SportsEvent/Place data only.
- World Cup 2026 legacy routes remain available as archive routes but are not the global positioning of the site.

## Execution order

1. Extend entity/media schema and verification pipeline.
2. Seed verified league/team membership from official league sources.
3. Enrich participant profiles and venues.
4. Integrate approved logos/social icons/venue imagery into reusable UI.
5. Add league/franchise pages and search coverage.
6. Import authoritative schedules in idempotent batches.
7. Add F1 circuit-layout assets and UFC fighter/event media.
8. Run link/data/SEO/performance/accessibility audits.
9. Fix defects and rerun tests/build.
10. Produce a final audit with remaining risks and prioritized improvements.
