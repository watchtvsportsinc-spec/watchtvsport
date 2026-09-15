import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import Breadcrumbs from "@/components/Breadcrumbs";
import { getPublicEventsSnapshot } from "@/lib/public-events";

type PageProps = { params: Promise<{ sport: string }> };

const SPORT_CONFIG: Record<string,{name:string;label:string;description:string;filter:string}> = {
  basketball:{name:"Basketball",label:"NBA",description:"NBA and basketball broadcast coverage is being prepared for WatchTVSport V2.",filter:"basketball"},
  tennis:{name:"Tennis",label:"Tennis",description:"Tournament-level tennis coverage is being prepared without generating unnecessary player pages.",filter:"tennis"},
  motogp:{name:"MotoGP",label:"MotoGP",description:"MotoGP race weekends and official broadcasters will use the same multi-session architecture as Formula 1.",filter:"motogp"},
  hockey:{name:"Ice hockey",label:"NHL",description:"NHL and ice hockey broadcast coverage is being prepared for WatchTVSport V2.",filter:"hockey"},
};

export async function generateStaticParams(){return Object.keys(SPORT_CONFIG).map(sport=>({sport}));}

export async function generateMetadata({params}:PageProps):Promise<Metadata>{
  const {sport}=await params; const cfg=SPORT_CONFIG[sport];
  if(!cfg)return{title:"Sport not found",robots:{index:false,follow:false}};
  const snapshot=await getPublicEventsSnapshot();
  const hasEvents=snapshot.events.some(e=>e.sport===cfg.filter);
  return{
    title:`${cfg.label} TV schedule & official broadcasters`,
    description:`Find where to watch ${cfg.label} legally with official TV channels and streaming platforms by country.`,
    alternates:{canonical:`/sports/${sport}`},
    robots:hasEvents?{index:true,follow:true}:{index:false,follow:true},
  };
}

export default async function SportLandingPage({params}:PageProps){
  const {sport}=await params; const cfg=SPORT_CONFIG[sport]; if(!cfg)notFound();
  const snapshot=await getPublicEventsSnapshot();
  const events=snapshot.events.filter(e=>e.sport===cfg.filter).sort((a,b)=>Date.parse(a.eventDate)-Date.parse(b.eventDate));
  return <main id="main-content" className="v2-calendar">
    <Breadcrumbs items={[{label:"Home",href:"/"},{label:"Sports",href:"/#sports"},{label:cfg.label}]}/>
    <section className="v2-calendar-hero">
      <p className="v2-eyebrow">{cfg.name}</p><h1>{cfg.label}</h1><p className="v2-hero-copy">{cfg.description}</p>
    </section>
    <section className="v2-results">
      <div className="v2-results-heading"><div><p className="v2-eyebrow">Schedule</p><h2>{events.length?"Upcoming events":"Coming soon"}</h2></div><p>{events.length} events</p></div>
      {events.length===0?<div className="v2-empty-state"><h3>{cfg.label} is ready in the architecture</h3><p>We have not published verified event data for this sport yet. This page is intentionally not indexed until real schedules are available.</p><Link href="/">Back to active sports</Link></div>:
      <div className="v2-event-list">{events.slice(0,30).map(event=><article className="v2-event-card" key={event.id}><div className="v2-event-main"><p className="v2-event-competition">{event.competition}</p><h3>{event.title}</h3><p className="v2-event-stage">{new Intl.DateTimeFormat("en",{dateStyle:"medium",timeStyle:"short"}).format(new Date(event.eventDate))}</p></div><Link className="v2-broadcast-link" href={event.detailPath}><span>{event.broadcasts.length} listings</span><strong>Where to watch →</strong></Link></article>)}</div>}
    </section>
  </main>;
}
