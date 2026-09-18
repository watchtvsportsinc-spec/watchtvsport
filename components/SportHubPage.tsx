import type { Metadata } from "next";
import Link from "next/link";
import Breadcrumbs from "@/components/Breadcrumbs";
import SportCompetitionGrid, { type SportCompetitionCard } from "@/components/SportCompetitionGrid";
import SportHero from "@/components/SportHero";
import { classifyCompetition, displayCompetitionName, type CompetitionCategory } from "@/lib/competition-catalog";
import { getPublicEventsSnapshot } from "@/lib/public-events";
import { getPublicSportCompetitions } from "@/lib/public-sport-competitions";
import { evaluateSeoEligibility, indexableRobots } from "@/lib/seo-indexability";
import { getSportLabel } from "@/lib/sports-registry";
import styles from "./sport-hub.module.css";

const SPORT_COPY:Record<string,{title:string;description:string;eyebrow:string;backdrop:string;about:string}>={
football:{title:"Football",eyebrow:"Sport",description:"Choose a league, cup or international competition, then open its schedule and match pages.",backdrop:"/sports/football.webp",about:"Browse football by competition rather than through one oversized match list. European competitions, domestic leagues, cups and international tournaments each lead to their own permanent TV schedule."},
basketball:{title:"Basketball",eyebrow:"Sport",description:"Choose a basketball league or competition, from the NBA to European and international competitions.",backdrop:"/sports/basketball.webp",about:"WatchTVSport organizes basketball around leagues and competitions. Open the NBA, EuroLeague or another competition to see its upcoming games and confirmed viewing options."},
hockey:{title:"Hockey",eyebrow:"Sport",description:"Choose a hockey league or tournament, then open its schedule and game pages.",backdrop:"/sports/hockey.webp",about:"Hockey competitions are separated into permanent pages so NHL and international tournaments can each carry their own schedule, teams and broadcaster information."},
tennis:{title:"Tennis",eyebrow:"Sport",description:"Choose a tournament first. Grand Slams and tour events open into their own schedules and match pages.",backdrop:"/sports/tennis.webp",about:"Tennis is organized by tournament. Grand Slams and future ATP/WTA events can publish their own match schedules without turning this page into an endless chronological feed."},
rugby:{title:"Rugby",eyebrow:"Sport",description:"Choose a domestic, European or international rugby competition to open its fixtures.",backdrop:"/sports/all-sports.webp",about:"Rugby competitions are grouped by competition type so domestic leagues, continental cups and international tournaments remain easy to navigate."},
baseball:{title:"Baseball",eyebrow:"Sport",description:"Choose a baseball league or tournament to open its schedule and game pages.",backdrop:"/sports/all-sports.webp",about:"Baseball is organized around leagues and tournaments such as MLB and the World Baseball Classic, with permanent competition pages ready for verified schedules."},
"american-football":{title:"American football",eyebrow:"Sport",description:"Choose a league or competition, starting with the NFL, then browse its game schedule.",backdrop:"/sports/all-sports.webp",about:"American football competition pages separate NFL and college schedules while keeping official TV information close to each game."},
motogp:{title:"MotoGP",eyebrow:"Motorsport championship",description:"Choose a MotoGP race weekend to open sessions and official viewing pages.",backdrop:"/sports/motogp.webp",about:"MotoGP is organized around race weekends rather than team fixtures. Each weekend can surface practice, qualifying, sprint and race sessions as verified data becomes available."},
cycling:{title:"Cycling",eyebrow:"Sport",description:"Choose a stage race or cycling competition, then open its event pages and viewing information.",backdrop:"/sports/all-sports.webp",about:"Cycling competition pages keep major tours separate and allow stages or race sessions to appear beneath the correct event."},
};

const CATEGORY_ORDER:CompetitionCategory[]=["continental","domestic-league","domestic-cup","international","grand-slam","tour","league","championship","organization","other"];
const CATEGORY_LABELS:Record<CompetitionCategory,string>={continental:"European & continental competitions","domestic-league":"Domestic leagues","domestic-cup":"Domestic cups",international:"International competitions","grand-slam":"Grand Slams",tour:"Tours & stage races",league:"Leagues",championship:"Championships",organization:"Organizations",other:"Other competitions"};
function competitionHref(sport:string,slug:string){return sport==="football"?`/football/competition/${slug}`:`/sports/${sport}/competition/${slug}`;}
function dayKey(value:string|number|Date){return new Date(value).toISOString().slice(0,10);}

