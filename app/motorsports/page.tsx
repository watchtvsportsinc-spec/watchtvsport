import type { Metadata } from "next";
import Link from "next/link";
import Breadcrumbs from "@/components/Breadcrumbs";
import styles from "@/components/sport-hub.module.css";

export const metadata:Metadata={title:"Motorsports championships | WatchTVSport",description:"Browse motorsports by championship, including Formula 1 and MotoGP.",alternates:{canonical:"/motorsports"}};
const DISCIPLINES=[
 {href:"/formula-1",title:"Formula 1",copy:"Grand Prix weekends, qualifying and races",status:"Available"},
 {href:"/sports/motogp",title:"MotoGP",copy:"Race weekends, sessions and events",status:"Available"},
] as const;
export default function MotorsportsPage(){return <main id="main-content" className={styles.page}>
 <Breadcrumbs items={[{label:"Home",href:"/"},{label:"Sports",href:"/sports"},{label:"Motorsports"}]}/>
 <section className={styles.hero} style={{backgroundImage:"linear-gradient(90deg,rgba(3,10,18,.97),rgba(3,12,22,.68)),url('/sports/formula-1.webp')"}}><p>Sport family</p><h1>Motorsports</h1><span>Choose a racing championship first, then open its events and sessions.</span></section>
 <section className={styles.section}><div className={styles.heading}><div><p>Racing</p><h2>Championships</h2></div><span>{DISCIPLINES.length} available</span></div><div className={styles.competitionGrid}>{DISCIPLINES.map(item=><Link className={styles.featuredCard} href={item.href} key={item.href}><div><small>{item.status}</small><strong>{item.title}</strong></div><span>{item.copy}</span><b>Open championship →</b></Link>)}</div></section>
 </main>}
