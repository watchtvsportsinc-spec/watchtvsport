import type { MetadataRoute } from "next";
import { clubSlug } from "@/lib/club-aliases";
import { allCompetitionCatalogEntries } from "@/lib/competition-catalog";
import { entitySlug, getFootballNations } from "@/lib/entity-pages";
import { getAllEvents, type Participant } from "@/lib/events";
import { getAllMatches, type MatchData } from "@/lib/matches";
import { getPublicCompetitionFixtures } from "@/lib/public-fixtures";
import { sportsRegistry, sportAllowsParticipantPages } from "@/lib/sports-registry";

const BASE_URL="https://watchtvsport.com";
function sitemapEntry(path:string,priority:number,changeFrequency:MetadataRoute.Sitemap[number]["changeFrequency"],lastModified:Date=new Date()):MetadataRoute.Sitemap[number]{return{url:`${BASE_URL}${path}`,lastModified,changeFrequency,priority};}
function confirmedCountryCodes(match:MatchData):string[]{return Array.from(new Set(match.broadcasts.filter(b=>b.coverageStatus==="confirmed"&&b.countryCode&&b.broadcaster&&b.url).map(b=>b.countryCode.toLowerCase())));}
function sportHubPath(sport:string):string{if(sport==="football")return"/football";if(sport==="formula-1")return"/formula-1";if(sport==="ufc")return"/ufc";return`/sports/${sport}`;}
function competitionPath(sport:string,slug:string):string{if(sport==="football")return`/football/competition/${slug}`;return`/sports/${sport}/competition/${slug}`;}
function participantSlug(participant:Participant):string{if(participant.slug)return participant.slug;if(participant.id.startsWith("club:")){const parsed=participant.id.split(":").slice(2).join(":");if(parsed)return parsed;}return clubSlug(participant.name);}

export default async function sitemap():Promise<MetadataRoute.Sitemap>{
 const events=getAllEvents();const worldCupMatches=getAllMatches();
 const [ligue1Fixtures,premierLeagueFixtures]=await Promise.all([getPublicCompetitionFixtures("football","ligue-1"),getPublicCompetitionFixtures("football","premier-league")]);
 const sportPages=sportsRegistry.filter(s=>s.enabled).map(s=>sitemapEntry(sportHubPath(s.slug),.95,"weekly"));
 const staticPages=[sitemapEntry("/",1,"daily"),sitemapEntry("/sports",.98,"weekly"),sitemapEntry("/motorsports",.95,"weekly"),sitemapEntry("/combat-sports",.95,"weekly"),sitemapEntry("/combat-sports/mma",.93,"weekly")];
 const catalogCompetitionPages=allCompetitionCatalogEntries().filter(c=>c.sport!=="ufc").map(c=>sitemapEntry(competitionPath(c.sport,c.slug),.9,"weekly"));
 const eventCompetitionPages=events.filter(e=>e.sport!=="formula-1"&&e.sport!=="ufc").map(e=>competitionPath(e.sport,e.competitionSlug));
 const competitionPages=Array.from(new Set([...catalogCompetitionPages.map(e=>e.url.replace(BASE_URL,"")),...eventCompetitionPages])).map(path=>sitemapEntry(path,.9,"daily"));
 const clubMap=new Map(events.flatMap(event=>{if(!sportAllowsParticipantPages(event.sport))return[];return[event.participant1,event.participant2].filter((participant):participant is Participant=>Boolean(participant&&(participant.type==="club"||participant.type==="national_team"))).map(participant=>[`${event.sport}:${participant.id}`,{sport:event.sport,participant}] as const);}));
 const clubPages=Array.from(clubMap.values()).map(({sport,participant})=>sitemapEntry(`/sports/${sport}/club/${participantSlug(participant)}`,.88,"daily"));
 const nationPages=getFootballNations(events).map(n=>sitemapEntry(`/football/nation/${entitySlug(n.name)}`,.85,"daily"));
 const permanentEventPages=Array.from(new Map(events.filter(e=>e.detailPath.startsWith("/football/")).map(e=>[e.detailPath,e] as const)).values()).map(e=>sitemapEntry(e.detailPath,.9,"daily",new Date(e.eventDate)));
 const leagueFixturePages=[...ligue1Fixtures,...premierLeagueFixtures].map(fixture=>sitemapEntry(fixture.detailPath,.9,"daily",fixture.exactDate?new Date(fixture.exactDate):new Date()));
 const f1Pages=Array.from(new Map(events.filter(e=>e.sport==="formula-1"&&e.eventGroupId&&e.eventGroupSlug).map(e=>[e.eventGroupId!,e] as const)).values()).map(e=>sitemapEntry(`/formula-1/grand-prix/${e.eventGroupSlug}`,.9,"daily",new Date(e.eventDate)));
 const ufcPages=Array.from(new Map(events.filter(e=>e.sport==="ufc"&&e.eventGroupSlug).map(e=>[e.eventGroupSlug!,e] as const)).values()).map(e=>sitemapEntry(`/ufc/event/${e.eventGroupSlug}`,.9,"daily",new Date(e.eventDate)));
 const archiveMatchPages=worldCupMatches.map(m=>sitemapEntry(`/match/${m.slug}`,.85,"monthly",new Date(m.matchDate)));
 const watchPages=worldCupMatches.flatMap(m=>confirmedCountryCodes(m).map(code=>sitemapEntry(`/watch/${m.slug}/${code}`,.75,"monthly",new Date(m.matchDate))));
 const countryPages=Array.from(new Set(worldCupMatches.flatMap(m=>confirmedCountryCodes(m)))).map(code=>sitemapEntry(`/country/${code}`,.8,"daily"));
 const dedup=new Map<string,MetadataRoute.Sitemap[number]>();for(const entry of[...staticPages,...sportPages,...competitionPages,...clubPages,...nationPages,...permanentEventPages,...leagueFixturePages,...f1Pages,...ufcPages,...archiveMatchPages,...watchPages,...countryPages])dedup.set(entry.url,entry);return Array.from(dedup.values());
}
