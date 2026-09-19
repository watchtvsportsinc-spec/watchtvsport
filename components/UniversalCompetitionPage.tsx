import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import Breadcrumbs from "@/components/Breadcrumbs";
import CompetitionSchedule, { type CompetitionScheduleItem } from "@/components/CompetitionSchedule";
import FavoriteButton from "@/components/FavoriteButton";
import ParticipantLogo from "@/components/ParticipantLogo";
import { displayCompetitionName, getCompetitionCatalogEntry } from "@/lib/competition-catalog";
import type { FavoriteCandidate } from "@/lib/favorites";
import { getFootballLeagueProfile } from "@/lib/football-league-profiles";
import type { ParticipantVisualProfile } from "@/lib/participant-visuals";
import { getPublicCompetition } from "@/lib/public-competition";
import { getPublicEventsSnapshot } from "@/lib/public-events";
import { getApprovedMediaAssets } from "@/lib/public-media-assets";
import { evaluateSeoEligibility, indexableRobots } from "@/lib/seo-indexability";
import { getSportLabel } from "@/lib/sports-registry";
import styles from "./competition-page.module.css";

type TeamLink={name:string;slug:string;visual?:ParticipantVisualProfile;countryCode?:string;type:"club"|"national_team"};
const BACKDROPS:Record<string,string>={football:"/sports/football.webp",basketball:"/sports/basketball.webp",hockey:"/sports/hockey.webp",tennis:"/sports/tennis.webp","formula-1":"/sports/formula-1.webp",motogp:"/sports/motogp.webp",ufc:"/sports/ufc.webp",rugby:"/sports/all-sports.webp",baseball:"/sports/all-sports.webp","american-football":"/sports/all-sports.webp",cycling:"/sports/all-sports.webp"};
function slugify(value:string){return value.normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/&/g," and ").replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"");}
export function competitionPath(sport:string,competition:string){return sport==="football"?`/football/competition/${competition}`:`/sports/${sport}/competition/${competition}`;}
function sportPath(sport:string){if(sport==="football")return"/football";if(sport==="formula-1")return"/formula-1";if(sport==="ufc")return"/ufc";return`/sports/${sport}`;}
function participantPath(sport:string,team:TeamLink){if(sport==="football"&&team.type==="national_team")return`/football/nation/${team.slug}`;return`/sports/${sport}/club/${team.slug}`;}
function isToday(value:string){return new Date(value).toISOString().slice(0,10)===new Date().toISOString().slice(0,10);}
function formatDate(value:string){return new Intl.DateTimeFormat("en",{weekday:"short",month:"short",day:"numeric",hour:"numeric",minute:"2-digit"}).format(new Date(value));}
function formatSeasonDate(value:string){return new Intl.DateTimeFormat("en",{month:"short",day:"numeric",year:"numeric",timeZone:"UTC"}).format(new Date(`${value}T12:00:00Z`));}

async function competitionData(sport:string,competition:string){const[permanent,snapshot]=await Promise.all([getPublicCompetition(sport,competition),getPublicEventsSnapshot({sport,competition,limit:500})]);const events=snapshot.events.sort((a,b)=>Date.parse(a.eventDate)-Date.parse(b.eventDate));const leagueProfile=getFootballLeagueProfile(sport,competition);const rawName=leagueProfile?.displayName??permanent?.displayName??permanent?.name??events[0]?.competition??competition.replace(/-/g," ");const name=displayCompetitionName(sport,competition,rawName);return{permanent,events,name,leagueProfile};}

function metadataParticipantCount(permanent:Awaited<ReturnType<typeof getPublicCompetition>>,events:Awaited<ReturnType<typeof competitionData>>["events"]){
 const ids=new Set<string>((permanent?.teams??[]).map(team=>team.slug));
 for(const event of events){for(const participant of[event.participant1,event.participant2])if(participant)ids.add(participant.id||participant.slug||participant.name);}
 return ids.size;
}

