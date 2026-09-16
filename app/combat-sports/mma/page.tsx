import type { Metadata } from "next";
import Link from "next/link";
import Breadcrumbs from "@/components/Breadcrumbs";
import styles from "@/components/sport-hub.module.css";

export const metadata:Metadata={title:"MMA organizations & events | WatchTVSport",description:"Browse MMA organizations and open their event schedules and fight cards.",alternates:{canonical:"/combat-sports/mma"}};

export default function MmaPage(){return <main id="main-content" className={styles.page}>
 <Breadcrumbs items={[{label:"Home",href:"/"},{label:"Sports",href:"/sports"},{label:"Combat sports",href:"/combat-sports"},{label:"MMA"}]}/>
 <section className={styles.hero} style={{backgroundImage:"linear-gradient(90deg,rgba(3,10,18,.97),rgba(3,12,22,.68)),url('/sports/ufc.webp')"}}><p>Combat discipline</p><h1>MMA</h1><span>Choose an MMA organization, then open its event and fight-card pages.</span></section>
 <section className={styles.section}><div className={styles.heading}><div><p>Organizations</p><h2>MMA organizations</h2></div><span>1 available</span></div><div className={styles.competitionGrid}>
  <Link className={styles.featuredCard} href="/ufc"><div><small>Organization</small><strong>UFC</strong></div><span>Fight cards, events and individual bouts</span><b>Open UFC →</b></Link>
 </div></section>
 </main>}
