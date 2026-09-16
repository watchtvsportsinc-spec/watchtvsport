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
  { href: "/football", title: "Football", copy: "European competitions, domestic leagues, cups and international football", icon: "⚽", slugs: ["football"] },
  { href: "/sports/basketball", title: "Basketball", copy: "NBA, EuroLeague, WNBA and other basketball competitions", icon: "🏀", slugs: ["basketball"] },
  { href: "/sports/hockey", title: "Hockey", copy: "NHL and international hockey competitions", icon: "🏒", slugs: ["hockey", "ice-hockey"] },
  { href: "/sports/tennis", title: "Tennis", copy: "Grand Slams and ATP/WTA tournament coverage", icon: "🎾", slugs: ["tennis"] },
  { href: "/motorsports", title: "Motorsports", copy: "Formula 1, MotoGP and future racing championships", icon: "🏁", slugs: ["formula-1", "motogp"] },
  { href: "/combat-sports", title: "Combat sports", copy: "MMA, boxing and future combat disciplines", icon: "🥊", slugs: ["ufc"] },
  { href: "/sports/rugby", title: "Rugby", copy: "Domestic, European and international rugby competitions", icon: "◆", slugs: ["rugby"] },
  { href: "/sports/baseball", title: "Baseball", copy: "MLB, World Baseball Classic and other leagues", icon: "⚾", slugs: ["baseball"] },
  { href: "/sports/american-football", title: "American football", copy: "NFL and NCAA football", icon: "🏈", slugs: ["american-football"] },
  { href: "/sports/cycling", title: "Cycling", copy: "Tour de France, Giro d'Italia and Vuelta a España", icon: "🚴", slugs: ["cycling"] },
] as const;

export default async function SportsDirectory() {
  const snapshot = await getPublicEventsSnapshot();
  const now = Date.now();
  const weekEnd = now + 7 * 24 * 60 * 60 * 1000;

  return <main id="main-content" className={styles.page}>
    <Breadcrumbs items={[{label:"Home",href:"/"},{label:"Sports"}]}/>
    <section className={styles.hero} style={{backgroundImage:"linear-gradient(90deg,rgba(3,10,18,.97),rgba(3,12,22,.72)),url('/sports/all-sports.webp')"}}>
      <p>Explore</p><h1>Sports</h1><span>Choose a sport, then open the competition, tournament or championship you want to follow.</span>
    </section>
    <section className={styles.section}>
      <div className={styles.heading}><div><p className={styles.sectionLabel}>Browse</p><h2>Choose a sport</h2></div><span>{SPORTS.length} sections</span></div>
      <div className={styles.grid}>{SPORTS.map((item) => {
        const events = snapshot.events.filter((event) => item.slugs.includes(event.sport as never));
        const current = events.filter((event) => event.status === "live" || (event.status !== "finished" && Date.parse(event.eventDate) >= now));
        const thisWeek = current.filter((event) => Date.parse(event.eventDate) <= weekEnd);
        const live = current.filter((event) => event.status === "live").length;
        const next = current.sort((a,b) => Date.parse(a.eventDate) - Date.parse(b.eventDate))[0];
        return <Link className={styles.card} data-active={current.length > 0} href={item.href} key={item.href}>
          <div className={styles.top}><span className={styles.icon} aria-hidden="true">{item.icon}</span><span className={styles.status}>{live ? `${live} live` : thisWeek.length ? `${thisWeek.length} this week` : "Explore"}</span></div>
          <h3>{item.title}</h3><p>{item.copy}</p>
          <div className={styles.metrics}>{current.length ? <><span><b>{current.length}</b> upcoming</span><span><b>{new Set(current.map((event) => event.competitionSlug)).size}</b> competitions</span></> : <span className={styles.emptyMetric}>Ready for verified schedules</span>}</div>
          {next ? <div className={styles.next}>Next: {next.title}</div> : null}
          <span className={styles.open}>Open →</span>
        </Link>;
      })}</div>
    </section>
  </main>;
}
