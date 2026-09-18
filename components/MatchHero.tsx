import type { ReactNode } from "react";
import Link from "next/link";
import LocalTime from "@/components/LocalTime";
import ParticipantSportVisual from "@/components/ParticipantSportVisual";
import type { ParticipantVisualProfile } from "@/lib/participant-visuals";
import backgroundStyles from "./match-hero-backgrounds.module.css";

type MatchHeroTeam = {
  name: string;
  href?: string | null;
  countryCode?: string;
  visual?: ParticipantVisualProfile | null;
};

type Props = {
  sport: string;
  competition: string;
  competitionHref: string;
  stage?: string;
  status?: string;
  date?: string;
  scheduleText?: string;
  venue?: string;
  team1: MatchHeroTeam;
  team2: MatchHeroTeam;
  favorite?: ReactNode;
};

function TeamBlock({ sport, team }: { sport: string; team: MatchHeroTeam }) {
  const content = (
    <>
      <ParticipantSportVisual
        sport={sport}
        label={team.name}
        countryCode={team.countryCode}
        visual={team.visual}
        size="lg"
      />
      <strong>{team.name}</strong>
    </>
  );

  if (team.href) {
    return <Link className="v2-match-hero-team" href={team.href}>{content}</Link>;
  }

  return <span className="v2-match-hero-team">{content}</span>;
}

export default function MatchHero({
  sport,
  competition,
  competitionHref,
  stage,
  status,
  date,
  scheduleText,
  venue,
  team1,
  team2,
  favorite,
}: Props) {
  const sportBackgroundClass = sport === "american-football"
    ? backgroundStyles.americanFootball
    : sport === "basketball"
      ? backgroundStyles.basketball
      : sport === "tennis"
        ? backgroundStyles.tennis
        : "";
  const heroClassName = `v2-match-hero ${sportBackgroundClass}`.trim();

  return (
    <section className={heroClassName} aria-label={`${team1.name} vs ${team2.name}`}>
      <div className="v2-match-hero-header">
        <div>
          <p className="v2-eyebrow"><Link href={competitionHref}>{competition}</Link></p>
          {stage ? <p className="v2-match-hero-stage">{stage}</p> : null}
        </div>
        {favorite ? <div className="v2-match-hero-favorite">{favorite}</div> : null}
      </div>

      <h1 className="v2-match-hero-fixture">
        <TeamBlock sport={sport} team={team1} />
        <span className="v2-match-hero-center">
          <b>VS</b>
          {date ? <LocalTime date={date} showYear showTimeZone /> : <span>{scheduleText ?? "Schedule TBC"}</span>}
          {status ? <small>{status}</small> : null}
        </span>
        <TeamBlock sport={sport} team={team2} />
      </h1>

      {venue ? <p className="v2-match-hero-venue">{venue}</p> : null}
    </section>
  );
}
