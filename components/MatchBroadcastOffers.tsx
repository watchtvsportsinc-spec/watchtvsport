import type { EventData } from "@/lib/events";
import type { BroadcastInfo } from "@/lib/matches";
import styles from "./MatchBroadcastOffers.module.css";

type AccessFilter = "Free" | "Paid" | "";

type Props = {
  event: EventData;
  selectedCountry?: string;
  selectedAccess?: string;
  returnTo?: string;
};

function countryFlag(countryCode: string): string {
  const code = countryCode.trim().toUpperCase();
  if (!/^[A-Z]{2}$/.test(code)) return "🌐";
  return String.fromCodePoint(...Array.from(code, (letter) => 127397 + letter.charCodeAt(0)));
}

function broadcasterInitials(name: string): string {
  const words = name.replace(/[^a-zA-Z0-9+ ]/g, " ").split(/\s+/).filter(Boolean);
  if (!words.length) return "TV";
  if (words.length === 1) return words[0].slice(0, 3).toUpperCase();
  return words.slice(0, 2).map((word) => word[0]).join("").toUpperCase();
}

function BroadcasterLogo({ name }: { name: string }) {
  if (name === "DAZN") {
    return (
      <span className={`${styles.logo} ${styles.logoDazn}`} aria-hidden="true">
        <svg viewBox="0 0 52 52" role="presentation">
          <rect x="5" y="5" width="42" height="42" rx="2" />
          <text x="26" y="23" textAnchor="middle">DA</text>
          <text x="26" y="38" textAnchor="middle">ZN</text>
        </svg>
      </span>
    );
  }

  if (name === "CANAL+") {
    return (
      <span className={`${styles.logo} ${styles.logoCanal}`} aria-hidden="true">
        <span>CANAL+</span>
      </span>
    );
  }

  if (name === "Paramount+") {
    return (
      <span className={`${styles.logo} ${styles.logoParamount}`} aria-hidden="true">
        <span className={styles.paramountPeak}>▲</span>
        <span className={styles.paramountWord}>P+</span>
      </span>
    );
  }

  return (
    <span className={`${styles.logo} ${styles.logoFallback}`} aria-hidden="true">
      {broadcasterInitials(name)}
    </span>
  );
}

function coverageLabel(broadcast: BroadcastInfo): string {
  switch (broadcast.broadcastType) {
    case "delayed":
      return "Delayed coverage";
    case "replay":
      return "Replay";
    case "highlights":
      return "Highlights";
    default:
      return "Live coverage";
  }
}

export default function MatchBroadcastOffers({ event, selectedCountry, selectedAccess, returnTo }: Props) {
  const allOffers = event.broadcasts.filter((broadcast) => broadcast.coverageStatus === "confirmed");
  const countries = Array.from(
    new Map(
      allOffers.map((broadcast) => [
        broadcast.countryCode,
        { code: broadcast.countryCode, name: broadcast.countryName },
      ])
    ).values()
  ).sort((a, b) => a.name.localeCompare(b.name));

  const country = selectedCountry && countries.some((item) => item.code === selectedCountry)
    ? selectedCountry
    : "";
  const access: AccessFilter = selectedAccess === "Free" || selectedAccess === "Paid"
    ? selectedAccess
    : "";
  const visibleOffers = allOffers.filter(
    (broadcast) => (!country || broadcast.countryCode === country) && (!access || broadcast.access === access)
  );
  const grouped = new Map<string, BroadcastInfo[]>();

  for (const broadcast of visibleOffers) {
    const key = broadcast.countryCode;
    grouped.set(key, [...(grouped.get(key) ?? []), broadcast]);
  }

  const freeCount = allOffers.filter((broadcast) => broadcast.access === "Free").length;
  const paidCount = allOffers.filter((broadcast) => broadcast.access === "Paid").length;

  return (
    <section id="where-to-watch" className={styles.section} aria-labelledby="match-broadcast-options-title">
      <div className={styles.heading}>
        <div>
          <p className={styles.eyebrow}>Official viewing options</p>
          <h2 id="match-broadcast-options-title">Where to watch</h2>
          <p className={styles.intro}>
            Confirmed official TV and streaming services for {event.title}, grouped by country.
          </p>
        </div>
        <span className={styles.countryCount}>{countries.length} {countries.length === 1 ? "country" : "countries"}</span>
      </div>

      <form method="get" className={styles.filters}>
        {returnTo ? <input type="hidden" name="returnTo" value={returnTo} /> : null}
        <label htmlFor="country-broadcast-filter">
          <span>Country</span>
          <select id="country-broadcast-filter" name="country" defaultValue={country}>
            <option value="">All available countries</option>
            {countries.map((item) => (
              <option key={item.code} value={item.code}>{item.name}</option>
            ))}
          </select>
        </label>
        <label htmlFor="access-broadcast-filter">
          <span>Access</span>
          <select id="access-broadcast-filter" name="access" defaultValue={access}>
            <option value="">Free + Paid</option>
            {freeCount > 0 ? <option value="Free">Free ({freeCount})</option> : null}
            {paidCount > 0 ? <option value="Paid">Paid ({paidCount})</option> : null}
          </select>
        </label>
        <button type="submit">Apply</button>
      </form>

      {visibleOffers.length === 0 ? (
        <div className={styles.empty} role="status">
          <h3>Broadcast information pending</h3>
          <p>No verified official viewing option matches these filters.</p>
        </div>
      ) : (
        <div className={styles.countryList}>
          {Array.from(grouped.entries()).map(([countryCode, offers]) => (
            <section className={styles.countryCard} key={countryCode}>
              <header className={styles.countryHeader}>
                <span className={styles.flag} role="img" aria-label={`${offers[0].countryName} flag`}>
                  {countryFlag(countryCode)}
                </span>
                <div>
                  <h3>{offers[0].countryName}</h3>
                  <p>{offers.length} {offers.length === 1 ? "option" : "options"}</p>
                </div>
              </header>

              <div className={styles.offerList}>
                {offers.map((broadcast) => {
                  const href = broadcast.affiliateUrl ?? broadcast.url;
                  const key = [broadcast.countryCode, broadcast.broadcaster, href, broadcast.access].join("|");
                  return (
                    <article className={styles.offer} key={key}>
                      <BroadcasterLogo name={broadcast.broadcaster} />
                      <div className={styles.offerMain}>
                        <div className={styles.offerTitleRow}>
                          <h4>{broadcast.broadcaster}</h4>
                          <span className={`${styles.accessBadge} ${broadcast.access === "Free" ? styles.free : styles.paid}`}>
                            {broadcast.access}
                          </span>
                        </div>
                        <p>{coverageLabel(broadcast)}</p>
                        {broadcast.commentaryLanguages?.length ? (
                          <p className={styles.detail}>Commentary: {broadcast.commentaryLanguages.join(", ")}</p>
                        ) : null}
                        {broadcast.accessConditions ? <p className={styles.detail}>{broadcast.accessConditions}</p> : null}
                      </div>
                      <a
                        className={styles.officialLink}
                        href={href}
                        rel="noopener noreferrer sponsored"
                        target="_blank"
                      >
                        Official service <span aria-hidden="true">↗</span>
                      </a>
                    </article>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      )}

      <p className={styles.disclaimer}>
        Broadcaster availability can depend on territory, subscription and account conditions. WatchTVSport links only to official services.
      </p>
    </section>
  );
}
