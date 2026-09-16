# WatchTVSport V2 — entity media policy

## Principle

A media URL is data, not permission to display the media.

WatchTVSport may store a logo, crest, icon, photo or illustration as a candidate/reference, but the public UI may render it only after an explicit media review marks it `approved` and the delivery URL/provenance checks pass.

Statuses:

- `candidate`: discovered/imported, not reviewed.
- `review`: under manual rights/provenance review.
- `approved`: explicitly cleared for the intended WatchTVSport use.
- `rejected`: reviewed and not selected/usable.
- `blocked`: must not be rendered or reintroduced automatically.

Only `approved` is renderable.

## Fallback strategy

WatchTVSport must remain visually complete without third-party marks.

- Clubs/teams: use the existing WatchTVSport participant visual system (shirt/jersey/helmet/etc.) on profile/event surfaces, or the WatchTVSport badge when a compact entity visual is needed.
- Sports, competitions and events: use WatchTVSport-owned icons/badges/illustrations unless an external asset has been explicitly approved.
- A participant palette may color a fallback badge only when its `visualStatus` is `reviewed` or `verified`. `generated` and `needs_review` palettes do not become club identity automatically.
- Missing or non-approved media must never create a broken image or blank layout.

## External and imported media

Automated providers, APIs, feeds and agents may propose media candidates, but they must never set them to `approved` automatically.

An approved third-party asset requires a documented source, source page, rights/license note and review trail. Technical URL safety is a separate requirement from rights approval.

Do not hotlink arbitrary remote hosts. Prefer WatchTVSport-controlled/local storage for any third-party asset that has actually been cleared for use.

## Existing participant `logo_url`

`participant_profiles.logo_url` remains a reference/profile field. Its presence does not bypass this policy and does not grant permission to render the logo.

The public rendering decision belongs to the entity-media approval layer.

## Database model

`supabase-v2-entity-media-policy.sql` prepares `public.entity_media_assets` with the same five statuses, provenance/review fields, approval constraints and public RLS limited to approved rows.

The migration is additive and must be reviewed/applied separately; creating the SQL file does not apply it to Supabase.
