import type { MetadataRoute } from "next";
import { clubSlug } from "@/lib/club-aliases";
import { entitySlug, getFootballNations } from "@/lib/entity-pages";
import { getAllEvents, type Participant } from "@/lib/events";
import { getAllMatches, type MatchData } from "@/lib/matches";
import { sportAllowsParticipantPages } from "@/lib/sports-registry";

const BASE_URL = "https://watchtvsport.com";

function sitemapEntry(path:string,priority:number,changeFrequency:MetadataRoute.Sitemap[number]["changeFrequency"],lastModified:Date=new Date()):MetadataRoute.Sitemap[number]{return{url:`${BASE_URL}${path}`,lastModified,changeFrequency,priority}}
function confirmedCountryCodes(match:MatchData):string[]{return Array.from(new Set(match.broadcasts.filter(b=>b.coverageStatus==="confirmed"&&b.countryCode&&b.broadcaster&&b.url).map(b=>b.countryCode.toLowerCase())))}
function sportHubPath(sport:string):string{if(sport==="football")return"/football";if(sport==="formula-1")return"/formula-1";if(sport==="ufc")return"/ufc";return`/sports/${sport}`}
function participantSlug(participant:Participant):string{if(participant.slug)return participant.slug;if(participant.id.startsWith("club:")){const parsed=participant.id.split(":").slice(2).join(":");if(parsed)return parsed;}return clubSlug(participant.name)}

export default function sitemap():MetadataRoute.Sitemap{
 const events=getAllEvents(); const worldCupMatches=getAllMatches();
 const activeSports=Array.from(new Set(events.map(event=>event.sport)));
 const staticPages=[sitemapEntry("/",1,"daily"),...activeSports.map(sport=>sitemapEntry(sportHubPath(sport),.95,"daily"))];
 const competitionPages=Array.from(new Set(events.filter(e=>e.sport==="football").map(e=>e.competitionSlug))).map(slug=>sitemapEntry(`/football/competition/${slug}`,.9,"daily"));
 const clubPages=Array.from(new Map(events.flatMap(event=>{
   if(!sportAllowsParticipantPages(event.sport))return[];
   return[event.participant1,event.participant2]
     .filter((participant):participant is Participant=>Boolean(participant&&participant.type==="club"))
     .map(participant=>[`${event.sport}:${participant.id}`,{sport:event.sport,participant}] as const);
 }).values()).map(({sport,participant})=>sitemapEntry(`/sports/${sport}/club/${participantSlug(participant)}`,.88,"daily"));
 const nationPages=getFootballNations(events).map(n=>sitemapEntry(`/football/nation/${entitySlug(n.name)}`,.85,"daily"));
 const permanentEventPages=Array.from(new Map(events.filter(e=>e.detailPath.startsWith("/football/")).map(e=>[e.detailPath,e] as const)).values()).map(e=>sitemapEntry(e.detailPath,.9,"daily",new Date(e.eventDate)));
 const f1Pages=Array.from(new Map(events.filter(e=>e.sport==="formula-1"&&e.eventGroupId&&e.eventGroupSlug).map(e=>[e.eventGroupId!,e] as const)).values()).map(e=>sitemapEntry(`/formula-1/grand-prix/${e.eventGroupSlug}`,.9,"daily",new Date(e.eventDate)));
 const ufcPages=Array.from(new Map(events.filter(e=>e.sport==="ufc"&&e.eventGroupSlug).map(e=>[e.eventGroupSlug!,e] as const)).values()).map(e=>sitemapEntry(`/ufc/event/${e.eventGroupSlug}`,.9,"daily",new Date(e.eventDate)));
 const archiveMatchPages=worldCupMatches.map(m=>sitemapEntry(`/match/${m.slug}`,.85,"monthly",new Date(m.matchDate)));
 const watchPages=worldCupMatches.flatMap(m=>confirmedCountryCodes(m).map(code=>sitemapEntry(`/watch/${m.slug}/${code}`,.75,"monthly",new Date(m.matchDate))));
 const countryPages=Array.from(new Set(worldCupMatches.flatMap(m=>confirmedCountryCodes(m)))).map(code=>sitemapEntry(`/country/${code}`,.8,"daily"));
 return[...staticPages,...competitionPages,...clubPages,...nationPages,...permanentEventPages,...f1Pages,...ufcPages,...archiveMatchPages,...watchPages,...countryPages];
}
