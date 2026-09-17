import Link from "next/link";
import Breadcrumbs from "@/components/Breadcrumbs";
import FavoriteButton from "@/components/FavoriteButton";
import MatchHero from "@/components/MatchHero";
import MatchNextGames from "@/components/MatchNextGames";
import MatchWatchPanel from "@/components/MatchWatchPanel";
import { fixtureWindowLabel, type PublicFixture } from "@/lib/public-fixtures";
import { getPublicEventsSnapshot } from "@/lib/public-events";
import { getPublicParticipantProfile } from "@/lib/participant-profiles";

function sportHref(sport:string){return sport==="football"?"/football":`/sports/${sport}`;}
function sportLabel(sport:string){if(sport==="football")return"Football";if(sport==="nba")return"NBA";if(sport==="nhl")return"NHL";return sport.toUpperCase();}
function competitionHref(item:PublicFixture){return item.sport==="football"?`/football/competition/${item.competitionSlug}`:`/sports/${item.sport}/competition/${item.competitionSlug}`;}
function clubHref(item:PublicFixture,slug:string){return item.sport==="football"?`/football/club/${slug}`:`/sports/${item.sport}/club/${slug}`;}

export default async function PermanentFixturePage({fixture}:{fixture:PublicFixture}){
  const snapshot=await getPublicEventsSnapshot({sport:fixture.sport,competition:fixture.competitionSlug,from:fixture.exactDate,limit:500});
  const exactEvent=fixture.eventId?snapshot.events.find(event=>event.id===fixture.eventId):undefined;
  const confirmed=exactEvent?.broadcasts.filter(b=>b.coverageStatus==="confirmed")??[];
  const windowLabel=fixtureWindowLabel(fixture);
  const competitionPath=competitionHref(fixture);
  const favorite={kind:"event" as const,entityId:`fixture:${fixture.pageId}`,label:fixture.title,href:fixture.detailPath};
  const scheduleLabel=fixture.scheduleStatus==="schedule_confirmed"&&fixture.exactDate?"Kick-off confirmed":"Kick-off time TBC";
  const stage=fixture.stage??(fixture.matchweek?`Matchweek ${fixture.matchweek}`:"Fixture");
  const label=sportLabel(fixture.sport);
  const [profile1,profile2]=await Promise.all([getPublicParticipantProfile(fixture.participant1.slug,fixture.sport),getPublicParticipantProfile(fixture.participant2.slug,fixture.sport)]);
  return <main id="main-content" className="v2-calendar"><Breadcrumbs items={[{label:"Home",href:"/"},{label,href:sportHref(fixture.sport)},{label:fixture.competition,href:competitionPath},{label:fixture.title}]}/><MatchHero sport={fixture.sport} competition={fixture.competition} competitionHref={competitionPath} stage={stage} status={fixture.status??scheduleLabel} date={fixture.scheduleStatus==="schedule_confirmed"?fixture.exactDate:undefined} scheduleText={windowLabel??scheduleLabel} venue={fixture.venue} team1={{name:fixture.participant1.name,href:clubHref(fixture,fixture.participant1.slug),countryCode:fixture.participant1.countryCode,visual:profile1?.visual}} team2={{name:fixture.participant2.name,href:clubHref(fixture,fixture.participant2.slug),countryCode:fixture.participant2.countryCode,visual:profile2?.visual}} favorite={<FavoriteButton favorite={favorite}/>}/><MatchWatchPanel broadcasts={confirmed} emptyTitle={fixture.scheduleStatus!=="schedule_confirmed"?"Exact kick-off not confirmed yet":"Broadcasters not confirmed yet"} emptyCopy={fixture.scheduleStatus!=="schedule_confirmed"?"This fixture is official. WatchTVSport will show confirmed viewing options here after the exact day and kick-off time are published.":"Confirmed official viewing options will appear here when verified."} showMethodologyLink defaultOpen/><MatchNextGames sport={fixture.sport} competitionSlug={fixture.competitionSlug} competitionHref={competitionPath} currentDate={fixture.scheduleStatus==="schedule_confirmed"?fixture.exactDate:undefined} currentEventId={fixture.eventId} currentEventSlug={fixture.eventSlug} currentParticipants={[fixture.participant1,fixture.participant2].map(participant=>({id:participant.id,slug:participant.slug,name:participant.name}))}/><nav className="v2-related-nav" aria-label="Related pages"><Link href={sportHref(fixture.sport)}>← {label}</Link><Link href={competitionPath}>{fixture.competition} →</Link></nav></main>;
}
