import { createClient } from "npm:@supabase/supabase-js@2";

const NBA_TEAM_SLUGS = ["atl","bkn","bos","cha","chi","cle","dal","den","det","gs","hou","ind","lac","lal","mem","mia","mil","min","no","ny","okc","orl","phi","phx","por","sa","sac","tor","utah","wsh"];
const normalizeNbaAbbr = (v: string) => ({ GS:"GSW", NO:"NOP", NY:"NYK", SA:"SAS", UTAH:"UTA", WSH:"WAS" } as Record<string,string>)[v.toUpperCase()] ?? v.toUpperCase();

function espnStatus(event: any): "scheduled"|"live"|"finished" {
  const t=event?.status?.type; if(t?.completed===true||t?.state==="post") return "finished"; if(t?.state==="in") return "live"; return "scheduled";
}
function nhlStatus(game: any): "scheduled"|"live"|"finished" {
  const s=String(game?.gameState??"").toUpperCase(); if(["LIVE","CRIT"].includes(s)) return "live"; if(["OFF","FINAL"].includes(s)) return "finished"; return "scheduled";
}
async function fetchJson(url:string){const r=await fetch(url,{headers:{"user-agent":"WatchTVSport/1.0 schedule-sync"}});if(!r.ok)throw new Error(`${r.status} ${url}`);return r.json();}

async function context(db:any,publicSlug:string,competitionSlug:string){
  const {data:sports,error:se}=await db.from("sports").select("id,slug,public_slug"); if(se)throw se;
  const sport=sports.find((s:any)=>s.slug===publicSlug||s.public_slug===publicSlug); if(!sport)throw new Error(`sport ${publicSlug} not found`);
  const {data:competition,error:ce}=await db.from("competitions").select("id,slug").eq("sport_id",sport.id).eq("slug",competitionSlug).single(); if(ce)throw ce;
  const {data:season,error:sne}=await db.from("seasons").select("id,slug").eq("competition_id",competition.id).eq("slug","2026-27").single(); if(sne)throw sne;
  const {data:participants,error:pe}=await db.from("participants").select("id,slug,short_name").eq("sport_id",sport.id).eq("is_active",true); if(pe)throw pe;
  const participantMap=new Map<string,string>(); for(const p of participants)if(p.short_name)participantMap.set(String(p.short_name).toUpperCase(),p.id);
  const {data:venues}=await db.from("venues").select("id,name"); const venueMap=new Map<string,string>(); for(const v of venues??[])if(v.name)venueMap.set(String(v.name).toLowerCase(),v.id);
  return {sport,competition,season,participantMap,venueMap};
}

async function upsertEvents(db:any,rows:any[],provider:string){
  let count=0;
  for(let i=0;i<rows.length;i+=250){
    const chunk=rows.slice(i,i+250);
    const {data:events,error}=await db.from("events").upsert(chunk.map(r=>r.event),{onConflict:"sport_id,slug"}).select("id,slug"); if(error)throw error;
    const bySlug=new Map((events??[]).map((e:any)=>[e.slug,e.id]));
    const ext=chunk.flatMap(r=>bySlug.has(r.event.slug)?[{event_id:bySlug.get(r.event.slug),provider,external_id:r.externalId}]:[]);
    const urls=chunk.flatMap(r=>bySlug.has(r.event.slug)?[{event_id:bySlug.get(r.event.slug),url_path:`/event/${r.event.slug}`,kind:"canonical",is_active:true}]:[]);
    if(ext.length){const {error:e}=await db.from("event_external_ids").upsert(ext,{onConflict:"provider,external_id"});if(e)throw e;}
    if(urls.length){const {error:e}=await db.from("event_urls").upsert(urls,{onConflict:"url_path"});if(e)throw e;}
    count+=chunk.length;
  }
  return count;
}

