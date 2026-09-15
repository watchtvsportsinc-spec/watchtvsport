import Link from "next/link";
import { getPublicEventsSnapshot } from "@/lib/public-events";

export default async function HomePopularNow(){
  const snapshot=await getPublicEventsSnapshot();
  const now=Date.now();
  const events=snapshot.events
    .filter(e=>Date.parse(e.eventDate)>=now&&e.status!=="finished")
    .map(e=>({event:e,confirmed:e.broadcasts.filter(b=>b.coverageStatus==="confirmed").length}))
    .sort((a,b)=>{
      const aSoon=Math.max(0,Date.parse(a.event.eventDate)-now);const bSoon=Math.max(0,Date.parse(b.event.eventDate)-now);
      const aScore=a.confirmed*1_000_000-Math.min(aSoon,7*24*3600_000);const bScore=b.confirmed*1_000_000-Math.min(bSoon,7*24*3600_000);
      return bScore-aScore;
    }).slice(0,4);
  if(!events.length)return null;
  return <section className="v2-visual-section" aria-labelledby="popular-now-title"><div className="v2-section-heading"><div><p className="v2-eyebrow">Popular now</p><h2 id="popular-now-title">Worth checking next</h2></div><Link href="/?view=all#calendar-results">All events →</Link></div><p className="v2-timezone-note">Currently ranked from upcoming timing and verified broadcast availability. Audience popularity will replace this signal once enough analytics data is available.</p><div className="v2-popular-rail">{events.map(({event,confirmed})=><Link className="v2-popular-card" href={event.detailPath} key={event.id}><small>{event.competition}</small><strong>{event.title}</strong><span>{new Intl.DateTimeFormat("en",{weekday:"short",month:"short",day:"numeric",hour:"2-digit",minute:"2-digit"}).format(new Date(event.eventDate))}</span><b>{confirmed} confirmed · Where to watch →</b></Link>)}</div></section>;
}
