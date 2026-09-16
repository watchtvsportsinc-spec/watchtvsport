# Adaptive provider verification policy

WatchTVSport does not double-check every observation from a specialist provider forever.

## Scope

Trust is measured separately for each provider + competition + territory. A provider can therefore be trusted for Premier League / France while remaining under review for another competition or country.

## States

- Probation: every sampled observation is independently checked.
- Trusted: automatic use is allowed when all normal publication gates pass; 10% of observations remain independently audited.
- Elite: automatic use is allowed when all normal publication gates pass; 2% remain independently audited.
- Watch: enhanced verification is required.
- Suspended: no automatic use.

## Initial thresholds

Trusted requires at least 100 independently audited observations, at least 98.5% accuracy, at least 95% freshness reliability, no recent critical error, and confirmed commercial reuse rights.

Elite requires at least 300 independently audited observations, at least 99.5% accuracy, at least 98% freshness reliability, no recent critical error, and confirmed commercial reuse rights.

Any recent critical error moves the scope to Watch. A rights or reuse problem moves it to Suspended.

## Automatic path

A trusted provider observation may pass without a second lookup only when the event, territory and broadcaster are resolved; access type and broadcast type are known; evidence is event-specific and fresh; source reuse is allowed; there is no conflict with already published data; and the observation was not selected for sample audit.

## Forced second verification

Independent verification remains mandatory for unknown access type, ambiguous territory or broadcaster, stale evidence, a change to already published data, cross-source conflict, missing event-specific evidence, random/sample audit, or a provider scope in Probation/Watch.

## Human review

Contradictions or unresolved fields go to the private review application. Human approval never overrides source reuse or legal restrictions.

## Learning loop

Audit outcomes update provider accuracy and freshness metrics for the exact provider + competition + territory scope. Trust can increase or decrease automatically as evidence accumulates. This avoids paying for duplicate research on historically reliable scopes while preserving drift detection.