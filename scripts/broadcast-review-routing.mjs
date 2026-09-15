const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ENUMS={access_type:new Set(['Free','Paid','Unknown']),broadcast_type:new Set(['live','delayed','replay','highlights']),evidence_scope:new Set(['event','competition','unknown'])};
export const REVIEW_POLICY_VERSION=1;
export const REVIEW_THRESHOLDS={nearEventHours:168,maxEvidenceAgeNearHours:72,maxEvidenceAgeFarHours:336};
function https(v){try{const u=new URL(v);return u.protocol==='https:'&&!u.username&&!u.password&&!!u.hostname;}catch{return false;}}
function ts(v){const n=Date.parse(v);return Number.isFinite(n)?n:null;}
function diff(a,b){return a!==undefined&&b!==undefined&&JSON.stringify(a)!==JSON.stringify(b);}
export function assessBroadcastCandidate(input,{now=new Date()}={}){
 const reasons=[];const hard=[];const c=input?.candidate||{};const e=input?.evidence||{};const source=input?.sourcePolicy||{};const existing=input?.existing||null;
 const nowMs=now instanceof Date?now.getTime():Date.parse(now);
 if(!UUID.test(input?.eventId||'')) hard.push('event_unresolved');
 if(!UUID.test(c.broadcaster_id||'')) reasons.push('broadcaster_unresolved');
 if(!UUID.test(c.territory_id||'')) reasons.push('territory_unresolved');
 if(!ENUMS.access_type.has(c.access_type)) reasons.push('access_unknown');
 if(c.access_type==='Unknown') reasons.push('access_unknown');
 if(!ENUMS.broadcast_type.has(c.broadcast_type)) reasons.push('broadcast_type_unknown');
 if(!ENUMS.evidence_scope.has(c.evidence_scope)||c.evidence_scope!=='event') reasons.push('evidence_not_event_specific');
 if(!https(c.source_url||e.url)) reasons.push('evidence_url_invalid');
 if(!https(c.official_url)) reasons.push('official_url_invalid');
 if(source.is_enabled!==true||source.automatic_collection_enabled!==true) hard.push('source_not_approved_for_collection');
 if(source.reuse_status!=='approved'||source.commercial_use_allowed!==true) reasons.push('source_reuse_not_approved');
 const observed=ts(input?.sourceObservedAt||e.observedAt);const eventStart=ts(input?.eventStart);
 if(observed===null) reasons.push('evidence_time_missing');
 else if(Number.isFinite(nowMs)){
   const hours=Math.max(0,(nowMs-observed)/36e5);const near=eventStart!==null&&Math.abs(eventStart-nowMs)<=REVIEW_THRESHOLDS.nearEventHours*36e5;
   const max=near?REVIEW_THRESHOLDS.maxEvidenceAgeNearHours:REVIEW_THRESHOLDS.maxEvidenceAgeFarHours;
   if(hours>max) reasons.push('evidence_stale');
 }
 if(existing){for(const k of ['broadcaster_id','territory_id','access_type','broadcast_type','official_url']) if(diff(existing[k],c[k])) reasons.push('conflicts_with_published');}
 if(input?.crossSourceConflict===true) reasons.push('cross_source_conflict');
 if(input?.manualLock===true) hard.push('manual_lock');
 const unique=[...new Set([...hard,...reasons])];
 const route=hard.length?'blocked':unique.length?'review':'automatic';
 return {policyVersion:REVIEW_POLICY_VERSION,route,reasons:unique,requiresExplanation:unique.includes('conflicts_with_published')||unique.includes('cross_source_conflict')||unique.includes('manual_lock')};
}
export function buildReviewException(input,assessment=assessBroadcastCandidate(input)){
 if(assessment.route!=='review') return null;
 const c=input.candidate||{};
 const exceptionKey=['broadcast',input.eventId,c.territory_id||'unknown',c.broadcaster_id||'unknown',input.importItemId||input.externalKey||'candidate'].join(':').slice(0,250);
 return {exception_key:exceptionKey,import_item_id:input.importItemId||null,event_id:input.eventId,source_id:input.sourceId||null,event_title:String(input.eventTitle||'Evenement a verifier').slice(0,240),competition:String(input.competition||'Competition').slice(0,160),session_label:String(input.sessionLabel||'').slice(0,160),event_start:input.eventStart||null,source_observed_at:input.sourceObservedAt||null,reason:assessment.reasons.join(', ').slice(0,2000),requires_explanation:assessment.requiresExplanation,candidate:{...c,evidence_scope:c.evidence_scope||'unknown'},published_snapshot:input.existing||null};
}
