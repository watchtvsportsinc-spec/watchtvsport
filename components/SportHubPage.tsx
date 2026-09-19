import type { Metadata } from "next";
import Link from "next/link";
import Breadcrumbs from "@/components/Breadcrumbs";
import ParticipantLogo from "@/components/ParticipantLogo";
import SportCompetitionExplorer, { type SportCompetitionExplorerItem } from "@/components/SportCompetitionExplorer";
import SportCompetitionGrid, { type SportCompetitionCard } from "@/components/SportCompetitionGrid";
import SportHero from "@/components/SportHero";
import { classifyCompetition, displayCompetitionName, type CompetitionCategory } from "@/lib/competition-catalog";
import type { Participant } from "@/lib/events";
import { getPublicEventsSnapshot } from "@/lib/public-events";
import { getApprovedMediaAssets } from "@/lib/public-media-assets";
import { getPublicSportCompetitions } from "@/lib/public-sport-competitions";
import { evaluateSeoEligibility, indexableRobots } from "@/lib/seo-indexability";
import { getSportLabel } from "@/lib/sports-registry";
import styles from "./sport-hub.module.css";

const SPORT_COPY:Record<string,{title:string;description:string;eyebrow:string;backdrop:string;about:string}>={
  football:{title:"Football",eyebrow:"Sport",description:"Find the right league, cup or international competition, then see where to watch it.",backdrop:"/sports/football.webp",about:"Browse football by competition rather than through one oversized match list. European competitions, domestic leagues, cups and international tournaments each lead to their own permanent TV schedule."},
  basketball:{title:"Basketball",eyebrow:"Sport",description:"Find the right league or tournament, from the NBA to European and international basketball.",backdrop:"/sports/basketball.webp",about:"WatchTVSport organizes basketball around leagues and competitions. Open the NBA, EuroLeague or another competition to see its upcoming games and confirmed viewing options."},
  hockey:{title:"Hockey",eyebrow:"Sport",description:"Find the right league or tournament, then open its schedule and official viewing options.",backdrop:"/sports/hockey.webp",about:"Hockey competitions are separated into permanent pages so NHL and international tournaments can each carry their own schedule, teams and broadcaster information."},
  tennis:{title:"Tennis",eyebrow:"Sport",description:"Find the right tour or tournament, from Grand Slams to ATP, WTA and team events.",backdrop:"/sports/tennis.webp",about:"Tennis is organized by tournament. Grand Slams and future ATP/WTA events can publish their own match schedules without turning this page into an endless chronological feed."},
  rugby:{title:"Rugby",eyebrow:"Sport",description:"Find the right domestic, continental or international rugby competition.",backdrop:"/sports/all-sports.webp",about:"Rugby competitions are grouped by competition type so domestic leagues, continental cups and international tournaments remain easy to navigate."},
  baseball:{title:"Baseball",eyebrow:"Sport",description:"Find the right baseball league or tournament, then open its schedule and viewing guide.",backdrop:"/sports/all-sports.webp",about:"Baseball is organized around leagues and tournaments such as MLB and the World Baseball Classic, with permanent competition pages ready for verified schedules."},
  "american-football":{title:"American Football",eyebrow:"Sport",description:"Find the right league or competition, starting with the NFL, then browse its game schedule.",backdrop:"/american-football-hero.webp",about:"American football competition pages separate NFL and college schedules while keeping official TV information close to each game."},
  motogp:{title:"MotoGP",eyebrow:"Motorsport championship",description:"Choose a MotoGP race weekend to open sessions and official viewing pages.",backdrop:"/sports/motogp.webp",about:"MotoGP is organized around race weekends rather than team fixtures. Each weekend can surface practice, qualifying, sprint and race sessions as verified data becomes available."},
  cycling:{title:"Cycling",eyebrow:"Sport",description:"Choose a stage race or cycling competition, then open its event pages and viewing information.",backdrop:"/sports/all-sports.webp",about:"Cycling competition pages keep major tours separate and allow stages or race sessions to appear beneath the correct event."},
};

const DIRECTORY_SPORTS=new Set(["football","basketball","hockey","rugby","baseball","american-football","tennis"]);
const CATEGORY_ORDER:CompetitionCategory[]=["continental","domestic-league","domestic-cup","international","grand-slam","tour","league","championship","organization","other"];
const CATEGORY_LABELS:Record<CompetitionCategory,string>={continental:"European & continental competitions","domestic-league":"Domestic leagues","domestic-cup":"Domestic cups",international:"International competitions","grand-slam":"Grand Slams",tour:"Tours & stage races",league:"Leagues",championship:"Championships",organization:"Organizations",other:"Other competitions"};

