"use client";

import Link from "next/link";
import { Fragment, useEffect, useMemo, useState } from "react";
import FavoriteButton from "@/components/FavoriteButton";

export type UfcHubCard = {
  id: string;
  slug: string;
  name: string;
  mainDate: string;
  country?: string;
  venue?: string;
  sessionCount: number;
  sessionLabels: string[];
  confirmedListings: number;
  freeCountries: number;
  paidCountries: number;
  live: boolean;
};

function dateKey(value: string, timeZone: string): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date(value));
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return values.year + "-" + values.month + "-" + values.day;
}

function dateKeyAsUtcDate(value: string): Date {
  return new Date(value + "T12:00:00Z");
}

function formatHeading(value: string): string {
  return new Intl.DateTimeFormat("en", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(dateKeyAsUtcDate(value));
}

function formatTime(value: string, timeZone: string): string {
  return new Intl.DateTimeFormat("en", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(value));
}

function formatShortDate(value: string, timeZone: string): string {
  return new Intl.DateTimeFormat("en", {
    timeZone,
    month: "short",
    day: "numeric",
  }).format(new Date(value));
}

function sessionSummary(card: UfcHubCard): string {
  if (card.sessionLabels.length > 0) return card.sessionLabels.join(" · ");
  return card.sessionCount + " card session" + (card.sessionCount === 1 ? "" : "s");
}

export default function UfcEventGrid({
  items,
}: {
  items: UfcHubCard[];
}) {
  const [timeZone, setTimeZone] = useState("UTC");

  useEffect(() => {
    try {
      setTimeZone(Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC");
    } catch {
      setTimeZone("UTC");
    }
  }, []);

  const ordered = useMemo(
    () =>
      [...items].sort(
        (a, b) =>
          Number(b.live) - Number(a.live) ||
          Date.parse(a.mainDate) - Date.parse(b.mainDate),
      ),
    [items],
  );

  return (
    <div className="wts-discovery-list">
      {ordered.map((card, index) => {
        const itemDate = dateKey(card.mainDate, timeZone);
        const previousDate =
          index > 0 ? dateKey(ordered[index - 1].mainDate, timeZone) : "";
        const accessOptions = [
          card.freeCountries > 0 ? "Free" : null,
          card.paidCountries > 0 ? "Paid" : null,
        ].filter(Boolean) as Array<"Free" | "Paid">;

        return (
          <Fragment key={card.id}>
            {itemDate !== previousDate ? (
              <h3 className="wts-discovery-date-heading">
                {formatHeading(itemDate)}
              </h3>
            ) : null}

            <article className="wts-ufc-event-row">
              <Link
                className="wts-discovery-card is-group has-favorite-action"
                href={"/ufc/event/" + card.slug}
              >
                <div className="wts-discovery-card-time">
                  <span
                    className={
                      card.live
                        ? "wts-result-status is-live"
                        : "wts-result-status is-upcoming"
                    }
                  >
                    {card.live ? "Live" : "Fight event"}
                  </span>
                  <strong>
                    {card.live ? "LIVE" : formatTime(card.mainDate, timeZone)}
                  </strong>
                  <small>{formatShortDate(card.mainDate, timeZone)}</small>
                </div>

                <div className="wts-discovery-card-main">
                  <p>
                    🥊 UFC{card.country ? " · " + card.country : ""}
                  </p>
                  <h3>{card.name}</h3>
                  <span>
                    {sessionSummary(card)}
                    {card.venue ? " · " + card.venue : ""}
                    {card.confirmedListings > 0
                      ? " · " +
                        card.confirmedListings +
                        " confirmed TV option" +
                        (card.confirmedListings === 1 ? "" : "s")
                      : ""}
                  </span>
                </div>

                <span className="wts-result-access-stack">
                  {accessOptions.length > 0 ? (
                    accessOptions.map((access) => (
                      <span
                        className={
                          "wts-result-access " +
                          (access === "Free" ? "is-free" : "is-paid")
                        }
                        key={access}
                      >
                        {access}
                      </span>
                    ))
                  ) : (
                    <span className="wts-result-access is-tbc">TV TBC</span>
                  )}
                </span>

                <span className="wts-discovery-card-favorite-space" aria-hidden="true" />

                <div className="wts-discovery-card-open">
                  <span>View event</span>
                  <b aria-hidden="true">›</b>
                </div>
              </Link>

              <div className="wts-discovery-card-favorite">
                <FavoriteButton
                  compact
                  favorite={{
                    kind: "group",
                    entityId: card.id,
                    label: card.name,
                    href: "/ufc/event/" + card.slug,
                  }}
                />
              </div>
            </article>
          </Fragment>
        );
      })}
    </div>
  );
}
