import {assessBroadcastCandidate,buildReviewException} from './broadcast-review-routing.mjs';

export async function routeBroadcastWithTrust(input,{lookupTrust,now=new Date()}={}){
  if(typeof lookupTrust!=='function') throw new TypeError('lookupTrust function required');
  const sourceId=input?.sourceId;
  const competitionId=input?.competitionId;
  const territoryId=input?.candidate?.territory_id;
  let providerTrust={level:'probation',auditRate:1,profileFound:false};
  if(sourceId&&competitionId&&territoryId){
    const loaded=await lookupTrust({sourceId,competitionId,territoryId});
    if(loaded&&typeof loaded==='object') providerTrust=loaded;
  }
  const routedInput={...input,providerTrust};
  const assessment=assessBroadcastCandidate(routedInput,{now});
  return {
    assessment,
    providerTrust,
    reviewException:assessment.route==='review'?buildReviewException(routedInput,assessment):null,
  };
}