async function syncNhl(db:any){
  const ctx=await context(db,"hockey","nhl");
  const payloads=await Promise.all([...ctx.participantMap.keys()].map(async abbr=>({abbr,payload:await fetchJson(`https://api-web.nhle.com/v1/club-schedule-season/${abbr}/20262027`)})));
  const games=new Map<string,any>(); for(const {payload} of payloads)for(const g of payload.games??[])if(Number(g.gameType)===2)games.set(String(g.id),g);
  if(games.size!==1344)throw new Error(`NHL guardrail failed: expected 1344, got ${games.size}`);
  const now=new Date().toISOString(); const rows:any[]=[];
  for(const [id,g] of games){const home=ctx.participantMap.get(String(g.homeTeam?.abbrev??"").toUpperCase());const away=ctx.participantMap.get(String(g.awayTeam?.abbrev??"").toUpperCase());if(!home||!away||!g.startTimeUTC)continue;const venue=g.venue?.default??null;
    rows.push({externalId:id,event:{sport_id:ctx.sport.id,competition_id:ctx.competition.id,season_id:ctx.season.id,status:nhlStatus(g),slug:`nhl-${id}`,phase:"Regular Season",event_date:g.startTimeUTC,scheduled_date:g.startTimeUTC,venue_name:venue,timezone:g.venueTimezone??null,home_participant_id:home,away_participant_id:away,is_published:true,source_name:"NHL official schedule API",source_url:g.gameCenterLink?`https://www.nhl.com${g.gameCenterLink}`:"https://www.nhl.com/schedule",last_verified_at:now,verification_status:"confirmed",event_kind:"match",neutral_venue:Boolean(g.neutralSite),venue_id:venue?ctx.venueMap.get(String(venue).toLowerCase())??null:null,notes:"Automated sync from NHL official club schedule API; gameType=2 regular season.",updated_at:now}});
  }
  return upsertEvents(db,rows,"nhl_api");
}

async function syncNba(db:any){
  const ctx=await context(db,"basketball","nba");
  const payloads=await Promise.all(NBA_TEAM_SLUGS.map(async slug=>({slug,payload:await fetchJson(`https://site.api.espn.com/apis/site/v2/sports/basketball/nba/teams/${slug}/schedule?season=2027&seasontype=2`)})));
  const games=new Map<string,any>();
  for(const {payload} of payloads)for(const event of payload.events??[]){const comp=event.competitions?.[0];const notes=JSON.stringify(comp?.notes??event.notes??[]).toLowerCase();if(notes.includes("cup")&&notes.includes("championship"))continue;if(event.id)games.set(String(event.id),event);}
  if(games.size<1200||games.size>1230)throw new Error(`NBA guardrail failed: expected 1200-1230 assigned regular-season games, got ${games.size}`);
  const now=new Date().toISOString(); const rows:any[]=[];
  for(const [id,event] of games){const comp=event.competitions?.[0];const competitors=comp?.competitors??[];const hr=competitors.find((c:any)=>c.homeAway==="home");const ar=competitors.find((c:any)=>c.homeAway==="away");const home=ctx.participantMap.get(normalizeNbaAbbr(String(hr?.team?.abbreviation??"")));const away=ctx.participantMap.get(normalizeNbaAbbr(String(ar?.team?.abbreviation??"")));if(!home||!away||!event.date)continue;const venue=comp?.venue?.fullName??null;const sourceUrl=event.links?.find((l:any)=>Array.isArray(l.rel)&&l.rel.includes("summary"))?.href??`https://www.espn.com/nba/game/_/gameId/${id}`;
    rows.push({externalId:id,event:{sport_id:ctx.sport.id,competition_id:ctx.competition.id,season_id:ctx.season.id,status:espnStatus(event),slug:`nba-${id}`,phase:"Regular Season",event_date:event.date,scheduled_date:event.date,venue_name:venue,home_participant_id:home,away_participant_id:away,is_published:true,source_name:"ESPN NBA schedule API; NBA release cross-check",source_url:sourceUrl,last_verified_at:now,verification_status:"confirmed",event_kind:"match",neutral_venue:Boolean(comp?.neutralSite),venue_id:venue?ctx.venueMap.get(String(venue).toLowerCase())??null:null,notes:"Automated NBA regular-season sync. NBA Cup-determined games appear when assigned; Cup championship excluded when identifiable.",updated_at:now}});
  }
  if(rows.length<1200)throw new Error(`NBA participant mapping guardrail failed: ${rows.length} mapped games`);
  return upsertEvents(db,rows,"espn_nba");
}

Deno.serve(async(req:Request)=>{
  if(req.method!=="POST")return new Response("Method not allowed",{status:405});
  const url=Deno.env.get("SUPABASE_URL");const serviceRole=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");if(!url||!serviceRole)return Response.json({error:"Supabase service configuration unavailable"},{status:500});
  const db=createClient(url,serviceRole,{auth:{persistSession:false,autoRefreshToken:false}});
  const provided=req.headers.get("x-sync-secret");const {data:auth,error:authError}=await db.from("schedule_sync_auth").select("secret").eq("id",true).single();
  if(authError||!provided||provided!==auth?.secret)return Response.json({error:"unauthorized"},{status:401});
  try{const [nba,nhl]=await Promise.all([syncNba(db),syncNhl(db)]);return Response.json({ok:true,nba,nhl,syncedAt:new Date().toISOString()});}
  catch(error){console.error(error);return Response.json({ok:false,error:error instanceof Error?error.message:"unknown sync error"},{status:500});}
});
