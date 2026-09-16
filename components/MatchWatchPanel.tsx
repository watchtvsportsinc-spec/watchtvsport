import Link from "next/link";
import type { BroadcastInfo } from "@/lib/matches";

type Props = {
  broadcasts: BroadcastInfo[];
  emptyTitle: string;
  emptyCopy: string;
  showMethodologyLink?: boolean;
  verificationText?: string | null;
};

export default function MatchWatchPanel({
  broadcasts,
  emptyTitle,
  emptyCopy,
  showMethodologyLink = false,
  verificationText,
}: Props) {
  const countries = new Map<string, BroadcastInfo[]>();
  for (const broadcast of broadcasts) {
    countries.set(broadcast.countryCode, [...(countries.get(broadcast.countryCode) ?? []), broadcast]);
  }

  const broadcasterLabel = `${broadcasts.length} broadcaster${broadcasts.length === 1 ? "" : "s"}`;
  const countryLabel = `${countries.size} countr${countries.size === 1 ? "y" : "ies"}`;

  return (
    <details className="v2-match-watch">
      <summary>
        <span className="v2-match-watch-icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" focusable="false">
            <rect x="3" y="5" width="18" height="13" rx="2" />
            <path d="M8 21h8M12 18v3" />
          </svg>
        </span>
        <span className="v2-match-watch-copy">
          <strong>Where to watch</strong>
          <small>{broadcasts.length ? `${broadcasterLabel} · ${countryLabel}` : "Official listings will appear here"}</small>
        </span>
        <span className="v2-match-watch-chevron" aria-hidden="true">›</span>
      </summary>

      <div className="v2-match-watch-body">
        {broadcasts.length === 0 ? (
          <div className="v2-match-watch-empty">
            <strong>{emptyTitle}</strong>
            <p>{emptyCopy}</p>
            {showMethodologyLink ? <Link href="/methodology">How listings are verified →</Link> : null}
          </div>
        ) : (
          <div className="v2-broadcaster-country-list">
            {Array.from(countries.entries()).sort(([a], [b]) => a.localeCompare(b)).map(([code, list]) => (
              <section key={code}>
                <h3>{list[0].countryName}</h3>
                <div>
                  {list.map((broadcast) => (
                    <a
                      key={`${code}-${broadcast.broadcaster}-${broadcast.access}`}
                      href={broadcast.affiliateUrl || broadcast.url}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <span className={broadcast.access === "Free" ? "v2-chip is-free" : "v2-chip is-paid"}>{broadcast.access}</span>
                      <strong>{broadcast.broadcaster}</strong>
                      <small>{broadcast.broadcastType ?? "live"}{broadcast.commentaryLanguages?.length ? ` · ${broadcast.commentaryLanguages.join(", ")}` : ""}</small>
                      <b>Official service →</b>
                    </a>
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
        {verificationText ? <p className="v2-verification-note">✓ {verificationText}</p> : null}
      </div>
    </details>
  );
}
