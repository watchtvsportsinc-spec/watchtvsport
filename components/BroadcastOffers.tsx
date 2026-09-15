import type { EventData } from "@/lib/events";
import type { BroadcastInfo } from "@/lib/matches";

type Props = {
  events: EventData[];
  selectedCountry?: string;
  title?: string;
};

type AggregatedOffer = {
  key: string;
  broadcast: BroadcastInfo;
  sessions: string[];
};

function offerKey(broadcast: BroadcastInfo): string {
  return [
    broadcast.countryCode,
    broadcast.broadcaster,
    broadcast.url,
    broadcast.broadcastType ?? "live",
    broadcast.access,
  ].join("|");
}

function sessionLabel(event: EventData): string {
  return event.stage || event.sessionType?.replaceAll("_", " ") || event.title;
}

function aggregate(events: EventData[]): AggregatedOffer[] {
  const offers = new Map<string, { broadcast: BroadcastInfo; sessions: Set<string> }>();

  for (const event of events) {
    for (const broadcast of event.broadcasts) {
      if (broadcast.coverageStatus !== "confirmed") continue;
      const key = offerKey(broadcast);
      const existing = offers.get(key) ?? {
        broadcast,
        sessions: new Set<string>(),
      };
      existing.sessions.add(sessionLabel(event));
      offers.set(key, existing);
    }
  }

  return Array.from(offers.entries()).map(([key, value]) => ({
    key,
    broadcast: value.broadcast,
    sessions: Array.from(value.sessions),
  }));
}

export default function BroadcastOffers({
  events,
  selectedCountry,
  title = "Where to watch",
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

  const country = selectedCountry && countries.some((item) => item.code === selectedCountry)
    ? selectedCountry
    : "";
  const visibleOffers = country
    ? allOffers.filter((offer) => offer.broadcast.countryCode === country)
    : allOffers;
  const grouped = new Map<string, AggregatedOffer[]>();

  for (const offer of visibleOffers) {
    const key = offer.broadcast.countryCode;
    const group = grouped.get(key) ?? [];
    group.push(offer);
    grouped.set(key, group);
  }

  return (
    <section className="v2-results" aria-labelledby="broadcast-options-title">
      <div className="v2-results-heading">
        <div>
          <p className="v2-eyebrow">Official viewing options</p>
          <h2 id="broadcast-options-title">{title}</h2>
        </div>
        <p>{visibleOffers.length} confirmed</p>
      </div>

      {countries.length > 1 ? (
        <form method="get" style={{ margin: "1rem 0", display: "flex", gap: "0.75rem", flexWrap: "wrap", alignItems: "end" }}>
          <label htmlFor="country-broadcast-filter" style={{ display: "grid", gap: "0.35rem" }}>
            Country
            <select id="country-broadcast-filter" name="country" defaultValue={country}>
              <option value="">All available countries</option>
              {countries.map((item) => (
                <option key={item.code} value={item.code}>{item.name}</option>
              ))}
            </select>
          </label>
          <button type="submit">Show</button>
        </form>
      ) : null}

      {visibleOffers.length === 0 ? (
        <div className="v2-empty-state" role="status">
          <h3>Broadcast information pending</h3>
          <p>
            No official viewing option has been verified for this selection yet.
            WatchTVSport does not infer coverage from a broadcaster&apos;s general rights.
          </p>
        </div>
      ) : (
        <div className="v2-event-groups">
          {Array.from(grouped.entries()).map(([countryCode, offers]) => (
            <section className="v2-event-group" key={countryCode}>
              <h3>{offers[0].broadcast.countryName}</h3>
              <div className="v2-event-list">
                {offers.map(({ key, broadcast, sessions }) => (
                  <article className="v2-event-card" key={key}>
                    <div className="v2-event-main">
                      <p className="v2-event-competition">
                        {broadcast.access} · {broadcast.broadcastType ?? "live"}
                      </p>
                      <h4>{broadcast.broadcaster}</h4>
                      {events.length > 1 ? (
                        <p className="v2-event-stage">{sessions.join(" · ")}</p>
                      ) : null}
                      {broadcast.commentaryLanguages?.length ? (
                        <p className="v2-event-stage">
                          Languages: {broadcast.commentaryLanguages.join(", ")}
                        </p>
                      ) : null}
                      {broadcast.accessConditions ? (
                        <p className="v2-event-stage">{broadcast.accessConditions}</p>
                      ) : null}
                    </div>
                    <a
                      className="v2-broadcast-link"
                      href={broadcast.affiliateUrl ?? broadcast.url}
                      rel="noopener noreferrer sponsored"
                      target="_blank"
                    >
                      <span>{broadcast.requiresAccount ? "Account or subscription may be required" : "Official service"}</span>
                      <strong>Open official service →</strong>
                    </a>
                  </article>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </section>
  );
}
