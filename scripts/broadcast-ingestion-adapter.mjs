import {normalizeProviderObservation} from './broadcast-provider-contract.mjs';
import {routeBroadcastWithTrust} from './broadcast-routing-with-trust.mjs';

function required(fn,name){if(typeof fn!=='function') throw new TypeError(`${name} function required`);return fn;}

export async function ingestProviderObservation(observation,{
  resolveEvent,
  resolveBroadcaster,
  resolveTerritory,
  loadSourcePolicy,
  lookupTrust,
  findPublishedBroadcast=async()=>null,
  enqueueReview=async()=>null,
  now=new Date(),
}={}){
  required(resolveEvent,'resolveEvent');
  required(resolveBroadcaster,'resolveBroadcaster');
  required(resolveTerritory,'resolveTerritory');
  required(loadSourcePolicy,'loadSourcePolicy');
  required(lookupTrust,'lookupTrust');

  const normalized=normalizeProviderObservation(observation);
  if(!normalized.ok) return {disposition:'invalid',issues:normalized.issues,observation:null};

  const o=normalized.observation;
  const [event,territory,broadcaster,sourcePolicy]=await Promise.all([
    resolveEvent(o),
    resolveTerritory(o),
    resolveBroadcaster(o),
    loadSourcePolicy(o),
  ]);

  const resolved=normalizeProviderObservation(observation,{resolved:{
    broadcasterId:broadcaster?.id,
    territoryId:territory?.id,
  }});

  const candidate=resolved.candidate;
  const existing=event?.id&&candidate.territory_id&&candidate.broadcaster_id
    ? await findPublishedBroadcast({eventId:event.id,territoryId:candidate.territory_id,broadcasterId:candidate.broadcaster_id})
    : null;

  const routeInput={
    eventId:event?.id||'',
    eventTitle:event?.title||event?.name||o.eventExternalKey,
    eventStart:event?.startsAt||event?.start_at||event?.startTime||null,
    competitionId:event?.competitionId||event?.competition_id||null,
    competitionKey:event?.competitionKey||event?.competition_slug||event?.competition||'',
    competition:event?.competitionName||event?.competition||'Competition',
    externalKey:o.eventExternalKey,
    provider:o.provider,
    sourceName:o.provider,
    sourceId:sourcePolicy?.id||null,
    sourceObservedAt:o.observedAt,
    territoryCode:o.territoryCode,
    sourcePolicy:{
      is_enabled:sourcePolicy?.is_enabled===true,
      automatic_collection_enabled:sourcePolicy?.automatic_collection_enabled===true,
      reuse_status:sourcePolicy?.reuse_status||'unknown',
      commercial_use_allowed:sourcePolicy?.commercial_use_allowed===true,
    },
    candidate,
    existing,
    crossSourceConflict:Boolean(existing&&existing.broadcaster_id&&existing.broadcaster_id!==candidate.broadcaster_id),
  };

  const routed=await routeBroadcastWithTrust(routeInput,{lookupTrust,now});
  const base={observation:o,candidate,event:event||null,territory:territory||null,broadcaster:broadcaster||null,providerTrust:routed.providerTrust,assessment:routed.assessment};

  if(routed.assessment.route==='blocked') return {...base,disposition:'blocked',reviewCaseId:null};
  if(routed.assessment.route==='review'){
    const reviewCaseId=await enqueueReview(routed.reviewException,{observation:o,assessment:routed.assessment});
    return {...base,disposition:'review',reviewCaseId:reviewCaseId||null};
  }
  return {...base,disposition:'automatic',reviewCaseId:null};
}
