import type { CSSProperties } from "react";
import Link from "next/link";
import Breadcrumbs from "@/components/Breadcrumbs";
import BroadcastOffers from "@/components/BroadcastOffers";
import FavoriteButton from "@/components/FavoriteButton";
import LocalTime from "@/components/LocalTime";
import type { EventData } from "@/lib/events";
import { getPublicCompetitionBroadcastRights } from "@/lib/public-broadcast-rights";
import { getPublicEventsSnapshot } from "@/lib/public-events";
import { getPublicUfcCard } from "@/lib/public-ufc-card";
import { UFC_HERO_BACKDROP, UFC_HERO_POSITION } from "@/lib/ufc-branding";
import styles from "./competition-page.module.css";

type Props = {
  event: EventData;
  selectedCountry?: string;
  selectedAccess?: string;
};

function countryFlag(code?: string): string {
  if (!code || !/^[A-Za-z]{2}$/.test(code)) return "•";
  return String.fromCodePoint(
    ...code
      .toUpperCase()
      .split("")
      .map((letter) => 127397 + letter.charCodeAt(0))
  );
}

function sessionLabel(event: EventData): string {
  if (event.sessionType === "early_prelims") return "Early Prelims";
  if (event.sessionType === "prelims") return "Prelims";
  if (event.sessionType === "main_card") return "Main Card";
  return event.stage ?? "Fight session";
}

function normalizeSegment(value: string): string {
  return value.trim().toLowerCase().replace(/[-\s]+/g, "_");
}

