import Link from "next/link";
import Breadcrumbs from "@/components/Breadcrumbs";
import FavoriteButton from "@/components/FavoriteButton";
import LocalTime from "@/components/LocalTime";
import ParticipantSportVisual from "@/components/ParticipantSportVisual";
import { fixtureWindowLabel, type PublicFixture } from "@/lib/public-fixtures";
import { getPublicEventsSnapshot } from "@/lib/public-events";

function sportHref(sport:string){return sport==="football"?"/football":`/sports/${sport}`;}
function competitionHref(item:PublicFixture){return item.sport==="football"?`/football/competition/${item.competitionSlug}`:`/sports/${item.sport}/competition/${item.competitionSlug}`;}
function clubHref(item:PublicFixture,slug:string){return item.sport==="football"?`/football/club/${slug}`:`/sports/${item.sport}/club/${slug}`;}

export default async function PermanentFixturePage({fixture}:{fixture:PublicFixture}){
  const snapshot=await getPublicEventsSnapshot();
  const exactEvent=fixture.eventId?snapshot.events.find(event=>event.id===fixture.eventId):undefined;
  const confirmed=exactEvent?.broadcasts.filter(b=>b.coverageStatus==="confirmed")??[];
  const free=confirmed.filter(b=>b.access==="Free");
  const countries=new Map<string,typeof confirmed>();for(const item of confirmed)countries.set(item.countryCode,[...(countries.get(item.countryCode)??[]),item]);
  const windowLabel=fixtureWindowLabel(fixture);
  const competitionPath=competitionHref(fixture);
  const favorite={kind:"event" as const,entityId:`fixture:${fixture.pageId}`,label:fixture.title,href:fixture.detailPath};
  const scheduleLabel=fixture.scheduleStatus==="schedule_confirmed"&&fixture.exactDate?"Kick-off confirmed":"Kick-off time TBC";
  const stage=fixture.matchweek?`Matchweek ${fixture.matchweek}`:"Fixture";
  return <main id="main-content" className="v2-calendar">
    <Breadcrumbs items={[{label:"Home",href:"/"},{label:"Football",href:sportHref(fixture.sport)},{label:fixture.competition,href:competitionPath},{label:fixture.title}]}/>
    <section className="v2-event-hero"><div><p className="v2-eyebrow">{fixture.competition}{fixture.seasonLabel?` · ${fixture.seasonLabel}`:""}</p><h1>{fixture.title}</h1><div className="v2-event-hero-meta"><span className="v2-status">{stage}</span>{fixture.scheduleStatus==="schedule_confirmed"&&fixture.exactDate?<LocalTime date={fixture.exactDate}/>:<><span>{windowLabel}</span><span>{scheduleLabel}</span></>}{fixture.venue?<span>{fixture.venue}</span>:null}</div></div><FavoriteButton favorite={favorite}/></section>
    <section className="v2-versus-card"><div><Link href={clubHref(fixture,fixture.participant1.slug)}><ParticipantSportVisual sport={fixture.sport} label={fixture.participant1.name} countryCode={fixture.participant1.countryCode} size="md"/><strong>{fixture.participant1.name}</strong><small>Team profile →</small></Link><b>VS</b><Link href={clubHref(fixture,fixture.participant2.slug)}><ParticipantSportVisual sport={fixture.sport} label={fixture.participant2.name} countryCode={fixture.participant2.countryCode} size="md"/><strong>{fixture.participant2.name}</strong><small>Team profile →</small></Link></div></section>
    <section className="v2-stats-row"><div><strong>{fixture.seasonLabel??"Current"}</strong><span>Season</span></div><div><strong>{fixture.matchweek??"TBC"}</strong><span>Matchweek</span></div><div><strong>{confirmed.length}</strong><span>Confirmed listings</span></div><div><strong>{countries.size}</strong><span>TV countries</span></div></section>
    <section className="v2-results"><div className="v2-results-heading"><div><p className="v2-eyebrow">Official only</p><h2>Where to watch</h2></div><p>{confirmed.length} confirmed</p></div>{fixture.scheduleStatus!=="schedule_confirmed"?<div className="v2-empty-state"><h3>Exact kick-off not confirmed yet</h3><p>This fixture is official. WatchTVSport shows its matchweek and scheduling window now, then updates this same permanent page when the league confirms the exact day and kick-off time.</p></div>:confirmed.length===0?<div className="v2-empty-state"><h3>Broadcasters not confirmed yet</h3><p>Confirmed official viewing options will appear here when verified.</p></div>:<div className="v2-broadcaster-country-list">{Array.from(countries.entries()).sort(([a],[b])=>a.localeCompare(b)).map(([code,list])=><section key={code}><h3>{list[0].countryName}</h3><div>{list.map(b=><a key={`${code}-${b.broadcaster}-${b.access}`} href={b.affiliateUrl||b.url} target="_blank" rel="noopener noreferrer"><span className={b.access==="Free"?"v2-chip is-free":"v2-chip is-paid"}>{b.access}</span><strong>{b.broadcaster}</strong><small>{b.broadcastType??"live"}</small><b>Open official service →</b></a>)}</div></section>)}</div>}</section>
    <nav className="v2-related-nav" aria-label="Related pages"><Link href={sportHref(fixture.sport)}>← Football</Link><Link href={competitionPath}>{fixture.competition} →</Link></nav>
  </main>;
}