export async function buildSportHubMetadata(sport:string,canonical?:string):Promise<Metadata>{
 const cfg=SPORT_COPY[sport];
 if(!cfg)return{title:"Sport not found | WatchTVSport",robots:{index:false,follow:false}};
 const url=canonical??`/sports/${sport}`;
 const snapshot=await getPublicEventsSnapshot({sport,limit:100});
 const verifiedBroadcastCount=snapshot.events.reduce((sum,event)=>sum+event.broadcasts.filter(b=>b.coverageStatus==="confirmed").length,0);
 const eligibility=evaluateSeoEligibility({kind:"sport",canonicalPath:url,eventCount:snapshot.events.length,verifiedBroadcastCount});
 return{title:`${cfg.title} competitions, TV schedules & where to watch | WatchTVSport`,description:`Browse ${cfg.title.toLowerCase()} competitions, upcoming events and confirmed official TV and streaming options by country.`,alternates:{canonical:url},robots:indexableRobots(eligibility.indexable),openGraph:{title:`${cfg.title} competitions & TV schedules | WatchTVSport`,description:cfg.description,url,type:"website"},twitter:{card:"summary_large_image",title:`${cfg.title} competitions | WatchTVSport`,description:cfg.description}};
}

export default async function SportHubPage({sport,canonical}:{sport:string;canonical?:string}){
 const cfg=SPORT_COPY[sport];if(!cfg)return null;
 const [snapshot,permanent]=await Promise.all([getPublicEventsSnapshot({sport,limit:500}),getPublicSportCompetitions(sport)]);
 const events=snapshot.events;const now=Date.now();const today=dayKey(now);
 const map=new Map<string,SportCompetitionCard & {category:CompetitionCategory}>();
 for(const c of permanent)map.set(c.slug,{sport,slug:c.slug,name:c.displayName||c.name,href:competitionHref(sport,c.slug),category:(c.competitionType as CompetitionCategory)||classifyCompetition(sport,c.slug),eventCount:0,next:null,nextTitle:null,season:c.seasonLabel,liveCount:0,todayCount:0,confirmedListings:0,freeCountries:0,paidCountries:0});
 const freeByCompetition=new Map<string,Set<string>>();const paidByCompetition=new Map<string,Set<string>>();
 for(const event of events){let row=map.get(event.competitionSlug);if(!row){row={sport,slug:event.competitionSlug,name:displayCompetitionName(sport,event.competitionSlug,event.competition),href:competitionHref(sport,event.competitionSlug),category:classifyCompetition(sport,event.competitionSlug),eventCount:0,next:null,nextTitle:null,liveCount:0,todayCount:0,confirmedListings:0,freeCountries:0,paidCountries:0};map.set(event.competitionSlug,row);}row.eventCount++;if(event.status==="live")row.liveCount++;if(dayKey(event.eventDate)===today&&event.status!=="finished")row.todayCount++;const next=event.status!=="finished"&&Date.parse(event.eventDate)>=now?event.eventDate:null;if(next&&(!row.next||Date.parse(next)<Date.parse(row.next))){row.next=next;row.nextTitle=event.title;}const confirmed=event.broadcasts.filter(b=>b.coverageStatus==="confirmed");row.confirmedListings+=confirmed.length;const free=freeByCompetition.get(event.competitionSlug)??new Set<string>();const paid=paidByCompetition.get(event.competitionSlug)??new Set<string>();for(const b of confirmed){if(b.access==="Free")free.add(b.countryCode);if(b.access==="Paid")paid.add(b.countryCode);}freeByCompetition.set(event.competitionSlug,free);paidByCompetition.set(event.competitionSlug,paid);}
 for(const row of map.values()){row.freeCountries=freeByCompetition.get(row.slug)?.size??0;row.paidCountries=paidByCompetition.get(row.slug)?.size??0;}
 const competitions=Array.from(map.values());
 const groups=CATEGORY_ORDER.map(category=>({category,label:CATEGORY_LABELS[category],items:competitions.filter(c=>c.category===category)})).filter(g=>g.items.length);
 const currentEvents=events.filter(e=>e.status==="live"||(e.status!=="finished"&&Date.parse(e.eventDate)>=now)).sort((a,b)=>(a.status==="live"?-1:0)-(b.status==="live"?-1:0)||Date.parse(a.eventDate)-Date.parse(b.eventDate));
 const current=currentEvents.slice(0,5);
 const liveCount=currentEvents.filter(e=>e.status==="live").length;
 const upcomingCount=currentEvents.filter(e=>e.status!=="live").length;
 const nextEvent=currentEvents.find(e=>e.status!=="live")??currentEvents[0];
 const heroStats=[
  {icon:"competition" as const,value:competitions.length,label:sport==="tennis"?"TOURNAMENTS":"COMPETITIONS"},
  {icon:"calendar" as const,value:upcomingCount,label:"UPCOMING"},
  ...(liveCount>0
    ? [{icon:"live" as const,value:liveCount,label:"LIVE NOW",tone:"live" as const}]
    : nextEvent
      ? [{icon:"next" as const,value:"NEXT",label:"UP NEXT",detail:`${nextEvent.title} · ${new Intl.DateTimeFormat("en",{month:"short",day:"numeric"}).format(new Date(nextEvent.eventDate))}`,tone:"next" as const}]
      : []),
 ];
 const title=cfg.title||getSportLabel(sport);const canonicalPath=canonical??`/sports/${sport}`;
 const jsonLd={"@context":"https://schema.org","@type":"CollectionPage",name:`${title} competitions and TV schedules`,url:`https://watchtvsport.com${canonicalPath}`,description:cfg.about,about:{"@type":"Thing",name:title}};
 return <main id="main-content" className={styles.page}>
  <script type="application/ld+json" dangerouslySetInnerHTML={{__html:JSON.stringify(jsonLd)}}/>
  <Breadcrumbs items={[{label:"Home",href:"/"},{label:"Sports",href:"/sports"},{label:title}]}/>
  <SportHero eyebrow={cfg.eyebrow} title={title} description={cfg.description} backdrop={cfg.backdrop} titleId={`${sport}-title`} stats={heroStats} />
  {current.length>0?<section id="next" className={styles.current} aria-labelledby={`${sport}-current-title`}><div className={styles.heading}><div><p>What matters now</p><h2 id={`${sport}-current-title`}>Live & next</h2></div><Link href="/events#sports-filters">Full schedule →</Link></div><div className={styles.currentGrid}>{current.map(event=>{const confirmed=event.broadcasts.filter(b=>b.coverageStatus==="confirmed");const freeCountries=new Set(confirmed.filter(b=>b.access==="Free").map(b=>b.countryCode)).size;return <Link href={event.detailPath} key={event.id}><span className={event.status==="live"?styles.liveBadge:dayKey(event.eventDate)===today?styles.todayBadge:styles.statusBadge}>{event.status==="live"?"LIVE":dayKey(event.eventDate)===today?"TODAY":"UPCOMING"}</span><small>{displayCompetitionName(sport,event.competitionSlug,event.competition)}</small><strong>{event.title}</strong><span>{event.status==="live"?"Live now":new Intl.DateTimeFormat("en",{month:"short",day:"numeric",hour:"numeric",minute:"2-digit"}).format(new Date(event.eventDate))}</span><em>{confirmed.length} confirmed{freeCountries?` · free in ${freeCountries}`:""}</em></Link>})}</div></section>:null}
  <aside className={styles.monetizationSlot} data-monetization-slot="sport-hub-top" aria-label="Partner placement reserved"><span>Partner placement</span><strong>Reserved for relevant broadcaster or connectivity offers</strong></aside>
  <section id="competitions" className={styles.section} aria-labelledby={`${sport}-competitions-title`}><div className={styles.heading}><div><p>Choose where to go next</p><h2 id={`${sport}-competitions-title`}>Competitions & tournaments</h2></div><span>{competitions.length} available</span></div>
   {!groups.length?<div className={styles.empty}><strong>No competition published yet</strong><span>The page is ready. New active competitions will appear here automatically when imported.</span></div>:groups.map(group=><div className={styles.group} key={group.category}><div className={styles.groupHeading}><h3>{group.label}</h3><span>{group.items.length}</span></div><SportCompetitionGrid items={group.items} backdrop={cfg.backdrop}/></div>)}
  </section>
  <section className={styles.about}><p>About {title}</p><h2>{title} on WatchTVSport</h2><span>{cfg.about}</span><div><Link href="/events#sports-filters">Browse all {title.toLowerCase()} events →</Link><Link href="/sports">Explore other sports →</Link></div></section>
 </main>;
}
