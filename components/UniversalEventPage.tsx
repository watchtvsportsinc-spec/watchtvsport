import Link from "next/link";
import { notFound } from "next/navigation";
import Breadcrumbs from "@/components/Breadcrumbs";
import LocalTime from "@/components/LocalTime";
import FavoriteButton from "@/components/FavoriteButton";
import ParticipantSportVisual from "@/components/ParticipantSportVisual";
import { resolveClubSlug } from "@/lib/club-aliases";
import { getPublicEventsSnapshot } from "@/lib/public-events";
import type { EventData, Participant } from "@/lib/events";

function slugify(value:string){return value.normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/&/g," and ").replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"");}
function sportLabel(value:string){return value==="basketball"?"Basketball":value==="hockey"?"Ice hockey":value==="american-football"?"American football":value==="formula-1"?"Formula 1":value==="motogp"?"MotoGP":value==="ufc"?"UFC":value.charAt(0).toUpperCase()+value.slice(1);}
function sportHref(sport:string){if(sport==="football")return "/football";if(sport==="formula-1")return "/formula-1";if(sport==="ufc")return "/ufc";return `/sports/${sport}`;}
function competitionHref(event:EventData){if(event.sport==="football")return `/football/competition/${event.competitionSlug}`;if(event.sport==="formula-1")return "/formula-1";if(event.sport==="ufc")return "/ufc";return `/sports/${event.sport}/competition/${event.competitionSlug}`;}
function participantHref(event:EventData,p?:Participant){
  if(!p)return null;
  const clubPathSlug=p.slug||(p.id.startsWith("club:")?p.id.split(":").slice(2).join(":"):resolveClubSlug(p.name));
  if(event.sport==="football"&&p.type==="national_team")return `/football/nation/${slugify(p.name)}`;
  if(p.type==="club"||p.type==="national_team")return `/sports/${event.sport}/club/${p.type==="club"?clubPathSlug:slugify(p.name)}`;
  return null;
}
function schemaStatus(event:EventData){if(event.status==="live")return"https://schema.org/EventInProgress";if(event.status==="finished"||Date.parse(event.eventDate)<Date.now())return"https://schema.org/EventCompleted";return"https://schema.org/EventScheduled";}
function latestChecked(event:EventData){const values=event.broadcasts.map(b=>b.lastChecked).filter((value):value is string=>Boolean(value)).sort();return values.at(-1)??null;}
function checkedLabel(value:string){const parsed=new Date(value);return Number.isNaN(parsed.getTime())?value.split("T")[0]:new Intl.DateTimeFormat("en",{month:"short",day:"numeric",year:"numeric"}).format(parsed);}
function schemaPerformer(participant:Participant){return participant.type==="player"?{"@type":"Person",name:participant.name}:{"@type":"SportsTeam",name:participant.name};}

function ParticipantBlock({event,participant,href}:{event:EventData;participant?:Participant;href:string|null}){
  if(!participant)return <div><strong>TBC</strong></div>;
  const visual=<ParticipantSportVisual sport={event.sport} label={participant.name} countryCode={participant.countryCode} visual={participant.visualProfile} size="md"/>;
  if(href)return <Link href={href}>{visual}<strong>{participant.name}</strong></Link>;
  return <div>{visual}<strong>{participant.name}</strong></div>;
}

