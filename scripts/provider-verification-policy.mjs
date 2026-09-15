export const PROVIDER_VERIFICATION_POLICY_VERSION=1;
export const PROVIDER_LEVELS={
 probation:{minAudits:0,minAccuracy:0,minFreshness:0,auditRate:1},
 trusted:{minAudits:100,minAccuracy:.985,minFreshness:.95,auditRate:.10},
 elite:{minAudits:300,minAccuracy:.995,minFreshness:.98,auditRate:.02},
};

export function providerVerificationLevel(metrics={}){
 const audits=Math.max(0,Number(metrics.audits)||0);
 const accuracy=Math.max(0,Math.min(1,Number(metrics.accuracy)||0));
 const freshness=Math.max(0,Math.min(1,Number(metrics.freshness)||0));
 if(metrics.reuseAllowed!==true) return {level:'suspended',auditRate:1,automatic:false};
 if(Number(metrics.recentCriticalErrors)>0) return {level:'watch',auditRate:.5,automatic:false};
 if(audits>=300&&accuracy>=.995&&freshness>=.98) return {level:'elite',auditRate:.02,automatic:true};
 if(audits>=100&&accuracy>=.985&&freshness>=.95) return {level:'trusted',auditRate:.10,automatic:true};
 if(audits>=100&&accuracy<.97) return {level:'watch',auditRate:.5,automatic:false};
 return {level:'probation',auditRate:1,automatic:false};
}

export function mustDoubleCheck({level,hasConflict=false,changesPublished=false,unknownAccess=false,ambiguous=false,stale=false,sampleAudit=false}={}){
 if(hasConflict||changesPublished||unknownAccess||ambiguous||stale||sampleAudit) return true;
 return level!=='trusted'&&level!=='elite';
}
