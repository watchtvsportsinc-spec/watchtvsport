import Link from "next/link";
import { getPublicEventsSnapshot } from "@/lib/public-events";

function slugify(value:string){return value.normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/&/g," and ").replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"");}

export default async function MatchLayout({children,params}:{children:React.ReactNode;params:Promise<{slug:string}>}){
  const {slug}=await params;const snapshot=await getPublicEventsSnapshot();const event=snapshot.events.find(e=>e.slug===slug);
  if(!event)return children;
  const participantLink=(name:string,type?:string)=>type==="club"?`/football/club/${slugify(name)}`:type==="national_team"?`/football/nation/${slugify(name)}`:`/?view=all&q=${encodeURIComponent(name)}`;
  return <><nav className="v2-match-context" aria-label="Match context"><Link href="/">Home</Link><span>›</span><Link href={event.sport==="football"?"/football":`/sports/${event.sport}`}>{event.sport}</Link><span>›</span><Link href={event.sport==="football"?`/football/competition/${event.competitionSlug}`:`/sports/${event.sport}/competition/${event.competitionSlug}`}>{event.competition}</Link>{event.participant1?<><span>›</span><Link href={participantLink(event.participant1.name,event.participant1.type)}>{event.participant1.name}</Link></>:null}{event.participant2?<><span>·</span><Link href={participantLink(event.participant2.name,event.participant2.type)}>{event.participant2.name}</Link></>:null}</nav>{children}</>;
}