export default async function UniversalEventPage({slug}:{slug:string}){
 const snapshot=await getPublicEventsSnapshot({slug,limit:1});const event=snapshot.events.find(e=>e.slug===slug);if(!event)notFound();
 const eventSportHref=sportHref(event.sport);const eventCompetitionHref=competitionHref(event);const p1href=participantHref(event,event.participant1);const p2href=participantHref(event,event.participant2);const confirmed=event.broadcasts.filter(b=>b.coverageStatus==="confirmed");const free=confirmed.filter(b=>b.access==="Free");const countries=new Map<string,typeof confirmed>();for(const b of confirmed){countries.set(b.countryCode,[...(countries.get(b.countryCode)??[]),b]);}
 const favorite={kind:"event" as const,entityId:event.id,label:event.title};const lastChecked=latestChecked(event);
 const jsonLd={"@context":"https://schema.org","@type":"SportsEvent",name:event.title,startDate:event.eventDate,eventStatus:schemaStatus(event),sport:sportLabel(event.sport),url:`https://watchtvsport.com${event.detailPath}`,...(event.venue||event.country?{location:{"@type":"Place",name:event.venue??event.country,...(event.country?{address:{"@type":"PostalAddress",addressCountry:event.country}}:{})}}:{}),...((event.participant1||event.participant2)?{performer:[event.participant1,event.participant2].filter((participant):participant is Participant=>Boolean(participant)).map(schemaPerformer)}:{})};
 return <main id="main-content" className="v2-calendar">
   <script type="application/ld+json" dangerouslySetInnerHTML={{__html:JSON.stringify(jsonLd)}}/>
   <Breadcrumbs items={[{label:"Home",href:"/"},{label:sportLabel(event.sport),href:eventSportHref},{label:event.competition,href:eventCompetitionHref},{label:event.title}]}/>
   <section className="v2-event-hero"><div><p className="v2-eyebrow">{sportLabel(event.sport)} · <Link href={eventCompetitionHref}>{event.competition}</Link></p><h1>{event.title}</h1><div className="v2-event-hero-meta"><span className="v2-status">{event.status??"scheduled"}</span><LocalTime date={event.eventDate}/>{event.venue?<span>{event.venue}</span>:null}</div></div><FavoriteButton favorite={favorite}/></section>
   {event.participant1||event.participant2?<section className="v2-versus-card"><div><ParticipantBlock event={event} participant={event.participant1} href={p1href}/><b>VS</b><ParticipantBlock event={event} participant={event.participant2} href={p2href}/></div></section>:null}
   <section className="v2-stats-row"><div><strong>{confirmed.length}</strong><span>Listings</span></div><div><strong>{free.length}</strong><span>Free</span></div><div><strong>{countries.size}</strong><span>Countries</span></div><div><strong>{event.stage??"Event"}</strong><span>Stage</span></div></section>
   <section className="v2-results"><div className="v2-results-heading"><div><p className="v2-eyebrow">Official only</p><h2>Where to watch</h2></div><p>{confirmed.length} confirmed</p></div>{confirmed.length===0?<div className="v2-empty-state"><h3>Broadcasters not confirmed yet</h3><p>WatchTVSport does not guess missing coverage. Confirmed official options will appear here when verified.</p><p><Link href="/methodology">How listings are verified →</Link></p></div>:<div className="v2-broadcaster-country-list">{Array.from(countries.entries()).sort(([a],[b])=>a.localeCompare(b)).map(([code,list])=><section key={code}><h3>{list[0].countryName}</h3><div>{list.map(b=><a key={`${code}-${b.broadcaster}-${b.access}`} href={b.affiliateUrl||b.url} target="_blank" rel="noopener noreferrer"><span className={b.access==="Free"?"v2-chip is-free":"v2-chip is-paid"}>{b.access}</span><strong>{b.broadcaster}</strong><small>{b.broadcastType??"live"}{b.commentaryLanguages?.length?` · ${b.commentaryLanguages.join(", ")}`:""}</small><b>Official service →</b></a>)}</div></section>)}</div>}{lastChecked?<p className="v2-verification-note">✓ Broadcast information verified {checkedLabel(lastChecked)}</p>:null}</section>
   <nav className="v2-related-nav" aria-label="Related pages"><Link href={eventSportHref}>← {sportLabel(event.sport)}</Link><Link href={eventCompetitionHref}>{event.competition} →</Link><Link href="/methodology">Verification →</Link></nav>
 </main>;
}
