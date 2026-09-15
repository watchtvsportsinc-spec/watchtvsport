import type { MetadataRoute } from "next";
import { clubSlug } from "@/lib/club-aliases";
import { getPublicCompetitionDirectories } from "@/lib/competition-directory";
import { entitySlug, getFootballNations } from "@/lib/entity-pages";
import { getAllEvents } from "@/lib/events";
import { getAllMatches, type MatchData } from "@/lib/matches";

const BASE_URL = "https://watchtvsport.com";
function sitemapEntry(path:string,priority:number,changeFrequency:MetadataRoute.Sitemap[number]["changeFrequency"],lastModified:Date=new Date()):MetadataRoute.Sitemap[number]{return{url:`${BASE_URL}${path}`,lastModified,changeFrequency,priority}}
function confirmedCountryCodes(match:MatchData):string[]{return Array.from(new Set(match.broadcasts.filter(b=>b.coverageStatus==="confirmed"&&b.countryCode&&b.broadcaster&&b.url).map(b=>b.countryCode.toLowerCase())))}

export default async function sitemap():Promise<MetadataRoute.Sitemap>{
 const events=getAllEvents(); const worldCupMatches=getAllMatches(); const directories=await getPublicCompetitionDirectories();
 const staticPages=[
  sitemapEntry("/",1,"daily"),sitemapEntry("/football",.95,"daily"),sitemapEntry("/formula-1",.95,"daily"),sitemapEntry("/ufc",.95,"daily"),
  sitemapEntry("/sports/basketball",.9,"daily"),sitemapEntry("/sports/hockey",.9,"daily"),sitemapEntry("/sports/american-football",.9,"daily"),
 ];
 const eventCompetitionSlugs=new Set(events.filter(e=>e.sport==="football").map(e=>e.competitionSlug));
 const directoryFootball=directories.filter(d=>d.sport==="football"&&d.members.length>0);
 const competitionSlugs=new Set([...eventCompetitionSlugs,...directoryFootball.map(d=>d.slug)]);
 const competitionPages=[...competitionSlugs].map(slug=>sitemapEntry(`/football/competition/${slug}`,.9,"daily"));
 const eventClubPages=Array.from(new Map(events.filter(e=>e.sport==="football").flatMap(e=>[e.participant1,e.participant2]).filter(p=>p?.type==="club").map(p=>[p!.id,p!] as const)).values()).map(c=>sitemapEntry(`/football/club/${clubSlug(c.name)}`,.85,"daily"));
 // New league-only team pages intentionally stay out of the sitemap until their profile has enough verified editorial data.
 const nationPages=getFootballNations(events).map(n=>sitemapEntry(`/football/nation/${entitySlug(n.name)}`,.85,"daily"));
 const permanentEventPages=Array.from(new Map(events.filter(e=>e.detailPath.startsWith("/football/")).map(e=>[e.detailPath,e] as const)).values()).map(e=>sitemapEntry(e.detailPath,.9,"daily",new Date(e.eventDate)));
 const f1Pages=Array.from(new Map(events.filter(e=>e.sport==="formula-1"&&e.eventGroupId&&e.eventGroupSlug).map(e=>[e.eventGroupId!,e] as const)).values()).map(e=>sitemapEntry(`/formula-1/grand-prix/${e.eventGroupSlug}`,.9,"daily",new Date(e.eventDate)));
 const ufcPages=Array.from(new Map(events.filter(e=>e.sport==="ufc"&&e.eventGroupSlug).map(e=>[e.eventGroupSlug!,e] as const)).values()).map(e=>sitemapEntry(`/ufc/event/${e.eventGroupSlug}`,.9,"daily",new Date(e.eventDate)));
 const archiveMatchPages=worldCupMatches.map(m=>sitemapEntry(`/match/${m.slug}`,.85,"monthly",new Date(m.matchDate)));
 const watchPages=worldCupMatches.flatMap(m=>confirmedCountryCodes(m).map(code=>sitemapEntry(`/watch/${m.slug}/${code}`,.75,"monthly",new Date(m.matchDate))));
 const countryPages=Array.from(new Set(worldCupMatches.flatMap(m=>confirmedCountryCodes(m)))).map(code=>sitemapEntry(`/country/${code}`,.8,"daily"));
 return[...staticPages,...competitionPages,...eventClubPages,...nationPages,...permanentEventPages,...f1Pages,...ufcPages,...archiveMatchPages,...watchPages,...countryPages];
}
