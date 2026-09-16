import type { Metadata } from "next";
import Link from "next/link";
import Breadcrumbs from "@/components/Breadcrumbs";
import { classifyCompetition, displayCompetitionName, type CompetitionCategory } from "@/lib/competition-catalog";
import { getPublicEventsSnapshot } from "@/lib/public-events";
import { getPublicSportCompetitions } from "@/lib/public-sport-competitions";
import { getSportLabel } from "@/lib/sports-registry";
import styles from "./sport-hub.module.css";

const SPORT_COPY:Record<string,{title:string;description:string;eyebrow:string;backdrop:string}>={
football:{title:"Football",eyebrow:"Sport",description:"Choose a league, cup or international competition, then open its schedule and match pages.",backdrop:"/sports/football.webp"},
basketball:{title:"Basketball",eyebrow:"Sport",description:"Choose a basketball league or competition, from the NBA to future international and European competitions.",backdrop:"/sports/basketball.webp"},
hockey:{title:"Hockey",eyebrow:"Sport",description:"Choose a hockey league or tournament. NHL is available now and international competitions can plug into the same structure.",backdrop:"/sports/hockey.webp"},
tennis:{title:"Tennis",eyebrow:"Sport",description:"Choose a tournament first. Grand Slams and tour events open into their own schedules and match pages.",backdrop:"/sports/tennis.webp"},
rugby:{title:"Rugby",eyebrow:"Sport",description:"Choose a domestic, European or international rugby competition to open its fixtures.",backdrop:"/sports/all-sports.webp"},
baseball:{title:"Baseball",eyebrow:"Sport",description:"Choose a baseball league or tournament to open its schedule and game pages.",backdrop:"/sports/all-sports.webp"},
"american-football":{title:"American football",eyebrow:"Sport",description:"Choose a league or competition, starting with the NFL, then browse its game schedule.",backdrop:"/sports/all-sports.webp"},
motogp:{title:"MotoGP",eyebrow:"Motorsport championship",description:"Choose a MotoGP race weekend to open sessions and official viewing pages.",backdrop:"/sports/motogp.webp"},
cycling:{title:"Cycling",eyebrow:"Sport",description:"Choose a stage race or cycling competition, then open its event pages and viewing information.",backdrop:"/sports/all-sports.webp"},
};

const CATEGORY_ORDER:CompetitionCategory[]=["continental","domestic-league","domestic-cup","international","grand-slam","tour","league","championship","organization","other"];
const CATEGORY_LABELS:Record<CompetitionCategory,string>={continental:"European & continental competitions","domestic-league":"Domestic leagues","domestic-cup":"Domestic cups","international":"International competitions","grand-slam":"Grand Slams","tour":"Tours & stage races","league":"Leagues","championship":"Championships","organization":"Organizations","other":"Other competitions"};
function competitionHref(sport:string,slug:string){return sport==="football"?`/football/competition/${slug}`:`/sports/${sport}/competition/${slug}`;}

export async function buildSportHubMetadata(sport:string,canonical?:string):Promise<Metadata>{const cfg=SPORT_COPY[sport];if(!cfg)return{title:"Sport not found | WatchTVSport",robots:{index:false,follow:false}};const url=canonical??`/sports/${sport}`;return{title:`${cfg.title} competitions, schedules & where to watch | WatchTVSport`,description:`Browse ${cfg.title.toLowerCase()} competitions and open each competition schedule to find event pages and official viewing options.`,alternates:{canonical:url},robots:{index:true,follow:true},openGraph:{title:`${cfg.title} competitions | WatchTVSport`,description:cfg.description,url,type:"website"},twitter:{card:"summary_large_image",title:`${cfg.title} competitions | WatchTVSport`,description:cfg.description}};}

