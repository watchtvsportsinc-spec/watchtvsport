import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import Breadcrumbs from "@/components/Breadcrumbs";
import { getPublicEventsSnapshot } from "@/lib/public-events";

type PageProps = { params: Promise<{ sport: string }> };

const SPORT_CONFIG: Record<string,{name:string;label:string;description:string;filter:string}> = {
  basketball:{name:"Basketball",label:"Basketball",description:"Browse basketball competitions, teams and upcoming games with official broadcast information by country.",filter:"basketball"},
  tennis:{name:"Tennis",label:"Tennis",description:"Browse tennis competitions and upcoming events without unnecessary player-page duplication.",filter:"tennis"},
  motogp:{name:"MotoGP",label:"MotoGP",description:"Browse MotoGP race weekends, sessions and official broadcasters.",filter:"motogp"},
  hockey:{name:"Ice hockey",label:"Ice hockey",description:"Browse hockey competitions, teams and upcoming games with official broadcast information by country.",filter:"hockey"},
};

function slugify(value:string){return value.normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/&/g," and ").replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"");}

export async function generateStaticParams(){return Object.keys(SPORT_CONFIG).map(sport=>({sport}));}

export async function generateMetadata({params}:PageProps):Promise<Metadata>{
  const {sport}=await params; const cfg=SPORT_CONFIG[sport];
  if(!cfg)return{title:"Sport not found",robots:{index:false,follow:false}};
  const snapshot=await getPublicEventsSnapshot();
  const hasEvents=snapshot.events.some(e=>e.sport===cfg.filter);
  return{title:`${cfg.label} TV schedule & official broadcasters`,description:`Find ${cfg.label} competitions, teams, schedules and official TV and streaming platforms by country.`,alternates:{canonical:`/sports/${sport}`},robots:hasEvents?{index:true,follow:true}:{index:false,follow:true}};
}

export default async function SportLandingPage({params}:PageProps){
  const {sport}=await params; const cfg=SPORT_CONFIG[sport]; if(!cfg)notFound();
  const snapshot=await getPublicEventsSnapshot();
  const events=snapshot.events.filter(e=>e.sport===cfg.filter).sort((a,b)=>Date.parse(a.eventDate)-Date.parse(b.eventDate));
  const now=Date.now();
  const upcoming=events.filter(e=>Date.parse(e.eventDate)>=now && e.status!=="finished");
  const competitions=Array.from(new Map(events.map(e=>[e.competitionSlug,{slug:e.competitionSlug,name:e.competition,count:0}])).values());
  for(const c of competitions)c.count=events.filter(e=>e.competitionSlug===c.slug).length;
  const participantMap=new Map<string,{name:string;slug:string}>();
  for(const e of events){for(const p of [e.participant1,e.participant2]){if(p&&(p.type==="club"||p.type==="national_team")){const slug=p.id.startsWith("club:")?p.id.split(":").slice(2).join(":"):slugify(p.name); participantMap.set(`${p.name}:${slug}`,{name:p.name,slug});}}}
  const participants=Array.from(participantMap.values()).sort((a,b)=>a.name.localeCompare(b.name));
  return <main id="main-content" className="v2-calendar">
    <Breadcrumbs items={[{label:"Home",href:"/"},{label:"Sports",href:"/#sports"},{label:cfg.label}]}/>
    <section className="v2-calendar-hero"><p className="v2-eyebrow">Sport hub</p><h1>{cfg.label}</h1><p className="v2-hero-copy">{cfg.description}</p><div className="v2-sport-pills"><a href="#competitions">Competitions</a>{participants.length?<a href="#teams">Teams</a>:null}<a href="#schedule">Schedule</a></div></section>

    <section id="competitions" className="v2-visual-section"><div className="v2-section-heading"><div><p className="v2-eyebrow">Explore</p><h2>Competitions</h2></div><span>{competitions.length}</span></div>
      <div className="v2-entity-grid">{competitions.map(c=><Link className="v2-entity-tile" key={c.slug} href={`/sports/${sport}/competition/${c.slug}`}><span className="v2-entity-icon">🏆</span><strong>{c.name}</strong><small>{c.count} events</small><b>Open competition →</b></Link>)}</div>
    </section>

    {participants.length?<section id="teams" className="v2-visual-section"><div className="v2-section-heading"><div><p className="v2-eyebrow">Participants</p><h2>Teams</h2></div><span>{participants.length}</span></div><div className="v2-team-link-grid">{participants.map(team=><Link key={`${team.name}-${team.slug}`} href={`/sports/${sport}/club/${team.slug}`}><span>{team.name.slice(0,2).toUpperCase()}</span><strong>{team.name}</strong><small>Team profile →</small></Link>)}</div></section>:null}

    <section id="schedule" className="v2-results"><div className="v2-results-heading"><div><p className="v2-eyebrow">Schedule</p><h2>{upcoming.length?"Upcoming events":"Coming soon"}</h2></div><p>{upcoming.length} upcoming</p></div>
      {upcoming.length===0?<div className="v2-empty-state"><h3>No upcoming event currently confirmed</h3><p>Verified schedules will appear here automatically when available.</p><Link href="/">Back to calendar</Link></div>:<div className="v2-event-list">{upcoming.slice(0,40).map(event=><article className="v2-event-card" key={event.id}><div className="v2-event-main"><p className="v2-event-competition"><Link href={`/sports/${sport}/competition/${event.competitionSlug}`}>{event.competition}</Link></p><h3><Link href={event.detailPath}>{event.title}</Link></h3><p className="v2-event-stage">{new Intl.DateTimeFormat("en",{dateStyle:"medium",timeStyle:"short"}).format(new Date(event.eventDate))}</p></div><Link className="v2-broadcast-link" href={event.detailPath}><span>{event.broadcasts.filter(b=>b.coverageStatus==="confirmed").length} confirmed</span><strong>Where to watch →</strong></Link></article>)}</div>}
    </section>
  </main>;
}
