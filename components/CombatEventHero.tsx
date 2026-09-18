import FavoriteButton from "@/components/FavoriteButton";
import LocalTime from "@/components/LocalTime";
import type { FavoriteCandidate } from "@/lib/favorites";

export type CombatEventSession = {
  id: string;
  label: string;
  eventDate: string;
  isMain?: boolean;
};

export type CombatMainBout = {
  fighter1: {
    name: string;
    countryCode?: string;
  };
  fighter2: {
    name: string;
    countryCode?: string;
  };
  titleBout?: boolean;
  weightClass?: string;
};

type Props = {
  promotionLabel: string;
  eventName: string;
  venue?: string;
  country?: string;
  mainCardDate: string;
  mainBout?: CombatMainBout;
  sessions: CombatEventSession[];
  favorite: FavoriteCandidate;
};

function countryFlag(code?: string): string {
  if (!code || !/^[A-Za-z]{2}$/.test(code)) return "•";
  return String.fromCodePoint(
    ...code
      .toUpperCase()
      .split("")
      .map((letter) => 127397 + letter.charCodeAt(0)),
  );
}

export default function CombatEventHero({
  promotionLabel,
  eventName,
  venue,
  country,
  mainCardDate,
  mainBout,
  sessions,
  favorite,
}: Props) {
  return (
    <section
      className="v2-calendar-hero wts-combat-event-hero"
      aria-labelledby="combat-event-title"
    >
      <div className="wts-combat-arena-backdrop" aria-hidden="true" />
      <img
        className="wts-combat-arena-image"
        src="/mma-combat-arena-bg-dezoom.webp"
        alt=""
        aria-hidden="true"
      />
      <div className="wts-combat-arena-shade" aria-hidden="true" />
      <div className="wts-combat-hero-header">
        <div>
          <p className="wts-combat-event-kicker">
            {promotionLabel} · Fight Night
          </p>
          <h1 id="combat-event-title">{eventName}</h1>
        </div>
        <FavoriteButton favorite={favorite} />
      </div>

      {mainBout ? (
        <div className="wts-combat-main-event">
          <div className="wts-combat-main-event-label">
            <span>{mainBout.titleBout ? "TITLE FIGHT" : "MAIN EVENT"}</span>
            <strong>{mainBout.weightClass ?? "Main Event"}</strong>
          </div>

          <div className="wts-combat-main-fighter is-red">
            <span className="wts-combat-main-flag" aria-hidden="true">
              {countryFlag(mainBout.fighter1.countryCode)}
            </span>
            <div>
              <small>{mainBout.fighter1.countryCode ?? "Fighter"}</small>
              <strong>{mainBout.fighter1.name}</strong>
            </div>
          </div>

          <div className="wts-combat-main-vs" aria-hidden="true">
            VS
          </div>

          <div className="wts-combat-main-fighter is-blue">
            <div>
              <small>{mainBout.fighter2.countryCode ?? "Fighter"}</small>
              <strong>{mainBout.fighter2.name}</strong>
            </div>
            <span className="wts-combat-main-flag" aria-hidden="true">
              {countryFlag(mainBout.fighter2.countryCode)}
            </span>
          </div>
        </div>
      ) : null}

      <div className="wts-combat-event-program">
        <div className="wts-combat-program-meta">
          <span>
            <b>Venue</b>
            {venue ?? "Venue TBC"}
            {country ? " · " + country : ""}
          </span>

          <span>
            <b>Event date</b>
            <LocalTime
              date={mainCardDate}
              display="date"
              showYear
              showTimeZone
            />
          </span>
        </div>

        <div
          className="wts-combat-program-sessions"
          aria-label="Fight night program"
        >
          {sessions.map((session) => (
            <span className={session.isMain ? "is-main" : undefined} key={session.id}>
              <b>{session.label}</b>
              <LocalTime date={session.eventDate} display="time" />
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
