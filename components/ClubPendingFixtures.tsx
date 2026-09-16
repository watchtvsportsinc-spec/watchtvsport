import Link from "next/link";
import { fixtureWindowLabel } from "@/lib/public-fixtures";
import { getPublicParticipantFixtures } from "@/lib/public-fixtures";
import { getPublicParticipantProfile } from "@/lib/participant-profiles";

export default async function ClubPendingFixtures({sport,club}:{sport:string;club:string}){
  if(sport!=="football")return null;
  const verified=await getPublicParticipantProfile(club,sport);if(!verified)return null;
  const fixtures=await getPublicParticipantFixtures(verified.participantId);
  const today=new Date().toISOString().slice(0,10);
  const pending=fixtures.filter(item=>item.scheduleStatus==="schedule_pending"&&(!item.windowEnd||item.windowEnd>=today)).sort((a,b)=>(a.windowStart??"9999").localeCompare(b.windowStart??"9999")).slice(0,10);
  if(!pending.length)return null;
  return <section style={{maxWidth:1220,margin:"0 auto 64px",padding:"0 18px"}} aria-labelledby="pending-fixtures-title">
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"end",gap:12,marginBottom:12}}><div><p className="v2-eyebrow">League fixture windows</p><h2 id="pending-fixtures-title" style={{margin:0}}>Upcoming fixtures awaiting kick-off confirmation</h2></div><span style={{color:"#7f98ad",fontSize:10}}>{pending.length} shown</span></div>
    <div style={{display:"grid",gap:8}}>{pending.map(item=>{const opponent=item.participant1.slug===club?item.participant2:item.participant1;return <Link key={item.pageId} href={item.detailPath} style={{display:"grid",gridTemplateColumns:"90px minmax(0,1fr) auto",alignItems:"center",gap:10,padding:"11px 13px",border:"1px solid rgba(103,171,233,.14)",borderRadius:13,background:"#07131f",color:"#fff",textDecoration:"none"}}><span style={{color:"#69baff",fontSize:10,fontWeight:850}}>{item.matchweek?`MW ${item.matchweek}`:"MW TBC"}</span><span style={{display:"grid",gap:2}}><strong style={{fontSize:11}}>{opponent.name}</strong><small style={{color:"#7790a4",fontSize:9}}>{item.competition} · {fixtureWindowLabel(item)}</small></span><span style={{color:"#70bfff",fontSize:9}}>Kick-off TBC →</span></Link>;})}</div>
  </section>;
}
