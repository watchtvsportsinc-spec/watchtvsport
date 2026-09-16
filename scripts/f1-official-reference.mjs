export const F1_OFFICIAL_SOURCE='formula1-official-web';
export const F1_BROADCAST_URL='https://www.formula1.com/en/information/f1-broadcast-information.45y3LNsT1D6VoK0ZmX8ciJ';

const SESSION_SUFFIXES=['practice-1','practice-2','practice-3','sprint-qualifying','sprint','qualifying','race'];

export function f1RaceSlugFromEventSlug(eventSlug){
 const slug=String(eventSlug||'').trim().toLowerCase();
 for(const suffix of SESSION_SUFFIXES){
  const marker=`-${suffix}`;
  if(slug.endsWith(marker)) return slug.slice(0,-marker.length);
 }
 return slug||null;
}

export function f1RacePageUrl(eventSlug,season=2026){
 const race=f1RaceSlugFromEventSlug(eventSlug);
 return race?`https://www.formula1.com/en/racing/${season}/${race}`:null;
}

export function normalizeF1BroadcasterSnapshot(snapshot){
 if(!snapshot||!Array.isArray(snapshot.territories)) throw new TypeError('territories array required');
 const observedAt=new Date(snapshot.observedAt||Date.now()).toISOString();
 const rows=[];
 for(const territory of snapshot.territories){
  const code=String(territory.code||'').trim().toLowerCase();
  if(!code) continue;
  for(const item of territory.broadcasters||[]){
   const name=String(item.name||'').trim();
   if(!name) continue;
   rows.push({
    source:F1_OFFICIAL_SOURCE,
    territoryCode:code,
    broadcasterName:name,
    officialUrl:item.officialUrl||null,
    accessType:item.accessType||'Unknown',
    coverageType:item.coverageType||'unknown',
    evidenceScope:'competition',
    evidenceUrl:snapshot.sourceUrl||F1_BROADCAST_URL,
    observedAt,
    requiresSessionVerification:item.coverageType!=='full',
    publishable:false,
   });
  }
 }
 return rows;
}

export function f1VerificationCadence({eventStart,now=new Date()}={}){
 const start=new Date(eventStart).getTime();
 const current=new Date(now).getTime();
 if(!Number.isFinite(start)||!Number.isFinite(current)) return {scheduleHours:24,broadcastHours:24};
 const hours=(start-current)/36e5;
 if(hours<=24) return {scheduleHours:3,broadcastHours:6};
 if(hours<=168) return {scheduleHours:12,broadcastHours:24};
 return {scheduleHours:72,broadcastHours:168};
}
