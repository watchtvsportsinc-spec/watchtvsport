import type { EventData } from "@/lib/events";
import type { BroadcastInfo } from "@/lib/matches";
import styles from "./MatchBroadcastOffers.module.css";
import { broadcasterInitials, getBroadcasterLogo } from "@/lib/broadcaster-logos";

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

function BroadcasterLogo({ name }: { name: string }) {
  const logo = getBroadcasterLogo(name);
  return (
    <span className={styles.logo} role="img" aria-label={logo ? name : `${name} initials`}>
      {logo ? (
        <img
          src={logo.src}
          alt=""
          aria-hidden="true"
          loading="lazy"
          style={{ width: "100%", height: "100%", objectFit: "contain", display: "block" }}
        />
      ) : (
        <span aria-hidden="true">{broadcasterInitials(name)}</span>
      )}
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

function compactCoverageLabel(broadcast: BroadcastInfo): string {
  switch (broadcast.broadcastType) {
    case "delayed":
      return "Delayed";
    case "replay":
      return "Replay";
    case "highlights":
      return "Highlights";
    default:
      return "Live";
  }
}

function compactLanguages(languages?: string[]): string {
  if (!languages?.length) return "";
  const codes: Record<string, string> = {
    English: "EN",
    French: "FR",
    Spanish: "ES",
    Portuguese: "PT",
    Arabic: "AR",
    German: "DE",
    Italian: "IT",
  };
  return languages.map((language) => codes[language] ?? language.slice(0, 2).toUpperCase()).join("/");
}

function latestVerification(offers: BroadcastInfo[]): string | null {
  const valid = offers
    .map((offer) => offer.lastChecked)
    .filter((value): value is string => Boolean(value))
    .map((value) => ({ value, time: new Date(value).getTime() }))
    .filter((item) => !Number.isNaN(item.time))
    .sort((a, b) => b.time - a.time);
  return valid[0]?.value ?? null;
}

function formatVerificationDate(value: string): string {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(value));
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
  const hasAffiliateLinks = visibleOffers.some((broadcast) => broadcast.access === "Paid" && Boolean(broadcast.affiliateUrl));
  const verifiedAt = latestVerification(allOffers);

  return (
    <section id="where-to-watch" className={styles.section} aria-labelledby="match-broadcast-options-title">
      <div className={styles.heading}>
        <div>
          <p className={styles.eyebrow}>Official TV & streaming</p>
          <h2 id="match-broadcast-options-title">Where to watch</h2>
          <p className={styles.intro}>
            Confirmed official services for {event.title}, grouped by country.
          </p>
        </div>
        <span className={styles.countryCount}>{countries.length} {countries.length === 1 ? "country" : "countries"}</span>
      </div>

      <form method="get" className={styles.filters}>
        {returnTo ? <input type="hidden" name="returnTo" value={returnTo} /> : null}
        <label htmlFor="country-broadcast-filter">
          <span>Country</span>
          <select id="country-broadcast-filter" name="country" defaultValue={country}>
            <option value="">All countries</option>
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
                  const language = compactLanguages(broadcast.commentaryLanguages);
                  const hasLogo = Boolean(getBroadcasterLogo(broadcast.broadcaster));
                  return (
                    <article className={styles.offer} key={key}>
                      <BroadcasterLogo name={broadcast.broadcaster} />
                      <div className={styles.offerMain}>
                        {!hasLogo ? <h4>{broadcast.broadcaster}</h4> : null}
                        <p className={styles.coverageFull}>{coverageLabel(broadcast)}</p>
                        {broadcast.commentaryLanguages?.length ? (
                          <p className={styles.detail}>Commentary: {broadcast.commentaryLanguages.join(", ")}</p>
                        ) : null}
                        {broadcast.accessConditions ? <p className={styles.detail}>{broadcast.accessConditions}</p> : null}
                      </div>
                      <div className={styles.offerMeta}>
                        <span className={`${styles.accessBadge} ${broadcast.access === "Free" ? styles.free : styles.paid}`}>
                          {broadcast.access}
                        </span>
                        <span className={styles.compactMeta}>
                          {compactCoverageLabel(broadcast)}{language ? ` · ${language}` : ""}
                        </span>
                      </div>
                      <a
                        className={styles.officialLink}
                        href={href}
                        rel={broadcast.affiliateUrl ? "noopener noreferrer sponsored" : "noopener noreferrer"}
                        target="_blank"
                        aria-label={`Open ${broadcast.broadcaster} official service`}
                      >
                        <span className={styles.linkText}>Official service</span>
                        <span className={styles.linkArrow} aria-hidden="true">↗</span>
                      </a>
                    </article>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      )}

      {verifiedAt ? (
        <p className={styles.verification}>✓ Broadcast data verified {formatVerificationDate(verifiedAt)}</p>
      ) : null}
      <p className={styles.disclaimer}>
        Availability can depend on territory, subscription and account conditions. WatchTVSport links only to official services.
        {hasAffiliateLinks ? " Some links to paid services are affiliate links. If you subscribe through one, WatchTVSport may earn a commission at no extra cost to you; this helps support the site." : ""}
      </p>
    </section>
  );
}
