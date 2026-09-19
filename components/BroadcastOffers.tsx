import type { EventData } from "@/lib/events";
import type { BroadcastInfo } from "@/lib/matches";
import type { PublicCompetitionBroadcastRight } from "@/lib/public-broadcast-rights";
import { getBroadcasterLogo } from "@/lib/broadcaster-logos";

type AccessFilter = "Free" | "Paid" | "";

type Props = {
  events: EventData[];
  selectedCountry?: string;
  selectedAccess?: string;
  title?: string;
  competitionRights?: PublicCompetitionBroadcastRight[];
};

type AggregatedOffer = {
  key: string;
  broadcast: BroadcastInfo;
  sessions: string[];
};

function offerKey(broadcast: BroadcastInfo) {
  return [
    broadcast.countryCode,
    broadcast.broadcaster,
    broadcast.url,
    broadcast.broadcastType ?? "live",
    broadcast.access,
  ].join("|");
}

function normalizedBroadcasterKey(countryCode: string, broadcaster: string) {
  return countryCode.toLowerCase() + "|" + broadcaster.trim().toLowerCase();
}

function sessionLabel(event: EventData) {
  return event.stage || event.sessionType?.replaceAll("_", " ") || event.title;
}

function aggregate(events: EventData[]): AggregatedOffer[] {
  const offers = new Map<string, { broadcast: BroadcastInfo; sessions: Set<string> }>();

  for (const event of events) {
    for (const broadcast of event.broadcasts) {
      if (broadcast.coverageStatus !== "confirmed") continue;
      const key = offerKey(broadcast);
      const current = offers.get(key) ?? {
        broadcast,
        sessions: new Set<string>(),
      };
      current.sessions.add(sessionLabel(event));
      offers.set(key, current);
    }
  }

  return Array.from(offers, ([key, value]) => ({
    key,
    broadcast: value.broadcast,
    sessions: Array.from(value.sessions),
  })).sort(
    (a, b) =>
      a.broadcast.countryName.localeCompare(b.broadcast.countryName) ||
      a.broadcast.broadcaster.localeCompare(b.broadcast.broadcaster)
  );
}

function BroadcasterLogo({ name }: { name: string }) {
  const logo = getBroadcasterLogo(name);
  const styleClass =
    logo?.darkStyle === "invert"
      ? " is-inverted"
      : logo?.darkStyle === "knockout"
        ? " is-knockout"
        : "";

  return (
    <span className="wts-event-broadcaster-logo-slot">
      <span
        className={`v2-match-broadcaster-logo${logo?.compact ? " is-wide" : ""}${styleClass}${logo ? "" : " is-fallback"}`}
        role="img"
        aria-label={logo ? name : `${name} broadcaster`}
      >
        {logo ? (
          <img src={logo.src} alt="" aria-hidden="true" loading="lazy" />
        ) : (
          <span className="wts-event-broadcaster-name-fallback" aria-hidden="true">{name}</span>
        )}
      </span>
    </span>
  );
}

function coverageLabel(value: PublicCompetitionBroadcastRight["coverageType"]) {
  if (value === "full") return "Full competition coverage";
  if (value === "partial") return "Partial competition rights";
  return "Official competition partner";
}