const LIGHT_ON_DARK_COMPETITION_LOGOS=new Set([
  "europa-league",
  "conference-league",
  "ligue-1",
  "bundesliga",
  "fa-cup",
  "copa-del-rey",
  "euro",
  "copa-america",
]);

const FOOTBALL_COMPETITION_IDENTITY_OVERRIDES:Record<string,{name?:string;logoUrl?:string;logoTone?:"default"|"light";logoVariant?:"default"|"cdf"}>={
  "champions-league":{
    logoUrl:"https://assets.footylogos.com/logos/uefa-champions-league-symbol-white/uefa-champions-league-symbol-white-logo-footylogos.svg",
    logoTone:"default",
  },
  "europa-league":{
    logoUrl:"https://www.footylogos.com/downloads/logo/europa-league-symbol-logo-footylogos.svg",
    logoTone:"default",
  },
  "premier-league":{
    logoUrl:"https://logo.premierleague.com/img/lion-light.svg",
    logoTone:"default",
  },
  "ligue-1":{
    name:"Ligue 1",
    logoUrl:"https://assets.footylogos.com/logos/ligue-1-france/ligue-1-france-logo-footylogos.svg",
    logoTone:"light",
  },
  "laliga":{
    logoUrl:"https://assets.laliga.com/assets/logos/LL_RGB_v_monocromatic_negativo/LL_RGB_v_monocromatic_negativo.png",
    logoTone:"default",
  },
  "bundesliga":{
    logoUrl:"https://commons.wikimedia.org/wiki/Special:FilePath/Bundesliga_logo_(2017).svg",
    logoTone:"default",
  },
  "coupe-de-france":{
    logoUrl:"https://foot-centre.fff.fr/wp-content/uploads/sites/9/2025/08/e200a7041387bf95d7d8cb417cbba561.png",
    logoTone:"default",
    logoVariant:"cdf",
  },
};

function competitionHref(sport:string,slug:string){return sport==="football"?`/football/competition/${slug}`:`/sports/${sport}/competition/${slug}`;}
function dayKey(value:string|number|Date){return new Date(value).toISOString().slice(0,10);}
function normalizeSlug(value:string){return value.normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/&/g," and ").replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"");}

function competitionFilter(sport:string,category:CompetitionCategory,name:string,slug:string){
  const haystack=`${slug} ${name}`.toLowerCase();
  if(sport==="tennis"){
    if(category==="grand-slam")return{key:"grand-slams",label:"Grand Slams"};
    if(/\batp\b|masters|challenger/.test(haystack))return{key:"atp",label:"ATP"};
    if(/\bwta\b/.test(haystack))return{key:"wta",label:"WTA"};
    if(/davis|billie|united-cup|team/.test(haystack))return{key:"team-events",label:"Team events"};
    return{key:"other",label:"Other"};
  }
  if(category==="domestic-league"||category==="league")return{key:"leagues",label:"Leagues"};
  if(category==="continental")return{key:"continental",label:"Continental"};
  if(category==="international")return{key:"international",label:"International"};
  if(category==="domestic-cup")return{key:"cups",label:"Cups"};
  if(category==="championship")return{key:"championships",label:"Championships"};
  return{key:"other",label:"Other"};
}

function eventNoun(sport:string){
  if(sport==="basketball"||sport==="hockey"||sport==="baseball"||sport==="american-football")return"games";
  if(sport==="tennis"||sport==="football"||sport==="rugby")return"matches";
  return"events";
}

function participantHref(sport:string,participant:Participant){
  if(participant.type!=="club")return null;
  const slug=participant.slug||normalizeSlug(participant.name);
  return `/sports/${sport}/club/${slug}`;
}

function participantInitials(name:string){
  return name.split(/\s+/).filter(Boolean).slice(0,2).map(part=>part[0]).join("").toUpperCase();
}

function participantMediaKey(participant:Participant){
  if(participant.slug)return participant.slug;
  if(participant.id.includes(":")){
    const value=participant.id.split(":").at(-1);
    if(value)return value;
  }
  return normalizeSlug(participant.name);
}

