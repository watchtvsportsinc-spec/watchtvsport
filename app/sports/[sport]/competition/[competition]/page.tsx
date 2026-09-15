import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import Breadcrumbs from "@/components/Breadcrumbs";
import { getPublicEventsSnapshot } from "@/lib/public-events";

type PageProps={params:Promise<{sport:string;competition:string}>};

function slugify(value:string){return value.normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/&/g," and ").replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"");}
function sportLabel(value:string){return value==="basketball"?"Basketball":value==="hockey"?"Ice hockey":value==="formula-1"?"Formula 1":value==="motogp"?"MotoGP":value==="ufc"?"UFC":value.charAt(0).toUpperCase()+value.slice(1);}
function canonicalCompetitionPath(sport:string,competition:string){if(sport==="football")return `/football/competition/${competition}`;if(sport==="formula-1")return "/formula-1";if(sport==="ufc")return "/ufc";return `/sports/${sport}/competition/${competition}`;}

export async function generateMetadata({params}:PageProps):Promise<Metadata>{const {sport,competition}=await params;const snapshot=await getPublicEventsSnapshot();const event=snapshot.events.find(e=>e.sport===sport&&e.competitionSlug===competition);if(!event)return{title:"Competition not found",robots:{index:false,follow:false}};return{title:`${event.competition} schedule & official broadcasters`,description:`Upcoming ${event.competition} events, participating teams and official TV and streaming options by country.`,alternates:{canonical:canonicalCompetitionPath(sport,competition)}};}

export default async function CompetitionPage({params}:PageProps){
 const {sport,competition}=await params;
 if(sport==="football")redirect(`/football/competition/${competition}`);
 if(sport==="formula-1")redirect("/formula-1");
 if(sport==="ufc")redirect("/ufc");
 const snapshot=await getPublicEventsSnapshot();const events=snapshot.events.filter(e=>e.sport===sport&&e.competitionSlug===competition).sort((a,b)=>Date.parse(a.eventDate)-Date.parse(b.eventDate));if(!events.length)notFound();
 const name=events[0].competition;const now=Date.now();const upcoming=events.filter(e=>Date.parse(e.eventDate)>=now&&e.status!=="finished");const recent=events.filter(e=>Date.parse(e.eventDate)<now||e.status==="finished").slice(-12).reverse();
 const participants=new Map<string,{name:string;slug:string}>();for(const e of events){for(const p of [e.participant1,e.participant2]){if(p&&(p.type==="club"||p.type==="national_team")){const slug=p.id.startsWith("club:")?p.id.split(":").slice(2).join(":"):slugify(p.name);participants.set(`${p.name}:${slug}`,{name:p.name,slug});}}}
 const teams=Array.from(participants.values()).sort((a,b)=>a.name.localeCompare(b.name));
 return <main id="main-content" className="v2-calendar"><Breadcrumbs items={[{label:"Home",href:"/"},{label:sportLabel(sport),href:`/sports/${sport}`},{label:name}]}/>
 <section className="v2-calendar-hero"><p className="v2-eyebrow">Competition</p><h1>{name}</h1><p className="v2-hero-copy">Schedule, participating teams and verified official broadcast information in one permanent competition page.</p><div className="v2-sport-pills"><a href="#schedule">Schedule</a>{teams.length?<a href="#teams">Teams</a>:null}<Link href={`/?view=all&sport=${encodeURIComponent(sport)}&competition=${encodeURIComponent(competition)}#calendar-results`}>Full calendar</Link></div></section>
 <section className="v2-stats-row"><div><strong>{upcoming.length}</strong><span>Upcoming</span></div><div><strong>{teams.length}</strong><span>Teams</span></div><div><strong>{events.length}</strong><span>Events loaded</span></div><div><strong>{events.reduce((n,e)=>n+e.broadcasts.filter(b=>b.coverageStatus==="confirmed").length,0)}</strong><span>Confirmed listings</span></div></section>
 <section id="schedule" className="v2-results"><div className="v2-results-heading"><div><p className="v2-eyebrow">Schedule</p><h2>Next events</h2></div><p>{upcoming.length}</p></div><div className="v2-event-list">{upcoming.slice(0,50).map(e=><article className="v2-event-card" key={e.id}><div className="v2-event-main"><p className="v2-event-competition">{name}{e.stage?` · ${e.stage}`:""}</p><h3><Link href={e.detailPath}>{e.title}</Link></h3><p className="v2-event-stage">{new Intl.DateTimeFormat("en",{dateStyle:"medium",timeStyle:"short"}).format(new Date(e.eventDate))}</p></div><Link className="v2-broadcast-link" href={e.detailPath}><span>{e.broadcasts.filter(b=>b.coverageStatus==="confirmed").length} confirmed</span><strong>Where to watch →</strong></Link></article>)}</div></section>
 {teams.length?<section id="teams" className="v2-visual-section"><div className="v2-section-heading"><div><p className="v2-eyebrow">Participants</p><h2>Teams</h2></div></div><div className="v2-team-link-grid">{teams.map(t=><Link key={`${t.name}-${t.slug}`} href={`/sports/${sport}/club/${t.slug}`}><span>{t.name.slice(0,2).toUpperCase()}</span><strong>{t.name}</strong><small>Team profile →</small></Link>)}</div></section>:null}
 {recent.length?<section className="v2-results"><div className="v2-results-heading"><div><p className="v2-eyebrow">Archive</p><h2>Recent events</h2></div></div><div className="v2-event-list">{recent.map(e=><article className="v2-event-card" key={e.id}><div className="v2-event-main"><h3><Link href={e.detailPath}>{e.title}</Link></h3><p className="v2-event-stage">{new Intl.DateTimeFormat("en",{dateStyle:"medium"}).format(new Date(e.eventDate))}</p></div></article>)}</div></section>:null}
 </main>;
}