export default function BroadcastOffers({
  events,
  selectedCountry,
  selectedAccess,
  title = "Where to watch",
  competitionRights = [],
}: Props) {
  const allOffers = aggregate(events);
  const countries = Array.from(
    new Map(
      allOffers.map((offer) => [
        offer.broadcast.countryCode,
        {
          code: offer.broadcast.countryCode,
          name: offer.broadcast.countryName,
        },
      ])
    ).values()
  ).sort((a, b) => a.name.localeCompare(b.name));

  const country =
    selectedCountry && countries.some((item) => item.code === selectedCountry)
      ? selectedCountry
      : "";
  const access: AccessFilter =
    selectedAccess === "Free" || selectedAccess === "Paid"
      ? selectedAccess
      : "";

  const visibleOffers = allOffers.filter(
    (offer) =>
      (!country || offer.broadcast.countryCode === country) &&
      (!access || offer.broadcast.access === access)
  );

  const grouped = new Map<string, AggregatedOffer[]>();
  for (const offer of visibleOffers) {
    const key = offer.broadcast.countryCode;
    grouped.set(key, [...(grouped.get(key) ?? []), offer]);
  }

  const freeCount = allOffers.filter(
    (offer) => offer.broadcast.access === "Free"
  ).length;
  const paidCount = allOffers.filter(
    (offer) => offer.broadcast.access === "Paid"
  ).length;

  const hasAffiliateLinks = visibleOffers.some(
    (offer) =>
      offer.broadcast.access === "Paid" && Boolean(offer.broadcast.affiliateUrl)
  );

  const confirmedKeys = new Set(
    allOffers.map((offer) =>
      normalizedBroadcasterKey(
        offer.broadcast.countryCode,
        offer.broadcast.broadcaster
      )
    )
  );

  const supplementalRights = competitionRights
    .filter(
      (right) =>
        !confirmedKeys.has(
          normalizedBroadcasterKey(right.countryCode, right.broadcaster)
        )
    )
    .filter((right) => !country || right.countryCode === country)
    .filter(
      (right) =>
        !access ||
        right.access === access ||
        (right.access === "Unknown" && !access)
    )
    .sort(
      (a, b) =>
        a.countryName.localeCompare(b.countryName) ||
        a.broadcaster.localeCompare(b.broadcaster)
    );

  return (
    <section
      className="v2-results wts-event-broadcasts"
      id="broadcasts"
      aria-labelledby="broadcast-options-title"
    >
      <div className="v2-results-heading">
        <div>
          <p className="v2-eyebrow">Confirmed for this event</p>
          <h2 id="broadcast-options-title">{title}</h2>
        </div>
        <p>{visibleOffers.length} confirmed</p>
      </div>

      {(countries.length > 1 || freeCount > 0 || paidCount > 0) ? (
        <form method="get" className="wts-event-broadcast-filters">
          <label htmlFor="country-broadcast-filter">
            <span>Country</span>
            <select
              id="country-broadcast-filter"
              name="country"
              defaultValue={country}
            >
              <option value="">All available countries</option>
              {countries.map((item) => (
                <option key={item.code} value={item.code}>
                  {item.name}
                </option>
              ))}
            </select>
          </label>

          <label htmlFor="access-broadcast-filter">
            <span>Access</span>
            <select
              id="access-broadcast-filter"
              name="access"
              defaultValue={access}
            >
              <option value="">Free + Paid</option>
              {freeCount > 0 ? (
                <option value="Free">Free ({freeCount})</option>
              ) : null}
              {paidCount > 0 ? (
                <option value="Paid">Paid ({paidCount})</option>
              ) : null}
            </select>
          </label>

          <button type="submit">Apply</button>
        </form>
      ) : null}

      {visibleOffers.length === 0 ? (
        <div className="v2-empty-state" role="status">
          <h3>Broadcast information pending</h3>
          <p>
            No verified official viewing option matches these filters.
            WatchTVSport does not infer event coverage from general rights.
          </p>
        </div>
      ) : (
        <div className="wts-event-broadcast-country-groups">
          {Array.from(grouped.entries()).map(([countryCode, offers]) => (
            <section
              className="wts-event-broadcast-country"
              key={countryCode}
              aria-label={offers[0].broadcast.countryName}
            >
              <h3>{offers[0].broadcast.countryName}</h3>

              <div className="wts-event-broadcast-list">
                {offers.map(({ key, broadcast, sessions }) => {
                  const href = broadcast.affiliateUrl ?? broadcast.url;
                  const isAffiliate = Boolean(broadcast.affiliateUrl);

                  return (
                    <a
                      className="wts-event-broadcast-row"
                      key={key}
                      href={href}
                      rel={
                        isAffiliate
                          ? "noopener noreferrer sponsored"
                          : "noopener noreferrer"
                      }
                      target="_blank"
                    >
                      <span className="wts-event-broadcast-service">
                        <BroadcasterLogo name={broadcast.broadcaster} />
                        <span className="wts-event-broadcast-copy">
                          {!getBroadcasterLogo(broadcast.broadcaster) ? <strong>{broadcast.broadcaster}</strong> : null}
                          {events.length > 1 ? (
                            <small>{sessions.join(" · ")}</small>
                          ) : null}
                          {broadcast.commentaryLanguages?.length ? (
                            <small>
                              {broadcast.commentaryLanguages.join(", ")}
                            </small>
                          ) : null}
                        </span>
                      </span>

                      <span
                        className={
                          "wts-event-access is-" +
                          broadcast.access.toLowerCase()
                        }
                      >
                        {broadcast.access}
                      </span>

                      <span className="wts-event-broadcast-action">
                        Official <b aria-hidden="true">↗</b>
                      </span>
                    </a>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      )}

      {hasAffiliateLinks ? (
        <p className="wts-event-affiliate-note">
          Some links to paid services are affiliate links. If you subscribe
          through one, WatchTVSport may earn a commission at no extra cost to
          you. This helps support the site.
        </p>
      ) : null}

      {supplementalRights.length > 0 ? (
        <section
          className="wts-event-rights"
          aria-labelledby="event-competition-rights-title"
        >
          <div className="wts-event-rights-heading">
            <div>
              <p className="v2-eyebrow">Competition-level rights</p>
              <h3 id="event-competition-rights-title">
                Official competition broadcasters
              </h3>
              <p>
                These services hold verified rights for the competition in
                their territory. This does not confirm that every session of
                this specific event is carried by the service.
              </p>
            </div>
            <span>{supplementalRights.length} rights</span>
          </div>

          <div className="wts-event-rights-list">
            {supplementalRights.map((right, index) => {
              const content = (
                <>
                  <span className="wts-event-right-country">
                    {right.countryName}
                  </span>
                  <span className="wts-event-broadcast-service">
                    <BroadcasterLogo name={right.broadcaster} />
                    <span className="wts-event-broadcast-copy">
                      {!getBroadcasterLogo(right.broadcaster) ? <strong>{right.broadcaster}</strong> : null}
                      <small>{coverageLabel(right.coverageType)}</small>
                    </span>
                  </span>
                  <span
                    className={
                      right.access === "Free"
                        ? "wts-event-access is-free"
                        : right.access === "Paid"
                          ? "wts-event-access is-paid"
                          : "wts-event-access is-unknown"
                    }
                  >
                    {right.access}
                  </span>
                  <span className="wts-event-broadcast-action">
                    {right.officialUrl ? (
                      <>
                        Official <b aria-hidden="true">↗</b>
                      </>
                    ) : (
                      "Rights info"
                    )}
                  </span>
                </>
              );

              return right.officialUrl ? (
                <a
                  className="wts-event-right-row"
                  href={right.officialUrl}
                  key={
                    right.countryCode + "-" + right.broadcaster + "-" + index
                  }
                  rel="noopener noreferrer"
                  target="_blank"
                >
                  {content}
                </a>
              ) : (
                <div
                  className="wts-event-right-row is-static"
                  key={
                    right.countryCode + "-" + right.broadcaster + "-" + index
                  }
                >
                  {content}
                </div>
              );
            })}
          </div>

          <p className="wts-event-rights-note">
            Event-specific confirmations above always take priority.
          </p>
        </section>
      ) : null}
    </section>
  );
}
