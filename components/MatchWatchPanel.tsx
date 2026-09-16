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
  const countryCount = new Set(broadcasts.map((broadcast) => broadcast.countryCode)).size;
  const sortedBroadcasts = [...broadcasts].sort((a, b) => {
    const countryOrder = a.countryName.localeCompare(b.countryName);
    return countryOrder || a.broadcaster.localeCompare(b.broadcaster);
  });

  const broadcasterLabel = `${broadcasts.length} broadcaster${broadcasts.length === 1 ? "" : "s"}`;
  const countryLabel = `${countryCount} countr${countryCount === 1 ? "y" : "ies"}`;

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
          <div className="v2-match-broadcaster-list">
            {sortedBroadcasts.map((broadcast, index) => (
              <a
                className="v2-match-broadcaster-row"
                key={`${broadcast.countryCode}-${broadcast.broadcaster}-${broadcast.access}-${index}`}
                href={broadcast.affiliateUrl || broadcast.url}
                target="_blank"
                rel="noopener noreferrer"
              >
                <span className="v2-match-broadcaster-country">{broadcast.countryName}</span>
                <span className="v2-match-broadcaster-service">
                  <strong>{broadcast.broadcaster}</strong>
                  <small>
                    {broadcast.broadcastType ?? "live"}
                    {broadcast.commentaryLanguages?.length ? ` · ${broadcast.commentaryLanguages.join(", ")}` : ""}
                  </small>
                </span>
                <span className={broadcast.access === "Free" ? "v2-chip is-free" : "v2-chip is-paid"}>{broadcast.access}</span>
                <span className="v2-match-broadcaster-arrow" aria-hidden="true">›</span>
              </a>
            ))}
          </div>
        )}
        {verificationText ? <p className="v2-verification-note">✓ {verificationText}</p> : null}
      </div>
    </details>
  );
}
