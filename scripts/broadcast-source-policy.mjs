export const BROADCAST_SOURCE_POLICY_VERSION=1;

export const SOURCE_CLASS_BASE_SCORES=Object.freeze({
 official_broadcaster:100,
 rights_holder:96,
 official_competition:92,
 specialist_provider:78,
 secondary_source:55,
});

export const FRESHNESS_WINDOWS=Object.freeze({
 imminent:{eventWithinHours:24,maxEvidenceAgeHours:24,recheckBeforeEventHours:6},
 near:{eventWithinHours:168,maxEvidenceAgeHours:72,recheckBeforeEventHours:24},
 far:{eventWithinHours:720,maxEvidenceAgeHours:336,recheckBeforeEventHours:168},
 distant:{eventWithinHours:Infinity,maxEvidenceAgeHours:720,recheckBeforeEventHours:336},
});

export const RESEARCH_BUDGET_DEFAULTS=Object.freeze({
 currency:'USD',
 monthlyCapMinor:2500,
 dailyCapMinor:150,
 perCaseCapMinor:20,
 maxAttemptsPerCase:2,
 maxCasesPerDay:50,
 reservePercentForImminentEvents:35,
});

function hoursBetween(a,b){return Math.abs(Date.parse(a)-Date.parse(b))/36e5;}
function ageHours(observedAt,now){return Math.max(0,(Date.parse(now)-Date.parse(observedAt))/36e5);}

export function freshnessBand(eventStart,now=new Date().toISOString()){
 const h=hoursBetween(eventStart,now);
 if(h<=FRESHNESS_WINDOWS.imminent.eventWithinHours) return 'imminent';
 if(h<=FRESHNESS_WINDOWS.near.eventWithinHours) return 'near';
 if(h<=FRESHNESS_WINDOWS.far.eventWithinHours) return 'far';
 return 'distant';
}

export function assessSourceConfidence(input,{now=new Date().toISOString()}={}){
 const base=SOURCE_CLASS_BASE_SCORES[input?.sourceClass]??0;
 const reasons=[];
 if(base===0) reasons.push('unknown_source_class');
 let score=base;
 if(input?.evidenceScope!=='event'){score-=20;reasons.push('not_event_specific');}
 if(input?.commercialReuseAllowed!==true){score-=35;reasons.push('commercial_reuse_unconfirmed');}
 if(input?.providerConfidence!==undefined&&input.providerConfidence!==null){
  if(typeof input.providerConfidence==='number'&&input.providerConfidence>=0&&input.providerConfidence<=1){
   score=Math.round(score*0.75+(input.providerConfidence*100)*0.25);
  } else reasons.push('provider_confidence_invalid');
 }
 if(input?.crossSourceConflict===true){score-=30;reasons.push('cross_source_conflict');}
 if(input?.matchesExisting===true){score+=3;reasons.push('corroborates_existing');}
 const band=input?.eventStart?freshnessBand(input.eventStart,now):'near';
 const window=FRESHNESS_WINDOWS[band];
 if(!input?.observedAt||!Number.isFinite(Date.parse(input.observedAt))){score-=25;reasons.push('evidence_time_missing');}
 else if(ageHours(input.observedAt,now)>window.maxEvidenceAgeHours){score-=25;reasons.push('evidence_stale');}
 score=Math.max(0,Math.min(100,score));
 const route=score>=90&&!reasons.includes('cross_source_conflict')?'automatic':score>=60?'review':'blocked';
 return {policyVersion:BROADCAST_SOURCE_POLICY_VERSION,score,route,band,reasons:[...new Set(reasons)],recheckBeforeEventHours:window.recheckBeforeEventHours};
}

export function canSpendResearchBudget(usage,request={},limits=RESEARCH_BUDGET_DEFAULTS){
 const cost=Math.max(0,Number(request.estimatedCostMinor||0));
 const imminent=request.band==='imminent';
 const monthly=Number(usage?.monthlySpentMinor||0);
 const daily=Number(usage?.dailySpentMinor||0);
 const cases=Number(usage?.casesToday||0);
 if(cost>limits.perCaseCapMinor) return {allowed:false,reason:'per_case_cap'};
 if(monthly+cost>limits.monthlyCapMinor) return {allowed:false,reason:'monthly_cap'};
 if(daily+cost>limits.dailyCapMinor) return {allowed:false,reason:'daily_cap'};
 if(cases>=limits.maxCasesPerDay) return {allowed:false,reason:'daily_case_cap'};
 if(!imminent){
  const reserve=Math.round(limits.dailyCapMinor*limits.reservePercentForImminentEvents/100);
  if(daily+cost>limits.dailyCapMinor-reserve) return {allowed:false,reason:'imminent_reserve'};
 }
 return {allowed:true,reason:'within_budget'};
}

export function scoreProviderBenchmark(metrics={}){
 const pct=(v)=>Math.max(0,Math.min(1,Number(v)||0));
 const score=
  pct(metrics.fixtureCoverage)*15+
  pct(metrics.broadcastCoverage)*25+
  pct(metrics.territoryCoverage)*20+
  pct(metrics.correctness)*20+
  pct(metrics.accessTypeCoverage)*8+
  pct(metrics.officialUrlCoverage)*5+
  pct(metrics.freshnessReliability)*5+
  pct(metrics.idStability)*2;
 return Math.round(score*100)/100;
}
