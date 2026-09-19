"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { BroadcastInfo } from "@/lib/matches";
import { broadcasterInitials, getBroadcasterLogo } from "@/lib/broadcaster-logos";

type CompetitionRight = {
  countryCode: string;
  countryName: string;
  broadcaster: string;
  rightsHolder: string;
  access: "Free" | "Paid" | "Unknown";
  coverageType: "full" | "partial" | "unknown";
  officialUrl?: string;
  sourceName?: string;
  sourceUrl?: string;
  lastChecked?: string;
};

type Props = {
  broadcasts: BroadcastInfo[];
  competitionRights?: CompetitionRight[];
  emptyTitle: string;
  emptyCopy: string;
  showMethodologyLink?: boolean;
  verificationText?: string | null;
  defaultOpen?: boolean;
};

const LANGUAGE_LABELS: Record<string, string> = {
  en: "English",
  fr: "Français",
  es: "Español",
  de: "Deutsch",
  it: "Italiano",
  pt: "Português",
  ar: "العربية",
};

function languageLabel(value: string) {
  const normalized = value.trim().toLowerCase();
  return LANGUAGE_LABELS[normalized] ?? value.toUpperCase();
}

function broadcastLanguages(broadcast: BroadcastInfo) {
  return (broadcast.commentaryLanguages ?? []).map((language) => language.trim().toLowerCase()).filter(Boolean);
}

function compactBroadcastMeta(broadcast: BroadcastInfo) {
  const languages = broadcastLanguages(broadcast);
  return languages.length ? languages.map(languageLabel).join(" · ") : "Language pending";
}

function BroadcasterLogo({ name }: { name: string }) {
  const logo = getBroadcasterLogo(name);
  return (
    <span
      className={`v2-match-broadcaster-logo${logo?.compact ? " is-wide" : ""}`}
      role="img"
      aria-label={logo ? name : `${name} initials`}
    >
      {logo ? <img src={logo.src} alt="" aria-hidden="true" loading="lazy" /> : <span aria-hidden="true">{broadcasterInitials(name)}</span>}
    </span>
  );
}

function normalizedKey(countryCode: string, broadcaster: string) {
  return `${countryCode.toLowerCase()}|${broadcaster.trim().toLowerCase()}`;
}

function coverageLabel(value: CompetitionRight["coverageType"]) {
  if (value === "full") return "Full competition coverage";
  if (value === "partial") return "Partial competition rights";
  return "Official competition partner";
}

