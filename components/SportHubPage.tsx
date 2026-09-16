import type { Metadata } from "next";
import Link from "next/link";
import Breadcrumbs from "@/components/Breadcrumbs";
import { getPublicEventsSnapshot } from "@/lib/public-events";
import { getSportLabel } from "@/lib/sports-registry";
import styles from "./sport-hub.module.css";

const SPORT_COPY: Record<string,{title:string;description:string;eyebrow:string;backdrop:string}> = {
  football:{title:"Football",eyebrow:"Sport",description:"Choose a football competition to open its schedule, teams and match pages.",backdrop:"/sports/football.webp"},
  basketball:{title:"Basketball",eyebrow:"Sport",description:"Choose a basketball league or competition, then browse its games and official viewing pages.",backdrop:"/sports/basketball.webp"},
  hockey:{title:"Hockey",eyebrow:"Sport",description:"Choose a hockey league or tournament, including NHL and future international competitions.",backdrop:"/sports/hockey.webp"},
  tennis:{title:"Tennis",eyebrow:"Sport",description:"Choose a tennis tournament to open its event schedule and match pages.",backdrop:"/sports/tennis.webp"},
  rugby:{title:"Rugby",eyebrow:"Sport",description:"Choose a rugby competition to browse its fixtures and viewing information.",backdrop:"/sports/all-sports.webp"},
  baseball:{title:"Baseball",eyebrow:"Sport",description:"Choose a baseball league or tournament to browse its schedule and match pages.",backdrop:"/sports/all-sports.webp"},
  "american-football":{title:"American football",eyebrow:"Sport",description:"Choose a league or competition to browse its schedule and game pages.",backdrop:"/sports/all-sports.webp"},
  motogp:{title:"MotoGP",eyebrow:"Motorsport championship",description:"Choose a MotoGP event or race weekend to open its sessions and official viewing pages.",backdrop:"/sports/motogp.webp"},
};

function competitionHref(sport:string,slug:string){return sport==="football"?`/football/competition/${slug}`:`/sports/${sport}/competition/${slug}`;}

export async function buildSportHubMetadata(sport:string,canonical?:string):Promise<Metadata>{
  const cfg=SPORT_COPY[sport];
  if(!cfg)return{title:"Sport not found | WatchTVSport",robots:{index:false,follow:false}};
  return{
    title:`${cfg.title} competitions & TV schedules | WatchTVSport`,
    description:`Browse ${cfg.title.toLowerCase()} competitions and open each competition schedule to find match pages and official viewing options.`,
    alternates:{canonical:canonical??`/sports/${sport}`},
    openGraph:{title:`${cfg.title} competitions | WatchTVSport`,description:cfg.description,url:canonical??`/sports/${sport}`,type:"website"},
    twitter:{card:"summary_large_image",title:`${cfg.title} competitions | WatchTVSport`,description:cfg.description},
  };
}

export default async function SportHubPage({sport,canonical}:{sport:string;canonical?:string}){
  const cfg=SPORT_COPY[sport];
  if(!cfg)return null;
  const snapshot=await getPublicEventsSnapshot();
  const events=snapshot.events.filter(e=>e.sport===sport);
  const now=Date.now();
  const competitions=Array.from(new Map(events.map(e=>[e.competitionSlug,{slug:e.competitionSlug,name:e.competition,events:0,next:null as string|null}])).values());
  for(const competition of competitions){
    const list=events.filter(e=>e.competitionSlug===competition.slug);
    competition.events=list.length;
    competition.next=list.filter(e=>e.status!=="finished"&&Date.parse(e.eventDate)>=now).sort((a,b)=>Date.parse(a.eventDate)-Date.parse(b.eventDate))[0]?.eventDate??null;
  }
  competitions.sort((a,b)=>(a.next?0:1)-(b.next?0:1)||a.name.localeCompare(b.name));
  const current=events.filter(e=>e.status==="live"||(e.status!=="finished"&&Date.parse(e.eventDate)>=now)).sort((a,b)=>Date.parse(a.eventDate)-Date.parse(b.eventDate)).slice(0,4);
  const title=cfg.title||getSportLabel(sport);
  return <main id="main-content" className={styles.page}>
    <Breadcrumbs items={[{label:"Home",href:"/"},{label:"Sports",href:"/sports"},{label:title}]}/>
    <section className={styles.hero} style={{backgroundImage:`linear-gradient(90deg,rgba(3,10,18,.97),rgba(3,12,22,.72)),url('${cfg.backdrop}')`}}>
      <p>{cfg.eyebrow}</p><h1>{title}</h1><span>{cfg.description}</span>
      <a href="#competitions">Browse competitions ↓</a>
    </section>

    <section id="competitions" className={styles.section} aria-labelledby={`${sport}-competitions-title`}>
      <div className={styles.heading}><div><p>Choose where to go next</p><h2 id={`${sport}-competitions-title`}>Competitions & tournaments</h2></div><span>{competitions.length} available</span></div>
      {competitions.length===0?<div className={styles.empty}><strong>No competition published yet</strong><span>The page is ready and competitions will appear here when verified data is imported.</span></div>:
      <div className={styles.competitionGrid}>{competitions.map((competition,index)=><Link className={index<4?styles.featuredCard:styles.card} href={competitionHref(sport,competition.slug)} key={competition.slug}>
        <div><small>{index<4?"Featured competition":"Competition"}</small><strong>{competition.name}</strong></div>
        <span>{competition.next?`Next event ${new Intl.DateTimeFormat("en",{month:"short",day:"numeric"}).format(new Date(competition.next))}`:`${competition.events} referenced events`}</span>
        <b>Open competition →</b>
      </Link>)}</div>}
    </section>

    {current.length>0?<section className={styles.current} aria-labelledby={`${sport}-current-title`}>
      <div className={styles.heading}><div><p>Quick glance</p><h2 id={`${sport}-current-title`}>Current & next</h2></div><Link href={`/events?view=all&sport=${sport}`}>All events →</Link></div>
      <div className={styles.currentGrid}>{current.map(event=><Link href={event.detailPath} key={event.id}><small>{event.competition}</small><strong>{event.title}</strong><span>{event.status==="live"?"Live now":new Intl.DateTimeFormat("en",{month:"short",day:"numeric",hour:"numeric",minute:"2-digit"}).format(new Date(event.eventDate))}</span></Link>)}</div>
    </section>:null}
  </main>;
}
