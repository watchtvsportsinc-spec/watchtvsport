import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import Breadcrumbs from "@/components/Breadcrumbs";
import FavoriteButton from "@/components/FavoriteButton";
import ParticipantSportVisual from "@/components/ParticipantSportVisual";
import { displayCompetitionName, getCompetitionCatalogEntry } from "@/lib/competition-catalog";
import type { FavoriteCandidate } from "@/lib/favorites";
import type { ParticipantVisualProfile } from "@/lib/participant-visuals";
import { getPublicCompetition } from "@/lib/public-competition";
import { getPublicEventsSnapshot } from "@/lib/public-events";
import { getSportLabel } from "@/lib/sports-registry";

type TeamLink={name:string;slug:string;visual?:ParticipantVisualProfile;countryCode?:string};

function slugify(value:string){return value.normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/&/g," and ").replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"");}
export function competitionPath(sport:string,competition:string){return sport==="football"?`/football/competition/${competition}`:`/sports/${sport}/competition/${competition}`;}
function sportPath(sport:string){if(sport==="football")return"/football";if(sport==="formula-1")return"/formula-1";if(sport==="ufc")return"/ufc";return`/sports/${sport}`;}

async function competitionData(sport:string,competition:string){
  const [permanent,snapshot]=await Promise.all([getPublicCompetition(sport,competition),getPublicEventsSnapshot()]);
  const events=snapshot.events.filter(e=>e.sport===sport&&e.competitionSlug===competition).sort((a,b)=>Date.parse(a.eventDate)-Date.parse(b.eventDate));
  const rawName=permanent?.name??events[0]?.competition??competition.replace(/-/g," ");
  const name=displayCompetitionName(sport,competition,rawName);
  return{permanent,events,name};
}

export async function buildCompetitionMetadata(sport:string,competition:string):Promise<Metadata>{
  const {permanent,events,name}=await competitionData(sport,competition);
  if(!permanent&&!events.length)return{title:"Competition not found | WatchTVSport",robots:{index:false,follow:false}};
  const next=events.find(e=>e.status==="live"||(e.status!=="finished"&&Date.parse(e.eventDate)>=Date.now()));
  const description=next?`${name} schedule, teams and next event: ${next.title}. Find official TV and streaming options by country.`:`${name} schedule, participating teams and official TV and streaming options by country.`;
  return{title:`${name} TV schedule, fixtures & where to watch | WatchTVSport`,description,alternates:{canonical:competitionPath(sport,competition)},robots:{index:true,follow:true},openGraph:{title:`${name} TV schedule & fixtures | WatchTVSport`,description,url:competitionPath(sport,competition),type:"website"},twitter:{card:"summary_large_image",title:`${name} TV schedule | WatchTVSport`,description}};
}

