const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ACCESS=new Set(['Free','Paid','Unknown']);
const TYPES=new Set(['live','delayed','replay','highlights']);
const SCOPES=new Set(['event','competition','unknown']);
const SOURCE_CLASSES=new Set(['official_broadcaster','official_competition','rights_holder','specialist_provider','secondary_source']);

export const BROADCAST_PROVIDER_CONTRACT_VERSION=1;

function isPlainObject(value){return value!==null&&typeof value==='object'&&!Array.isArray(value);}
function https(value){try{const u=new URL(value);return u.protocol==='https:'&&!u.username&&!u.password&&Boolean(u.hostname);}catch{return false;}}
function iso(value){return typeof value==='string'&&Number.isFinite(Date.parse(value));}
function text(value,max){return typeof value==='string'&&value.trim().length>0&&value.length<=max;}

export function validateProviderObservation(value){
 const issues=[];
 if(!isPlainObject(value)) return {ok:false,issues:['observation_not_object']};
 if(value.contractVersion!==BROADCAST_PROVIDER_CONTRACT_VERSION) issues.push('contract_version_invalid');
 if(!text(value.provider,80)) issues.push('provider_invalid');
 if(!text(value.providerRecordId,200)) issues.push('provider_record_id_invalid');
 if(!text(value.eventExternalKey,200)) issues.push('event_external_key_invalid');
 if(!iso(value.observedAt)) issues.push('observed_at_invalid');
 if(!text(value.territoryCode,16)) issues.push('territory_code_invalid');
 if(!text(value.broadcasterName,160)) issues.push('broadcaster_name_invalid');
 if(value.broadcasterUrl!==null&&value.broadcasterUrl!==undefined&&!https(value.broadcasterUrl)) issues.push('broadcaster_url_invalid');
 if(value.evidenceUrl!==null&&value.evidenceUrl!==undefined&&!https(value.evidenceUrl)) issues.push('evidence_url_invalid');
 if(!ACCESS.has(value.accessType)) issues.push('access_type_invalid');
 if(!TYPES.has(value.broadcastType)) issues.push('broadcast_type_invalid');
 if(!SCOPES.has(value.evidenceScope)) issues.push('evidence_scope_invalid');
 if(!SOURCE_CLASSES.has(value.sourceClass)) issues.push('source_class_invalid');
 if(value.languageCodes!==undefined&&(!Array.isArray(value.languageCodes)||value.languageCodes.length>12||value.languageCodes.some(x=>typeof x!=='string'||!/^[a-z]{2,3}(?:-[A-Za-z0-9]{2,8})*$/.test(x)))) issues.push('language_codes_invalid');
 if(value.requiresAccount!==undefined&&typeof value.requiresAccount!=='boolean') issues.push('requires_account_invalid');
 if(value.isFreeTrial!==undefined&&typeof value.isFreeTrial!=='boolean') issues.push('is_free_trial_invalid');
 if(value.providerConfidence!==undefined&&(typeof value.providerConfidence!=='number'||value.providerConfidence<0||value.providerConfidence>1)) issues.push('provider_confidence_invalid');
 return {ok:issues.length===0,issues};
}

export function normalizeProviderObservation(value,{resolved={}}={}){
 const checked=validateProviderObservation(value);
 if(!checked.ok) return checked;
 return {
  ok:true,
  observation:{
   contractVersion:BROADCAST_PROVIDER_CONTRACT_VERSION,
   provider:value.provider,
   providerRecordId:value.providerRecordId,
   eventExternalKey:value.eventExternalKey,
   observedAt:value.observedAt,
   territoryCode:value.territoryCode.toUpperCase(),
   broadcasterName:value.broadcasterName.trim(),
   broadcasterUrl:value.broadcasterUrl||null,
   evidenceUrl:value.evidenceUrl||value.broadcasterUrl||null,
   accessType:value.accessType,
   broadcastType:value.broadcastType,
   evidenceScope:value.evidenceScope,
   sourceClass:value.sourceClass,
   languageCodes:[...new Set(value.languageCodes||[])],
   requiresAccount:value.requiresAccount??false,
   isFreeTrial:value.isFreeTrial??false,
   providerConfidence:value.providerConfidence??null,
   rawFingerprint:value.rawFingerprint||null,
  },
  candidate:{
   broadcaster_id:UUID.test(resolved.broadcasterId||'')?resolved.broadcasterId:null,
   territory_id:UUID.test(resolved.territoryId||'')?resolved.territoryId:null,
   access_type:value.accessType,
   broadcast_type:value.broadcastType,
   official_url:value.broadcasterUrl||'',
   source_name:value.provider,
   source_url:value.evidenceUrl||value.broadcasterUrl||'',
   evidence_scope:value.evidenceScope,
   language_codes:[...new Set(value.languageCodes||[])],
   requires_account:value.requiresAccount??false,
   is_free_trial:value.isFreeTrial??false,
  }
 };
}

export function providerCapabilityScore(capabilities){
 const c=capabilities||{};
 const weights={fixtures:15,territories:15,eventBroadcasters:25,officialUrls:10,accessType:10,nearLiveFreshness:10,commercialReuse:10,stableIds:5};
 let score=0;
 for(const [key,weight] of Object.entries(weights)) if(c[key]===true) score+=weight;
 return score;
}