function formatBoutSegment(value: string): string {
  return value
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export default async function UfcSessionEventPage({
  event,
  selectedCountry,
  selectedAccess,
}: Props) {
  const groupSlug = event.eventGroupSlug!;
  const [snapshot, bouts, competitionRights] = await Promise.all([
    getPublicEventsSnapshot({ sport: "ufc", limit: 500 }),
    getPublicUfcCard(groupSlug),
    getPublicCompetitionBroadcastRights({
      sport: "ufc",
      competition: event.competitionSlug,
      eventDate: event.eventDate,
    }),
  ]);

  const sessions = snapshot.events
    .filter(
      (item) =>
        item.sport === "ufc" &&
        item.eventGroupSlug === groupSlug &&
        item.sessionType
    )
    .sort(
      (a, b) =>
        (a.sequenceNumber ?? 999) - (b.sequenceNumber ?? 999) ||
        Date.parse(a.eventDate) - Date.parse(b.eventDate)
    );

  const current = sessions.find((item) => item.id === event.id) ?? event;
  const label = sessionLabel(current);
  const groupName = current.eventGroupName ?? current.competition;
  const currentSegment = current.sessionType
    ? normalizeSegment(current.sessionType)
    : "";

  const sessionBouts = bouts
    .filter((bout) => normalizeSegment(bout.segment) === currentSegment)
    .sort((a, b) => a.order - b.order);

  const confirmed = current.broadcasts.filter(
    (broadcast) => broadcast.coverageStatus === "confirmed"
  );
  const confirmedCountries = new Set(
    confirmed.map((broadcast) => broadcast.countryCode)
  ).size;
  const freeCountries = new Set(
    confirmed
      .filter((broadcast) => broadcast.access === "Free")
      .map((broadcast) => broadcast.countryCode)
  ).size;

  const favorite = {
    kind: "event" as const,
    entityId: current.id,
    label: current.title,
    href: current.detailPath,
    event: {
      detailPath: current.detailPath,
      eventDate: current.eventDate,
      sport: current.sport,
      competition: current.competition,
      participantNames: [] as string[],
    },
  };

  const canonicalGroupPath = "/ufc/event/" + groupSlug;
  const pageTitle = groupName + " – " + label;
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "SportsEvent",
    name: pageTitle,
    startDate: current.eventDate,
    sport: "UFC",
    url: "https://watchtvsport.com" + current.detailPath,
    ...(current.venue || current.country
      ? {
          location: {
            "@type": "Place",
            name: current.venue ?? current.country,
            ...(current.country
              ? {
                  address: {
                    "@type": "PostalAddress",
                    addressCountry: current.country,
                  },
                }
              : {}),
          },
        }
      : {}),
  };

  return (
    <main id="main-content" className={styles.page}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <Breadcrumbs
        items={[
          { label: "Home", href: "/" },
          { label: "UFC", href: "/ufc" },
          { label: groupName, href: canonicalGroupPath },
          { label },
        ]}
      />

      <section
        className={styles.hero}
        style={
          {
            backgroundImage:
              "linear-gradient(90deg,rgba(3,10,18,.97) 0%,rgba(3,12,22,.76) 50%,rgba(3,12,22,.38) 100%),url('" +
              UFC_HERO_BACKDROP +
              "')",
            backgroundPosition: UFC_HERO_POSITION,
          } as CSSProperties
        }
      >
        <div className="wts-ufc-session-hero-top">
          <div>
            <p className={styles.eyebrow}>UFC · {groupName}</p>
            <h1>{pageTitle}</h1>
          </div>
          <FavoriteButton favorite={favorite} />
        </div>

        <p className="wts-ufc-session-hero-copy">
          Fight card, local start time and confirmed official broadcasters for
          this part of the event.
        </p>

        <div className="wts-ufc-session-meta">
          <span className="wts-ufc-session-status">
            {current.status === "live"
              ? "LIVE"
              : current.status === "finished"
                ? "FINISHED"
                : "UPCOMING"}
          </span>
          <LocalTime date={current.eventDate} showYear showTimeZone />
          {current.venue ? (
            <span>
              {current.venue}
              {current.country ? " · " + current.country : ""}
            </span>
          ) : current.country ? (
            <span>{current.country}</span>
          ) : null}
        </div>

        <nav
          className="wts-ufc-session-switcher"
          aria-label={groupName + " sessions"}
        >
          {sessions.map((session) => {
            const active = session.id === current.id;
            return (
              <Link
                href={session.detailPath}
                key={session.id}
                className={active ? "is-active" : undefined}
                aria-current={active ? "page" : undefined}
              >
                {sessionLabel(session)}
              </Link>
            );
          })}
          <Link href={canonicalGroupPath}>Full event</Link>
        </nav>
      </section>

      <section className={styles.stats} aria-label={label + " overview"}>
        <div>
          <strong>{sessionBouts.length}</strong>
          <span>Fights</span>
        </div>
        <div>
          <strong>
            <LocalTime date={current.eventDate} display="time" />
          </strong>
          <span>Local start</span>
        </div>
        <div>
          <strong>{confirmedCountries}</strong>
          <span>TV countries</span>
        </div>
        <div>
          <strong>{freeCountries}</strong>
          <span>Free countries</span>
        </div>
      </section>

      <section id="fight-card" className={styles.section}>
        <div className={styles.sectionHeading}>
          <div>
            <p>Verified fight card</p>
            <h2>{label} fights</h2>
          </div>
          <span>
            {sessionBouts.length} confirmed fight
            {sessionBouts.length === 1 ? "" : "s"}
          </span>
        </div>

        {sessionBouts.length > 0 ? (
          <div className="wts-ufc-bout-list">
            {sessionBouts.map((bout) => (
              <article className="wts-ufc-bout-row" key={bout.id}>
                <div className="wts-ufc-bout-meta">
                  <span className={bout.titleBout ? "is-title" : undefined}>
                    {bout.titleBout
                      ? "Title bout"
                      : formatBoutSegment(bout.segment)}
                  </span>
                  <strong>{bout.weightClass ?? "Confirmed bout"}</strong>
                </div>

                <div className="wts-ufc-fighter is-left">
                  <span className="wts-ufc-fighter-flag" aria-hidden="true">
                    {countryFlag(bout.fighter1.countryCode)}
                  </span>
                  <div>
                    <strong>{bout.fighter1.name}</strong>
                    <small>{bout.fighter1.countryCode ?? "Fighter"}</small>
                  </div>
                </div>

                <div className="wts-ufc-vs" aria-hidden="true">
                  VS
                </div>

                <div className="wts-ufc-fighter is-right">
                  <div>
                    <strong>{bout.fighter2.name}</strong>
                    <small>{bout.fighter2.countryCode ?? "Fighter"}</small>
                  </div>
                  <span className="wts-ufc-fighter-flag" aria-hidden="true">
                    {countryFlag(bout.fighter2.countryCode)}
                  </span>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className={styles.empty}>
            <strong>Fight card pending</strong>
            <span>
              Confirmed bouts for this session will appear here as soon as they
              are available.
            </span>
          </div>
        )}
      </section>

      <BroadcastOffers
        events={[current]}
        selectedCountry={selectedCountry}
        selectedAccess={selectedAccess}
        competitionRights={competitionRights}
        showFilters={false}
        rightsEyebrow="Official UFC broadcasters"
        rightsTitle="Event coverage not yet confirmed"
        rightsDescription="These services hold verified UFC rights in their territory, but this specific session has not yet been confirmed."
        title={"Where to watch " + label}
      />

      <section id="about" className={styles.section}>
        <div className={styles.sectionHeading}>
          <div>
            <p>Session information</p>
            <h2>About {label}</h2>
          </div>
        </div>

        <div className={styles.about}>
          <p>
            This page covers the {label} portion of {groupName}. WatchTVSport
            keeps each UFC session separate so start times, fight cards and
            official broadcaster confirmations can be shown for the exact part
            of the event you want to watch.
          </p>

          <div className={styles.facts}>
            <span>Event: {groupName}</span>
            <span>Session: {label}</span>
            <span>{sessionBouts.length} confirmed fights</span>
            <span>{confirmed.length} confirmed TV listings</span>
            {current.venue ? <span>Venue: {current.venue}</span> : null}
            {current.country ? <span>Country: {current.country}</span> : null}
          </div>

          <Link className={styles.sourceLink} href={canonicalGroupPath}>
            View full {groupName} event →
          </Link>
        </div>
      </section>
    </main>
  );
}