export async function buildCompetitionMetadata(sport:string,competition:string):Promise<Metadata>{
 const{permanent,events,name,leagueProfile}=await competitionData(sport,competition);
 if(!permanent&&!events.length)return{title:"Competition not found | WatchTVSport",robots:{index:false,follow:false}};
 const next=events.find(e=>e.status==="live"||(e.status!=="finished"&&Date.parse(e.eventDate)>=Date.now()));
 const description=next?`${name} TV schedule, upcoming fixtures and official broadcasters by country. Next: ${next.title}.`:leagueProfile?`${name} ${leagueProfile.seasonLabel} schedule, ${leagueProfile.teamCount} clubs and official TV or streaming broadcasters by country.`:`${name} TV schedule, participants and official broadcaster information by country.`;
 const verifiedBroadcastCount=events.reduce((sum,event)=>sum+event.broadcasts.filter(b=>b.coverageStatus==="confirmed").length,0);
 const participantCount=metadataParticipantCount(permanent,events);
 const usefulContentCount=[leagueProfile?.seasonLabel,leagueProfile?.officialSourceUrl,permanent?.seasonLabel,permanent?.regionLabel,permanent?.competitionType].filter(Boolean).length;
 const eligibility=evaluateSeoEligibility({kind:"competition",canonicalPath:competitionPath(sport,competition),eventCount:events.length,participantCount,verifiedBroadcastCount,usefulContentCount,hasVerifiedProfile:Boolean(leagueProfile||permanent)});
 return{title:`${name} TV schedule, fixtures & where to watch | WatchTVSport`,description,alternates:{canonical:competitionPath(sport,competition)},robots:indexableRobots(eligibility.indexable),openGraph:{title:`${name} TV schedule & fixtures | WatchTVSport`,description,url:competitionPath(sport,competition),type:"website"},twitter:{card:"summary_large_image",title:`${name} TV schedule | WatchTVSport`,description}};
}

