# Broadcast provider benchmark

This benchmark is deliberately independent from any vendor. A provider must prove coverage on real events before purchase or production use.

## Test sample

Use at least 40 events per provider when possible:

- 10 high-profile football matches
- 10 lower-profile football matches
- 5 basketball events
- 5 hockey events
- 5 tennis sessions/matches
- 5 events from another supported sport

For football-only vendors, replace unsupported sports with additional competitions and smaller fixtures. Include multiple kickoff slots, weekdays/weekends, and events at least 7 days away plus events within 24 hours.

## Required measurements

For every event record:

- fixture found: yes/no
- broadcaster data found: yes/no
- number of territories returned
- territories checked manually
- correct broadcaster in checked territories
- event-level evidence available
- official broadcaster URL available
- free/paid status available
- account requirement available
- languages available
- source observation age
- stable provider event ID
- stable broadcaster/station ID
- contradictory records found
- latency and API calls consumed

## Aggregate metrics

The automated benchmark score is 0-100:

- fixture coverage: 15%
- event broadcaster coverage: 25%
- territory coverage: 20%
- manually verified correctness: 20%
- free/paid coverage: 8%
- official URL coverage: 5%
- freshness reliability: 5%
- ID stability: 2%

A commercial/legal gate is separate from the score. A technically excellent provider is not eligible for automatic publication if reuse terms are not approved for commercial display.

## Decision bands

- 90-100: strong primary-provider candidate
- 80-89.99: usable primary provider with secondary verification
- 65-79.99: useful enrichment/secondary provider
- below 65: do not use as a primary broadcaster source

These bands do not override source-level confidence. Every individual observation still passes the WatchTVSport routing policy.

## Source hierarchy

Default evidence priority, from strongest to weakest:

1. official broadcaster schedule or event page
2. rights holder / league rights page that is specific enough for the event and territory
3. official competition event page
4. specialist broadcast-data provider
5. secondary editorial/web source

Conflicts never auto-pass simply because one source has a high base score. Conflicting observations enter review/research.

## Freshness policy

Evidence becomes more demanding as kickoff approaches:

- event within 24h: evidence should be no older than 24h; target recheck within 6h of kickoff
- event within 7d: evidence should be no older than 72h; target recheck within 24h of kickoff
- event within 30d: evidence should be no older than 14d; target recheck about 7d before kickoff
- event farther away: evidence should be no older than 30d; target recheck about 14d before kickoff

These are initial policy defaults, not immutable business rules. They should be tuned after measuring provider behaviour.

## Secondary-research budget guardrail

Initial software defaults are intentionally conservative and can be changed before enabling a paid research worker:

- USD 25 monthly cap
- USD 1.50 daily cap
- USD 0.20 per case
- maximum 2 attempts per case
- maximum 50 researched cases per day
- reserve 35% of the daily budget for events within 24h

This budget is for secondary research only. It does not authorize purchasing any API subscription and does not include the primary sports-data provider subscription.

## Purchase gate

Before subscribing to a provider, record:

- exact sports and competitions covered
- broadcaster/territory coverage from the benchmark
- API call limits and overage behaviour
- monthly and annual cost
- trial cancellation conditions
- commercial reuse/display rights
- attribution requirements
- caching/storage restrictions
- permitted retention of historical data
- rate limits
- SLA/support level
- termination/export implications

No vendor-specific adapter should bypass the neutral `broadcast-provider-contract` format.
