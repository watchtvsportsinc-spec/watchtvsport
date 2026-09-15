import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import Breadcrumbs from "@/components/Breadcrumbs";
import { getPublicEventsSnapshot } from "@/lib/public-events";
import { getPublicParticipantsForSport } from "@/lib/public-participants";
import styles from "./sport-page.module.css";

type PageProps = { params: Promise<{ sport: string }> };

type SportConfig = { name: string; label: string; description: string; filter: string; league?: string; teamLabel?: string };

const SPORT_CONFIG: Record<string, SportConfig> = {
  basketball:{name:"Basketball",label:"NBA",description:"NBA teams, upcoming events and verified official broadcast coverage by country.",filter:"basketball",league:"NBA",teamLabel:"NBA teams"},
  tennis:{name:"Tennis",label:"Tennis",description:"Tournament-level tennis coverage without unnecessary player pages.",filter:"tennis"},
  motogp:{name:"MotoGP",label:"MotoGP",description:"MotoGP race weekends and official broadcasters use the same multi-session architecture as Formula 1.",filter:"motogp"},
  hockey:{name:"Ice hockey",label:"NHL",description:"NHL teams, upcoming games and verified official broadcast coverage by country.",filter:"hockey",league:"NHL",teamLabel:"NHL teams"},
  "american-football":{name:"American Football",label:"NFL",description:"NFL teams, upcoming games and verified official broadcast coverage by country.",filter:"american-football",league:"NFL",teamLabel:"NFL teams"},
};

export async function generateStaticParams(){return Object.keys(SPORT_CONFIG).map(sport=>({sport}));}

export async function generateMetadata({params}:PageProps):Promise<Metadata>{
  const {sport}=await params; const cfg=SPORT_CONFIG[sport];
  if(!cfg)return{title:"Sport not found",robots:{index:false,follow:false}};
  const [snapshot,participants]=await Promise.all([getPublicEventsSnapshot(),getPublicParticipantsForSport(cfg.filter)]);
  const hasEvents=snapshot.events.some(e=>e.sport===cfg.filter);
  const hasVerifiedDirectory=Boolean(cfg.league&&participants.some(p=>p.type==="team"||p.type==="club"));
  return{
    title:`${cfg.label} TV schedule, teams & official broadcasters`,
    description:`Find ${cfg.label} teams, schedules and where to watch legally with official TV channels and streaming platforms by country.`,
    alternates:{canonical:`/sports/${sport}`},
    robots:hasEvents||hasVerifiedDirectory?{index:true,follow:true}:{index:false,follow:true},
    openGraph:{title:`${cfg.label} teams, schedule & where to watch`,description:cfg.description,url:`/sports/${sport}`,type:"website"},
  };
}

export default async function SportLandingPage({params}:PageProps){
  const {sport}=await params; const cfg=SPORT_CONFIG[sport]; if(!cfg)notFound();
  const [snapshot,participants]=await Promise.all([getPublicEventsSnapshot(),getPublicParticipantsForSport(cfg.filter)]);
  const events=snapshot.events.filter(e=>e.sport===cfg.filter).sort((a,b)=>Date.parse(a.eventDate)-Date.parse(b.eventDate));
  const teams=participants.filter(p=>p.type==="team"||p.type==="club");
  const leagueJsonLd=cfg.league&&teams.length?{"@context":"https://schema.org","@type":"SportsOrganization",name:cfg.league,sport:cfg.name,url:`https://watchtvsport.com/sports/${sport}`,member:teams.map(team=>({"@type":"SportsTeam",name:team.name,url:`https://watchtvsport.com/sports/${sport}/team/${team.slug}`}))}:null;
  return <main id="main-content" className="v2-calendar">
    {leagueJsonLd?<script type="application/ld+json" dangerouslySetInnerHTML={{__html:JSON.stringify(leagueJsonLd)}}/>:null}
    <Breadcrumbs items={[{label:"Home",href:"/"},{label:"Sports",href:"/#sports"},{label:cfg.label}]}/>
    <section className="v2-calendar-hero">
      <p className="v2-eyebrow">{cfg.name}</p><h1>{cfg.label}</h1><p className="v2-hero-copy">{cfg.description}</p>
      {teams.length?<p className="v2-timezone-note">{teams.length} verified league participants are already in the V2 directory.</p>:null}
    </section>

    {teams.length?<section className="v2-results" aria-labelledby="teams-title">
      <div className="v2-results-heading"><div><p className="v2-eyebrow">Teams</p><h2 id="teams-title">{cfg.teamLabel??"Teams"}</h2></div><p>{teams.length} teams</p></div>
      <div className={styles.teamDirectory}>
        {teams.map(team=><Link key={team.id} href={`/sports/${sport}/team/${team.slug}`} className={styles.teamCard}>
          <span className={styles.teamMark} aria-hidden="true">{team.name.split(/\s+/).slice(0,2).map(part=>part[0]).join("").toUpperCase()}</span>
          <span className={styles.teamText}><strong>{team.name}</strong><small>{team.countryCode??cfg.league??cfg.name}</small></span>
          <b className={styles.arrow} aria-hidden="true">→</b>
        </Link>)}
      </div>
    </section>:null}

    <section className="v2-results">
      <div className="v2-results-heading"><div><p className="v2-eyebrow">Schedule</p><h2>{events.length?"Upcoming events":"Schedule coming next"}</h2></div><p>{events.length} events</p></div>
      {events.length===0?<div className="v2-empty-state"><h3>{cfg.label} team directory is live in V2</h3><p>The verified teams are ready. Match schedules and broadcaster coverage remain unpublished until authoritative event data has been imported and checked.</p><Link href="/">Back to active events</Link></div>:
      <div className="v2-event-list">{events.slice(0,30).map(event=><article className="v2-event-card" key={event.id}><div className="v2-event-main"><p className="v2-event-competition">{event.competition}</p><h3>{event.title}</h3><p className="v2-event-stage">{new Intl.DateTimeFormat("en",{dateStyle:"medium",timeStyle:"short"}).format(new Date(event.eventDate))}</p></div><Link className="v2-broadcast-link" href={event.detailPath}><span>{event.broadcasts.length} listings</span><strong>Where to watch →</strong></Link></article>)}</div>}
    </section>
  </main>;
}
