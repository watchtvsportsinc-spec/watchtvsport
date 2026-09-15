# WatchTVSport V2 architecture

## Product contract
WatchTVSport answers one question: **where can this sports event be watched legally in a given territory?** The application never hosts video and never invents event-level coverage from a broadcaster's general rights.

## Launch data models
- **Football / team_match**: competition -> permanent fixture page -> dated match. Team and nation pages are allowed.
- **Formula 1 / race_session**: competition -> permanent Grand Prix page -> season edition -> practice / sprint qualifying / sprint / qualifying / race sessions. Driver/team pages are deliberately not generated.
- **UFC / fight_card**: competition -> permanent fight-card page -> dated edition -> Early Prelims / Prelims / Main Card sessions. Fighter pages are deliberately not generated.

The same primitives support future sports without rebuilding the UI:
- NBA / NHL / NFL / MLS: `team_match`, participant pages enabled.
- MotoGP: `race_session`, participant pages disabled initially.
- Tennis: `tournament_match`, tournament/event discovery only; no player pages initially.
- Cycling: `cycling_race`, race/event discovery only; no team/rider pages initially.

## Data confidence
Event schedule and broadcaster confidence are separate. `confirmed`, `expected`, `to_update`, and `unknown` may be stored for event data. Public broadcaster offers require `verification_status=confirmed`, `decision=included`, and `is_published=true`.

Unknown times are displayed as TBC. Unknown broadcasters are displayed as pending. A rights holder is not shown on an event until event-level coverage is sufficiently supported.

## Runtime data flow
1. Supabase is the preferred public event source.
2. `get_public_events_v2` is parsed through the strict public payload validators.
3. If Supabase is unavailable or returns no published events during migration, the application can fall back to bundled data.
4. Pages consume the same `EventData` model: home calendar, search, favorites, clubs, competitions, Grand Prix and UFC cards.

## URL policy
Permanent entity/event URLs are stable and do not include a year unless the edition itself is the entity. Examples:
- `/football/club/manchester-united`
- `/football/competition/champions-league`
- `/football/champions-league/manchester-united-arsenal`
- `/formula-1/grand-prix/canada`
- `/ufc/event/ufc-331-van-vs-pantoja-2`

The World Cup 2026 archive URLs are retained to protect already-indexed URLs.

## Mobile and performance rules
Mobile is the primary design target. Core navigation and event discovery must work at 320px width without horizontal page overflow. Horizontal scrolling is permitted only for compact navigation/filter rails. Tap targets target roughly 44px. Large decorative images are optional enhancement, never a dependency for understanding the page. The default visual system uses gradients/CSS rather than heavy hero media so low-bandwidth users still receive a complete interface.

## Adding a sport
1. Add the sport registry entry and aliases.
2. Choose an existing event model; add a new model only when its scheduling semantics cannot fit an existing model.
3. Define participant page policy before importing participants.
4. Create/verify source policy in `data_sources` and `source_scopes`.
5. Build idempotent seed/import records.
6. Add structural tests.
7. Add the sport hub/event route only if it creates user value; do not create pages merely because data exists.
8. Add sitemap entries only for canonical, useful, indexable pages.

## Automation boundary
Future agents may collect, validate and propose changes through the ingestion tables. Automatic collection is allowed only for a source explicitly marked approved for reuse. Automatic publication is a separate permission and remains off unless deliberately enabled. Human or agent overrides must preserve evidence URL, observation time and verification status.
