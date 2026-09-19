import Link from "next/link";
import { notFound } from "next/navigation";
import Breadcrumbs from "@/components/Breadcrumbs";
import FavoriteButton from "@/components/FavoriteButton";
import LeagueFixtureSchedule from "@/components/LeagueFixtureSchedule";
import ParticipantLogo from "@/components/ParticipantLogo";
import { getFootballLeagueProfile } from "@/lib/football-league-profiles";
import { getPublicCompetition } from "@/lib/public-competition";
import { getPublicCompetitionFixtures } from "@/lib/public-fixtures";
import { getApprovedMediaAssets } from "@/lib/public-media-assets";
import styles from "./competition-page.module.css";

function formatSeasonDate(value:string){return new Intl.DateTimeFormat("en",{month:"short",day:"numeric",year:"numeric",timeZone:"UTC"}).format(new Date(`${value}T12:00:00Z`));}

export default async function LeagueCompetitionPage({competition}:{competition:string}){
  const profile=getFootballLeagueProfile("football",competition);
  if(!profile)notFound();
  const [permanent,fixtures]=await Promise.all([getPublicCompetition("football",competition),getPublicCompetitionFixtures("football",competition)]);
  if(!permanent)notFound();
  const teams=permanent.teams;
  const [participantLogos,competitionLogos]=await Promise.all([
    getApprovedMediaAssets("participant","team_logo",teams.map(team=>team.slug)),
    getApprovedMediaAssets("competition","competition_logo",[competition,`competition:${permanent.id}`]),
  ]);
  const competitionLogo=competitionLogos[`competition:${permanent.id}`]??competitionLogos[competition];
  const confirmed=fixtures.filter(item=>item.scheduleStatus==="schedule_confirmed").length;
  const pending=fixtures.length-confirmed;
  const currentWeek=fixtures.filter(item=>item.windowEnd&&Date.parse(`${item.windowEnd}T23:59:59Z`)>=Date.now()).sort((a,b)=>(a.matchweek??999)-(b.matchweek??999))[0]?.matchweek;
  const path=`/football/competition/${competition}`;
  const favorite={kind:"competition" as const,entityId:`football:${competition}`,label:`${profile.displayName} (Football)`,href:path};
  return <main id="main-content" className={styles.page}>
    <Breadcrumbs items={[{label:"Home",href:"/"},{label:"Football",href:"/football"},{label:profile.displayName}]}/>
    <section className={styles.hero} style={{backgroundImage:"linear-gradient(90deg,rgba(4,13,23,.98),rgba(4,16,28,.75)),url('/sports/football.webp')"}}>
      <p className={styles.eyebrow}>Domestic league · {profile.seasonLabel}</p><div className={styles.heroTitleRow}>{competitionLogo?<span className={styles.competitionHeroLogo}><img src={competitionLogo.url} alt="" aria-hidden="true"/></span>:null}<h1>{profile.displayName}</h1></div><p className={styles.heroCopy}>{profile.heroCopy}</p>
      <div className={styles.heroNav}><a href="#schedule">Schedule</a><a href="#participants">Clubs</a><a href="#about">About</a><FavoriteButton favorite={favorite}/></div>
    </section>
    <section className={styles.leagueFacts} aria-label={`${profile.displayName} ${profile.seasonLabel} season overview`}>
      <div><strong>{profile.teamCount}</strong><span>Clubs</span></div><div><strong>{profile.fixtureCount}</strong><span>Matches</span></div><div><strong>{profile.matchdayCount}</strong><span>Matchweeks</span></div>
      <div className={styles.leagueDate}><strong>{formatSeasonDate(profile.seasonStart)}</strong><span>Season start</span></div><div className={styles.leagueDate}><strong>{formatSeasonDate(profile.seasonEnd)}</strong><span>Season end</span></div>
    </section>
    <section className={styles.overview}><div className={styles.nextCard}><div className={styles.nextTop}><span className={styles.state}>{currentWeek?`MATCHWEEK ${currentWeek}`:"SEASON READY"}</span><small>{profile.seasonLabel}</small></div><h2>{fixtures.length===profile.fixtureCount?"Full fixture list ready":"Fixture list preparation in progress"}</h2><div className={styles.nextMeta}><span><b>{fixtures.length}</b> permanent match pages</span><span><b>{confirmed}</b> exact kick-offs confirmed</span><span><b>{pending}</b> awaiting exact schedule</span></div><div className={styles.nextActions}><a href="#schedule">Browse matchweeks ↓</a><span>Unconfirmed fixtures show a scheduling window, never an invented kick-off.</span></div></div><div className={styles.stats}><div><strong>{currentWeek??"–"}</strong><span>Current / next MW</span></div><div><strong>{confirmed}</strong><span>Kick-offs confirmed</span></div><div><strong>{pending}</strong><span>Kick-offs TBC</span></div><div><strong>{teams.length}</strong><span>Clubs</span></div></div></section>
    <section id="schedule" className={styles.section}><div className={styles.sectionHeading}><div><p>{profile.seasonLabel}</p><h2>Matchweek schedule</h2></div><span>{fixtures.length} fixtures</span></div>{fixtures.length?<LeagueFixtureSchedule fixtures={fixtures}/>:<div className={styles.empty}><strong>Fixture data is being prepared</strong><span>{profile.schedulePendingCopy}</span></div>}</section>
    <section id="participants" className={styles.section}><div className={styles.sectionHeading}><div><p>{profile.seasonLabel} league</p><h2>{teams.length} clubs</h2></div><span>{teams.length}</span></div><div className={styles.participants}>{teams.map(team=><Link className={styles.participant} key={team.slug} href={`/football/club/${team.slug}`}><ParticipantLogo sport="football" label={team.name} logoUrl={participantLogos[team.slug]?.url} visual={team.visual} size="sm"/><span><strong>{team.name}</strong><small>Club profile →</small></span></Link>)}</div></section>
    <section id="about" className={styles.section}><div className={styles.sectionHeading}><div><p>Competition information</p><h2>About {profile.displayName}</h2></div></div><div className={styles.about}><p>{profile.displayName} {profile.seasonLabel} runs from {formatSeasonDate(profile.seasonStart)} to {formatSeasonDate(profile.seasonEnd)}. Each directional fixture has a permanent WatchTVSport page that can be reused next season; matchweek and scheduling information belongs to the seasonal edition, not to the permanent URL.</p><div className={styles.facts}><span>Season: {profile.seasonLabel}</span><span>Country: {profile.countryName}</span><span>{profile.fixtureCount} matches</span><span>{profile.matchdayCount} matchweeks</span><span>2 schedule states: pending / confirmed</span></div><a className={styles.sourceLink} href={profile.officialSourceUrl} rel="noreferrer" target="_blank">Official {profile.officialSourceName} season source ↗</a></div></section>
  </main>;
}
