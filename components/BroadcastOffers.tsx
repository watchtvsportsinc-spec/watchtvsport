import type { EventData } from "@/lib/events";
import type { BroadcastInfo } from "@/lib/matches";

type AccessFilter = "Free" | "Paid" | "";
type Props = { events: EventData[]; selectedCountry?: string; selectedAccess?: string; title?: string };
type AggregatedOffer = { key: string; broadcast: BroadcastInfo; sessions: string[] };

function offerKey(b: BroadcastInfo) { return [b.countryCode,b.broadcaster,b.url,b.broadcastType??"live",b.access].join("|"); }
function sessionLabel(event: EventData) { return event.stage || event.sessionType?.replaceAll("_"," ") || event.title; }
function aggregate(events: EventData[]): AggregatedOffer[] {
  const offers = new Map<string,{broadcast:BroadcastInfo;sessions:Set<string>}>();
  for (const event of events) for (const broadcast of event.broadcasts) {
    if (broadcast.coverageStatus !== "confirmed") continue;
    const key=offerKey(broadcast); const current=offers.get(key)??{broadcast,sessions:new Set<string>()};
    current.sessions.add(sessionLabel(event)); offers.set(key,current);
  }
  return Array.from(offers,([key,v])=>({key,broadcast:v.broadcast,sessions:Array.from(v.sessions)}));
}

export default function BroadcastOffers({events,selectedCountry,selectedAccess,title="Where to watch"}:Props){
  const allOffers=aggregate(events);
  const countries=Array.from(new Map(allOffers.map(o=>[o.broadcast.countryCode,{code:o.broadcast.countryCode,name:o.broadcast.countryName}])).values()).sort((a,b)=>a.name.localeCompare(b.name));
  const country=selectedCountry&&countries.some(c=>c.code===selectedCountry)?selectedCountry:"";
  const access:AccessFilter=selectedAccess==="Free"||selectedAccess==="Paid"?selectedAccess:"";
  const visibleOffers=allOffers.filter(o=>(!country||o.broadcast.countryCode===country)&&(!access||o.broadcast.access===access));
  const grouped=new Map<string,AggregatedOffer[]>();
  for(const offer of visibleOffers){const key=offer.broadcast.countryCode;grouped.set(key,[...(grouped.get(key)??[]),offer]);}
  const freeCount=allOffers.filter(o=>o.broadcast.access==="Free").length;
  const paidCount=allOffers.filter(o=>o.broadcast.access==="Paid").length;

  return <section className="v2-results" aria-labelledby="broadcast-options-title">
    <div className="v2-results-heading"><div><p className="v2-eyebrow">Official viewing options</p><h2 id="broadcast-options-title">{title}</h2></div><p>{visibleOffers.length} confirmed</p></div>
    <form method="get" className="v2-broadcast-filters">
      <label htmlFor="country-broadcast-filter">Country<select id="country-broadcast-filter" name="country" defaultValue={country}><option value="">All available countries</option>{countries.map(c=><option key={c.code} value={c.code}>{c.name}</option>)}</select></label>
      <label htmlFor="access-broadcast-filter">Access<select id="access-broadcast-filter" name="access" defaultValue={access}><option value="">Free + Paid</option>{freeCount>0?<option value="Free">Free ({freeCount})</option>:null}{paidCount>0?<option value="Paid">Paid ({paidCount})</option>:null}</select></label>
      <button type="submit">Apply</button>
    </form>
    {visibleOffers.length===0?<div className="v2-empty-state" role="status"><h3>Broadcast information pending</h3><p>No verified official viewing option matches these filters. WatchTVSport never infers event coverage from general rights.</p></div>:
    <div className="v2-event-groups">{Array.from(grouped.entries()).map(([countryCode,offers])=><section className="v2-event-group" key={countryCode}><h3>{offers[0].broadcast.countryName}</h3><div className="v2-event-list">{offers.map(({key,broadcast,sessions})=><article className="v2-event-card" key={key}><div className="v2-event-main"><p className="v2-event-competition"><span className={`v2-access-badge v2-access-${broadcast.access.toLowerCase()}`}>{broadcast.access}</span> · {broadcast.broadcastType??"live"}</p><h4>{broadcast.broadcaster}</h4>{events.length>1?<p className="v2-event-stage">Sessions: {sessions.join(" · ")}</p>:null}{broadcast.commentaryLanguages?.length?<p className="v2-event-stage">Languages: {broadcast.commentaryLanguages.join(", ")}</p>:null}{broadcast.accessConditions?<p className="v2-event-stage">{broadcast.accessConditions}</p>:null}{broadcast.lastChecked?<p className="v2-event-stage">Verified: {broadcast.lastChecked}</p>:null}</div><a className="v2-broadcast-link" href={broadcast.affiliateUrl??broadcast.url} rel="noopener noreferrer sponsored" target="_blank"><span>{broadcast.requiresAccount?"Account or subscription may be required":"Official service"}</span><strong>Open official service →</strong></a></article>)}</div></section>)}</div>}
  </section>;
}
