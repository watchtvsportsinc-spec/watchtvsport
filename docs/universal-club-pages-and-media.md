# Universal club/franchise pages and media policy

## Product rule

WatchTVSport has one participant-page layout for all team sports. Football clubs, NBA franchises, NHL franchises and future team sports must use the same information architecture and visual hierarchy.

Canonical route:

`/sports/{sport}/club/{participant-slug}`

Legacy sport-specific routes may redirect to the canonical route.

## A club page must not depend on fixtures

A participant page is a permanent entity page. It must remain useful when a league schedule has not yet been published or imported.

Permanent content can include:

- team/franchise name and short name
- sport
- logo (only when usage is approved)
- hero image (only when usage is approved)
- city and country
- founded year
- home venue / arena / stadium
- venue capacity
- official website
- official social accounts
- sourced summary
- verification state and last verification date

Dynamic content is additive:

- next game
- upcoming games
- recent games
- competitions represented in the current event dataset
- confirmed broadcaster count
- legal watch links

If dynamic content is unavailable, the page must show a neutral empty state and preserve all permanent profile content. It must never imply that the team has no games; it only states that no confirmed schedule is currently available in WatchTVSport.

## Media model

Participant profile media remains in `participant_profiles` (`logo_url`, `hero_image_url`). Sports, competitions and event pages now have dedicated media URL fields. `entity_media_assets` records provenance and usage approval.

Assets marked `review` or `blocked` must not be rendered as official logos. The UI falls back to initials or flags.

## Multi-sport participant types

Supported participant types include:

- `club`
- `team`
- `franchise`
- `national_team`
- `country`
- `individual`

NBA/NHL entities should normally use `franchise` (or `team` where the provider taxonomy requires it) but the UI must not change based on that distinction.

## NBA and NHL ingestion requirement

NBA and NHL pages require permanent participant/profile seed data independently of fixtures. The ingestion pipeline should populate the franchise and profile tables before or independently from the match schedule.

This allows pages to exist with verified entity data even during the off-season or before a new season schedule is available.