export default function MatchWatchPanel({
  broadcasts,
  competitionRights = [],
  emptyTitle,
  emptyCopy,
  showMethodologyLink = false,
  verificationText,
}: Props) {
  const [accessFilter, setAccessFilter] = useState<"All" | "Free" | "Paid">("All");
  const [languageFilter, setLanguageFilter] = useState("all");
  const countryCount = new Set(broadcasts.map((broadcast) => broadcast.countryCode)).size;
  const summaryLabel = broadcasts.length
    ? `${broadcasts.length} broadcaster${broadcasts.length === 1 ? "" : "s"} · ${countryCount} countr${countryCount === 1 ? "y" : "ies"}`
    : "Pending";

  const availableLanguages = useMemo(() => {
    return Array.from(new Set(broadcasts.flatMap(broadcastLanguages))).sort((a, b) => languageLabel(a).localeCompare(languageLabel(b)));
  }, [broadcasts]);

  const filteredBroadcasts = useMemo(() => {
    return [...broadcasts]
      .filter((broadcast) => accessFilter === "All" || broadcast.access === accessFilter)
      .filter((broadcast) => languageFilter === "all" || broadcastLanguages(broadcast).includes(languageFilter))
      .sort((a, b) => a.countryName.localeCompare(b.countryName) || a.broadcaster.localeCompare(b.broadcaster));
  }, [broadcasts, accessFilter, languageFilter]);

  const freeBroadcasts = filteredBroadcasts.filter((broadcast) => broadcast.access === "Free");
  const paidBroadcasts = filteredBroadcasts.filter((broadcast) => broadcast.access === "Paid");
  const hasPaidAffiliateLinks = paidBroadcasts.some((broadcast) => Boolean(broadcast.affiliateUrl));

  const confirmedKeys = useMemo(
    () => new Set(broadcasts.map((broadcast) => normalizedKey(broadcast.countryCode, broadcast.broadcaster))),
    [broadcasts]
  );

  const supplementalRights = useMemo(
    () => competitionRights
      .filter((right) => !confirmedKeys.has(normalizedKey(right.countryCode, right.broadcaster)))
      .sort((a, b) => a.countryName.localeCompare(b.countryName) || a.broadcaster.localeCompare(b.broadcaster)),
    [competitionRights, confirmedKeys]
  );

  function broadcasterRows(items: BroadcastInfo[]) {
    return items.map((broadcast, index) => {
      const meta = compactBroadcastMeta(broadcast);
      const hasLogo = Boolean(getBroadcasterLogo(broadcast.broadcaster));

      return (
        <a
          className="v2-match-broadcaster-row"
          key={`${broadcast.countryCode}-${broadcast.broadcaster}-${broadcast.access}-${index}`}
          href={broadcast.affiliateUrl || broadcast.url}
          target="_blank"
          rel={broadcast.affiliateUrl ? "noopener noreferrer sponsored" : "noopener noreferrer"}
        >
          <span className="v2-match-broadcaster-country">{broadcast.countryName}</span>
          <span className="v2-match-broadcaster-service">
            <BroadcasterLogo name={broadcast.broadcaster} />
            {!hasLogo ? <strong>{broadcast.broadcaster}</strong> : null}
            <small className={meta === "Language pending" ? "is-pending" : ""}>{meta}</small>
          </span>
          <span className={broadcast.access === "Free" ? "v2-chip is-free" : "v2-chip is-paid"}>{broadcast.access}</span>
          <span className="v2-match-broadcaster-action">Official site <span aria-hidden="true">↗</span></span>
        </a>
      );
    });
  }

  return (
    <>
      <section className="v2-match-watch" aria-labelledby="confirmed-broadcasters-title">
        <header className="v2-match-watch-heading">
          <span className="v2-match-watch-copy">
            <strong id="confirmed-broadcasters-title">Confirmed for this match</strong>
            <small>{summaryLabel}</small>
          </span>
        </header>

        <div className="v2-match-watch-body">
          {broadcasts.length === 0 ? (
            <div className="v2-match-watch-empty">
              <strong>{emptyTitle}</strong>
              <p>{emptyCopy}</p>
              {showMethodologyLink ? <Link href="/methodology">How listings are verified →</Link> : null}
            </div>
          ) : (
            <>
              <div className="v2-match-broadcast-filters" aria-label="Broadcaster filters">
                <div className="v2-match-access-filter" role="group" aria-label="Access type">
                  {(["All", "Free", "Paid"] as const).map((value) => (
                    <button type="button" key={value} className={accessFilter === value ? "is-active" : ""} onClick={() => setAccessFilter(value)}>{value}</button>
                  ))}
                </div>
                {availableLanguages.length > 0 ? (
                  <select aria-label="Commentary language" value={languageFilter} onChange={(event) => setLanguageFilter(event.target.value)}>
                    <option value="all">All languages</option>
                    {availableLanguages.map((language) => <option key={language} value={language}>{languageLabel(language)}</option>)}
                  </select>
                ) : null}
              </div>

              {freeBroadcasts.length ? (
                <section className="v2-match-broadcaster-group" aria-labelledby="free-broadcasters-title">
                  <h3 id="free-broadcasters-title">Free broadcasters</h3>
                  <div className="v2-match-broadcaster-list">{broadcasterRows(freeBroadcasts)}</div>
                  <aside className="v2-match-access-notice is-free">
                    <strong>About free broadcasts</strong>
                    <span>Free broadcasts may only be available in the broadcaster&apos;s territory. You may need to create a free account or sign in.</span>
                  </aside>
                </section>
              ) : null}

              {paidBroadcasts.length ? (
                <section className="v2-match-broadcaster-group" aria-labelledby="paid-broadcasters-title">
                  <h3 id="paid-broadcasters-title">Paid broadcasters</h3>
                  <div className="v2-match-broadcaster-list">{broadcasterRows(paidBroadcasts)}</div>
                  <aside className="v2-match-access-notice is-paid">
                    <strong>About paid broadcasts</strong>
                    <span>A subscription or payment is required. Availability may depend on your location and subscription.</span>
                  </aside>
                  {hasPaidAffiliateLinks ? (
                    <p className="v2-match-affiliate-note">
                      Some links to paid services are affiliate links. If you subscribe through one, WatchTVSport may earn a commission at no extra cost to you. This helps support the site.
                    </p>
                  ) : null}
                </section>
              ) : null}

              {filteredBroadcasts.length === 0 ? <p className="v2-match-filter-empty">No broadcaster matches these filters.</p> : null}
            </>
          )}
          {verificationText ? <p className="v2-verification-note">{verificationText}</p> : null}
        </div>
      </section>

      {supplementalRights.length ? (
        <section className="v2-match-competition-rights" aria-labelledby="competition-broadcasters-title">
          <header>
            <div>
              <strong id="competition-broadcasters-title">Official competition broadcasters</strong>
              <p>These services hold verified rights for the competition in their territory. This does not confirm that this specific match is carried by the service.</p>
            </div>
            <span>{supplementalRights.length} rights</span>
          </header>
          <div className="v2-match-rights-list">
            {supplementalRights.map((right, index) => {
              const hasLogo = Boolean(getBroadcasterLogo(right.broadcaster));
              const row = (
                <>
                  <span className="v2-match-broadcaster-country">{right.countryName}</span>
                  <span className="v2-match-broadcaster-service">
                    <BroadcasterLogo name={right.broadcaster} />
                    {!hasLogo ? <strong>{right.broadcaster}</strong> : null}
                    <small>{coverageLabel(right.coverageType)}</small>
                  </span>
                  <span className={right.access === "Free" ? "v2-chip is-free" : right.access === "Paid" ? "v2-chip is-paid" : "v2-chip"}>
                    {right.access}
                  </span>
                  <span className="v2-match-broadcaster-action">{right.officialUrl ? <>Official site <span aria-hidden="true">↗</span></> : "Rights info"}</span>
                </>
              );

              return right.officialUrl ? (
                <a
                  className="v2-match-broadcaster-row"
                  key={`${right.countryCode}-${right.broadcaster}-${index}`}
                  href={right.officialUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {row}
                </a>
              ) : (
                <div className="v2-match-broadcaster-row is-rights-only" key={`${right.countryCode}-${right.broadcaster}-${index}`}>
                  {row}
                </div>
              );
            })}
          </div>
          <p className="v2-match-rights-note">Match-specific confirmations always take priority over competition-level rights.</p>
        </section>
      ) : null}
    </>
  );
}
