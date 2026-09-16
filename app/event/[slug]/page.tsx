import type { Metadata } from "next";
import PermanentFixturePage from "@/components/PermanentFixturePage";
import UniversalEventPage from "@/components/UniversalEventPage";
import { getPublicFixturePage, fixtureWindowLabel } from "@/lib/public-fixtures";
import { getPublicEventsSnapshot } from "@/lib/public-events";

type PageProps={params:Promise<{slug:string}>};

export async function generateMetadata({params}:PageProps):Promise<Metadata>{
  const {slug}=await params;
  const fixture=await getPublicFixturePage(slug);
  if(fixture){
    const schedule=fixture.scheduleStatus==="schedule_confirmed"&&fixture.exactDate?"Exact kick-off confirmed":fixtureWindowLabel(fixture)??"Schedule pending";
    const description=`${fixture.title} ${fixture.seasonLabel??""} TV guide and official broadcaster information. ${fixture.matchweek?`Matchweek ${fixture.matchweek}. `:""}${schedule}.`;
    return{title:`${fixture.title} TV schedule & where to watch | WatchTVSport`,description,alternates:{canonical:fixture.detailPath},robots:{index:true,follow:true},openGraph:{title:`${fixture.title} – where to watch`,description,url:fixture.detailPath,type:"website"},twitter:{card:"summary_large_image",title:`${fixture.title} – where to watch`,description}};
  }
  const snapshot=await getPublicEventsSnapshot();const event=snapshot.events.find(e=>e.slug===slug);
  if(!event)return{title:"Event not found",robots:{index:false,follow:false}};
  return{title:`${event.title} – where to watch`,description:`Find official TV channels and streaming platforms for ${event.title} by country.`,alternates:{canonical:`/event/${slug}`}};
}

export default async function EventPage({params}:PageProps){
  const {slug}=await params;
  const fixture=await getPublicFixturePage(slug);
  return fixture?<PermanentFixturePage fixture={fixture}/>:<UniversalEventPage slug={slug}/>;
}