export default async function UniversalCompetitionPage({sport,competition}:{sport:string;competition:string}){
  const {permanent,events,name}=await competitionData(sport,competition);
  if(!permanent&&!events.length)notFound();
  const now=Date.now();
  const live=events.filter(e=>e.status==="live");
  const upcoming=events.filter(e=>e.status!=="finished"&&Date.parse(e.eventDate)>=now);
  const recent=events.filter(e=>e.status==="finished"||Date.parse(e.eventDate)<now).slice(-10).reverse();
  const participants=new Map<string,TeamLink>();
  for(const team of permanent?.teams??[])participants.set(team.slug,{name:team.name,slug:team.slug,visual:team.visual});
  for(const event of events)for(const participant of[event.participant1,event.participant2]){if(!participant||(participant.type!=="club"&&participant.type!=="national_team"&&participant.type!=="team"&&participant.type!=="franchise"))continue;const slug=participant.slug||(participant.id.startsWith("club:")?participant.id.split(":").slice(2).join(":"):slugify(participant.name));const old=participants.get(slug);participants.set(slug,{name:participant.name,slug,visual:participant.visualProfile??old?.visual,countryCode:participant.countryCode??old?.countryCode});}
  const teams=Array.from(participants.values()).sort((a,b)=>a.name.localeCompare(b.name));
  const confirmed=events.reduce((sum,event)=>sum+event.broadcasts.filter(b=>b.coverageStatus==="confirmed").length,0);
  const favorite:FavoriteCandidate={kind:"competition",entityId:`${sport}:${competition}`,label:`${name} (${getSportLabel(sport)})`};
  const catalog=getCompetitionCatalogEntry(sport,competition);
  const jsonLd={"@context":"https://schema.org","@type":"SportsOrganization",name,sport:getSportLabel(sport),url:`https://watchtvsport.com${competitionPath(sport,competition)}`,...(catalog?.region?{areaServed:catalog.region}:{})};
  const crumbs={"@context":"https://schema.org","@type":"BreadcrumbList",itemListElement:[{"@type":"ListItem",position:1,name:"Home",item:"https://watchtvsport.com/"},{"@type":"ListItem",position:2,name:getSportLabel(sport),item:`https://watchtvsport.com${sportPath(sport)}`},{"@type":"ListItem",position:3,name,item:`https://watchtvsport.com${competitionPath(sport,competition)}`}]};
  return <main id="main-content" className="v2-calendar">
    <script type="application/ld+json" dangerouslySetInnerHTML={{__html:JSON.stringify(jsonLd)}}/><script type="application/ld+json" dangerouslySetInnerHTML={{__html:JSON.stringify(crumbs)}}/>
    <Breadcrumbs items={[{label:"Home",href:"/"},{label:getSportLabel(sport),href:sportPath(sport)},{label:name}]}/>
    <section className="v2-calendar-hero"><p className="v2-eyebrow">{catalog?.category?.replace(/-/g," ")??"Competition"}</p><h1>{name}</h1><p className="v2-hero-copy">Fixtures, participants and official viewing information for {name}. Open an event to see broadcasters by country.</p><div className="v2-sport-pills"><FavoriteButton favorite={favorite}/><a href="#schedule">Schedule</a>{teams.length?<a href="#participants">Participants</a>:null}<Link href={`/events?view=all&sport=${encodeURIComponent(sport)}&competition=${encodeURIComponent(competition)}`}>All events</Link></div></section>
    <section className="v2-stats-row"><div><strong>{live.length}</strong><span>Live</span></div><div><strong>{upcoming.length}</strong><span>Upcoming</span></div><div><strong>{teams.length}</strong><span>Participants</span></div><div><strong>{confirmed}</strong><span>Confirmed listings</span></div></section>
    <section id="schedule" className="v2-results"><div className="v2-results-heading"><div><p className="v2-eyebrow">Schedule</p><h2>Next events</h2></div><p>{upcoming.length}</p></div>{upcoming.length?<div className="v2-event-list">{upcoming.slice(0,60).map(event=><article className="v2-event-card" key={event.id}><div className="v2-event-main"><p className="v2-event-competition">{event.stage??name}</p><h3><Link href={event.detailPath}>{event.title}</Link></h3><p className="v2-event-stage">{new Intl.DateTimeFormat("en",{dateStyle:"medium",timeStyle:"short"}).format(new Date(event.eventDate))}</p></div><Link className="v2-broadcast-link" href={event.detailPath}><span>{event.broadcasts.filter(b=>b.coverageStatus==="confirmed").length} confirmed</span><strong>Match page →</strong></Link></article>)}</div>:<div className="v2-empty-state"><h3>No upcoming event confirmed</h3><p>This permanent competition page will populate automatically when verified fixtures are imported.</p></div>}</section>
    {teams.length?<section id="participants" className="v2-visual-section"><div className="v2-section-heading"><div><p className="v2-eyebrow">Participants</p><h2>Teams & participants</h2></div><span>{teams.length}</span></div><div className="v2-team-link-grid">{teams.map(team=><Link key={team.slug} href={`/sports/${sport}/club/${team.slug}`}><ParticipantSportVisual sport={sport} label={team.name} countryCode={team.countryCode} visual={team.visual} size="sm"/><strong>{team.name}</strong><small>Profile →</small></Link>)}</div></section>:null}
    {recent.length?<section className="v2-results"><div className="v2-results-heading"><div><p className="v2-eyebrow">Archive</p><h2>Recent events</h2></div></div><div className="v2-event-list">{recent.map(event=><article className="v2-event-card" key={event.id}><div className="v2-event-main"><h3><Link href={event.detailPath}>{event.title}</Link></h3><p className="v2-event-stage">{new Intl.DateTimeFormat("en",{dateStyle:"medium"}).format(new Date(event.eventDate))}</p></div><Link className="v2-broadcast-link" href={event.detailPath}><strong>Open →</strong></Link></article>)}</div></section>:null}
  </main>;
}
