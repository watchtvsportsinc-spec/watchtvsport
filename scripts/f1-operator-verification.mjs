export const F1_OPERATOR_VERIFICATION_VERSION=1;

const SESSION_TERMS={
  'practice':['practice','free practice','essais libres','essais libre','fp1','fp2','fp3'],
  'practice-1':['practice 1','free practice 1','essais libres 1','essais libre 1','fp1'],
  'practice-2':['practice 2','free practice 2','essais libres 2','essais libre 2','fp2'],
  'practice-3':['practice 3','free practice 3','essais libres 3','essais libre 3','fp3'],
  'sprint':['sprint'],
  'sprint-qualifying':['sprint qualifying','sprint qualification','qualification sprint','sprint shootout'],
  'qualifying':['qualifying','qualification','qualifications','essais qualificatifs'],
  'race':['race','grand prix','course'],
};

const LIVE_TERMS=['live','direct','en direct','streaming live','watch live','diffusé','diffuse','à suivre','a suivre'];
const NEGATIVE_TERMS=['not available','unavailable','not broadcast','will not be shown','non diffusé','non diffuse','pas diffusé','pas diffuse'];

function normalize(v=''){
  return String(v).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,' ').replace(/\s+/g,' ').trim();
}
function containsAny(text,terms){return terms.some(t=>text.includes(normalize(t)));}

export function operatorSearchHints({broadcasterName,territoryCode,eventSlug,sessionType}={}){
  const session=(SESSION_TERMS[sessionType]||[sessionType]).slice(0,4).join(' OR ');
  const gp=String(eventSlug||'').replace(/-(practice(?:-[123])?|sprint(?:-qualifying)?|qualifying|race)$/,'').replace(/-/g,' ');
  return {
    query:[broadcasterName,'Formula 1',gp,session,territoryCode].filter(Boolean).join(' '),
    preferredTerms:[broadcasterName,gp,...(SESSION_TERMS[sessionType]||[])].filter(Boolean),
  };
}

export function classifyOperatorEvidence({text,sessionType,eventSlug,broadcasterName,url}={}){
  const body=normalize(text);
  if(!body) return {status:'unclear',confidence:0,reason:'empty_page',evidenceUrl:url||null};
  const sessionTerms=SESSION_TERMS[sessionType]||[sessionType].filter(Boolean);
  const gp=normalize(String(eventSlug||'').replace(/-(practice(?:-[123])?|sprint(?:-qualifying)?|qualifying|race)$/,'').replace(/-/g,' '));
  const station=normalize(broadcasterName||'');
  const hasSession=containsAny(body,sessionTerms);
  const hasGp=!gp||body.includes(gp);
  const hasStation=!station||body.includes(station);
  const hasNegative=containsAny(body,NEGATIVE_TERMS);
  const hasLive=containsAny(body,LIVE_TERMS);

  if(hasSession&&hasGp&&hasNegative) return {status:'confirmed_not_available',confidence:.95,reason:'explicit_negative',evidenceUrl:url||null};
  if(hasSession&&hasGp&&hasLive) return {status:'confirmed_live',confidence:.9,reason:'session_and_live_context',evidenceUrl:url||null};
  if(hasSession&&hasGp&&hasStation) return {status:'unclear',confidence:.65,reason:'session_listed_without_live_context',evidenceUrl:url||null};
  if(hasGp&&!hasSession) return {status:'not_listed',confidence:.45,reason:'grand_prix_found_session_not_listed',evidenceUrl:url||null};
  return {status:'unclear',confidence:.2,reason:'insufficient_operator_evidence',evidenceUrl:url||null};
}

export function shouldEscalate(result){
  return !result||['not_listed','unclear','conflict'].includes(result.status);
}
