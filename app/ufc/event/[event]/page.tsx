import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Breadcrumbs from "@/components/Breadcrumbs";
import BroadcastOffers from "@/components/BroadcastOffers";
import LocalTime from "@/components/LocalTime";
import { getAllEvents, type EventData } from "@/lib/events";
import { getPublicEventsSnapshot } from "@/lib/public-events";
import { getPublicUfcCard } from "@/lib/public-ufc-card";
import styles from "./ufc-event.module.css";

type PageProps={params:Promise<{event:string}>;searchParams?:Promise<{country?:string;access?:string}>};
function cardEvents(events:EventData[],slug:string){return events.filter(e=>e.sport==="ufc"&&e.eventGroupSlug===slug).sort((a,b)=>(a.sequenceNumber??999)-(b.sequenceNumber??999));}
export async function generateStaticParams(){return Array.from(new Set(getAllEvents().filter(e=>e.sport==="ufc"&&e.eventGroupSlug).map(e=>e.eventGroupSlug!))).map(event=>({event}));}
export async function generateMetadata({params}:PageProps):Promise<Metadata>{const{event}=await params;const snapshot=await getPublicEventsSnapshot();const sessions=cardEvents(snapshot.events,event);const first=sessions[0];if(!first)return{title:"UFC event not found | WatchTVSport",robots:{index:false,follow:false}};const card=await getPublicUfcCard(event);return{title:`${first.eventGroupName} – TV schedule & official broadcasters`,description:`Find official viewing options by country for ${first.eventGroupName}, verified fight-card information and ${card.venue?.name??first.venue??"venue"} details.`,alternates:{canonical:`/ufc/event/${event}`},openGraph:{title:`${first.eventGroupName} – Where to watch`,description:`Official UFC broadcasters and card times for ${first.eventGroupName}.`,url:`/ufc/event/${event}`,type:"website",images:card.venue?.image?.url?[card.venue.image.url]:undefined}};}

function Flag({code,name}:{code?:string;name:string}){if(!code)return null;return <img className={styles.flag} src={`/flags/${code.toLowerCase()}.png`} alt={`${name} country flag`} width="28" height="19" loading="lazy"/>;}

export default async function UfcEventPage({params,searchParams}:PageProps){
 const{event}=await params;const resolved=(await searchParams)??{};
 const [snapshot,card]=await Promise.all([getPublicEventsSnapshot(),getPublicUfcCard(event)]);
 const sessions=cardEvents(snapshot.events,event);const first=sessions[0];if(!first)notFound();
 const main=sessions.find(s=>s.sessionType==="main_card")??sessions.at(-1)!;
 const venue=card.venue;
 const jsonLd={"@context":"https://schema.org","@type":"SportsEvent",name:first.eventGroupName,startDate:main.eventDate,eventStatus:"https://schema.org/EventScheduled",location:(venue?.name||first.venue)?{"@type":"Place",name:venue?.name??first.venue,address:[venue?.city,venue?.countryCode??first.country].filter(Boolean).join(", ")}:undefined,image:venue?.image?.url?[venue.image.url]:undefined,url:`https://watchtvsport.com/ufc/event/${event}`};
 return <main id="main-content" className="v2-calendar">
  <script type="application/ld+json" dangerouslySetInnerHTML={{__html:JSON.stringify(jsonLd)}}/>
  <Breadcrumbs items={[{label:"Home",href:"/"},{label:"UFC",href:"/ufc"},{label:first.eventGroupName??"UFC event"}]}/>
  <section className={`${styles.hero} v2-calendar-hero`} aria-labelledby="ufc-event-title" style={venue?.image?.url?{backgroundImage:`linear-gradient(90deg,rgba(3,10,18,.96),rgba(3,10,18,.48)),url('${venue.image.url}')`}:undefined}>
    <p className="v2-eyebrow">UFC fight card</p><h1 id="ufc-event-title">{first.eventGroupName}</h1>
    <p className="v2-signature">{[venue?.name??first.venue,venue?.city,venue?.countryCode??first.country].filter(Boolean).join(" · ")}</p>
    <p className="v2-hero-copy">Main Card: <LocalTime date={main.eventDate}/>. Broadcast availability is tracked separately for Early Prelims, Prelims and Main Card because they can use different official services in the same country.</p>
    {venue?.image?.credit?<small className={styles.credit}>{venue.image.credit}</small>:null}
  </section>

  {card.bouts.length>0?<section className="v2-results" aria-labelledby="fight-card-title">
    <div className="v2-results-heading"><div><p className="v2-eyebrow">Verified fight card</p><h2 id="fight-card-title">Featured bouts</h2></div><p>{card.bouts.length} verified</p></div>
    <div className={styles.bouts}>{card.bouts.map(bout=><article className={styles.bout} key={bout.id}>
      <p className={styles.weight}>{bout.titleBout?"Title bout · ":""}{bout.weightClass??"UFC bout"}</p>
      <div className={styles.fighters}>
        <div>{bout.fighter1.photo?.url?<img className={styles.fighterPhoto} src={bout.fighter1.photo.url} alt={bout.fighter1.photo.alt||bout.fighter1.name} loading="lazy"/>:<span className={styles.fallback}>{bout.fighter1.name.split(/\s+/).map(x=>x[0]).slice(0,2).join("")}</span>}<Flag code={bout.fighter1.countryCode} name={bout.fighter1.name}/><strong>{bout.fighter1.name}</strong></div>
        <b className={styles.vs}>VS</b>
        <div>{bout.fighter2.photo?.url?<img className={styles.fighterPhoto} src={bout.fighter2.photo.url} alt={bout.fighter2.photo.alt||bout.fighter2.name} loading="lazy"/>:<span className={styles.fallback}>{bout.fighter2.name.split(/\s+/).map(x=>x[0]).slice(0,2).join("")}</span>}<Flag code={bout.fighter2.countryCode} name={bout.fighter2.name}/><strong>{bout.fighter2.name}</strong></div>
      </div>
    </article>)}</div>
  </section>:null}

  <section className="v2-results" aria-labelledby="card-schedule-title"><div className="v2-results-heading"><div><p className="v2-eyebrow">Fight night schedule</p><h2 id="card-schedule-title">Card sessions</h2></div><p>{sessions.length}</p></div><div className="v2-event-list">{sessions.map(session=>{const confirmed=session.broadcasts.filter(b=>b.coverageStatus==="confirmed").length;return <article className="v2-event-card" key={session.id}><div className="v2-event-main"><p className="v2-event-competition">{session.stage}</p><h3>{session.stage}</h3><p className="v2-event-stage"><LocalTime date={session.eventDate}/></p></div><div className="v2-broadcast-link"><span>{confirmed} confirmed official listings</span><strong>{confirmed?"Viewing options available":"Broadcast data pending"}</strong></div></article>})}</div></section>
  <BroadcastOffers events={sessions} selectedCountry={resolved.country} selectedAccess={resolved.access} title="Where to watch this UFC event"/>
 </main>;
}
