export const TRUST_LEVELS=Object.freeze({PROBATION:'probation',TRUSTED:'trusted',ELITE:'elite',WATCH:'watch',SUSPENDED:'suspended'});

export const TRUST_RULES=Object.freeze({
 trusted:{minAudits:100,minAccuracy:0.985,minRecentAccuracy:0.98,maxCriticalErrors:0,auditRate:0.10},
 elite:{minAudits:300,minAccuracy:0.995,minRecentAccuracy:0.99,maxCriticalErrors:0,auditRate:0.02},
 watch:{minRecentAudits:25,maxRecentAccuracy:0.97,auditRate:0.50},
 probation:{auditRate:1.00},
 suspended:{auditRate:1.00},
});

function clamp01(v){return Math.max(0,Math.min(1,Number(v)||0));}
function safeInt(v){return Math.max(0,Math.trunc(Number(v)||0));}

export function trustKey({provider,competitionKey,territoryCode}){
 return [String(provider||'').trim().toLowerCase(),String(competitionKey||'').trim().toLowerCase(),String(territoryCode||'').trim().toUpperCase()].join('::');
}

export function summarizeAuditHistory(audits,{recentLimit=50}={}){
 const rows=Array.isArray(audits)?audits:[];
 const normalized=rows.map(a=>({
  correct:a?.correct===true,
  critical:a?.critical===true,
  auditedAt:Date.parse(a?.auditedAt||'')||0,
 })).sort((a,b)=>b.auditedAt-a.auditedAt);
 const recent=normalized.slice(0,recentLimit);
 const accuracy=normalized.length?normalized.filter(x=>x.correct).length/normalized.length:0;
 const recentAccuracy=recent.length?recent.filter(x=>x.correct).length/recent.length:0;
 return {
  audits:normalized.length,
  correct:normalized.filter(x=>x.correct).length,
  criticalErrors:normalized.filter(x=>x.critical&&!x.correct).length,
  accuracy:clamp01(accuracy),
  recentAudits:recent.length,
  recentAccuracy:clamp01(recentAccuracy),
 };
}

export function evaluateTrustState(metrics,{commercialReuseAllowed=true,manualSuspension=false}={}){
 const m={audits:safeInt(metrics?.audits),criticalErrors:safeInt(metrics?.criticalErrors),recentAudits:safeInt(metrics?.recentAudits),accuracy:clamp01(metrics?.accuracy),recentAccuracy:clamp01(metrics?.recentAccuracy)};
 if(!commercialReuseAllowed||manualSuspension) return {level:TRUST_LEVELS.SUSPENDED,auditRate:TRUST_RULES.suspended.auditRate,reasons:[!commercialReuseAllowed?'commercial_reuse_blocked':'manual_suspension']};
 if(m.criticalErrors>0) return {level:TRUST_LEVELS.WATCH,auditRate:TRUST_RULES.watch.auditRate,reasons:['critical_error']};
 if(m.recentAudits>=TRUST_RULES.watch.minRecentAudits&&m.recentAccuracy<TRUST_RULES.watch.maxRecentAccuracy) return {level:TRUST_LEVELS.WATCH,auditRate:TRUST_RULES.watch.auditRate,reasons:['recent_accuracy_drop']};
 if(m.audits>=TRUST_RULES.elite.minAudits&&m.accuracy>=TRUST_RULES.elite.minAccuracy&&m.recentAccuracy>=TRUST_RULES.elite.minRecentAccuracy) return {level:TRUST_LEVELS.ELITE,auditRate:TRUST_RULES.elite.auditRate,reasons:['elite_threshold_met']};
 if(m.audits>=TRUST_RULES.trusted.minAudits&&m.accuracy>=TRUST_RULES.trusted.minAccuracy&&m.recentAccuracy>=TRUST_RULES.trusted.minRecentAccuracy) return {level:TRUST_LEVELS.TRUSTED,auditRate:TRUST_RULES.trusted.auditRate,reasons:['trusted_threshold_met']};
 return {level:TRUST_LEVELS.PROBATION,auditRate:TRUST_RULES.probation.auditRate,reasons:['insufficient_history']};
}

export function recordAudit(previous={},audit){
 const p={audits:safeInt(previous.audits),correct:safeInt(previous.correct),criticalErrors:safeInt(previous.criticalErrors)};
 const ok=audit?.correct===true;
 const critical=audit?.critical===true&&!ok;
 const audits=p.audits+1;
 const correct=p.correct+(ok?1:0);
 return {...p,audits,correct,criticalErrors:p.criticalErrors+(critical?1:0),accuracy:correct/audits};
}

export function shouldAudit({level,auditRate},stableKey){
 if(level===TRUST_LEVELS.PROBATION||level===TRUST_LEVELS.WATCH||level===TRUST_LEVELS.SUSPENDED) return true;
 const rate=clamp01(auditRate);
 let h=2166136261;
 for(const ch of String(stableKey||'')){h^=ch.charCodeAt(0);h=Math.imul(h,16777619)>>>0;}
 return (h/0xffffffff)<rate;
}
