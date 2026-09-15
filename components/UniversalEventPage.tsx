import Link from "next/link";
import { notFound } from "next/navigation";
import Breadcrumbs from "@/components/Breadcrumbs";
import LocalTime from "@/components/LocalTime";
import FavoriteButton from "@/components/FavoriteButton";
import { getPublicEventsSnapshot } from "@/lib/public-events";
import type { EventData, Participant } from "@/lib/events";

function slugify(value:string){return value.normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/&/g," and ").replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"");}
function sportLabel(value:string){return value==="basketball"?"Basketball":value==="hockey"?"Ice hockey":value==="formula-1"?"Formula 1":value==="motogp"?"MotoGP":value==="ufc"?"UFC":value.charAt(0).toUpperCase()+value.slice(1);}
function participantHref(event:EventData,p?:Participant){if(!p)return null;if(p.type==="club")return `/sports/${event.sport}/club/${p.id.startsWith("club:")?p.id.split(":").slice(2).join(":"):slugify(p.name)}`;if(p.type==="national_team")return `/sports/${event.sport}/club/${slugify(p.name)}`;return null;}

export default async function UniversalEventPage({slug}:{slug:string}){
 const snapshot=await getPublicEventsSnapshot();const event=snapshot.events.find(e=>e.slug===slug);if(!event)notFound();
 const p1href=participantHref(event,event.participant1);const p2href=participantHref(event,event.participant2);const confirmed=event.broadcasts.filter(b=>b.coverageStatus==="confirmed");const free=confirmed.filter(b=>b.access==="Free");const countries=new Map<string,typeof confirmed>();for(const b of confirmed){countries.set(b.countryCode,[...(countries.get(b.countryCode)??[]),b]);}
 const favorite={kind:"event" as const,entityId:event.id,label:event.title};
 return <main id="main-content" className="v2-calendar">
   <Breadcrumbs items={[{label:"Home",href:"/"},{label:sportLabel(event.sport),href:`/sports/${event.sport}`},{label:event.competition,href:`/sports/${event.sport}/competition/${event.competitionSlug}`},{label:event.title}]}/>
   <section className="v2-event-hero"><div><p className="v2-eyebrow">{sportLabel(event.sport)} · <Link href={`/sports/${event.sport}/competition/${event.competitionSlug}`}>{event.competition}</Link></p><h1>{event.title}</h1><div className="v2-event-hero-meta"><span className="v2-status">{event.status??"scheduled"}</span><LocalTime date={event.eventDate}/>{event.venue?<span>{event.venue}</span>:null}</div></div><FavoriteButton favorite={favorite}/></section>
   {event.participant1||event.participant2?<section className="v2-versus-card"><div>{p1href?<Link href={p1href}><span>{event.participant1?.name.slice(0,2).toUpperCase()}</span><strong>{event.participant1?.name}</strong><small>Team profile →</small></Link>:<div><strong>{event.participant1?.name??"TBC"}</strong></div>}<b>VS</b>{p2href?<Link href={p2href}><span>{event.participant2?.name.slice(0,2).toUpperCase()}</span><strong>{event.participant2?.name}</strong><small>Team profile →</small></Link>:<div><strong>{event.participant2?.name??"TBC"}</strong></div>}</div></section>:null}
   <section className="v2-stats-row"><div><strong>{confirmed.length}</strong><span>Confirmed listings</span></div><div><strong>{free.length}</strong><span>Free options</span></div><div><strong>{countries.size}</strong><span>Countries</span></div><div><strong>{event.stage??"Event"}</strong><span>Stage</span></div></section>
   <section className="v2-results"><div className="v2-results-heading"><div><p className="v2-eyebrow">Official only</p><h2>Where to watch</h2></div><p>{confirmed.length} confirmed</p></div>{confirmed.length===0?<div className="v2-empty-state"><h3>Broadcasters not confirmed yet</h3><p>WatchTVSport does not guess missing coverage. Confirmed official options will appear here when verified.</p></div>:<div className="v2-broadcaster-country-list">{Array.from(countries.entries()).sort(([a],[b])=>a.localeCompare(b)).map(([code,list])=><section key={code}><h3>{list[0].countryName}</h3><div>{list.map(b=><a key={`${code}-${b.broadcaster}-${b.access}`} href={b.affiliateUrl||b.url} target="_blank" rel="noopener noreferrer"><span className={b.access==="Free"?"v2-chip is-free":"v2-chip is-paid"}>{b.access}</span><strong>{b.broadcaster}</strong><small>{b.broadcastType??"live"}{b.commentaryLanguages?.length?` · ${b.commentaryLanguages.join(", ")}`:""}</small><b>Open official service →</b></a>)}</div></section>)}</div>}</section>
   <nav className="v2-related-nav" aria-label="Related pages"><Link href={`/sports/${event.sport}`}>← {sportLabel(event.sport)}</Link><Link href={`/sports/${event.sport}/competition/${event.competitionSlug}`}>{event.competition} →</Link></nav>
 </main>;
}