export default async function UniversalCompetitionPage({sport,competition}:{sport:string;competition:string}){
 const{permanent,events,name,leagueProfile}=await competitionData(sport,competition);if(!permanent&&!events.length)notFound();
 const now=Date.now();const upcoming=events.filter(e=>e.status!=="finished"&&Date.parse(e.eventDate)>=now);const live=events.filter(e=>e.status==="live");const recent=events.filter(e=>e.status==="finished"||Date.parse(e.eventDate)<now);const next=live[0]??upcoming[0]??null;
 const participants=new Map<string,TeamLink>();for(const team of permanent?.teams??[])participants.set(team.slug,{name:team.name,slug:team.slug,visual:team.visual,type:"club"});for(const event of events)for(const participant of[event.participant1,event.participant2]){if(!participant||(participant.type!=="club"&&participant.type!=="national_team"))continue;const slug=participant.slug||(participant.id.startsWith("club:")?participant.id.split(":").slice(2).join(":"):slugify(participant.name));const old=participants.get(slug);participants.set(slug,{name:participant.name,slug,visual:participant.visualProfile??old?.visual,countryCode:participant.countryCode??old?.countryCode,type:participant.type});}
 const teams=Array.from(participants.values()).sort((a,b)=>a.name.localeCompare(b.name));
 const [participantLogos,competitionLogos]=await Promise.all([
  getApprovedMediaAssets("participant","team_logo",teams.map(team=>team.slug)),
  getApprovedMediaAssets("competition","competition_logo",[competition,...(permanent?.id?[`competition:${permanent.id}`]:[])]),
 ]);
 const competitionLogo=permanent?.id?competitionLogos[`competition:${permanent.id}`]??competitionLogos[competition]:competitionLogos[competition];
 const confirmed=events.flatMap(event=>event.broadcasts.filter(b=>b.coverageStatus==="confirmed"));const confirmedCountries=new Set(confirmed.map(b=>b.countryCode)).size;const freeCountries=new Set(confirmed.filter(b=>b.access==="Free").map(b=>b.countryCode)).size;const paidCountries=new Set(confirmed.filter(b=>b.access==="Paid").map(b=>b.countryCode)).size;
 const favorite:FavoriteCandidate={kind:"competition",entityId:`${sport}:${competition}`,label:`${name} (${getSportLabel(sport)})`,href:competitionPath(sport,competition)};const catalog=getCompetitionCatalogEntry(sport,competition);const category=permanent?.competitionType??catalog?.category??"competition";const area=permanent?.regionLabel??catalog?.region;const season=leagueProfile?.seasonLabel??permanent?.seasonLabel;
 const jsonLd={"@context":"https://schema.org","@type":"CollectionPage",name:`${name} TV schedule`,description:`Official viewing guide and schedule for ${name}.`,url:`https://watchtvsport.com${competitionPath(sport,competition)}`,about:{"@type":"SportsOrganization",name,sport:getSportLabel(sport),...(area?{areaServed:area}:{})}};
 const backdrop=BACKDROPS[sport]??"/sports/all-sports.webp";
 const scheduleItems:CompetitionScheduleItem[]=events.map(event=>{const offers=event.broadcasts.filter(b=>b.coverageStatus==="confirmed");return{id:event.id,detailPath:event.detailPath,title:event.title,eventDate:event.eventDate,stage:event.stage,status:event.status,confirmed:offers.length,freeCountries:new Set(offers.filter(b=>b.access==="Free").map(b=>b.countryCode)).size,paidCountries:new Set(offers.filter(b=>b.access==="Paid").map(b=>b.countryCode)).size};});
 const nextOffers=next?.broadcasts.filter(b=>b.coverageStatus==="confirmed")??[];const nextFree=new Set(nextOffers.filter(b=>b.access==="Free").map(b=>b.countryCode)).size;
 const heroCopy=leagueProfile?.heroCopy??"Upcoming events and official TV or streaming broadcasters by country. Open an event for the exact viewing options available.";
 return <main id="main-content" className={styles.page}>
  <script type="application/ld+json" dangerouslySetInnerHTML={{__html:JSON.stringify(jsonLd)}}/>
  <Breadcrumbs items={[{label:"Home",href:"/"},{label:getSportLabel(sport),href:sportPath(sport)},{label:name}]}/>
  <section className={styles.hero} style={{backgroundImage:`linear-gradient(90deg,rgba(4,13,23,.98),rgba(4,16,28,.75)),url('${backdrop}')`}}><p className={styles.eyebrow}>{category.replace(/-/g," ")}{season?` · ${season}`:""}</p><div className={styles.heroTitleRow}>{competitionLogo?<span className={styles.competitionHeroLogo}><img src={competitionLogo.url} alt="" aria-hidden="true"/></span>:null}<h1>{name}</h1></div><p className={styles.heroCopy}>{heroCopy}</p><div className={styles.heroNav}><a href="#schedule">Schedule</a>{teams.length?<a href="#participants">Clubs</a>:null}<a href="#about">About</a><FavoriteButton favorite={favorite}/></div></section>
  {leagueProfile?<section className={styles.leagueFacts} aria-label={`${name} ${leagueProfile.seasonLabel} season overview`}><div><strong>{leagueProfile.teamCount}</strong><span>Clubs</span></div><div><strong>{leagueProfile.fixtureCount}</strong><span>Matches</span></div><div><strong>{leagueProfile.matchdayCount}</strong><span>Matchdays</span></div><div className={styles.leagueDate}><strong>{formatSeasonDate(leagueProfile.seasonStart)}</strong><span>Season start</span></div><div className={styles.leagueDate}><strong>{formatSeasonDate(leagueProfile.seasonEnd)}</strong><span>Season end</span></div></section>:null}
  <section className={styles.overview}>
   <div className={styles.nextCard}>{next?<><div className={styles.nextTop}><span className={next.status==="live"?styles.live:isToday(next.eventDate)?styles.today:styles.state}>{next.status==="live"?"LIVE":isToday(next.eventDate)?"TODAY":"NEXT"}</span><small>{next.stage??name}</small></div><h2>{next.title}</h2><div className={styles.nextMeta}><span>{next.status==="live"?"Live now":formatDate(next.eventDate)}</span><span><b>{nextOffers.length}</b> confirmed TV listings</span>{nextFree>0?<span>Free in <b>{nextFree}</b> countr{nextFree===1?"y":"ies"}</span>:null}</div><div className={styles.nextActions}><Link href={next.detailPath}>Where to watch →</Link><span>{nextOffers.length?"Official viewing information available":"Broadcaster confirmation pending"}</span></div></>:<><div className={styles.nextTop}><span className={styles.state}>SEASON READY</span></div><h2>{leagueProfile?`${leagueProfile.seasonLabel} fixtures are being verified`:"Schedule pending"}</h2><div className={styles.nextMeta}><span>{leagueProfile?.schedulePendingCopy??"This permanent page will populate automatically when verified fixtures are imported."}</span></div></>}</div>
   <div className={styles.stats}><div><strong>{live.length}</strong><span>Live</span></div><div><strong>{upcoming.length}</strong><span>Upcoming</span></div><div><strong>{confirmedCountries}</strong><span>TV countries</span></div><div><strong>{freeCountries}</strong><span>Free countries</span></div></div>
  </section>
  <aside className={styles.monetization} data-monetization-slot="competition-top" aria-label="Partner placement reserved"><span>Partner placement</span><strong>Reserved for relevant broadcaster, streaming or connectivity offers</strong></aside>
  <section id="schedule" className={styles.section}><div className={styles.sectionHeading}><div><p>TV schedule</p><h2>Events & fixtures</h2></div><span>{events.length} published · {paidCountries} paid TV countries</span></div>{events.length?<CompetitionSchedule items={scheduleItems}/>:<div className={styles.empty}><strong>{leagueProfile?`${leagueProfile.seasonLabel} schedule preparation in progress`:"No verified schedule yet"}</strong><span>{leagueProfile?.schedulePendingCopy??"The competition page is live and will populate automatically after fixture import."}</span></div>}</section>
  {teams.length?<section id="participants" className={styles.section}><div className={styles.sectionHeading}><div><p>{leagueProfile?`${season} league`:"Participants"}</p><h2>{leagueProfile?`${teams.length} clubs`:"Teams & participants"}</h2></div><span>{teams.length}</span></div><div className={styles.participants}>{teams.map(team=><Link className={styles.participant} key={team.slug} href={participantPath(sport,team)}><ParticipantLogo sport={sport} label={team.name} logoUrl={participantLogos[team.slug]?.url} countryCode={team.countryCode} visual={team.visual} size="sm"/><span><strong>{team.name}</strong><small>Club profile →</small></span></Link>)}</div></section>:null}
  <section id="about" className={styles.section}><div className={styles.sectionHeading}><div><p>Competition information</p><h2>About {name}</h2></div></div><div className={styles.about}><p>{leagueProfile?`${name} ${leagueProfile.seasonLabel} runs from ${formatSeasonDate(leagueProfile.seasonStart)} to ${formatSeasonDate(leagueProfile.seasonEnd)}. WatchTVSport connects its ${leagueProfile.fixtureCount} league fixtures to confirmed official broadcaster information by country as those viewing details are verified.`:`WatchTVSport keeps the ${name} schedule connected to official broadcaster information by country. Event pages are the source for exact viewing options; this page is the permanent hub for the competition.`}</p><div className={styles.facts}>{season?<span>Season: {season}</span>:null}{leagueProfile?<span>Country: {leagueProfile.countryName}</span>:null}<span>Sport: {getSportLabel(sport)}</span>{area?<span>Region: {area}</span>:null}<span>Type: {category.replace(/-/g," ")}</span><span>{teams.length} participants</span><span>{recent.length} past events referenced</span></div>{leagueProfile?<a className={styles.sourceLink} href={leagueProfile.officialSourceUrl} rel="noreferrer" target="_blank">Official {leagueProfile.officialSourceName} season source ↗</a>:null}</div></section>
 </main>;
}
