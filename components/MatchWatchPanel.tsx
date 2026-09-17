"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { broadcasterInitials, getBroadcasterLogo } from "@/lib/broadcaster-logos";
import type { BroadcastInfo } from "@/lib/matches";

type Props = {
  broadcasts: BroadcastInfo[];
  emptyTitle: string;
  emptyCopy: string;
  showMethodologyLink?: boolean;
  verificationText?: string | null;
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
  if (languages.length) return languages.map(languageLabel).join(" · ");
  const type = broadcast.broadcastType?.trim();
  return type && type.toLowerCase() !== "live" ? type : "Language pending";
}

export default function MatchWatchPanel({
  broadcasts,
  emptyTitle,
  emptyCopy,
  showMethodologyLink = false,
  verificationText,
}: Props) {
  const [accessFilter, setAccessFilter] = useState<"All" | "Free" | "Paid">("All");
  const [languageFilter, setLanguageFilter] = useState("all");

  const countryCount = new Set(broadcasts.map((broadcast) => broadcast.countryCode)).size;
  const broadcasterLabel = `${broadcasts.length} broadcaster${broadcasts.length === 1 ? "" : "s"}`;
  const countryLabel = `${countryCount} countr${countryCount === 1 ? "y" : "ies"}`;
  const summaryLabel = broadcasts.length ? `${broadcasterLabel} · ${countryLabel}` : "Pending";

  const availableLanguages = useMemo(() => {
    return Array.from(new Set(broadcasts.flatMap(broadcastLanguages))).sort((a, b) => languageLabel(a).localeCompare(languageLabel(b)));
  }, [broadcasts]);

  const filteredBroadcasts = useMemo(() => {
    return [...broadcasts]
      .filter((broadcast) => accessFilter === "All" || broadcast.access === accessFilter)
      .filter((broadcast) => languageFilter === "all" || broadcastLanguages(broadcast).includes(languageFilter))
      .sort((a, b) => {
        const countryOrder = a.countryName.localeCompare(b.countryName);
        return countryOrder || a.broadcaster.localeCompare(b.broadcaster);
      });
  }, [broadcasts, accessFilter, languageFilter]);

  return (
    <details className="v2-match-watch">
      <summary>
        <span className="v2-match-watch-copy">
          <strong>TV guide</strong>
          <small>{summaryLabel}</small>
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
          <>
            {(availableLanguages.length > 0 || broadcasts.some((broadcast) => broadcast.access === "Free") || broadcasts.some((broadcast) => broadcast.access === "Paid")) ? (
              <div className="v2-match-broadcast-filters" aria-label="Broadcaster filters">
                <div className="v2-match-access-filter" role="group" aria-label="Access type">
                  {(["All", "Free", "Paid"] as const).map((value) => (
                    <button
                      type="button"
                      key={value}
                      className={accessFilter === value ? "is-active" : ""}
                      onClick={() => setAccessFilter(value)}
                    >
                      {value}
                    </button>
                  ))}
                </div>
                {availableLanguages.length > 0 ? (
                  <select aria-label="Commentary language" value={languageFilter} onChange={(event) => setLanguageFilter(event.target.value)}>
                    <option value="all">All languages</option>
                    {availableLanguages.map((language) => <option key={language} value={language}>{languageLabel(language)}</option>)}
                  </select>
                ) : null}
              </div>
            ) : null}

            <div className="v2-match-broadcaster-list">
              {filteredBroadcasts.map((broadcast, index) => {
                const meta = compactBroadcastMeta(broadcast);
                const logo = getBroadcasterLogo(broadcast.broadcaster);
                const logoClassName = [
                  "v2-match-broadcaster-logo",
                  logo?.compact ? "is-wide" : "",
                  logo?.darkStyle === "invert" ? "is-inverted" : "",
                  logo?.darkStyle === "knockout" ? "is-knockout" : "",
                  logo ? "" : "is-fallback",
                ].filter(Boolean).join(" ");

                return (
                  <a
                    className="v2-match-broadcaster-row"
                    key={`${broadcast.countryCode}-${broadcast.broadcaster}-${broadcast.access}-${index}`}
                    href={broadcast.affiliateUrl || broadcast.url}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <span className="v2-match-broadcaster-country">{broadcast.countryName}</span>
                    <span className="v2-match-broadcaster-service">
                      <span className={logoClassName} aria-hidden="true">
                        {logo ? <img src={logo.src} alt="" /> : <span>{broadcasterInitials(broadcast.broadcaster)}</span>}
                      </span>
                      <strong>{broadcast.broadcaster}</strong>
                      <small className={meta === "Language pending" ? "is-pending" : ""}>{meta}</small>
                    </span>
                    <span className={broadcast.access === "Free" ? "v2-chip is-free" : "v2-chip is-paid"}>{broadcast.access}</span>
                    <span className="v2-match-broadcaster-arrow" aria-hidden="true">›</span>
                  </a>
                );
              })}
            </div>
            {filteredBroadcasts.length === 0 ? <p className="v2-match-filter-empty">No broadcaster matches these filters.</p> : null}
          </>
        )}
        {verificationText ? <p className="v2-verification-note">✓ {verificationText}</p> : null}
      </div>
    </details>
  );
}