export async function buildSportHubMetadata(sport:string,canonical?:string):Promise<Metadata>{
  const cfg=SPORT_COPY[sport];
  if(!cfg)return{title:"Sport not found | WatchTVSport",robots:{index:false,follow:false}};
  const url=canonical??`/sports/${sport}`;
  const snapshot=await getPublicEventsSnapshot({sport,limit:100});
  const verifiedBroadcastCount=snapshot.events.reduce((sum,event)=>sum+event.broadcasts.filter(b=>b.coverageStatus==="confirmed").length,0);
  const eligibility=evaluateSeoEligibility({kind:"sport",canonicalPath:url,eventCount:snapshot.events.length,verifiedBroadcastCount});
  return{
    title:`${cfg.title} competitions, TV schedules & where to watch | WatchTVSport`,
    description:`Browse ${cfg.title.toLowerCase()} competitions, upcoming events and confirmed official TV and streaming options by country.`,
    alternates:{canonical:url},
    robots:indexableRobots(eligibility.indexable),
    openGraph:{title:`${cfg.title} competitions & TV schedules | WatchTVSport`,description:cfg.description,url,type:"website"},
    twitter:{card:"summary_large_image",title:`${cfg.title} competitions | WatchTVSport`,description:cfg.description},
  };
}

export default async function SportHubPage({sport,canonical}:{sport:string;canonical?:string}){
  const cfg=SPORT_COPY[sport];
  if(!cfg)return null;

  const [snapshot,permanent]=await Promise.all([
    getPublicEventsSnapshot({sport,limit:500}),
    getPublicSportCompetitions(sport),
  ]);

  const events=snapshot.events;
  const now=Date.now();
  const today=dayKey(now);
  const map=new Map<string,SportCompetitionCard & {category:CompetitionCategory;sortPriority?:number;competitionId?:string}>();

  for(const c of permanent){
    const category=(c.competitionType as CompetitionCategory)||classifyCompetition(sport,c.slug);
    map.set(c.slug,{
      sport,
      slug:c.slug,
      name:displayCompetitionName(sport,c.slug,c.displayName||c.name),
      href:competitionHref(sport,c.slug),
      category,
      sortPriority:c.sortPriority,
      competitionId:c.id,
      eventCount:0,
      next:null,
      nextTitle:null,
      season:c.seasonLabel,
      liveCount:0,
      todayCount:0,
      confirmedListings:0,
      freeCountries:0,
      paidCountries:0,
    });
  }

  const freeByCompetition=new Map<string,Set<string>>();
  const paidByCompetition=new Map<string,Set<string>>();

  for(const event of events){
    let row=map.get(event.competitionSlug);
    if(!row){
      row={
        sport,
        slug:event.competitionSlug,
        name:displayCompetitionName(sport,event.competitionSlug,event.competition),
        href:competitionHref(sport,event.competitionSlug),
        category:classifyCompetition(sport,event.competitionSlug),
        eventCount:0,
        next:null,
        nextTitle:null,
        liveCount:0,
        todayCount:0,
        confirmedListings:0,
        freeCountries:0,
        paidCountries:0,
      };
      map.set(event.competitionSlug,row);
    }
    row.eventCount++;
    if(event.status==="live")row.liveCount++;
    if(dayKey(event.eventDate)===today&&event.status!=="finished")row.todayCount++;
    const next=event.status!=="finished"&&Date.parse(event.eventDate)>=now?event.eventDate:null;
    if(next&&(!row.next||Date.parse(next)<Date.parse(row.next))){
      row.next=next;
      row.nextTitle=event.title;
    }
    const confirmed=event.broadcasts.filter(b=>b.coverageStatus==="confirmed");
    row.confirmedListings+=confirmed.length;
    const free=freeByCompetition.get(event.competitionSlug)??new Set<string>();
    const paid=paidByCompetition.get(event.competitionSlug)??new Set<string>();
    for(const b of confirmed){
      if(b.access==="Free")free.add(b.countryCode);
      if(b.access==="Paid")paid.add(b.countryCode);
    }
    freeByCompetition.set(event.competitionSlug,free);
    paidByCompetition.set(event.competitionSlug,paid);
  }

  for(const row of map.values()){
    row.freeCountries=freeByCompetition.get(row.slug)?.size??0;
    row.paidCountries=paidByCompetition.get(row.slug)?.size??0;
  }

  const competitions=Array.from(map.values());
  const groups=CATEGORY_ORDER.map(category=>({
    category,
    label:CATEGORY_LABELS[category],
    items:competitions.filter(c=>c.category===category),
  })).filter(group=>group.items.length);

  const currentEvents=events
    .filter(event=>event.status==="live"||(event.status!=="finished"&&Date.parse(event.eventDate)>=now))
    .sort((a,b)=>(a.status==="live"?-1:0)-(b.status==="live"?-1:0)||Date.parse(a.eventDate)-Date.parse(b.eventDate));
  const current=currentEvents.slice(0,5);
  const liveCount=currentEvents.filter(event=>event.status==="live").length;
  const upcomingCount=currentEvents.filter(event=>event.status!=="live").length;
  const nextEvent=currentEvents.find(event=>event.status!=="live")??currentEvents[0];

  const title=cfg.title||getSportLabel(sport);
  const canonicalPath=canonical??`/sports/${sport}`;
  const jsonLd={
    "@context":"https://schema.org",
    "@type":"CollectionPage",
    name:`${title} competitions and TV schedules`,
    url:`https://watchtvsport.com${canonicalPath}`,
    description:cfg.about,
    about:{"@type":"Thing",name:title},
  };

  if(!DIRECTORY_SPORTS.has(sport)){
    const heroStats=[
      {icon:"competition" as const,value:competitions.length,label:"COMPETITIONS"},
      {icon:"calendar" as const,value:upcomingCount,label:"UPCOMING"},
      ...(liveCount>0
        ? [{icon:"live" as const,value:liveCount,label:"LIVE NOW",tone:"live" as const}]
        : nextEvent
          ? [{icon:"next" as const,value:"NEXT",label:"UP NEXT",detail:nextEvent.title,date:nextEvent.eventDate,tone:"next" as const}]
          : []),
    ];

    return <main id="main-content" className={styles.page}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{__html:JSON.stringify(jsonLd)}}/>
      <Breadcrumbs items={[{label:"Home",href:"/"},{label:"Sports",href:"/sports"},{label:title}]}/>
      <SportHero eyebrow={cfg.eyebrow} title={title} description={cfg.description} backdrop={cfg.backdrop} titleId={`${sport}-title`} stats={heroStats}/>
      {current.length>0?<section id="next" className={styles.current} aria-labelledby={`${sport}-current-title`}>
        <div className={styles.heading}>
          <div><p>What matters now</p><h2 id={`${sport}-current-title`}>Live & next</h2></div>
          <Link href="/events#sports-filters">Full schedule →</Link>
        </div>
        <div className={styles.currentGrid}>
          {current.map(event=>{
            const confirmed=event.broadcasts.filter(b=>b.coverageStatus==="confirmed");
            const freeCountries=new Set(confirmed.filter(b=>b.access==="Free").map(b=>b.countryCode)).size;
            return <Link href={event.detailPath} key={event.id}>
              <span className={event.status==="live"?styles.liveBadge:dayKey(event.eventDate)===today?styles.todayBadge:styles.statusBadge}>
                {event.status==="live"?"LIVE":dayKey(event.eventDate)===today?"TODAY":"UPCOMING"}
              </span>
              <small>{displayCompetitionName(sport,event.competitionSlug,event.competition)}</small>
              <strong>{event.title}</strong>
              <span>{event.status==="live"?"Live now":new Intl.DateTimeFormat("en",{month:"short",day:"numeric",hour:"numeric",minute:"2-digit"}).format(new Date(event.eventDate))}</span>
              <em>{confirmed.length} confirmed{freeCountries?` · free in ${freeCountries}`:""}</em>
            </Link>;
          })}
        </div>
      </section>:null}
      <section id="competitions" className={styles.section} aria-labelledby={`${sport}-competitions-title`}>
        <div className={styles.heading}>
          <div><p>Choose where to go next</p><h2 id={`${sport}-competitions-title`}>Competitions & tournaments</h2></div>
          <span>{competitions.length} available</span>
        </div>
        {!groups.length?<div className={styles.empty}><strong>No competition published yet</strong><span>The page is ready. New active competitions will appear here automatically when imported.</span></div>:groups.map(group=><div className={styles.group} key={group.category}>
          <div className={styles.groupHeading}><h3>{group.label}</h3><span>{group.items.length}</span></div>
          <SportCompetitionGrid items={group.items} backdrop={cfg.backdrop}/>
        </div>)}
      </section>
      <section className={styles.about}>
        <p>About {title}</p>
        <h2>{title} on WatchTVSport</h2>
        <span>{cfg.about}</span>
        <div><Link href="/events#sports-filters">Browse all {title.toLowerCase()} events →</Link><Link href="/sports">Explore other sports →</Link></div>
      </section>
    </main>;
  }

  const participantMap=new Map<string,{participant:Participant;count:number}>();
  for(const event of events){
    for(const participant of [event.participant1,event.participant2]){
      if(!participant)continue;
      const eligible=sport==="tennis"
        ? participant.type==="player"
        : participant.type==="club"||participant.type==="national_team";
      if(!eligible)continue;
      const key=participant.id||`${participant.type}:${normalizeSlug(participant.name)}`;
      const existing=participantMap.get(key);
      if(existing)existing.count++;
      else participantMap.set(key,{participant,count:1});
    }
  }
  const popularParticipants=Array.from(participantMap.values())
    .sort((a,b)=>b.count-a.count||a.participant.name.localeCompare(b.participant.name))
    .slice(0,sport==="tennis"?7:10);

  const competitionMediaKeys=competitions.flatMap(item=>[
    item.slug,
    ...(item.competitionId?[`competition:${item.competitionId}`]:[]),
  ]);
  const participantMediaKeys=sport==="tennis"?[]:popularParticipants.map(({participant})=>participantMediaKey(participant));
  const [competitionLogos,participantLogos]=await Promise.all([
    getApprovedMediaAssets("competition","competition_logo",competitionMediaKeys),
    getApprovedMediaAssets("participant","team_logo",participantMediaKeys),
  ]);
  const explorerItems:SportCompetitionExplorerItem[]=competitions.map(item=>{
    const filter=competitionFilter(sport,item.category,item.name,item.slug);
    const media=item.competitionId?competitionLogos[`competition:${item.competitionId}`]??competitionLogos[item.slug]:competitionLogos[item.slug];
    const override=sport==="football"?FOOTBALL_COMPETITION_IDENTITY_OVERRIDES[item.slug]:undefined;
    return{
      ...item,
      name:override?.name??item.name,
      filterKey:filter.key,
      filterLabel:filter.label,
      sortPriority:item.sortPriority,
      logoUrl:override?.logoUrl??media?.url,
      logoTone:override?.logoTone??(LIGHT_ON_DARK_COMPETITION_LOGOS.has(item.slug)?"light":"default"),
      logoVariant:override?.logoVariant??"default",
    };
  });

  const countryMap=new Map<string,{countryCode:string;countryName:string;broadcasters:Set<string>;competitions:Set<string>;listings:number}>();
  for(const event of events){
    for(const broadcast of event.broadcasts){
      if(broadcast.coverageStatus!=="confirmed")continue;
      const code=broadcast.countryCode.toLowerCase();
      const row=countryMap.get(code)??{
        countryCode:code,
        countryName:broadcast.countryName,
        broadcasters:new Set<string>(),
        competitions:new Set<string>(),
        listings:0,
      };
      row.broadcasters.add(broadcast.broadcaster);
      row.competitions.add(event.competitionSlug);
      row.listings++;
      countryMap.set(code,row);
    }
  }

  const priorityBySport:Record<string,string[]>={
    football:["fr","gb","us","ca","es","de"],
    basketball:["us","ca","fr","es","gb","de"],
    hockey:["ca","us","se","fi","fr","de"],
    tennis:["fr","us","gb","au","es","ca"],
    rugby:["gb","fr","au","nz","za","ie"],
    baseball:["us","ca","jp","mx","kr","do"],
    "american-football":["us","ca","gb","de","mx","fr"],
  };
  const priority=priorityBySport[sport]??[];
  const priorityIndex=new Map(priority.map((code,index)=>[code,index]));
  const countryRows=Array.from(countryMap.values())
    .sort((a,b)=>{
      const ai=priorityIndex.get(a.countryCode)??999;
      const bi=priorityIndex.get(b.countryCode)??999;
      if(ai!==bi)return ai-bi;
      return b.competitions.size-a.competitions.size||b.listings-a.listings||a.countryName.localeCompare(b.countryName);
    })
    .slice(0,6);

  const heroStats=[
    {icon:"competition" as const,value:competitions.length,label:sport==="tennis"?"TOURNAMENTS":"COMPETITIONS"},
    {icon:"calendar" as const,value:upcomingCount,label:`UPCOMING ${eventNoun(sport).toUpperCase()}`},
    {icon:"organization" as const,value:countryMap.size,label:"TV COUNTRIES"},
  ];

  return <main id="main-content" className={`${styles.page} ${styles.directoryPage}`}>
    <script type="application/ld+json" dangerouslySetInnerHTML={{__html:JSON.stringify(jsonLd)}}/>
    {snapshot.warning?<p className="v2-data-warning" role="status">{snapshot.warning}</p>:null}
    <Breadcrumbs items={[{label:"Home",href:"/"},{label:"Sports",href:"/sports"},{label:title}]}/>

    <SportHero
      eyebrow={cfg.eyebrow}
      title={title}
      description={cfg.description}
      backdrop={cfg.backdrop}
      titleId={`${sport}-title`}
      stats={heroStats}
    />

    <section id="competitions" className={`${styles.section} ${styles.directorySection}`} aria-labelledby={`${sport}-competitions-title`}>
      <div className={styles.directoryHeading}>
        <div>
          <p>Explore {title}</p>
          <h2 id={`${sport}-competitions-title`}>Competitions & tournaments</h2>
        </div>
        <span>{competitions.length} available</span>
      </div>
      {competitions.length===0
        ? <div className={styles.empty}><strong>No competition published yet</strong><span>New competitions will appear here automatically when imported.</span></div>
        : <SportCompetitionExplorer items={explorerItems} eventNoun={eventNoun(sport)}/>}
    </section>

    {popularParticipants.length>0?<section className={styles.directorySection} aria-labelledby={`${sport}-participants-title`}>
      <div className={styles.simpleHeading}>
        <h2 id={`${sport}-participants-title`}>{sport==="tennis"?"Popular players":"Popular teams"}</h2>
      </div>
      <div className={styles.participantRail}>
        {popularParticipants.map(({participant})=>{
          const href=participantHref(sport,participant);
          const visual=participant.type==="player"
            ? <span className={styles.playerInitials} aria-hidden="true">{participantInitials(participant.name)}</span>
            : participant.visualType==="flag"&&participant.countryCode
              ? <img className={styles.participantFlag} src={`/flags/${participant.countryCode.toLowerCase()}.png`} alt="" aria-hidden="true"/>
              : <ParticipantLogo sport={sport} label={participant.name} logoUrl={participantLogos[participantMediaKey(participant)]?.url} countryCode={participant.countryCode} visual={participant.visualProfile} size="md"/>;
          const card=<>
            <span className={styles.participantVisual} data-logo-key={participantMediaKey(participant)}>{visual}</span>
            <strong>{participant.name}</strong>
          </>;
          return href
            ? <Link className={styles.participantCard} href={href} key={participant.id}>{card}</Link>
            : <div className={styles.participantCard} key={participant.id}>{card}</div>;
        })}
      </div>
    </section>:null}

    {countryRows.length>0?<section className={styles.directorySection} aria-labelledby={`${sport}-countries-title`}>
      <div className={styles.countryHeading}>
        <div>
          <h2 id={`${sport}-countries-title`}>Where to watch {title}</h2>
          <span>Select a country to see TV channels and streaming options for {title.toLowerCase()}.</span>
        </div>
        <Link href="/country">View all countries →</Link>
      </div>
      <div className={styles.countryGrid}>
        {countryRows.map(country=><Link className={styles.countryCard} href={`/country/${country.countryCode}`} key={country.countryCode}>
          <img src={`/flags/${country.countryCode}.png`} alt="" aria-hidden="true"/>
          <strong>{country.countryName}</strong>
        </Link>)}
      </div>
    </section>:null}

    <section className={styles.directoryCta} aria-label={`Explore ${title}`}>
      <span className={styles.ctaIcon} aria-hidden="true">▣</span>
      <div>
        <strong>{title}, everywhere.</strong>
        <span>One place to find the right competition and where to watch it in every country.</span>
      </div>
      <Link href="#competitions">Explore all competitions →</Link>
    </section>

    <section className={styles.directoryAbout}>
      <span>{cfg.about}</span>
    </section>
  </main>;
}
