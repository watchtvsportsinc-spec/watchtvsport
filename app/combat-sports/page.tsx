import type { Metadata } from "next";
import Link from "next/link";
import Breadcrumbs from "@/components/Breadcrumbs";
import styles from "@/components/sport-hub.module.css";

export const metadata:Metadata={title:"Combat sports | WatchTVSport",description:"Browse combat sports by discipline, starting with MMA and expanding to boxing and more.",alternates:{canonical:"/combat-sports"}};

export default function CombatSportsPage(){return <main id="main-content" className={styles.page}>
  <Breadcrumbs items={[{label:"Home",href:"/"},{label:"Sports",href:"/sports"},{label:"Combat sports"}]}/>
  <section className={styles.hero} style={{backgroundImage:"linear-gradient(90deg,rgba(3,10,18,.97),rgba(3,12,22,.68)),url('/sports/ufc.webp')"}}><p>Sport family</p><h1>Combat sports</h1><span>Choose a combat discipline first, then open the organization or event you want to follow.</span></section>
  <section className={styles.section}><div className={styles.heading}><div><p>Disciplines</p><h2>Choose a combat sport</h2></div></div><div className={styles.competitionGrid}>
    <Link className={styles.featuredCard} href="/combat-sports/mma"><div><small>Available</small><strong>MMA</strong></div><span>Organizations, fight cards and individual bouts</span><b>Open MMA →</b></Link>
    <div className={styles.card} aria-disabled="true"><div><small>Future section</small><strong>Boxing</strong></div><span>Ready to be activated when verified boxing data is added.</span><b>Coming later</b></div>
  </div></section>
</main>}
