import type { Metadata } from "next";
import Link from "next/link";
import Breadcrumbs from "@/components/Breadcrumbs";
import styles from "@/components/sport-hub.module.css";

export const metadata:Metadata={title:"Sports & competitions | WatchTVSport",description:"Browse WatchTVSport by sport, from football and tennis to motorsports and combat sports.",alternates:{canonical:"/sports"},robots:{index:true,follow:true}};

const SPORTS=[
  {href:"/football",title:"Football",copy:"European competitions, domestic leagues, cups and international football",icon:"⚽"},
  {href:"/sports/basketball",title:"Basketball",copy:"NBA, EuroLeague, WNBA and other basketball competitions",icon:"🏀"},
  {href:"/sports/hockey",title:"Hockey",copy:"NHL and international hockey competitions",icon:"🏒"},
  {href:"/sports/tennis",title:"Tennis",copy:"Grand Slams and future ATP/WTA tournament coverage",icon:"🎾"},
  {href:"/motorsports",title:"Motorsports",copy:"Formula 1, MotoGP and future racing championships",icon:"◉"},
  {href:"/combat-sports",title:"Combat sports",copy:"MMA, boxing and future combat disciplines",icon:"🥊"},
  {href:"/sports/rugby",title:"Rugby",copy:"Domestic, European and international rugby competitions",icon:"◆"},
  {href:"/sports/baseball",title:"Baseball",copy:"MLB, World Baseball Classic and other leagues",icon:"⚾"},
  {href:"/sports/american-football",title:"American football",copy:"NFL and NCAA football",icon:"🏈"},
  {href:"/sports/cycling",title:"Cycling",copy:"Tour de France, Giro d'Italia and Vuelta a España",icon:"◌"},
] as const;

export default function SportsDirectory(){return <main id="main-content" className={styles.page}><Breadcrumbs items={[{label:"Home",href:"/"},{label:"Sports"}]}/><section className={styles.hero} style={{backgroundImage:"linear-gradient(90deg,rgba(3,10,18,.97),rgba(3,12,22,.72)),url('/sports/all-sports.webp')"}}><p>Explore</p><h1>Sports</h1><span>Choose a sport first, then open the competition, tournament or championship you want to follow.</span></section><section className={styles.section}><div className={styles.heading}><div><p>Browse</p><h2>Choose a sport</h2></div><span>{SPORTS.length} sections</span></div><div className={styles.competitionGrid}>{SPORTS.map((item,index)=><Link className={index<6?styles.featuredCard:styles.card} href={item.href} key={item.href}><div><small>{item.icon} Sport</small><strong>{item.title}</strong></div><span>{item.copy}</span><b>Open →</b></Link>)}</div></section></main>}