export default async function SportHubPage({sport,canonical}:{sport:string;canonical?:string}){
 const cfg=SPORT_COPY[sport];if(!cfg)return null;
 const [snapshot,permanent]=await Promise.all([getPublicEventsSnapshot(),getPublicSportCompetitions(sport)]);
 const events=snapshot.events.filter(e=>e.sport===sport);const now=Date.now();
 const map=new Map<string,{slug:string;name:string;category:CompetitionCategory;eventCount:number;next:string|null;season?:string}>();
 for(const c of permanent)map.set(c.slug,{slug:c.slug,name:c.displayName||c.name,category:(c.competitionType as CompetitionCategory)||classifyCompetition(sport,c.slug),eventCount:0,next:null,season:c.seasonLabel});
 for(const event of events){const old=map.get(event.competitionSlug);const next=event.status!=="finished"&&Date.parse(event.eventDate)>=now?event.eventDate:null;if(old){old.eventCount++;if(next&&(!old.next||Date.parse(next)<Date.parse(old.next)))old.next=next;}else map.set(event.competitionSlug,{slug:event.competitionSlug,name:displayCompetitionName(sport,event.competitionSlug,event.competition),category:classifyCompetition(sport,event.competitionSlug),eventCount:1,next});}
 const competitions=Array.from(map.values());
 const groups=CATEGORY_ORDER.map(category=>({category,label:CATEGORY_LABELS[category],items:competitions.filter(c=>c.category===category).sort((a,b)=>(a.next?0:1)-(b.next?0:1)||a.name.localeCompare(b.name))})).filter(g=>g.items.length);
 const current=events.filter(e=>e.status==="live"||(e.status!=="finished"&&Date.parse(e.eventDate)>=now)).sort((a,b)=>Date.parse(a.eventDate)-Date.parse(b.eventDate)).slice(0,4);
 const title=cfg.title||getSportLabel(sport);const canonicalPath=canonical??`/sports/${sport}`;
 const jsonLd={"@context":"https://schema.org","@type":"CollectionPage",name:`${title} competitions`,url:`https://watchtvsport.com${canonicalPath}`,about:{"@type":"Thing",name:title}};
 return <main id="main-content" className={styles.page}>
  <script type="application/ld+json" dangerouslySetInnerHTML={{__html:JSON.stringify(jsonLd)}}/>
  <Breadcrumbs items={[{label:"Home",href:"/"},{label:"Sports",href:"/sports"},{label:title}]}/>
  <section className={styles.hero} style={{backgroundImage:`linear-gradient(90deg,rgba(3,10,18,.97),rgba(3,12,22,.72)),url('${cfg.backdrop}')`}}><p>{cfg.eyebrow}</p><h1>{title}</h1><span>{cfg.description}</span><a href="#competitions">Browse competitions ↓</a></section>
  <section id="competitions" className={styles.section} aria-labelledby={`${sport}-competitions-title`}><div className={styles.heading}><div><p>Choose where to go next</p><h2 id={`${sport}-competitions-title`}>Competitions & tournaments</h2></div><span>{competitions.length} available</span></div>
   {!groups.length?<div className={styles.empty}><strong>No competition published yet</strong><span>The page is ready. New active competitions will appear here automatically when imported.</span></div>:groups.map(group=><div className={styles.group} key={group.category}><div className={styles.groupHeading}><h3>{group.label}</h3><span>{group.items.length}</span></div><div className={styles.competitionGrid}>{group.items.map((competition,index)=><Link className={index<4?styles.featuredCard:styles.card} href={competitionHref(sport,competition.slug)} key={competition.slug}><span className={styles.cardVisual} style={{backgroundImage:`url('${cfg.backdrop}')`}} aria-hidden="true"/><div><small>{competition.season??group.label}</small><strong>{competition.name}</strong></div><span>{competition.next?`Next event ${new Intl.DateTimeFormat("en",{month:"short",day:"numeric"}).format(new Date(competition.next))}`:competition.eventCount?`${competition.eventCount} referenced events`:"Permanent competition page ready"}</span><b>Open competition →</b></Link>)}</div></div>)}
  </section>
  {current.length>0?<section className={styles.current} aria-labelledby={`${sport}-current-title`}><div className={styles.heading}><div><p>Quick glance</p><h2 id={`${sport}-current-title`}>Current & next</h2></div><Link href={`/events?view=all&sport=${sport}`}>All events →</Link></div><div className={styles.currentGrid}>{current.map(event=><Link href={event.detailPath} key={event.id}><small>{displayCompetitionName(sport,event.competitionSlug,event.competition)}</small><strong>{event.title}</strong><span>{event.status==="live"?"Live now":new Intl.DateTimeFormat("en",{month:"short",day:"numeric",hour:"numeric",minute:"2-digit"}).format(new Date(event.eventDate))}</span></Link>)}</div></section>:null}
 </main>;
}
