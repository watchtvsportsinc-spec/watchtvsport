import type { Metadata } from "next";
import Link from "next/link";
import Breadcrumbs from "@/components/Breadcrumbs";
import { getPublicEventsSnapshot } from "@/lib/public-events";
import styles from "./sports-directory.module.css";

export const metadata: Metadata = {
  title: "Sports & competitions | WatchTVSport",
  description: "Browse WatchTVSport by sport, from football and tennis to motorsports and combat sports.",
  alternates: { canonical: "/sports" },
  robots: { index: true, follow: true },
};

const SPORTS = [
  { href: "/football", title: "Football", icon: "⚽", slugs: ["football"], description: "Leagues, cups and international football" },
  { href: "/sports/basketball", title: "Basketball", icon: "🏀", slugs: ["basketball"], description: "NBA and basketball competitions" },
  { href: "/sports/hockey", title: "Hockey", icon: "🏒", slugs: ["hockey", "ice-hockey"], description: "NHL and international hockey" },
  { href: "/sports/tennis", title: "Tennis", icon: "🎾", slugs: ["tennis"], description: "ATP, WTA and major tournaments" },
  { href: "/motorsports", title: "Motorsports", icon: "🏁", slugs: ["formula-1", "motogp"], description: "Formula 1, MotoGP and more" },
  { href: "/combat-sports", title: "Combat sports", icon: "🥊", slugs: ["ufc"], description: "UFC and combat sports events" },
  { href: "/sports/rugby", title: "Rugby", icon: "◆", slugs: ["rugby"], description: "International rugby and competitions" },
  { href: "/sports/baseball", title: "Baseball", icon: "⚾", slugs: ["baseball"], description: "Baseball leagues and tournaments" },
  { href: "/sports/american-football", title: "American football", icon: "🏈", slugs: ["american-football"], description: "American football schedules" },
  { href: "/sports/cycling", title: "Cycling", icon: "🚴", slugs: ["cycling"], description: "Grand Tours, classics and races" },
] as const;

export default async function SportsDirectory() {
  const snapshot = await getPublicEventsSnapshot();
  const now = Date.now();
  const weekEnd = now + 7 * 24 * 60 * 60 * 1000;
  const upcomingEvents = snapshot.events.filter((event) => event.status === "live" || (event.status !== "finished" && Date.parse(event.eventDate) >= now));
  const competitionCount = new Set(upcomingEvents.map((event) => `${event.sport}:${event.competitionSlug}`)).size;
  const liveCount = upcomingEvents.filter((event) => event.status === "live").length;

  return <main id="main-content" className={styles.page}>
    <Breadcrumbs items={[{label:"Home",href:"/"},{label:"Sports"}]}/>

    <section className={styles.hero} style={{backgroundImage:"linear-gradient(90deg,rgba(2,9,16,.97) 0%,rgba(3,12,22,.88) 43%,rgba(3,12,22,.43) 100%),url('/sports/all-sports.webp')"}}>
      <div className={styles.heroCopy}>
        <p>All sports. One place.</p>
        <h1>Sports</h1>
        <span>Find upcoming events, competitions and official TV coverage for the sports you follow.</span>
      </div>
      <div className={styles.heroStats} aria-label="Sports directory overview">
        <div><strong>{SPORTS.length}</strong><span>sports</span></div>
        <div><strong>{upcomingEvents.length}</strong><span>upcoming</span></div>
        <div><strong>{competitionCount}</strong><span>competitions</span></div>
        {liveCount > 0 ? <div className={styles.liveStat}><strong>{liveCount}</strong><span>live now</span></div> : null}
      </div>
    </section>

    <nav className={styles.quickNav} aria-label="Sports shortcuts">
      {SPORTS.map((item) => <Link href={item.href} key={`quick-${item.href}`}>
        <span aria-hidden="true">{item.icon}</span>
        <b>{item.title}</b>
      </Link>)}
    </nav>

    <section className={styles.section}>
      <div className={styles.heading}>
        <div>
          <p className={styles.sectionLabel}>Browse</p>
          <h2>All sports</h2>
          <span className={styles.headingText}>Choose a sport to see its competitions, events and broadcast information.</span>
        </div>
        <span>{SPORTS.length} sports</span>
      </div>

      <div className={styles.grid}>{SPORTS.map((item) => {
        const events = snapshot.events.filter((event) => item.slugs.includes(event.sport as never));
        const current = events.filter((event) => event.status === "live" || (event.status !== "finished" && Date.parse(event.eventDate) >= now));
        const thisWeek = current.filter((event) => Date.parse(event.eventDate) <= weekEnd);
        const live = current.filter((event) => event.status === "live").length;
        const next = [...current].sort((a,b) => Date.parse(a.eventDate) - Date.parse(b.eventDate))[0];
        const sportCompetitionCount = new Set(current.map((event) => event.competitionSlug)).size;

        return <Link className={styles.card} data-active={current.length > 0} href={item.href} key={item.href}>
          <div className={styles.cardTop}>
            <span className={styles.icon} aria-hidden="true">{item.icon}</span>
            <div className={styles.cardTitle}>
              <h3>{item.title}</h3>
              <p>{item.description}</p>
            </div>
            <span className={styles.arrow} aria-hidden="true">→</span>
          </div>

          <div className={styles.metrics}>
            {live ? <span className={styles.live}>{live} live</span> : thisWeek.length ? <span className={styles.status}>{thisWeek.length} this week</span> : <span className={styles.ready}>Schedule ready</span>}
            {current.length ? <>
              <span><b>{current.length}</b> upcoming</span>
              <span><b>{sportCompetitionCount}</b> {sportCompetitionCount === 1 ? "competition" : "competitions"}</span>
            </> : null}
          </div>

          <div className={styles.next}>
            <span className={styles.nextLabel}>{next ? "Next event" : "Explore"}</span>
            <strong>{next ? next.title : "View schedules and competitions"}</strong>
          </div>
        </Link>;
      })}</div>
    </section>
  </main>;
}
