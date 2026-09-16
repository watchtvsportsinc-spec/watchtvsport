import Link from "next/link";
import LocalTime from "@/components/LocalTime";
import { fixtureWindowLabel, type PublicFixture } from "@/lib/public-fixtures";
import styles from "./competition-page.module.css";

function label(matchweek:number|undefined){return matchweek?`Matchweek ${matchweek}`:"Matchweek TBC";}

export default function LeagueFixtureSchedule({fixtures}:{fixtures:PublicFixture[]}){
  const groups=new Map<number,PublicFixture[]>();
  for(const fixture of fixtures){const key=fixture.matchweek??999;groups.set(key,[...(groups.get(key)??[]),fixture]);}
  const ordered=Array.from(groups.entries()).sort(([a],[b])=>a-b);
  return <div className={styles.leagueSchedule}>{ordered.map(([week,items])=>{
    const sample=items[0];const window=fixtureWindowLabel(sample);
    return <section className={styles.matchweekGroup} key={week}>
      <div className={styles.matchweekHeading}><div><strong>{label(week===999?undefined:week)}</strong>{sample.seasonLabel?<small>{sample.seasonLabel}</small>:null}</div><span>{window&&sample.scheduleStatus!=="schedule_confirmed"?window:`${items.length} fixtures`}</span></div>
      <div className={styles.matchweekRows}>{items.map(item=><Link className={styles.matchweekRow} key={item.pageId} href={item.detailPath}>
        <span className={styles.matchTeams}><strong>{item.participant1.shortName??item.participant1.name}</strong><b>vs</b><strong>{item.participant2.shortName??item.participant2.name}</strong></span>
        <span className={styles.matchSchedule}>{item.scheduleStatus==="schedule_confirmed"&&item.exactDate?<LocalTime date={item.exactDate}/>:<><small>{fixtureWindowLabel(item)}</small><em>Kick-off TBC</em></>}</span>
        <b className={styles.matchOpen}>→</b>
      </Link>)}</div>
    </section>;
  })}</div>;
}
